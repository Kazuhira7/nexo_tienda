-- ============================================================
-- migration_003_brand_payments.sql
-- Fase A2 — Estado de cuenta por marca (mini-CRM).
-- Asume migration_001 (multi-tenant) y migration_002 aplicadas:
-- existen organizations, brands, settlements, helpers RLS y enum payment_method.
-- Aplicada vía Supabase MCP (apply_migration). Esta copia es para el repo.
-- ============================================================

-- Tipos de movimiento entre tienda y marca:
--   payout       = la dueña le paga a la marca lo vendido
--   fee_charge   = se carga una cuota a la marca
--   fee_payment  = la marca paga su cuota
create type brand_payment_type as enum ('payout', 'fee_charge', 'fee_payment');

create table brand_payments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  brand_id        uuid not null references brands(id) on delete cascade,
  settlement_id   uuid references settlements(id) on delete set null,
  amount          numeric(12,2) not null,
  type            brand_payment_type not null,
  method          payment_method,            -- solo aplica a payout / fee_payment
  occurred_on     date not null default current_date,
  notes           text,
  created_at      timestamptz not null default now()
);

create index idx_brand_payments_org   on brand_payments(organization_id);
create index idx_brand_payments_brand on brand_payments(brand_id, occurred_on desc);

alter table brand_payments enable row level security;

create policy brand_payments_owner on brand_payments for all
  using (current_role_is_owner() and organization_id = current_org_id())
  with check (current_role_is_owner() and organization_id = current_org_id());

-- Lectura para el portal de marca (Fase A3):
create policy brand_payments_brand_read on brand_payments for select
  using (brand_id = current_brand_id() and organization_id = current_org_id());

create policy brand_payments_superadmin on brand_payments for all
  using (is_superadmin()) with check (is_superadmin());
