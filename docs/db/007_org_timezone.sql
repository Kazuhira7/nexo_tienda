-- ============================================================
-- 007_org_timezone.sql
-- Zona horaria por organización. El servidor (Vercel) corre en UTC:
-- sin esto, "hoy" en /caja y /dashboard se calculaba en UTC y en
-- Nicaragua (UTC−6) las ventas después de las 6 pm caían al día
-- siguiente. Aditiva: todas las orgs quedan en America/Managua.
-- ============================================================

alter table organizations
  add column if not exists timezone text not null default 'America/Managua'
  check (timezone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+)*$');
