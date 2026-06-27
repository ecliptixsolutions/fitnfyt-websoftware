-- FITFYT website lead integration
-- Run this once in Supabase SQL Editor.

create table if not exists public.leads (
  id text primary key default ('lead_' || replace(gen_random_uuid()::text, '-', '')),
  name text not null,
  phone text not null,
  source text not null default 'Website',
  status text not null default 'New',
  enquiry text not null default 'Website Enquiry',
  follow_up timestamptz not null default now(),
  notes text,
  assigned_staff_id text,
  activities jsonb not null default '[]'::jsonb,
  branch_id text,
  page_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_source_idx on public.leads(source);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_follow_up_idx on public.leads(follow_up);
create index if not exists leads_phone_idx on public.leads(phone);

alter table public.leads enable row level security;

drop policy if exists "Authenticated users can read leads" on public.leads;
create policy "Authenticated users can read leads"
  on public.leads for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage leads" on public.leads;
create policy "Authenticated users can manage leads"
  on public.leads for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.submit_website_lead(
  p_name text,
  p_phone text,
  p_enquiry text default 'Website Enquiry',
  p_notes text default null,
  p_branch_id text default 'b1',
  p_page_url text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_phone text;
begin
  if nullif(trim(p_name), '') is null then
    raise exception 'Name is required';
  end if;
  if nullif(trim(p_phone), '') is null then
    raise exception 'Phone is required';
  end if;

  v_phone := regexp_replace(trim(p_phone), '[^0-9+]', '', 'g');
  v_id := 'lead_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.leads (
    id,
    name,
    phone,
    source,
    status,
    enquiry,
    follow_up,
    notes,
    branch_id,
    page_url,
    utm_source,
    utm_medium,
    utm_campaign,
    activities
  ) values (
    v_id,
    trim(p_name),
    v_phone,
    'Website',
    'New',
    coalesce(nullif(trim(p_enquiry), ''), 'Website Enquiry'),
    now(),
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(nullif(trim(p_branch_id), ''), 'b1'),
    nullif(trim(coalesce(p_page_url, '')), ''),
    nullif(trim(coalesce(p_utm_source, '')), ''),
    nullif(trim(coalesce(p_utm_medium, '')), ''),
    nullif(trim(coalesce(p_utm_campaign, '')), ''),
    jsonb_build_array(jsonb_build_object('id', v_id || '_created', 'date', now(), 'note', 'Lead submitted from fitnfyt.in'))
  );

  return jsonb_build_object('ok', true, 'lead_id', v_id);
end;
$$;

grant execute on function public.submit_website_lead(text, text, text, text, text, text, text, text, text) to anon;
grant execute on function public.submit_website_lead(text, text, text, text, text, text, text, text, text) to authenticated;
