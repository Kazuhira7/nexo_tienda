-- ============================================================
-- 016_cobro_requiere_caja_abierta.sql
-- En el restaurante no se puede cobrar si la caja de HOY (día local del
-- negocio) no está abierta (cash_openings). Aplica solo si la org usa el
-- módulo 'cash'. El POS del colectivo (register_sale) no cambia.
-- Error con hint 'cash_closed' para que la UI ofrezca abrir caja.
-- ============================================================

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
  v_cash    boolean;
  v_today   date;
begin
  v_staff := require_staff(p_staff_token, 'payments.collect');
  if p_payment_method is null or p_payment_method = 'mixed' then
    raise exception 'Elige efectivo, tarjeta o transferencia';
  end if;

  -- Caja abierta hoy (si la org usa el módulo de caja)
  select 'cash' = any(enabled_modules), (now() at time zone timezone)::date
    into v_cash, v_today
  from organizations where id = v_org;
  if v_cash and not exists (
    select 1 from cash_openings where organization_id = v_org and opening_date = v_today
  ) then
    raise exception 'Abre la caja antes de cobrar' using hint = 'cash_closed';
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

  v_first := b.paid = 0;

  perform pg_advisory_xact_lock(hashtext(v_org::text));
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
