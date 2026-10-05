-- ============================================================
-- 008_orden_ui.sql — soporte para /salon y /orden/[id] (R1 paso 3)
-- - orders.customer_name: nombre para órdenes "para llevar".
-- - open_order acepta p_customer_name (cambia la firma: se recrea).
-- - update_order_item: cantidad y notas de un platillo AÚN NO enviado.
-- - set_order_guests: número de personas en la mesa.
-- REQUIERE: 006 aplicada. Aditiva.
-- ============================================================

begin;

alter table orders add column if not exists customer_name text
  check (customer_name is null or length(customer_name) <= 60);

-- open_order con nombre (para llevar). La firma cambia → drop + create + grants.
drop function if exists open_order(text, uuid, order_type, int);

create or replace function open_order(
  p_staff_token   text,
  p_table_id      uuid default null,
  p_order_type    order_type default 'dine_in',
  p_guests        int default 1,
  p_customer_name text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org   uuid := current_org_id();
  v_staff staff_members;
  v_num   int;
  v_id    uuid;
begin
  v_staff := require_staff(p_staff_token, 'orders.take');

  if p_order_type = 'dine_in' then
    if p_table_id is null then raise exception 'Selecciona una mesa'; end if;
    perform 1 from dining_tables
      where id = p_table_id and organization_id = v_org and active
      for update;
    if not found then raise exception 'Mesa no encontrada'; end if;
    if exists (select 1 from orders where table_id = p_table_id and status = 'open') then
      raise exception 'La mesa ya tiene una orden abierta';
    end if;
  else
    p_table_id := null;
  end if;

  perform pg_advisory_xact_lock(hashtext('orders:' || v_org::text));
  select coalesce(max(order_number), 0) + 1 into v_num from orders where organization_id = v_org;

  insert into orders (organization_id, order_number, table_id, order_type, guests, opened_by_staff, customer_name)
  values (v_org, v_num, p_table_id, p_order_type, greatest(coalesce(p_guests, 1), 1), v_staff.id,
          nullif(left(trim(p_customer_name), 60), ''))
  returning id into v_id;

  if p_table_id is not null then
    update dining_tables set status = 'occupied' where id = p_table_id;
  end if;

  return v_id;
end;
$$;

-- Cambiar cantidad / notas de un platillo pendiente (no enviado) → orders.take
create or replace function update_order_item(
  p_staff_token text,
  p_item_id     uuid,
  p_quantity    int,
  p_notes       text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_org          uuid := current_org_id();
  v_status       order_item_status;
  v_order_status order_status;
begin
  perform require_staff(p_staff_token, 'orders.take');
  if p_quantity is null or p_quantity <= 0 or p_quantity > 99 then raise exception 'Cantidad inválida'; end if;

  select oi.status, o.status into v_status, v_order_status
  from order_items oi join orders o on o.id = oi.order_id
  where oi.id = p_item_id and oi.organization_id = v_org
  for update of oi;
  if not found then raise exception 'Platillo no encontrado'; end if;
  if v_order_status <> 'open' then raise exception 'La orden ya está cerrada'; end if;
  if v_status <> 'pending' then raise exception 'Ya se envió a cocina; anúlalo y agrégalo de nuevo'; end if;

  update order_items
    set quantity = p_quantity, notes = nullif(trim(p_notes), '')
  where id = p_item_id;
end;
$$;

-- Personas en la mesa → orders.take
create or replace function set_order_guests(p_staff_token text, p_order_id uuid, p_guests int)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform require_staff(p_staff_token, 'orders.take');
  if p_guests is null or p_guests < 1 or p_guests > 99 then raise exception 'Número de personas inválido'; end if;
  update orders set guests = p_guests
  where id = p_order_id and organization_id = current_org_id() and status = 'open';
  if not found then raise exception 'Orden no encontrada o ya cerrada'; end if;
end;
$$;

revoke execute on function open_order(text, uuid, order_type, int, text)   from public, anon;
revoke execute on function update_order_item(text, uuid, int, text)         from public, anon;
revoke execute on function set_order_guests(text, uuid, int)                from public, anon;
grant  execute on function open_order(text, uuid, order_type, int, text)   to authenticated;
grant  execute on function update_order_item(text, uuid, int, text)         to authenticated;
grant  execute on function set_order_guests(text, uuid, int)                to authenticated;

commit;
