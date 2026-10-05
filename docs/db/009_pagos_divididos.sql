-- ============================================================
-- 009_pagos_divididos.sql — cobro con cuenta dividida (R1 paso 5)
-- Una orden admite VARIOS pagos. Cada pago = una fila en sales con su
-- método (source='restaurant', sales.order_id). El cierre de caja del
-- Core sigue cuadrando por método sin cambios. Cuando el saldo llega a
-- 0, la orden queda pagada y la mesa libre.
--
-- - orders.discount_total: descuento a nivel de orden (antes de cobrar).
-- - sales.order_id: a qué orden pertenece cada pago.
-- - set_order_discount (orders.discount), pay_order (payments.collect).
-- - close_order se elimina: pay_order por el saldo completo la reemplaza.
-- - cancel_order y la anulación de platillos no pueden dejar el total
--   por debajo de lo ya cobrado.
-- REQUIERE: 006 y 008 aplicadas.
-- ============================================================

begin;

alter table orders add column if not exists discount_total numeric(12,2) not null default 0
  check (discount_total >= 0);
alter table sales add column if not exists order_id uuid references orders(id) on delete set null;
create index if not exists idx_sales_order on sales(order_id) where order_id is not null;

drop function if exists close_order(text, uuid, payment_method, numeric, numeric, uuid);

-- Total vigente de la orden (sin anulados), y lo ya cobrado
create or replace function order_balance(p_order_id uuid, out subtotal numeric, out discount numeric, out paid numeric)
language sql stable security definer set search_path = public as $$
  select
    (select coalesce(sum(line_total), 0) from order_items where order_id = p_order_id and status <> 'cancelled'),
    (select discount_total from orders where id = p_order_id),
    (select coalesce(sum(total), 0) from sales where order_id = p_order_id and not cancelled);
$$;
revoke execute on function order_balance(uuid) from public, anon, authenticated;

-- Descuento de la orden → orders.discount (solo antes del primer pago)
create or replace function set_order_discount(p_staff_token text, p_order_id uuid, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := current_org_id();
  b     record;
begin
  perform require_staff(p_staff_token, 'orders.discount');
  perform 1 from orders where id = p_order_id and organization_id = v_org and status = 'open' for update;
  if not found then raise exception 'Orden no encontrada o ya cerrada'; end if;

  select * into b from order_balance(p_order_id);
  if b.paid > 0 then raise exception 'Ya hay pagos registrados; el descuento va antes de cobrar'; end if;
  if p_amount is null or p_amount < 0 or p_amount > b.subtotal then raise exception 'Descuento inválido'; end if;

  update orders set discount_total = round(p_amount, 2) where id = p_order_id;
end;
$$;

-- Registrar un pago (parcial o total) → payments.collect
-- Devuelve el saldo pendiente después del pago (0 = orden pagada y mesa libre).
create or replace function pay_order(
  p_staff_token    text,
  p_order_id       uuid,
  p_amount         numeric,
  p_payment_method payment_method,
  p_customer_id    uuid default null
)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_org     uuid := current_org_id();
  v_staff   staff_members;
  v_order   orders%rowtype;
  b         record;
  v_balance numeric(12,2);
  v_amount  numeric(12,2) := round(coalesce(p_amount, 0), 2);
  v_first   boolean;
  v_num     int;
  v_sale_id uuid;
begin
  v_staff := require_staff(p_staff_token, 'payments.collect');
  if p_payment_method is null or p_payment_method = 'mixed' then
    raise exception 'Elige efectivo, tarjeta o transferencia';
  end if;

  select * into v_order from orders where id = p_order_id and organization_id = v_org for update;
  if not found then raise exception 'Orden no encontrada'; end if;
  if v_order.status <> 'open' then raise exception 'La orden ya fue cerrada'; end if;

  select * into b from order_balance(p_order_id);
  if b.subtotal <= 0 then raise exception 'La orden no tiene platillos'; end if;
  v_balance := b.subtotal - b.discount - b.paid;
  if v_amount <= 0 then raise exception 'Monto inválido'; end if;
  if v_amount > v_balance then raise exception 'El monto es mayor que el saldo (%)', v_balance; end if;

  if p_customer_id is not null then
    perform 1 from customers where id = p_customer_id and organization_id = v_org;
    if not found then raise exception 'Cliente no encontrado'; end if;
  end if;

  -- The first payment carries the order discount, so sum(sales.total) = order total
  v_first := b.paid = 0;

  perform pg_advisory_xact_lock(hashtext(v_org::text)); -- same lock as register_sale
  select coalesce(max(sale_number), 0) + 1 into v_num from sales where organization_id = v_org;

  insert into sales (organization_id, sale_number, customer_id, payment_method, sold_by,
                     subtotal, discount_total, total, tip_amount, source, order_id)
  values (v_org, v_num, coalesce(p_customer_id, v_order.customer_id), p_payment_method, auth.uid(),
          v_amount + case when v_first then b.discount else 0 end,
          case when v_first then b.discount else 0 end,
          v_amount, 0, 'restaurant', p_order_id)
  returning id into v_sale_id;

  v_balance := v_balance - v_amount;

  if v_balance = 0 then
    update orders
      set status = 'paid', sale_id = v_sale_id, closed_by_staff = v_staff.id, closed_at = now()
    where id = p_order_id;
    if v_order.table_id is not null then
      update dining_tables set status = 'free' where id = v_order.table_id;
    end if;
  end if;

  return v_balance;
end;
$$;

-- cancel_order: no si ya hay pagos
create or replace function cancel_order(p_staff_token text, p_order_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_org   uuid := current_org_id();
  v_staff staff_members;
  v_order orders%rowtype;
begin
  v_staff := require_staff(p_staff_token, 'orders.cancel');
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'Indica el motivo'; end if;

  select * into v_order from orders
    where id = p_order_id and organization_id = v_org
    for update;
  if not found then raise exception 'Orden no encontrada'; end if;
  if v_order.status <> 'open' then raise exception 'La orden ya fue cerrada'; end if;
  if exists (select 1 from sales where order_id = p_order_id and not cancelled) then
    raise exception 'La orden ya tiene pagos; termina de cobrarla';
  end if;

  update order_items
    set status = 'cancelled', voided_by_staff = v_staff.id
  where order_id = p_order_id and status <> 'cancelled';
  update orders
    set status = 'cancelled', cancel_reason = trim(p_reason),
        cancelled_by_staff = v_staff.id, closed_at = now()
  where id = p_order_id;

  if v_order.table_id is not null then
    update dining_tables set status = 'free' where id = v_order.table_id;
  end if;
end;
$$;

-- set_order_item_status: anular no puede dejar el total por debajo de lo cobrado
create or replace function set_order_item_status(
  p_staff_token text,
  p_item_id     uuid,
  p_status      order_item_status
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_org          uuid := current_org_id();
  v_current      order_item_status;
  v_order_id     uuid;
  v_order_status order_status;
  v_perm         text;
  v_staff        staff_members;
  b              record;
begin
  select oi.status, o.id, o.status into v_current, v_order_id, v_order_status
  from order_items oi
  join orders o on o.id = oi.order_id
  where oi.id = p_item_id and oi.organization_id = v_org
  for update of oi;
  if not found then raise exception 'Platillo no encontrado'; end if;
  if v_order_status <> 'open' then raise exception 'La orden ya está cerrada'; end if;
  if v_current = 'cancelled' then raise exception 'El platillo ya fue anulado'; end if;

  v_perm := case p_status
    when 'preparing' then 'kitchen.update'
    when 'ready'     then 'kitchen.update'
    when 'served'    then 'orders.take'
    when 'cancelled' then case when v_current = 'pending' then 'orders.take' else 'orders.void_item' end
    else null
  end;
  if v_perm is null then raise exception 'Cambio de estado no permitido'; end if;

  v_staff := require_staff(p_staff_token, v_perm);

  update order_items
    set status = p_status,
        voided_by_staff = case when p_status = 'cancelled' then v_staff.id else voided_by_staff end
  where id = p_item_id;

  if p_status = 'cancelled' then
    select * into b from order_balance(v_order_id);
    if b.subtotal - b.discount < b.paid then
      raise exception 'No se puede anular: ya se cobró más que el nuevo total';
    end if;
  end if;
end;
$$;

revoke execute on function set_order_discount(text, uuid, numeric)                   from public, anon;
revoke execute on function pay_order(text, uuid, numeric, payment_method, uuid)      from public, anon;
grant  execute on function set_order_discount(text, uuid, numeric)                   to authenticated;
grant  execute on function pay_order(text, uuid, numeric, payment_method, uuid)      to authenticated;

commit;
