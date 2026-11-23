-- 018_superadmin_mfa.sql — el superadmin solo cuenta como tal con verificación en dos pasos (aal2).
-- (Aplicada en Supabase el 11 oct 2026; recuperada de supabase_migrations para el repo.)

create or replace function is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'superadmin')
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

revoke execute on function is_superadmin() from public, anon;
grant  execute on function is_superadmin() to authenticated;
