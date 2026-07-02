-- ============================================================
-- 004_platform_modules.sql
-- Fase B (plataforma) — verticales y módulos activables por org.
-- ⚠️ PENDIENTE DE APLICAR: el proyecto Supabase estaba pausado al
-- momento de escribir esto. Aplicar en el SQL Editor (o vía MCP)
-- ANTES de desplegar el código que lee estas columnas.
-- Aditiva y no destructiva: la org existente queda como 'colectivo'
-- con todos sus módulos actuales activos.
-- ============================================================

create type vertical_type as enum ('colectivo', 'retail', 'restaurante');

alter table organizations
  add column vertical vertical_type not null default 'colectivo',
  add column enabled_modules text[] not null default '{pos,inventory,customers,cash,brands,settlements}';
