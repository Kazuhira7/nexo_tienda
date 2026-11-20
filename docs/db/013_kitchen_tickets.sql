-- ============================================================
-- 013_kitchen_tickets.sql — comandas impresas
-- Cada "Enviar a cocina" crea UN ticket de cocina con lo que se envió
-- en esa ronda (snapshot). La estación de impresión (/impresion, en la
-- computadora del local) lo recibe por Realtime, lo imprime y lo marca
-- como impreso. Reimprimir = volver a dejarlo sin printed_at.
-- ============================================================

begin;

create table kitchen_tickets (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  order_id         uuid not null references orders(id) on delete cascade,
  ticket_number    int not null,                 -- correlativo por org
  round            int not null,                 -- 1ra, 2da… ronda de la orden
  items            jsonb not null,               -- [{qty, name, modifiers[], notes, station}]
  created_by_staff uuid references staff_members(id) on delete set null,
  created_at       timestamptz not null default now(),
  printed_at       timestamptz
);
create unique index kitchen_tickets_org_number_unique on kitchen_tickets(organization_id, ticket_number);
create index idx_kitchen_tickets_pending on kitchen_tickets(organization_id, created_at) where printed_at is null;
create index idx_kitchen_tickets_order on kitchen_tickets(order_id);

alter table kitchen_tickets enable row level security;
create policy kitchen_tickets_team_read on kitchen_tickets for select
  using (organization_id = current_org_id() and current_user_is_team());
create policy kitchen_tickets_superadmin_all on kitchen_tickets for all
  using (is_superadmin()) with check (is_superadmin());

-- send_order_to_kitchen: además de marcar 'sent', crea el ticket de la ronda
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

-- Estación de impresión: no pide PIN (pantalla fija), pero sí cuenta del equipo de la org
create or replace function mark_kitchen_ticket_printed(p_ticket_id uuid)
returns void language sql security definer set search_path = public as $$
  update kitchen_tickets set printed_at = now()
  where id = p_ticket_id and organization_id = current_org_id() and current_user_is_team()
    and printed_at is null;
$$;

create or replace function reprint_kitchen_ticket(p_ticket_id uuid)
returns void language sql security definer set search_path = public as $$
  update kitchen_tickets set printed_at = null
  where id = p_ticket_id and organization_id = current_org_id() and current_user_is_team();
$$;

revoke execute on function mark_kitchen_ticket_printed(uuid) from public, anon;
revoke execute on function reprint_kitchen_ticket(uuid)      from public, anon;
grant  execute on function mark_kitchen_ticket_printed(uuid) to authenticated;
grant  execute on function reprint_kitchen_ticket(uuid)      to authenticated;

alter publication supabase_realtime add table kitchen_tickets;

commit;
