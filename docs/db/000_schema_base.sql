-- ============================================================
-- Sistema de Tienda Colectiva — Esquema inicial (Supabase / Postgres)
-- Correr en: Supabase > SQL Editor
-- ============================================================

-- ----------- ENUMS -----------
create type user_role as enum ('owner', 'brand');
create type payment_method as enum ('cash', 'pos', 'transfer', 'mixed');
create type settlement_status as enum ('pending', 'paid');

-- ----------- BRANDS -----------
create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  commission_rate numeric(5,2) not null default 0,  -- % que cobra la tienda (configurable)
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------- PROFILES (extiende auth.users) -----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'brand',
  brand_id uuid references brands(id) on delete set null,  -- null si es owner
  full_name text,
  created_at timestamptz not null default now()
);

-- ----------- PRODUCTS -----------
create table products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  code text not null unique,          -- SKU / código de barras
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  cost numeric(12,2),
  stock_quantity integer not null default 0,
  low_stock_threshold integer not null default 5,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_products_brand on products(brand_id);
create index idx_products_code on products(code);

-- ----------- CUSTOMERS -----------
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

-- ----------- SALES (cabecera) -----------
create table sales (
  id uuid primary key default gen_random_uuid(),
  sale_number serial unique,
  customer_id uuid references customers(id) on delete set null,
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method payment_method not null default 'cash',
  sold_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_sales_created on sales(created_at);

-- ----------- SALE ITEMS (detalle) -----------
create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  brand_id uuid not null references brands(id),  -- denormalizado para reportes
  quantity integer not null,
  unit_price numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  line_total numeric(12,2) not null
);
create index idx_sale_items_brand on sale_items(brand_id);
create index idx_sale_items_sale on sale_items(sale_id);

-- ----------- SETTLEMENTS (liquidaciones) -----------
create table settlements (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  gross_sales numeric(12,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  net_payout numeric(12,2) not null default 0,
  status settlement_status not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index idx_settlements_brand on settlements(brand_id);

-- ============================================================
-- HELPERS para RLS
-- ============================================================
create or replace function current_role_is_owner()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

create or replace function current_brand_id()
returns uuid language sql security definer stable as $$
  select brand_id from profiles where id = auth.uid();
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table brands       enable row level security;
alter table profiles     enable row level security;
alter table products     enable row level security;
alter table customers    enable row level security;
alter table sales        enable row level security;
alter table sale_items   enable row level security;
alter table settlements  enable row level security;

-- PROFILES: cada quien lee su propio profile; owner lee todos
create policy profiles_self_read on profiles for select
  using (id = auth.uid() or current_role_is_owner());

-- BRANDS: owner ve/edita todo; marca ve solo la suya
create policy brands_owner_all on brands for all
  using (current_role_is_owner()) with check (current_role_is_owner());
create policy brands_brand_read on brands for select
  using (id = current_brand_id());

-- PRODUCTS: owner todo; marca ve/edita solo los suyos
create policy products_owner_all on products for all
  using (current_role_is_owner()) with check (current_role_is_owner());
create policy products_brand_read on products for select
  using (brand_id = current_brand_id());
create policy products_brand_write on products for update
  using (brand_id = current_brand_id()) with check (brand_id = current_brand_id());
create policy products_brand_insert on products for insert
  with check (brand_id = current_brand_id());

-- CUSTOMERS: solo owner
create policy customers_owner_all on customers for all
  using (current_role_is_owner()) with check (current_role_is_owner());

-- SALES: solo owner (las marcas ven sus ventas vía sale_items)
create policy sales_owner_all on sales for all
  using (current_role_is_owner()) with check (current_role_is_owner());

-- SALE_ITEMS: owner todo; marca ve solo lo suyo
create policy sale_items_owner_all on sale_items for all
  using (current_role_is_owner()) with check (current_role_is_owner());
create policy sale_items_brand_read on sale_items for select
  using (brand_id = current_brand_id());

-- SETTLEMENTS: owner todo; marca ve solo las suyas
create policy settlements_owner_all on settlements for all
  using (current_role_is_owner()) with check (current_role_is_owner());
create policy settlements_brand_read on settlements for select
  using (brand_id = current_brand_id());

-- ============================================================
-- FUNCIÓN: register_sale (venta atómica + descuento de stock)
-- Llamar desde el servidor con supabase.rpc('register_sale', {...})
-- items: jsonb [{ product_id, quantity, unit_price, discount }]
-- ============================================================
create or replace function register_sale(
  p_customer_id uuid,
  p_payment_method payment_method,
  p_sold_by uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_sale_id uuid;
  v_item jsonb;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_line_total numeric(12,2);
  v_brand_id uuid;
  v_stock integer;
begin
  -- crear cabecera (se actualizan los totales al final)
  insert into sales (customer_id, payment_method, sold_by, subtotal, discount_total, total)
  values (p_customer_id, p_payment_method, p_sold_by, 0, 0, 0)
  returning id into v_sale_id;

  -- recorrer items
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    -- validar stock y obtener brand
    select stock_quantity, brand_id into v_stock, v_brand_id
    from products
    where id = (v_item->>'product_id')::uuid
    for update;

    if v_stock is null then
      raise exception 'Producto no encontrado: %', v_item->>'product_id';
    end if;
    if v_stock < (v_item->>'quantity')::int then
      raise exception 'Stock insuficiente para el producto %', v_item->>'product_id';
    end if;

    v_line_total := ((v_item->>'unit_price')::numeric * (v_item->>'quantity')::int)
                    - coalesce((v_item->>'discount')::numeric, 0);

    insert into sale_items (sale_id, product_id, brand_id, quantity, unit_price, discount, line_total)
    values (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      v_brand_id,
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'discount')::numeric, 0),
      v_line_total
    );

    -- descontar stock
    update products
    set stock_quantity = stock_quantity - (v_item->>'quantity')::int,
        updated_at = now()
    where id = (v_item->>'product_id')::uuid;

    v_subtotal := v_subtotal + ((v_item->>'unit_price')::numeric * (v_item->>'quantity')::int);
    v_discount := v_discount + coalesce((v_item->>'discount')::numeric, 0);
  end loop;

  -- actualizar totales de la venta
  update sales
  set subtotal = v_subtotal,
      discount_total = v_discount,
      total = v_subtotal - v_discount
  where id = v_sale_id;

  return v_sale_id;
end;
$$;
