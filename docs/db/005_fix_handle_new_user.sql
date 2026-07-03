-- ============================================================
-- 005_fix_handle_new_user.sql (APLICADA)
-- Bug encontrado en la validación RLS de la Fase A3:
-- handle_new_user insertaba profiles con organization_id NULL y el
-- check multi-tenant profiles_org_required lo rechazaba, bloqueando
-- TODA creación de usuarios nuevos (incluido "+ Usuario" en la app).
-- El trigger queda como respaldo tolerante: si no puede crear el
-- perfil, no aborta; la app siempre crea el perfil con su org.
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  begin
    insert into public.profiles (id, role, full_name)
    values (new.id, 'brand', coalesce(new.raw_user_meta_data->>'full_name', new.email))
    on conflict (id) do nothing;
  exception when others then
    -- profile will be created by the app with its organization_id
    null;
  end;
  return new;
end;
$$;
