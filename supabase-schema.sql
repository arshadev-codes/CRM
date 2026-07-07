-- =========================================================================
-- Run this once in your Supabase SQL editor:
--   https://cxvdlpnmzgbunukcsynr.supabase.co  →  SQL Editor  →  New Query
-- =========================================================================

create table if not exists public.projects (
  id            uuid primary key,
  name          text not null,
  status        text not null default 'Draft',
  offer_base    text,          -- e.g. "Q001/2025-26/Neo/TTS"
  offer_seq     int,           -- 1, 2, 3 ...  (used for auto-increment per FY)
  fy            text,          -- "2025-26"
  company_short text,          -- "Neo"
  revision      int not null default 0,
  parent_id     uuid references public.projects(id) on delete set null,
  data          jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists projects_offer_seq_idx on public.projects (fy, offer_seq);
create index if not exists projects_parent_idx    on public.projects (parent_id);

grant select, insert, update, delete on public.projects to anon;
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;

alter table public.projects enable row level security;

drop policy if exists "public rw" on public.projects;
create policy "public rw" on public.projects
  for all
  using (true)
  with check (true);
