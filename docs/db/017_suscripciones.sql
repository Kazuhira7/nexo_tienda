-- 017_suscripciones.sql — prueba gratis, mensualidades y bloqueo por falta de pago
-- (Aplicada en Supabase el 11 oct 2026; recuperada de supabase_migrations para el repo.
--  admin_orgs_overview se corrige en 017b.)

create table if not exists platform_settings (
  id             int primary key default 1 check (id = 1),
  trial_days     int  not null default 7  check (trial_days between 0 and 90),
  grace_days     int  not null default 3  check (grace_days between 0 and 30),
  warn_days      int  not null default 5  check (warn_days between 0 and 30),
  fee_restaurante numeric(10,2) not null default 1500 check (fee_restaurante >= 0),
  fee_retail      numeric(10,2) check (fee_retail >= 0),
  fee_colectivo   numeric(10,2) check (fee_colectivo >= 0),
  sales_whatsapp text,
  support_hours  text not null default 'Lunes a sábado',
  updated_at     timestamptz not null default now()
);
insert into platform_settings (id) values (1) on conflict (id) do nothing;

alter table platform_settings enable row level security;
drop policy if exists platform_settings_superadmin on platform_settings;
create policy platform_settings_superadmin on platform_settings
  for all using (is_superadmin()) with check (is_superadmin());

alter table organizations
  add column if not exists trial_ends_at  timestamptz,
  add column if not exists paid_until     date,
  add column if not exists billing_exempt boolean not null default false,
  add column if not exists monthly_fee    numeric(10,2) check (monthly_fee >= 0),
  add column if not exists owner_phone    text;

update organizations set billing_exempt = true
where slug in ('demo', 'colectivo-demo-nexo', 'restaurante-demo');

update organizations
set trial_ends_at = created_at + make_interval(days => (select trial_days from platform_settings where id = 1))
where not billing_exempt and trial_ends_at is null and paid_until is null;

create or replace function set_trial_on_new_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.trial_ends_at is null and new.paid_until is null and not new.billing_exempt then
    new.trial_ends_at := now() + make_interval(days => (select trial_days from platform_settings where id = 1));
  end if;
  return new;
end;
$$;
drop trigger if exists organizations_set_trial on organizations;
create trigger organizations_set_trial before insert on organizations
  for each row execute function set_trial_on_new_org();

create or replace function billing_status(o organizations)
returns table (status text, days_left int, is_open boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  s       platform_settings;
  v_today date := (now() at time zone coalesce(o.timezone, 'America/Managua'))::date;
begin
  select * into s from platform_settings where id = 1;

  if not o.active then
    status := 'suspendido'; is_open := false;
  elsif o.billing_exempt then
    status := 'exento'; is_open := true;
  elsif o.paid_until is not null and v_today <= o.paid_until then
    days_left := o.paid_until - v_today;
    status := case when days_left <= s.warn_days then 'por_vencer' else 'al_dia' end;
    is_open := true;
  elsif o.trial_ends_at is not null and now() < o.trial_ends_at then
    days_left := ceil(extract(epoch from (o.trial_ends_at - now())) / 86400)::int;
    status := 'prueba'; is_open := true;
  elsif o.paid_until is not null and v_today <= o.paid_until + s.grace_days then
    days_left := o.paid_until + s.grace_days - v_today;
    status := 'gracia'; is_open := true;
  else
    status := 'vencido'; is_open := false;
  end if;
  return next;
end;
$$;

-- Bloqueo: un negocio vencido o suspendido deja de "tener" organización para RLS.
create or replace function current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select o.id
  from profiles p
  join organizations o on o.id = p.organization_id
  where p.id = auth.uid()
    and (select b.is_open from billing_status(o) b);
$$;

create table if not exists subscription_payments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  amount          numeric(10,2) not null check (amount >= 0),
  currency        text not null default 'NIO',
  method          text not null default 'transferencia'
                  check (method in ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  months          int  not null default 1 check (months between 1 and 24),
  paid_at         date not null default current_date,
  period_start    date not null,
  period_end      date not null,
  notes           text,
  recorded_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  check (period_end >= period_start)
);
create index if not exists subscription_payments_org_idx on subscription_payments (organization_id, period_end desc);

alter table subscription_payments enable row level security;
drop policy if exists subscription_payments_superadmin on subscription_payments;
create policy subscription_payments_superadmin on subscription_payments
  for all using (is_superadmin()) with check (is_superadmin());
drop policy if exists subscription_payments_owner_read on subscription_payments;
create policy subscription_payments_owner_read on subscription_payments
  for select using (organization_id = current_org_id() and current_role_is_owner());

-- Estado de acceso del negocio del usuario (funciona aunque esté bloqueado).
create or replace function my_org_access()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  o   organizations;
  b   record;
  s   platform_settings;
  lp  subscription_payments;
begin
  select org.* into o
  from profiles p join organizations org on org.id = p.organization_id
  where p.id = auth.uid();
  if not found then return null; end if;

  select * into b from billing_status(o);
  select * into s from platform_settings where id = 1;
  select * into lp from subscription_payments
  where organization_id = o.id order by period_end desc, created_at desc limit 1;

  return jsonb_build_object(
    'org_id',        o.id,
    'org_name',      o.name,
    'vertical',      o.vertical,
    'status',        b.status,
    'days_left',     b.days_left,
    'is_open',       b.is_open,
    'trial_ends_at', o.trial_ends_at,
    'paid_until',    o.paid_until,
    'grace_days',    s.grace_days,
    'monthly_fee',   coalesce(o.monthly_fee, case o.vertical
                       when 'restaurante' then s.fee_restaurante
                       when 'retail'      then s.fee_retail
                       else s.fee_colectivo end),
    'currency',      o.currency,
    'sales_whatsapp', s.sales_whatsapp,
    'support_hours', s.support_hours,
    'last_payment',  case when lp.id is null then null else jsonb_build_object(
                       'amount', lp.amount, 'paid_at', lp.paid_at,
                       'period_start', lp.period_start, 'period_end', lp.period_end) end
  );
end;
$$;

create table if not exists admin_audit_log (
  id              bigint generated always as identity primary key,
  actor_id        uuid references auth.users(id) on delete set null,
  actor_email     text,
  action          text not null,
  organization_id uuid references organizations(id) on delete set null,
  details         jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on admin_audit_log (created_at desc);
create index if not exists admin_audit_log_org_idx on admin_audit_log (organization_id, created_at desc);
alter table admin_audit_log enable row level security;
drop policy if exists admin_audit_log_superadmin_read on admin_audit_log;
create policy admin_audit_log_superadmin_read on admin_audit_log
  for select using (is_superadmin());

create table if not exists admin_notes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  author_id       uuid references auth.users(id) on delete set null,
  body            text not null check (length(trim(body)) between 1 and 2000),
  created_at      timestamptz not null default now()
);
create index if not exists admin_notes_org_idx on admin_notes (organization_id, created_at desc);
alter table admin_notes enable row level security;
drop policy if exists admin_notes_superadmin on admin_notes;
create policy admin_notes_superadmin on admin_notes
  for all using (is_superadmin()) with check (is_superadmin());

create table if not exists signup_attempts (
  id         bigint generated always as identity primary key,
  ip         text not null,
  email      text,
  blocked    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists signup_attempts_ip_idx on signup_attempts (ip, created_at desc);
alter table signup_attempts enable row level security;
drop policy if exists signup_attempts_superadmin_read on signup_attempts;
create policy signup_attempts_superadmin_read on signup_attempts
  for select using (is_superadmin());

create or replace function require_superadmin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not is_superadmin() then
    raise exception 'Solo el superadmin puede hacer esto' using hint = 'forbidden';
  end if;
end;
$$;

create or replace function admin_log(p_action text, p_org uuid default null, p_details jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  perform require_superadmin();
  insert into admin_audit_log (actor_id, actor_email, action, organization_id, details)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), p_action, p_org, coalesce(p_details, '{}'));
end;
$$;

create or replace function admin_record_payment(
  p_org     uuid,
  p_amount  numeric,
  p_months  int default 1,
  p_method  text default 'transferencia',
  p_paid_at date default null,
  p_start   date default null,
  p_notes   text default null
)
returns subscription_payments language plpgsql security definer set search_path = public as $$
declare
  o       organizations;
  v_today date;
  v_start date;
  v_end   date;
  v_pay   subscription_payments;
begin
  perform require_superadmin();
  select * into o from organizations where id = p_org for update;
  if not found then raise exception 'Negocio no encontrado'; end if;
  if p_months is null or p_months < 1 or p_months > 24 then raise exception 'Meses inválidos'; end if;

  v_today := (now() at time zone coalesce(o.timezone, 'America/Managua'))::date;
  v_start := coalesce(p_start, greatest(
    v_today,
    o.paid_until + 1,
    (o.trial_ends_at at time zone coalesce(o.timezone, 'America/Managua'))::date + 1
  ));
  v_end := (v_start + make_interval(months => p_months))::date - 1;

  insert into subscription_payments
    (organization_id, amount, currency, method, months, paid_at, period_start, period_end, notes, recorded_by)
  values
    (p_org, round(p_amount, 2), o.currency::text, coalesce(p_method, 'transferencia'), p_months,
     coalesce(p_paid_at, v_today), v_start, v_end, nullif(trim(p_notes), ''), auth.uid())
  returning * into v_pay;

  update organizations set paid_until = greatest(coalesce(paid_until, v_end), v_end) where id = p_org;

  perform admin_log('pago_registrado', p_org, jsonb_build_object(
    'monto', v_pay.amount, 'meses', p_months, 'metodo', v_pay.method,
    'desde', v_start, 'hasta', v_end));
  return v_pay;
end;
$$;

create or replace function admin_delete_payment(p_payment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_pay subscription_payments;
begin
  perform require_superadmin();
  delete from subscription_payments where id = p_payment_id returning * into v_pay;
  if not found then raise exception 'Pago no encontrado'; end if;

  update organizations
  set paid_until = (select max(period_end) from subscription_payments where organization_id = v_pay.organization_id)
  where id = v_pay.organization_id;

  perform admin_log('pago_anulado', v_pay.organization_id, jsonb_build_object(
    'monto', v_pay.amount, 'desde', v_pay.period_start, 'hasta', v_pay.period_end));
end;
$$;

create or replace function admin_update_billing(p_org uuid, p_patch jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  o    organizations;
  k    text;
begin
  perform require_superadmin();
  select * into o from organizations where id = p_org for update;
  if not found then raise exception 'Negocio no encontrado'; end if;

  for k in select jsonb_object_keys(p_patch) loop
    if k not in ('active', 'billing_exempt', 'monthly_fee', 'owner_phone', 'trial_ends_at') then
      raise exception 'Campo no permitido: %', k;
    end if;
  end loop;

  update organizations set
    active         = case when p_patch ? 'active'         then (p_patch->>'active')::boolean         else active end,
    billing_exempt = case when p_patch ? 'billing_exempt' then (p_patch->>'billing_exempt')::boolean else billing_exempt end,
    monthly_fee    = case when p_patch ? 'monthly_fee'    then (p_patch->>'monthly_fee')::numeric    else monthly_fee end,
    owner_phone    = case when p_patch ? 'owner_phone'    then nullif(trim(p_patch->>'owner_phone'), '') else owner_phone end,
    trial_ends_at  = case when p_patch ? 'trial_ends_at'  then (p_patch->>'trial_ends_at')::timestamptz else trial_ends_at end
  where id = p_org;

  perform admin_log('cobro_actualizado', p_org, p_patch);
end;
$$;

-- admin_orgs_overview(): ver 017b (versión vigente).

revoke execute on function current_org_id()        from public, anon;
revoke execute on function is_superadmin()         from public, anon;
revoke execute on function current_role_is_owner() from public, anon;
revoke execute on function current_brand_id()      from public, anon;
revoke execute on function current_user_is_team()  from public, anon;
grant  execute on function current_org_id(), is_superadmin(), current_role_is_owner(),
                           current_brand_id(), current_user_is_team() to authenticated;

revoke execute on function billing_status(organizations)  from public, anon, authenticated;
revoke execute on function set_trial_on_new_org()          from public, anon, authenticated;
revoke execute on function require_superadmin()            from public, anon;
revoke execute on function my_org_access()                 from public, anon;
revoke execute on function admin_log(text, uuid, jsonb)    from public, anon;
revoke execute on function admin_record_payment(uuid, numeric, int, text, date, date, text) from public, anon;
revoke execute on function admin_delete_payment(uuid)      from public, anon;
revoke execute on function admin_update_billing(uuid, jsonb) from public, anon;

grant execute on function require_superadmin(), my_org_access(), admin_log(text, uuid, jsonb),
  admin_record_payment(uuid, numeric, int, text, date, date, text), admin_delete_payment(uuid),
  admin_update_billing(uuid, jsonb) to authenticated;
