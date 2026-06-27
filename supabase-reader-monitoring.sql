-- Incremental reader monitoring + fingerprint enrollment schema for FITFYT.
-- Run this in Supabase SQL Editor after the existing FITFYT tables are created.

alter table if exists public.biometric_devices
  add column if not exists username text,
  add column if not exists password text,
  add column if not exists last_communication_at timestamptz,
  add column if not exists last_status_update_at timestamptz,
  add column if not exists last_error text,
  add column if not exists polling_interval_seconds integer not null default 30,
  add column if not exists fingerprint_path text;

create table if not exists public.reader_connection_events (
  id text primary key,
  reader_id text not null,
  reader_name text not null,
  reader_ip text not null,
  event_type text not null check (event_type in ('Connected', 'Disconnected', 'Error')),
  at timestamptz not null default now(),
  error_message text,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_reader_connection_events_reader_at
  on public.reader_connection_events (reader_id, at desc);

create index if not exists idx_reader_connection_events_event_type
  on public.reader_connection_events (event_type);

create table if not exists public.fingerprint_enrollment_logs (
  id text primary key,
  user_id text not null,
  reader_id text not null,
  reader_ip text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  status text not null check (status in ('Started', 'Success', 'Failed', 'Cancelled')),
  error_details text,
  created_at timestamptz not null default now()
);

create index if not exists idx_fingerprint_enrollment_logs_user_started
  on public.fingerprint_enrollment_logs (user_id, started_at desc);

alter table public.reader_connection_events enable row level security;
alter table public.fingerprint_enrollment_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reader_connection_events' and policyname = 'reader_connection_events_anon_select'
  ) then
    create policy reader_connection_events_anon_select on public.reader_connection_events for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reader_connection_events' and policyname = 'reader_connection_events_anon_insert'
  ) then
    create policy reader_connection_events_anon_insert on public.reader_connection_events for insert to anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reader_connection_events' and policyname = 'reader_connection_events_anon_update'
  ) then
    create policy reader_connection_events_anon_update on public.reader_connection_events for update to anon using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fingerprint_enrollment_logs' and policyname = 'fingerprint_enrollment_logs_anon_select'
  ) then
    create policy fingerprint_enrollment_logs_anon_select on public.fingerprint_enrollment_logs for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fingerprint_enrollment_logs' and policyname = 'fingerprint_enrollment_logs_anon_insert'
  ) then
    create policy fingerprint_enrollment_logs_anon_insert on public.fingerprint_enrollment_logs for insert to anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fingerprint_enrollment_logs' and policyname = 'fingerprint_enrollment_logs_anon_update'
  ) then
    create policy fingerprint_enrollment_logs_anon_update on public.fingerprint_enrollment_logs for update to anon using (true) with check (true);
  end if;
end $$;
