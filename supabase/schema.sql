-- ==============================================================================
-- ACADEMIX STUDY MANAGEMENT PLATFORM - SUPABASE POSTGRES SCHEMA
-- Project Ref: lwacsamezwymumwbuteh
-- Designed per Supabase & PostgreSQL Best Practices (Row Level Security Enabled)
-- ==============================================================================

-- 1. Create table for persisting full academic state (Study schedule, syllabus topics, progress, focus timer, exams, notes)
create table if not exists public.academix_state (
  id text primary key,
  user_id text not null default 'rebin',
  state jsonb not null,
  version text default 'v3',
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Add comment for PostgREST documentation
comment on table public.academix_state is 'Stores the centralized user state, timetable events, syllabus completion, and academic analytics for Academix.';

-- 3. Enable Row Level Security (RLS)
alter table public.academix_state enable row level security;

-- 4. Policies for anon and authenticated clients (Zero-lockout client sync)
create policy "Allow select access to academix_state"
  on public.academix_state
  for select
  to anon, authenticated
  using (true);

create policy "Allow insert access to academix_state"
  on public.academix_state
  for insert
  to anon, authenticated
  with check (true);

create policy "Allow update access to academix_state"
  on public.academix_state
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- 5. Helpful index on updated_at
create index if not exists idx_academix_state_updated_at on public.academix_state (updated_at desc);

-- 6. Enable Realtime broadcasting so changes on one device reflect instantly on another
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table public.academix_state;
commit;

