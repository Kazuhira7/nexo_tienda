-- ============================================================
-- 006_restaurante.sql
-- 1) Core: equipo con PIN (staff_members + sesiones de PIN).
--    Genérico: sirve a cualquier vertical que opere con empleados
--    en un dispositivo compartido (restaurante hoy, retail mañana).
-- 2) Vertical restaurante: áreas, mesas, menú, modificadores,
--    órdenes e ítems, con todas sus mutaciones como RPC atómicas.
--
-- REQUIERE: 000…005 aplicadas y 006a_terminal_role.sql aplicada
-- en una transacción anterior. Aditiva: no toca datos existentes.
--
-- Modelo de identidad:
--   auth (profiles.role)      → 'owner' (dueña) o 'terminal' (cuenta del local)
--   empleado (staff_members)  → PIN de 4 dígitos + permisos según puesto
--   Toda RPC operativa recibe p_staff_token (sesión de PIN) y valida
--   el permiso con require_staff(). Sin PIN válido no se opera.
-- ============================================================

begin;

-- ============================================================
-- AJUSTES AL CORE
-- ============================================================

alter table sales add column if not exists tip_amount numeric(12,2) not null default 0;
alter table sales add column if not exists source text not null default 'pos';
alter table sales add constraint sales_source_check check (source in ('pos', 'restaurant'));
alter table sales add constraint sales_tip_check check (tip_amount >= 0);

-- Dueña o cuenta del local de la org (lectura operativa + Realtime)
create or replace function current_user_is_team()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role in ('owner', 'terminal')
      and organization_id is not null
  );
$$;

-- ============================================================
-- EQUIPO CON PIN (Core)
-- ============================================================

create table staff_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id      uuid references profiles(id) on delete set null, -- enlaza a la dueña si aplica
  name            text not null check (length(trim(name)) > 0),
  position        text not null default 'Mesero',                   -- preset o libre
  permissions     text[] not null default '{}' check (permissions <@ array[
    'orders.take', 'orders.send', 'orders.void_item', 'orders.cancel', 'orders.discount',
    'payments.collect', 'kitchen.update', 'menu.availability'
  ]::text[]),
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index idx_staff_members_org on staff_members(organization_id);
create unique index staff_members_org_profile_unique
  on staff_members(organization_id, profile_id) where profile_id is not null;

-- Hash del PIN separado: ningún cliente puede leerlo (RLS sin policies).
-- Un PIN de 4 dígitos se rompe offline al instante, así que el hash jamás sale de la BD.
create table staff_pins (
  staff_member_id uuid primary key references staff_members(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  pin_hash        text not null,
  updated_at      timestamptz not null default now()
);
create index idx_staff_pins_org on staff_pins(organization_id);

-- Sesiones de PIN. Solo se guarda el sha256 del token; el token vive
-- en una cookie httpOnly del servidor. Ligada a la cuenta (auth.uid())
-- que la creó: un token robado no sirve desde otra cuenta.
create table staff_sessions (
  token_hash      bytea primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  staff_member_id uuid not null references staff_members(id) on delete cascade,
  created_by      uuid not null references profiles(id) on delete cascade,
  one_shot        boolean not null default false, -- autorización de supervisor (60 s)
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  expires_at      timestamptz not null
);
create index idx_staff_sessions_expires on staff_sessions(expires_at);
create index idx_staff_sessions_member on staff_sessions(staff_member_id);

-- Intentos fallidos de PIN (anti fuerza bruta por org)
create table staff_pin_failures (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  at              timestamptz not null default now()
);
create index idx_staff_pin_failures_org_at on staff_pin_failures(organization_id, at);

alter table staff_members      enable row level security;
alter table staff_pins         enable row level security;  -- sin policies: solo vía funciones
alter table staff_sessions     enable row level security;  -- sin policies: solo vía funciones
alter table staff_pin_failures enable row level security;  -- sin policies: solo vía funciones

create policy staff_members_team_read on staff_members for select
  using (organization_id = current_org_id() and current_user_is_team());
create policy staff_members_owner_all on staff_members for all
  using (organization_id = current_org_id() and current_role_is_owner())
  with check (organization_id = current_org_id() and current_role_is_owner());
create policy staff_members_superadmin_all on staff_members for all
  using (is_superadmin()) with check (is_superadmin());

-- ----------- Validar sesión de PIN (interna, sin grant) -----------
-- Devuelve el empleado si el token es válido para esta cuenta/org y
-- (si se pide) tiene el permiso. Lanza excepción si no.
-- hint 'needs_permission:<perm>' → la UI pide PIN de un supervisor.
create or replace function require_staff(p_token text, p_permission text default null)
returns staff_members language plpgsql security definer set search_path = public as $$
declare
  v_session staff_sessions%rowtype;
  v_member  staff_members%rowtype;
begin
  if not current_user_is_team() then raise exception 'Sin permiso'; end if;
  if p_token is null or length(p_token) <> 64 then
    raise exception 'Ingresa tu PIN' using hint = 'pin_required';
  end if;

  select * into v_session from staff_sessions
  where token_hash = extensions.digest(p_token, 'sha256')
    and organization_id = current_org_id()
    and created_by = auth.uid()
    and expires_at > now()
    and (one_shot or last_seen_at > now() - interval '30 minutes');
  if not found then
    raise exception 'Tu sesión expiró. Ingresa tu PIN de nuevo' using hint = 'pin_required';
  end if;

  select * into v_member from staff_members
  where id = v_session.staff_member_id and active;
  if not found then
    raise exception 'Usuario inactivo' using hint = 'pin_required';
  end if;

  if p_permission is not null and not (p_permission = any(v_member.permissions)) then
    raise exception '% no tiene permiso para esta acción', v_member.name
      using hint = 'needs_permission:' || p_permission;
  end if;

  if v_session.one_shot then
    delete from staff_sessions where token_hash = v_session.token_hash;
  else
    update staff_sessions set last_seen_at = now() where token_hash = v_session.token_hash;
  end if;

  return v_member;
end;
$$;

-- ----------- Login con PIN -----------
-- No lanza excepción en PIN incorrecto (eso revertiría el registro del
-- fallo): devuelve {ok:false, error}. 10 fallos en 5 min bloquean la org 5 min.
create or replace function staff_login(p_pin text, p_one_shot boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_org    uuid := current_org_id();
  v_fails  int;
  v_member staff_members%rowtype;
  v_token  text;
begin
  if not current_user_is_team() then raise exception 'Sin permiso'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return jsonb_build_object('ok', false, 'error', 'El PIN debe tener 4 dígitos');
  end if;

  -- Limpieza oportunista
  delete from staff_pin_failures where at < now() - interval '1 hour';
  delete from staff_sessions
  where expires_at < now()
     or (not one_shot and last_seen_at < now() - interval '30 minutes');

  select count(*) into v_fails from staff_pin_failures
  where organization_id = v_org and at > now() - interval '5 minutes';
  if v_fails >= 10 then
    return jsonb_build_object('ok', false, 'error', 'Demasiados intentos. Espera 5 minutos.');
  end if;

  select m.* into v_member
  from staff_members m
  join staff_pins p on p.staff_member_id = m.id
  where m.organization_id = v_org
    and m.active
    and p.pin_hash = extensions.crypt(p_pin, p.pin_hash)
  limit 1;

  if not found then
    insert into staff_pin_failures (organization_id) values (v_org);
    return jsonb_build_object('ok', false, 'error', 'PIN incorrecto');
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into staff_sessions (token_hash, organization_id, staff_member_id, created_by, one_shot, expires_at)
  values (
    extensions.digest(v_token, 'sha256'), v_org, v_member.id, auth.uid(), coalesce(p_one_shot, false),
    now() + case when coalesce(p_one_shot, false) then interval '60 seconds' else interval '14 hours' end
  );

  return jsonb_build_object(
    'ok',              true,
    'token',           v_token,
    'staff_member_id', v_member.id,
    'name',            v_member.name,
    'position',        v_member.position,
    'permissions',     to_jsonb(v_member.permissions)
  );
end;
$$;

-- ----------- Empleado de la sesión actual (null si no hay sesión válida) -----------
create or replace function current_staff(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_member staff_members%rowtype;
begin
  begin
    v_member := require_staff(p_token, null);
  exception when others then
    return null;
  end;
  return jsonb_build_object(
    'staff_member_id', v_member.id,
    'name',            v_member.name,
    'position',        v_member.position,
    'permissions',     to_jsonb(v_member.permissions)
  );
end;
$$;

create or replace function staff_logout(p_token text)
returns void language sql security definer set search_path = public as $$
  delete from staff_sessions
  where token_hash = extensions.digest(coalesce(p_token, ''), 'sha256')
    and created_by = auth.uid();
$$;

-- ----------- Asignar PIN (solo dueña) -----------
create or replace function set_staff_pin(p_member_id uuid, p_pin text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := current_org_id();
begin
  if not current_role_is_owner() then raise exception 'Solo la administradora puede asignar PINs'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then raise exception 'El PIN debe tener 4 dígitos'; end if;

  perform 1 from staff_members where id = p_member_id and organization_id = v_org;
  if not found then raise exception 'Empleado no encontrado'; end if;

  -- Serializa asignaciones de PIN de la org (unicidad sin índice: los hashes llevan sal)
  perform pg_advisory_xact_lock(hashtext('staff_pins:' || v_org::text));
  if exists (
    select 1 from staff_pins
    where organization_id = v_org
      and staff_member_id <> p_member_id
      and pin_hash = extensions.crypt(p_pin, pin_hash)
  ) then
    raise exception 'Ese PIN ya lo usa otra persona del equipo';
  end if;

  insert into staff_pins (staff_member_id, organization_id, pin_hash, updated_at)
  values (p_member_id, v_org, extensions.crypt(p_pin, extensions.gen_salt('bf', 6)), now())
  on conflict (staff_member_id) do update
    set pin_hash = excluded.pin_hash, updated_at = now();

  -- Un PIN nuevo cierra las sesiones abiertas de esa persona
  delete from staff_sessions where staff_member_id = p_member_id;
end;
$$;

-- Qué empleados ya tienen PIN (sin exponer el hash)
create or replace function staff_members_with_pin()
returns setof uuid language sql security definer stable set search_path = public as $$
  select staff_member_id from staff_pins
  where organization_id = current_org_id() and current_role_is_owner();
$$;

-- ============================================================
-- VERTICAL RESTAURANTE
-- ============================================================

create type table_status as enum ('free', 'occupied', 'bill_requested');
create type order_status as enum ('open', 'paid', 'cancelled');
create type order_type as enum ('dine_in', 'takeaway', 'delivery');
create type order_item_status as enum ('pending', 'sent', 'preparing', 'ready', 'served', 'cancelled');

-- ----------- Áreas y mesas -----------
create table dining_areas (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);
create index idx_dining_areas_org on dining_areas(organization_id);

create table dining_tables (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  area_id         uuid references dining_areas(id) on delete set null,
  name            text not null,                 -- "Mesa 1", "Kiosko 3"
  seats           int not null default 4 check (seats > 0),
  status          table_status not null default 'free',
  sort_order      int not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index idx_dining_tables_org on dining_tables(organization_id);

-- ----------- Menú -----------
create table menu_categories (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  sort_order      int not null default 0,
  active          boolean not null default true
);
create index idx_menu_categories_org on menu_categories(organization_id);

create table menu_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  category_id     uuid references menu_categories(id) on delete set null,
  name            text not null,
  description     text,
  price           numeric(12,2) not null check (price >= 0),
  cost            numeric(12,2) check (cost >= 0),
  image_url       text,
  prep_station    text not null default 'kitchen' check (prep_station in ('kitchen', 'bar')),
  available       boolean not null default true,   -- toggle "Agotado"
  active          boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);
create index idx_menu_items_org on menu_items(organization_id);

create table modifier_groups (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,                 -- "Término", "Extras"
  min_select      int not null default 0 check (min_select >= 0),
  max_select      int not null default 1,
  check (max_select >= 1 and max_select >= min_select)
);
create index idx_modifier_groups_org on modifier_groups(organization_id);

create table modifiers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  group_id        uuid not null references modifier_groups(id) on delete cascade,
  name            text not null,                 -- "Tres cuartos", "Extra queso"
  price_delta     numeric(12,2) not null default 0,
  sort_order      int not null default 0
);
create index idx_modifiers_group on modifiers(group_id);

create table menu_item_modifier_groups (
  menu_item_id    uuid not null references menu_items(id) on delete cascade,
  group_id        uuid not null references modifier_groups(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  sort_order      int not null default 0,
  primary key (menu_item_id, group_id)
);

-- ----------- Órdenes -----------
create table orders (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations(id) on delete cascade,
  order_number       int not null,                -- correlativo por org
  table_id           uuid references dining_tables(id) on delete set null,
  order_type         order_type not null default 'dine_in',
  status             order_status not null default 'open',
  guests             int not null default 1 check (guests > 0),
  opened_by_staff    uuid references staff_members(id) on delete set null,
  closed_by_staff    uuid references staff_members(id) on delete set null,
  cancelled_by_staff uuid references staff_members(id) on delete set null,
  customer_id        uuid references customers(id) on delete set null,
  notes              text,
  sale_id            uuid references sales(id) on delete set null,
  cancel_reason      text,
  opened_at          timestamptz not null default now(),
  closed_at          timestamptz
);
create unique index orders_org_number_unique on orders(organization_id, order_number);
create index idx_orders_org_status on orders(organization_id, status);
-- Una mesa solo puede tener UNA orden abierta:
create unique index one_open_order_per_table on orders(table_id)
  where status = 'open' and table_id is not null;

create table order_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id        uuid not null references orders(id) on delete cascade,
  menu_item_id    uuid not null references menu_items(id),
  item_name       text not null,                  -- snapshot del nombre
  quantity        int not null check (quantity > 0),
  unit_price      numeric(12,2) not null,         -- snapshot del precio
  modifiers       jsonb not null default '[]'::jsonb,
  modifiers_total numeric(12,2) not null default 0,
  line_total      numeric(12,2) generated always as (quantity * (unit_price + modifiers_total)) stored,
  notes           text,
  status          order_item_status not null default 'pending',
  voided_by_staff uuid references staff_members(id) on delete set null,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);
create index idx_order_items_order on order_items(order_id);
create index idx_order_items_org_status on order_items(organization_id, status);

-- ----------- RLS -----------
alter table dining_areas              enable row level security;
alter table dining_tables             enable row level security;
alter table menu_categories           enable row level security;
alter table menu_items                enable row level security;
alter table modifier_groups           enable row level security;
alter table modifiers                 enable row level security;
alter table menu_item_modifier_groups enable row level security;
alter table orders                    enable row level security;
alter table order_items               enable row level security;

-- Catálogo: equipo lee, dueña escribe, superadmin todo
do $$
declare t text;
begin
  foreach t in array array[
    'dining_areas', 'dining_tables', 'menu_categories', 'menu_items',
    'modifier_groups', 'modifiers', 'menu_item_modifier_groups'
  ] loop
    execute format(
      'create policy %1$s_team_read on %1$I for select
         using (organization_id = current_org_id() and current_user_is_team())', t);
    execute format(
      'create policy %1$s_owner_all on %1$I for all
         using (organization_id = current_org_id() and current_role_is_owner())
         with check (organization_id = current_org_id() and current_role_is_owner())', t);
    execute format(
      'create policy %1$s_superadmin_all on %1$I for all
         using (is_superadmin()) with check (is_superadmin())', t);
  end loop;
end $$;

-- Órdenes: el equipo LEE; toda escritura va por las RPC de abajo
create policy orders_team_read on orders for select
  using (organization_id = current_org_id() and current_user_is_team());
create policy orders_superadmin_all on orders for all
  using (is_superadmin()) with check (is_superadmin());
create policy order_items_team_read on order_items for select
  using (organization_id = current_org_id() and current_user_is_team());
create policy order_items_superadmin_all on order_items for all
  using (is_superadmin()) with check (is_superadmin());

-- ============================================================
-- RPC DE ÓRDENES (llamar desde Server Actions con la cookie de PIN)
-- ============================================================

-- Abrir orden → orders.take
create or replace function open_order(
  p_staff_token text,
  p_table_id    uuid default null,
  p_order_type  order_type default 'dine_in',
  p_guests      int default 1
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

  insert into orders (organization_id, order_number, table_id, order_type, guests, opened_by_staff)
  values (v_org, v_num, p_table_id, p_order_type, greatest(coalesce(p_guests, 1), 1), v_staff.id)
  returning id into v_id;

  if p_table_id is not null then
    update dining_tables set status = 'occupied' where id = p_table_id;
  end if;

  return v_id;
end;
$$;

-- Agregar platillo → orders.take. El precio sale del menú, nunca del cliente.
create or replace function add_order_item(
  p_staff_token  text,
  p_order_id     uuid,
  p_menu_item_id uuid,
  p_quantity     int,
  p_modifier_ids uuid[] default '{}',
  p_notes        text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org        uuid := current_org_id();
  v_status     order_status;
  v_name       text;
  v_price      numeric(12,2);
  v_ids        uuid[];
  v_valid      int;
  v_bad        modifier_groups%rowtype;
  v_mods       jsonb;
  v_mods_total numeric(12,2);
  v_id         uuid;
begin
  perform require_staff(p_staff_token, 'orders.take');
  if p_quantity is null or p_quantity <= 0 then raise exception 'Cantidad inválida'; end if;

  select status into v_status from orders
    where id = p_order_id and organization_id = v_org
    for update;
  if not found then raise exception 'Orden no encontrada'; end if;
  if v_status <> 'open' then raise exception 'La orden ya está cerrada'; end if;

  select name, price into v_name, v_price from menu_items
    where id = p_menu_item_id and organization_id = v_org and active and available;
  if not found then raise exception 'Platillo no disponible'; end if;

  -- Modificadores: deben pertenecer a los grupos del platillo
  v_ids := array(select distinct unnest(coalesce(p_modifier_ids, '{}'::uuid[])));
  select count(*) into v_valid
  from modifiers m
  join menu_item_modifier_groups mg on mg.group_id = m.group_id and mg.menu_item_id = p_menu_item_id
  where m.id = any(v_ids) and m.organization_id = v_org;
  if v_valid <> cardinality(v_ids) then
    raise exception 'Opción no válida para este platillo';
  end if;

  -- Respetar mínimos/máximos de cada grupo (ej. "Término": elegir 1)
  select g.* into v_bad
  from menu_item_modifier_groups mg
  join modifier_groups g on g.id = mg.group_id
  where mg.menu_item_id = p_menu_item_id
    and (select count(*) from modifiers m where m.group_id = g.id and m.id = any(v_ids))
        not between g.min_select and g.max_select
  limit 1;
  if found then
    if v_bad.min_select = v_bad.max_select then
      raise exception 'Elige % opción(es) en "%"', v_bad.min_select, v_bad.name;
    else
      raise exception 'Elige entre % y % opciones en "%"', v_bad.min_select, v_bad.max_select, v_bad.name;
    end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'price_delta', m.price_delta)
                            order by m.sort_order, m.name), '[]'::jsonb),
         coalesce(sum(m.price_delta), 0)
    into v_mods, v_mods_total
  from modifiers m
  where m.id = any(v_ids);

  insert into order_items (organization_id, order_id, menu_item_id, item_name, quantity,
                           unit_price, modifiers, modifiers_total, notes)
  values (v_org, p_order_id, p_menu_item_id, v_name, p_quantity,
          v_price, v_mods, v_mods_total, nullif(trim(p_notes), ''))
  returning id into v_id;

  return v_id;
end;
$$;

-- Enviar ítems pendientes a cocina → orders.send
create or replace function send_order_to_kitchen(p_staff_token text, p_order_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_org   uuid := current_org_id();
  v_count int;
begin
  perform require_staff(p_staff_token, 'orders.send');

  perform 1 from orders
    where id = p_order_id and organization_id = v_org and status = 'open'
    for update;
  if not found then raise exception 'Orden no encontrada o ya cerrada'; end if;

  update order_items
    set status = 'sent', sent_at = now()
  where order_id = p_order_id and status = 'pending';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Cambiar estado de un ítem
--   preparing / ready → kitchen.update
--   served            → orders.take
--   cancelled         → orders.take si está pendiente; orders.void_item si ya se envió
create or replace function set_order_item_status(
  p_staff_token text,
  p_item_id     uuid,
  p_status      order_item_status
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_org          uuid := current_org_id();
  v_current      order_item_status;
  v_order_status order_status;
  v_perm         text;
  v_staff        staff_members;
begin
  select oi.status, o.status into v_current, v_order_status
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
end;
$$;

-- Pedir la cuenta (mesa en naranja) → orders.take
create or replace function request_bill(p_staff_token text, p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_org   uuid := current_org_id();
  v_table uuid;
begin
  perform require_staff(p_staff_token, 'orders.take');

  select table_id into v_table from orders
    where id = p_order_id and organization_id = v_org and status = 'open';
  if not found then raise exception 'Orden no encontrada'; end if;
  if v_table is not null then
    update dining_tables set status = 'bill_requested' where id = v_table;
  end if;
end;
$$;

-- Cobrar y cerrar → payments.collect (+ orders.discount si hay descuento).
-- Crea exactamente UNA fila en sales, numerada por org igual que register_sale.
create or replace function close_order(
  p_staff_token    text,
  p_order_id       uuid,
  p_payment_method payment_method,
  p_discount       numeric default 0,
  p_tip            numeric default 0,
  p_customer_id    uuid default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org      uuid := current_org_id();
  v_staff    staff_members;
  v_order    orders%rowtype;
  v_discount numeric(12,2) := coalesce(p_discount, 0);
  v_tip      numeric(12,2) := coalesce(p_tip, 0);
  v_customer uuid;
  v_subtotal numeric(12,2);
  v_num      int;
  v_sale_id  uuid;
begin
  v_staff := require_staff(p_staff_token, 'payments.collect');
  if v_discount > 0 and not ('orders.discount' = any(v_staff.permissions)) then
    raise exception '% no tiene permiso para aplicar descuentos', v_staff.name
      using hint = 'needs_permission:orders.discount';
  end if;
  if p_payment_method is null then raise exception 'Elige el método de pago'; end if;

  select * into v_order from orders
    where id = p_order_id and organization_id = v_org
    for update;
  if not found then raise exception 'Orden no encontrada'; end if;
  if v_order.status <> 'open' then raise exception 'La orden ya fue cerrada'; end if;

  select coalesce(sum(line_total), 0) into v_subtotal
    from order_items where order_id = p_order_id and status <> 'cancelled';
  if v_subtotal <= 0 then raise exception 'La orden no tiene platillos'; end if;
  if v_discount < 0 or v_discount > v_subtotal then raise exception 'Descuento inválido'; end if;
  if v_tip < 0 then raise exception 'Propina inválida'; end if;

  v_customer := coalesce(p_customer_id, v_order.customer_id);
  if v_customer is not null then
    perform 1 from customers where id = v_customer and organization_id = v_org;
    if not found then raise exception 'Cliente no encontrado'; end if;
  end if;

  -- Mismo lock que register_sale: numeración de ventas única por org
  perform pg_advisory_xact_lock(hashtext(v_org::text));
  select coalesce(max(sale_number), 0) + 1 into v_num from sales where organization_id = v_org;

  insert into sales (organization_id, sale_number, customer_id, payment_method, sold_by,
                     subtotal, discount_total, total, tip_amount, source)
  values (v_org, v_num, v_customer, p_payment_method, auth.uid(),
          v_subtotal, v_discount, v_subtotal - v_discount, v_tip, 'restaurant')
  returning id into v_sale_id;

  update orders
    set status = 'paid', sale_id = v_sale_id, customer_id = v_customer,
        closed_by_staff = v_staff.id, closed_at = now()
  where id = p_order_id;

  if v_order.table_id is not null then
    update dining_tables set status = 'free' where id = v_order.table_id;
  end if;

  return v_sale_id;
end;
$$;

-- Cancelar orden completa (con motivo) → orders.cancel
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

-- Toggle "Agotado" en pleno servicio → menu.availability
create or replace function set_menu_item_available(p_staff_token text, p_menu_item_id uuid, p_available boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform require_staff(p_staff_token, 'menu.availability');
  update menu_items set available = coalesce(p_available, true)
  where id = p_menu_item_id and organization_id = current_org_id();
  if not found then raise exception 'Platillo no encontrado'; end if;
end;
$$;

-- ============================================================
-- PERMISOS DE EJECUCIÓN
-- Por defecto Postgres da EXECUTE a PUBLIC (incluye anon).
-- ============================================================

revoke execute on function require_staff(text, text) from public, anon, authenticated;

revoke execute on function staff_login(text, boolean)                 from public, anon;
revoke execute on function current_staff(text)                        from public, anon;
revoke execute on function staff_logout(text)                         from public, anon;
revoke execute on function set_staff_pin(uuid, text)                  from public, anon;
revoke execute on function staff_members_with_pin()                   from public, anon;
revoke execute on function open_order(text, uuid, order_type, int)    from public, anon;
revoke execute on function add_order_item(text, uuid, uuid, int, uuid[], text) from public, anon;
revoke execute on function send_order_to_kitchen(text, uuid)          from public, anon;
revoke execute on function set_order_item_status(text, uuid, order_item_status) from public, anon;
revoke execute on function request_bill(text, uuid)                   from public, anon;
revoke execute on function close_order(text, uuid, payment_method, numeric, numeric, uuid) from public, anon;
revoke execute on function cancel_order(text, uuid, text)             from public, anon;
revoke execute on function set_menu_item_available(text, uuid, boolean) from public, anon;

grant execute on function staff_login(text, boolean)                 to authenticated;
grant execute on function current_staff(text)                        to authenticated;
grant execute on function staff_logout(text)                         to authenticated;
grant execute on function set_staff_pin(uuid, text)                  to authenticated;
grant execute on function staff_members_with_pin()                   to authenticated;
grant execute on function open_order(text, uuid, order_type, int)    to authenticated;
grant execute on function add_order_item(text, uuid, uuid, int, uuid[], text) to authenticated;
grant execute on function send_order_to_kitchen(text, uuid)          to authenticated;
grant execute on function set_order_item_status(text, uuid, order_item_status) to authenticated;
grant execute on function request_bill(text, uuid)                   to authenticated;
grant execute on function close_order(text, uuid, payment_method, numeric, numeric, uuid) to authenticated;
grant execute on function cancel_order(text, uuid, text)             to authenticated;
grant execute on function set_menu_item_available(text, uuid, boolean) to authenticated;

-- ----------- Realtime para cocina y salón -----------
alter publication supabase_realtime add table orders, order_items, dining_tables;

commit;

-- ============================================================
-- POST-MIGRACIÓN:
-- 1. Tipos: se agregan a mano en types/database.ts (NO sobrescribir con gen types).
-- 2. Activar el vertical en la org: organizations.vertical = 'restaurante' y
--    enabled_modules = '{restaurant,kitchen,customers,cash}' (admin > negocio).
-- 3. Crear la cuenta del local (rol 'terminal') desde admin > negocio > usuarios.
-- 4. La dueña crea su equipo y PINs en /equipo.
-- ============================================================
