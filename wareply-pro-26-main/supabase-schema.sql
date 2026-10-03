-- Wasend-Pro — Supabase schema (safe to re-run: uses IF NOT EXISTS)
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- Only needed if your tables don't exist yet.

create extension if not exists pgcrypto;

create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  role          text not null default 'admin',
  created_at    timestamptz not null default now()
);

create table if not exists license_keys (
  id              uuid primary key default gen_random_uuid(),
  key             text unique not null,
  plan            text not null,
  duration_days   integer not null,
  status          text not null default 'active',
  note            text default '',
  bound_phone     text,
  bound_name      text,
  bound_biz       text,
  bound_devices   jsonb not null default '[]'::jsonb,
  max_devices     integer not null default 1,
  activation_date timestamptz,
  expiry_date     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists payment_submissions (
  id            uuid primary key default gen_random_uuid(),
  customer_name text not null,
  business_name text,
  phone         text not null,
  plan          text not null,
  method        text not null,
  txn_id        text unique not null,
  amount        numeric,
  status        text not null default 'pending',
  license_key   text,
  admin_note    text,
  submitted_at  timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   text
);

create table if not exists settings (
  id               integer primary key default 1,
  price_monthly    numeric default 299,
  price_yearly     numeric default 2499,
  price_lifetime   numeric default 4999,
  reg_monthly      numeric default 499,
  reg_yearly       numeric default 3999,
  reg_lifetime     numeric default 7999,
  bkash_number     text default '',
  nagad_number     text default '',
  rocket_number    text default '',
  bank_info        text default '',
  bkash_on         boolean default true,
  nagad_on         boolean default true,
  rocket_on        boolean default true,
  bank_on          boolean default false,
  support_wa       text default '',
  tutorial_yt      text default '',
  support_channel  text default '',
  website_link     text default '',
  update_version   text default '',
  update_link      text default '',
  updated_at       timestamptz default now(),
  constraint settings_single_row check (id = 1)
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- Security: the app talks to the DB only through the service_role key on the server.
-- Enabling RLS with no policies blocks anon-key access to these tables.
alter table admin_users         enable row level security;
alter table license_keys        enable row level security;
alter table payment_submissions enable row level security;
alter table settings            enable row level security;

-- Atomic license activation. Run this section after the tables exist.
create or replace function public.activate_license_atomic(
  p_key text,
  p_phone text,
  p_device_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l license_keys%rowtype;
  devices jsonb;
  device_count integer;
  expiry timestamptz;
  activation timestamptz;
begin
  select * into l from license_keys where key = upper(trim(p_key)) for update;
  if not found then return jsonb_build_object('valid', false, 'reason', 'License key not found'); end if;
  if l.status in ('suspended','inactive','expired') then return jsonb_build_object('valid', false, 'reason', l.status); end if;
  if l.bound_phone is not null and p_phone is not null and l.bound_phone <> p_phone then
    return jsonb_build_object('valid', false, 'reason', 'License is bound to a different WhatsApp number');
  end if;

  devices := case when jsonb_typeof(l.bound_devices) = 'array' then l.bound_devices else '[]'::jsonb end;
  device_count := jsonb_array_length(devices);
  if not (devices ? p_device_id) and device_count >= greatest(coalesce(l.max_devices,1),1) then
    return jsonb_build_object('valid', false, 'reason', format('License already in use on another device. Only %s device(s) allowed.', greatest(coalesce(l.max_devices,1),1)));
  end if;

  if l.expiry_date is not null and l.plan <> 'lifetime' and l.expiry_date < now() then
    update license_keys set status='expired', updated_at=now() where id=l.id;
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;

  activation := coalesce(l.activation_date, now());
  expiry := case
    when l.plan = 'lifetime' or l.duration_days >= 3000 then '2099-12-31 23:59:59+00'::timestamptz
    when l.activation_date is null then activation + (l.duration_days * interval '1 day')
    else l.expiry_date
  end;

  if not (devices ? p_device_id) then devices := devices || jsonb_build_array(p_device_id); end if;

  update license_keys set
    bound_phone = coalesce(l.bound_phone, nullif(p_phone,'')),
    bound_devices = devices,
    activation_date = activation,
    expiry_date = expiry,
    status = 'active',
    updated_at = now()
  where id=l.id;

  return jsonb_build_object(
    'valid', true,
    'plan', l.plan,
    'status', 'active',
    'expiry_date', expiry,
    'activation_date', activation,
    'duration_days', l.duration_days,
    'bound_phone', coalesce(l.bound_phone, nullif(p_phone,'')),
    'bound_devices', devices
  );
end;
$$;
revoke all on function public.activate_license_atomic(text,text,text) from public;
grant execute on function public.activate_license_atomic(text,text,text) to service_role;
