-- ============================================================
-- 010_order_payments_read.sql
-- La cuenta del local (terminal) no puede leer `sales` (solo la dueña),
-- pero en /cobrar necesita ver los pagos ya hechos de UNA orden.
-- Esta función expone solo eso: método, monto y hora, de órdenes de la
-- propia org, para el equipo (owner/terminal). No expone ventas de POS
-- ni totales del día.
-- ============================================================

create or replace function order_payments(p_order_id uuid)
returns table (payment_method payment_method, amount numeric, discount numeric, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.payment_method, s.total, s.discount_total, s.created_at
  from sales s
  join orders o on o.id = s.order_id
  where s.order_id = p_order_id
    and o.organization_id = current_org_id()
    and current_user_is_team()
    and not s.cancelled
  order by s.created_at;
$$;

revoke execute on function order_payments(uuid) from public, anon;
grant  execute on function order_payments(uuid) to authenticated;
