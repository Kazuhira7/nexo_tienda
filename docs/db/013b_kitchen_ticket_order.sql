-- 013b_kitchen_ticket_order.sql — comanda ordenada: cocina primero, bar al final.
-- (Aplicada en Supabase el 7 oct 2026; recuperada de supabase_migrations para el repo.)

create or replace function send_order_to_kitchen(p_staff_token text, p_order_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_org   uuid := current_org_id();
  v_staff staff_members;
  v_items jsonb;
  v_count int;
  v_num   int;
  v_round int;
begin
  v_staff := require_staff(p_staff_token, 'orders.send');

  perform 1 from orders
    where id = p_order_id and organization_id = v_org and status = 'open'
    for update;
  if not found then raise exception 'Orden no encontrada o ya cerrada'; end if;

  with sent as (
    update order_items
      set status = 'sent', sent_at = now()
    where order_id = p_order_id and status = 'pending'
    returning id, menu_item_id, item_name, quantity, modifiers, notes, created_at
  )
  select count(*),
         coalesce(jsonb_agg(jsonb_build_object(
           'qty',       s.quantity,
           'name',      s.item_name,
           'modifiers', coalesce((select jsonb_agg(m->>'name') from jsonb_array_elements(s.modifiers) m), '[]'::jsonb),
           'notes',     s.notes,
           'station',   coalesce(mi.prep_station, 'kitchen')
         ) order by (coalesce(mi.prep_station, 'kitchen') = 'bar'), s.created_at), '[]'::jsonb)
    into v_count, v_items
  from sent s left join menu_items mi on mi.id = s.menu_item_id;

  if v_count > 0 then
    perform pg_advisory_xact_lock(hashtext('kitchen:' || v_org::text));
    select coalesce(max(ticket_number), 0) + 1 into v_num from kitchen_tickets where organization_id = v_org;
    select count(*) + 1 into v_round from kitchen_tickets where order_id = p_order_id;
    insert into kitchen_tickets (organization_id, order_id, ticket_number, round, items, created_by_staff)
    values (v_org, p_order_id, v_num, v_round, v_items, v_staff.id);
  end if;

  return v_count;
end;
$$;
