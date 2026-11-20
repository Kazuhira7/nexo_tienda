-- ============================================================
-- 015_cash_openings.sql — apertura de caja (Core)
-- Fondo inicial del día. Al cerrar, el efectivo esperado en el cajón es
-- fondo inicial + ventas en efectivo del día.
-- - La dueña abre/corrige desde /caja (RLS).
-- - En restaurante, quien tenga permiso de cobrar puede abrir con su PIN
--   desde el salón (open_cash). El día es el día LOCAL del negocio.
-- Aditiva: sin apertura, el fondo cuenta como 0 (comportamiento anterior).
-- ============================================================

begin;

create table cash_openings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  opening_date    date not null,
  opening_cash    numeric(12,2) not null check (opening_cash >= 0),
  notes           text check (notes is null or length(notes) <= 200),
  opened_by       uuid references profiles(id) on delete set null,       -- cuenta que la registró
  opened_by_staff uuid references staff_members(id) on delete set null,  -- persona (PIN), si aplica
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, opening_date)
);

alter table cash_openings enable row level security;
create policy cash_openings_owner_all on cash_openings for all
  using (current_role_is_owner() and organization_id = current_org_id())
  with check (current_role_is_owner() and organization_id = current_org_id());
create policy cash_openings_team_read on cash_openings for select
  using (organization_id = current_org_id() and current_user_is_team());
create policy cash_openings_superadmin_all on cash_openings for all
  using (is_superadmin()) with check (is_superadmin());

-- El cierre guarda el fondo con el que se cuadró
alter table cash_closures add column if not exists opening_cash numeric(12,2) not null default 0;

-- Abrir caja desde el salón (restaurante) → payments.collect
create or replace function open_cash(p_staff_token text, p_amount numeric, p_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_org   uuid := current_org_id();
  v_staff staff_members;
  v_today date;
begin
  v_staff := require_staff(p_staff_token, 'payments.collect');
  if p_amount is null or p_amount < 0 or p_amount > 10000000 then raise exception 'Monto inválido'; end if;

  select (now() at time zone timezone)::date into v_today from organizations where id = v_org;

  if exists (select 1 from cash_openings where organization_id = v_org and opening_date = v_today) then
    raise exception 'La caja ya se abrió hoy';
  end if;

  insert into cash_openings (organization_id, opening_date, opening_cash, notes, opened_by, opened_by_staff)
  values (v_org, v_today, round(p_amount, 2), nullif(trim(p_notes), ''), auth.uid(), v_staff.id);
end;
$$;

revoke execute on function open_cash(text, numeric, text) from public, anon;
grant  execute on function open_cash(text, numeric, text) to authenticated;

commit;
