-- FITFYT Authentication support
-- Run this once in Supabase SQL Editor after creating Auth users.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  name text not null,
  role text not null default 'staff' check (role in ('super', 'owner', 'staff', 'member')),
  branch_id text,
  permissions text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
  on public.user_profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Admins can read profiles" on public.user_profiles;
create policy "Admins can read profiles"
  on public.user_profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in ('super', 'owner')
      and p.active = true
    )
  );

drop policy if exists "Admins can manage profiles" on public.user_profiles;
create policy "Admins can manage profiles"
  on public.user_profiles for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in ('super', 'owner')
      and p.active = true
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in ('super', 'owner')
      and p.active = true
    )
  );

drop policy if exists "Authenticated users can insert audit logs" on public.audit_logs;
create policy "Authenticated users can insert audit logs"
  on public.audit_logs for insert
  to authenticated
  with check (user_id = auth.uid() or user_id is null);

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs"
  on public.audit_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in ('super', 'owner')
      and p.active = true
    )
  );

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_profiles_updated_at on public.user_profiles;
create trigger touch_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.touch_updated_at();
