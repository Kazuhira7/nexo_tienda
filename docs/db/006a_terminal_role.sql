-- ============================================================
-- 006a_terminal_role.sql
-- Rol de auth 'terminal' = "cuenta del local": se abre una vez por
-- dispositivo del negocio; cada empleado opera encima con su PIN
-- (ver 006_restaurante.sql → staff_members / staff_login).
--
-- Correr SOLA y ANTES de 006: Postgres no permite usar un valor
-- nuevo de enum en la misma transacción en que se crea.
-- ============================================================

alter type user_role add value if not exists 'terminal';
