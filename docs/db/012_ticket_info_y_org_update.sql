-- ============================================================
-- 012_ticket_info_y_org_update.sql
-- 1) Datos del negocio para el ticket (pre-cuenta / recibo / comanda).
-- 2) SEGURIDAD: la policy orgs_owner_update solo exigía misma org, así
--    que cualquier usuario de la org (marca del colectivo, cuenta del
--    local) podía actualizar su organización vía la API — incluso
--    vertical o enabled_modules. Ahora: solo la dueña, y solo las
--    columnas de configuración. Módulos/vertical/slug/active los cambia
--    únicamente el superadmin (service role desde /admin).
-- ============================================================

begin;

alter table organizations
  add column if not exists ticket_address text check (ticket_address is null or length(ticket_address) <= 120),
  add column if not exists ticket_phone   text check (ticket_phone   is null or length(ticket_phone)   <= 40),
  add column if not exists ticket_tax_id  text check (ticket_tax_id  is null or length(ticket_tax_id)  <= 30),
  add column if not exists ticket_footer  text check (ticket_footer  is null or length(ticket_footer)  <= 120);

drop policy if exists orgs_owner_update on organizations;
create policy orgs_owner_update on organizations for update
  using (id = current_org_id() and current_role_is_owner())
  with check (id = current_org_id() and current_role_is_owner());

revoke update on organizations from anon, authenticated;
grant update (
  name, currency, exchange_rate, settlement_model, settlement_period, timezone,
  ticket_address, ticket_phone, ticket_tax_id, ticket_footer
) on organizations to authenticated;

commit;
