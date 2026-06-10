-- ============================================================
-- migration_002_cash_closures.sql
-- Fase A1 — Cierre de caja diario.
-- Asume que migration_001 (multi-tenant) YA está aplicada:
-- existen organizations, organization_id en todas las tablas y los
-- helpers current_org_id(), current_role_is_owner(), is_superadmin().
-- Correr en Supabase > SQL Editor.
-- ============================================================

begin;

-- ----------- Tabla: cash_closures -----------
create table if not exists cash_closures (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  closure_date      date not null,
  expected_cash     numeric(12,2) not null default 0,
  counted_cash      numeric(12,2) not null default 0,
  expected_pos      numeric(12,2) not null default 0,
  expected_transfer numeric(12,2) not null default 0,
  expected_mixed    numeric(12,2) not null default 0, -- informativo (ventas mixtas), no entra en difference
  difference        numeric(12,2) not null default 0, -- counted_cash - expected_cash
  notes             text,
  closed_by         uuid references profiles(id),
  created_at        timestamptz not null default now(),
  unique (organization_id, closure_date)
);

create index if not exists idx_cash_closures_org
  on cash_closures(organization_id, closure_date desc);

-- ----------- RLS -----------
alter table cash_closures enable row level security;

drop policy if exists cash_closures_owner      on cash_closures;
drop policy if exists cash_closures_superadmin on cash_closures;

create policy cash_closures_owner on cash_closures for all
  using (current_role_is_owner() and organization_id = current_org_id())
  with check (current_role_is_owner() and organization_id = current_org_id());

create policy cash_closures_superadmin on cash_closures for all
  using (is_superadmin()) with check (is_superadmin());

commit;

-- ============================================================
-- POST-MIGRACIÓN:
-- Los tipos de cash_closures ya se agregaron a mano en types/database.ts.
-- Probar: login dueña > /caja > registrar ventas del día > guardar cierre.
-- ============================================================
