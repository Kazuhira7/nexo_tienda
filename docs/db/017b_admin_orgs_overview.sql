-- 017b_admin_orgs_overview.sql — resumen de negocios para el panel de superadmin.
-- (Aplicada en Supabase el 11 oct 2026; recuperada de supabase_migrations para el repo.)

create or replace function admin_orgs_overview()
returns table (
  id              uuid,
  name            text,
  slug            text,
  vertical        text,
  created_at      timestamptz,
  active          boolean,
  billing_exempt  boolean,
  trial_ends_at   timestamptz,
  paid_until      date,
  monthly_fee     numeric,
  currency        text,
  owner_phone     text,
  owner_name      text,
  owner_email     text,
  users           int,
  status          text,
  days_left       int,
  is_open         boolean,
  last_activity   timestamptz,
  sales_month     numeric,
  sales_count     int,
  menu_items      int,
  dining_tables   int,
  staff_with_pin  int,
  products        int,
  paid_total      numeric
)
language plpgsql stable security definer set search_path = public as $$
declare
  s platform_settings;
begin
  perform require_superadmin();
  -- calificado: "id" también es una columna de salida de esta función
  select * into s from platform_settings ps where ps.id = 1;

  return query
  select
    o.id, o.name, o.slug, o.vertical::text, o.created_at, o.active, o.billing_exempt,
    o.trial_ends_at, o.paid_until,
    coalesce(o.monthly_fee, case o.vertical
      when 'restaurante' then s.fee_restaurante
      when 'retail'      then s.fee_retail
      else s.fee_colectivo end),
    o.currency::text,
    o.owner_phone,
    own.full_name,
    own.email::text,
    (select count(*)::int from profiles p where p.organization_id = o.id),
    b.status, b.days_left, b.is_open,
    greatest(
      (select max(sa.created_at) from sales sa where sa.organization_id = o.id),
      (select max(od.opened_at)  from orders od where od.organization_id = o.id)
    ),
    coalesce((select sum(sa.total) from sales sa
              where sa.organization_id = o.id and not sa.cancelled
                and sa.created_at >= date_trunc('month', now() at time zone coalesce(o.timezone, 'America/Managua'))
                                     at time zone coalesce(o.timezone, 'America/Managua')), 0),
    (select count(*)::int from sales sa where sa.organization_id = o.id and not sa.cancelled),
    (select count(*)::int from menu_items mi where mi.organization_id = o.id and mi.active),
    (select count(*)::int from dining_tables dt where dt.organization_id = o.id and dt.active),
    (select count(*)::int from staff_pins sp
       join staff_members sm on sm.id = sp.staff_member_id
     where sp.organization_id = o.id and sm.active),
    (select count(*)::int from products pr where pr.organization_id = o.id and pr.active),
    coalesce((select sum(sp2.amount) from subscription_payments sp2 where sp2.organization_id = o.id), 0)
  from organizations o
  cross join lateral billing_status(o) b
  left join lateral (
    select p.full_name, u.email
    from profiles p join auth.users u on u.id = p.id
    where p.organization_id = o.id and p.role = 'owner'
    order by u.created_at limit 1
  ) own on true
  order by o.created_at desc;
end;
$$;

revoke execute on function admin_orgs_overview() from public, anon;
grant  execute on function admin_orgs_overview() to authenticated;
