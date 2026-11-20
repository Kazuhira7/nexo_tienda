-- ============================================================
-- 014_harden_sales_rpcs.sql — SEGURIDAD del POS (Core)
-- Antes: register_sale y cancel_sale eran SECURITY DEFINER, ejecutables
-- por anon y SIN revisar quién llamaba. Con la llave pública cualquiera
-- podía crear ventas en cualquier org (p_organization_id / p_sold_by
-- venían del cliente) o anular ventas de otra org (devolviendo stock).
-- Ahora:
--   - Solo la dueña de la org; org y vendedor salen de la sesión.
--   - Se elimina la sobrecarga vieja de 4 argumentos (sin organization_id).
--   - La firma de 5 args se mantiene: la app (components/pos/pos.tsx)
--     sigue llamando igual; p_sold_by / p_organization_id se ignoran.
--   - cancel_sale no anula pagos del restaurante (se manejan por orden).
--   - search_path fijo en los helpers y sin EXECUTE para anon.
-- ============================================================

begin;

drop function if exists register_sale(uuid, payment_method, uuid, jsonb);

create or replace function register_sale(
  p_customer_id     uuid,
  p_payment_method  payment_method,
  p_sold_by         uuid,               -- ignorado: el vendedor es auth.uid()
  p_items           jsonb,
  p_organization_id uuid default null   -- ignorado: la org es current_org_id()
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org        uuid := current_org_id();
  v_sale_id    uuid;
  v_item       jsonb;
  v_qty        int;
  v_price      numeric(12,2);
  v_disc       numeric(12,2);
  v_subtotal   numeric(12,2) := 0;
  v_discount   numeric(12,2) := 0;
  v_brand_id   uuid;
  v_stock      integer;
  v_next_num   integer;
begin
  if v_org is null or not current_role_is_owner() then raise exception 'Sin permiso para registrar ventas'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos';
  end if;
  if p_customer_id is not null then
    perform 1 from customers where id = p_customer_id and organization_id = v_org;
    if not found then raise exception 'Cliente no encontrado'; end if;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_org::text));
  select coalesce(max(sale_number), 0) + 1 into v_next_num from sales where organization_id = v_org;

  insert into sales (customer_id, payment_method, sold_by, subtotal, discount_total, total, organization_id, sale_number)
  values (p_customer_id, p_payment_method, auth.uid(), 0, 0, 0, v_org, v_next_num)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty   := (v_item->>'quantity')::int;
    v_price := (v_item->>'unit_price')::numeric;
    v_disc  := coalesce((v_item->>'discount')::numeric, 0);
    if v_qty is null or v_qty <= 0 then raise exception 'Cantidad inválida'; end if;
    if v_price is null or v_price < 0 or v_disc < 0 then raise exception 'Precio o descuento inválido'; end if;

    select stock_quantity, brand_id into v_stock, v_brand_id
    from products
    where id = (v_item->>'product_id')::uuid and organization_id = v_org
    for update;

    if v_stock is null then raise exception 'Producto no encontrado: %', v_item->>'product_id'; end if;
    if v_stock < v_qty then raise exception 'Stock insuficiente para el producto %', v_item->>'product_id'; end if;

    insert into sale_items (sale_id, product_id, brand_id, quantity, unit_price, discount, line_total, organization_id)
    values (v_sale_id, (v_item->>'product_id')::uuid, v_brand_id, v_qty, v_price, v_disc, v_price * v_qty - v_disc, v_org);

    update products
    set stock_quantity = stock_quantity - v_qty, updated_at = now()
    where id = (v_item->>'product_id')::uuid and organization_id = v_org;

    v_subtotal := v_subtotal + v_price * v_qty;
    v_discount := v_discount + v_disc;
  end loop;

  update sales set subtotal = v_subtotal, discount_total = v_discount, total = v_subtotal - v_discount
  where id = v_sale_id;

  return v_sale_id;
end;
$$;

create or replace function cancel_sale(p_sale_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_org    uuid := current_org_id();
  v_source text;
  v_item   record;
begin
  if v_org is null or not current_role_is_owner() then raise exception 'Sin permiso para anular ventas'; end if;

  select source into v_source from sales
  where id = p_sale_id and organization_id = v_org and cancelled = false
  for update;
  if not found then raise exception 'Venta no encontrada o ya fue anulada'; end if;
  if v_source = 'restaurant' then raise exception 'Los cobros del restaurante no se anulan desde ventas'; end if;

  for v_item in select product_id, quantity from sale_items where sale_id = p_sale_id loop
    update products
    set stock_quantity = stock_quantity + v_item.quantity, updated_at = now()
    where id = v_item.product_id and organization_id = v_org;
  end loop;

  update sales set cancelled = true, cancelled_at = now() where id = p_sale_id;
end;
$$;

-- Helpers del Core: search_path fijo
alter function current_org_id()        set search_path = public;
alter function is_superadmin()         set search_path = public;
alter function current_role_is_owner() set search_path = public;
alter function current_brand_id()      set search_path = public;
alter function handle_new_user()       set search_path = public;

revoke execute on function register_sale(uuid, payment_method, uuid, jsonb, uuid) from public, anon;
revoke execute on function cancel_sale(uuid)                                     from public, anon;
revoke execute on function handle_new_user()                                     from public, anon, authenticated;
grant  execute on function register_sale(uuid, payment_method, uuid, jsonb, uuid) to authenticated;
grant  execute on function cancel_sale(uuid)                                     to authenticated;

commit;
