-- ============================================================
-- 011_reportes.sql — reporte del restaurante (/reportes, solo dueña)
-- Una sola función que devuelve todo el reporte de un rango de fechas
-- LOCALES (organizations.timezone): ventas, por día/hora/método,
-- platillos, categorías, meseros, cancelaciones y anulaciones.
-- - Ventas = filas de sales (source='restaurant') por fecha del pago.
-- - Platillos/categorías = order_items de órdenes pagadas en el rango.
-- ============================================================

create or replace function restaurant_report(p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_org   uuid := current_org_id();
  v_tz    text;
  v_start timestamptz;
  v_end   timestamptz;
  v_out   jsonb;
begin
  if not current_role_is_owner() then raise exception 'Sin permiso'; end if;
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Rango de fechas inválido'; end if;
  if p_to - p_from > 366 then raise exception 'El rango máximo es de un año'; end if;

  select timezone into v_tz from organizations where id = v_org;
  v_start := p_from::timestamp at time zone v_tz;
  v_end   := (p_to + 1)::timestamp at time zone v_tz;

  with
  s as (
    select * from sales
    where organization_id = v_org and source = 'restaurant' and not cancelled
      and created_at >= v_start and created_at < v_end
  ),
  paid as (
    select * from orders
    where organization_id = v_org and status = 'paid'
      and closed_at >= v_start and closed_at < v_end
  ),
  items as (
    select oi.* from order_items oi join paid on paid.id = oi.order_id
    where oi.status <> 'cancelled'
  )
  select jsonb_build_object(
    'timezone', v_tz,
    'totals', jsonb_build_object(
      'sales',     coalesce((select sum(total) from s), 0),
      'discounts', coalesce((select sum(discount_total) from s), 0),
      'payments',  (select count(*) from s),
      'orders',    (select count(*) from paid),
      'guests',    coalesce((select sum(guests) from paid where order_type = 'dine_in'), 0),
      'takeaway',  (select count(*) from paid where order_type <> 'dine_in')
    ),
    'by_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'total', t, 'orders', n) order by d)
      from (select (created_at at time zone v_tz)::date d, sum(total) t, count(distinct order_id) n
            from s group by 1) x
    ), '[]'::jsonb),
    'by_hour', coalesce((
      select jsonb_agg(jsonb_build_object('hour', h, 'total', t, 'orders', n) order by h)
      from (select extract(hour from created_at at time zone v_tz)::int h, sum(total) t, count(distinct order_id) n
            from s group by 1) x
    ), '[]'::jsonb),
    'by_method', coalesce((
      select jsonb_agg(jsonb_build_object('method', payment_method, 'total', t, 'count', n) order by t desc)
      from (select payment_method, sum(total) t, count(*) n from s group by 1) x
    ), '[]'::jsonb),
    'top_items', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'qty', q, 'revenue', r) order by q desc, r desc)
      from (select coalesce(mi.name, items.item_name) name, sum(items.quantity) q, sum(items.line_total) r
            from items left join menu_items mi on mi.id = items.menu_item_id
            group by 1 order by 2 desc, 3 desc limit 50) x
    ), '[]'::jsonb),
    'by_category', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'qty', q, 'revenue', r) order by r desc)
      from (select coalesce(mc.name, 'Sin categoría') name, sum(items.quantity) q, sum(items.line_total) r
            from items
            left join menu_items mi on mi.id = items.menu_item_id
            left join menu_categories mc on mc.id = mi.category_id
            group by 1) x
    ), '[]'::jsonb),
    'by_waiter', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'orders', n, 'total', t) order by t desc)
      from (select coalesce(sm.name, 'Sin asignar') name, count(distinct s.order_id) n, sum(s.total) t
            from s left join orders o on o.id = s.order_id
            left join staff_members sm on sm.id = o.opened_by_staff
            group by 1) x
    ), '[]'::jsonb),
    'cancelled_orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'number', o.order_number, 'table', t.name, 'name', o.customer_name,
        'reason', o.cancel_reason, 'by', sm.name, 'at', o.closed_at,
        'value', (select coalesce(sum(line_total), 0) from order_items where order_id = o.id)
      ) order by o.closed_at desc)
      from orders o
      left join dining_tables t on t.id = o.table_id
      left join staff_members sm on sm.id = o.cancelled_by_staff
      where o.organization_id = v_org and o.status = 'cancelled'
        and o.closed_at >= v_start and o.closed_at < v_end
    ), '[]'::jsonb),
    -- Platillos anulados DESPUÉS de enviarse a cocina, en órdenes no canceladas
    'voided_items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', oi.item_name, 'qty', oi.quantity, 'value', oi.line_total,
        'number', o.order_number, 'by', sm.name, 'at', oi.sent_at
      ) order by oi.sent_at desc)
      from order_items oi
      join orders o on o.id = oi.order_id
      left join staff_members sm on sm.id = oi.voided_by_staff
      where oi.organization_id = v_org and oi.status = 'cancelled' and oi.sent_at is not null
        and o.status <> 'cancelled'
        and oi.sent_at >= v_start and oi.sent_at < v_end
    ), '[]'::jsonb),
    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'number', o.order_number, 'status', o.status, 'type', o.order_type,
        'table', t.name, 'name', o.customer_name, 'waiter', sm.name, 'closed_at', o.closed_at,
        'total', (select coalesce(sum(total), 0) from sales where order_id = o.id and not cancelled)
      ) order by o.closed_at desc)
      from (select * from orders
            where organization_id = v_org and status in ('paid', 'cancelled')
              and closed_at >= v_start and closed_at < v_end
            order by closed_at desc limit 300) o
      left join dining_tables t on t.id = o.table_id
      left join staff_members sm on sm.id = o.opened_by_staff
    ), '[]'::jsonb)
  ) into v_out;

  return v_out;
end;
$$;

revoke execute on function restaurant_report(date, date) from public, anon;
grant  execute on function restaurant_report(date, date) to authenticated;
