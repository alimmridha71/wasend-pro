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
