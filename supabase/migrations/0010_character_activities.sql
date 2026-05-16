-- supabase/migrations/0010_character_activities.sql
-- skillZs sub-project D: per-character GitHub activity log.
-- Daily cron upserts rows; character page reads last 7 days.
-- Mirrors the grant + policy pattern from 0008_characters_rls.sql.

create table character_activities (
  id              uuid primary key default gen_random_uuid(),
  character_id    uuid not null references characters(id) on delete cascade,
  github_event_id text not null unique,
  event_type      text not null check (event_type in ('PushEvent','ReleaseEvent')),
  repo_full_name  text not null,
  ref             text,
  title           text not null,
  url             text not null,
  occurred_at     timestamptz not null,
  payload         jsonb not null,
  ingested_at     timestamptz not null default now()
);

create index character_activities_lookup_idx
  on character_activities (character_id, occurred_at desc);

-- Mirror characters pattern: anon reads display columns only.
-- payload + ingested_at + github_event_id stay service-role-only.
revoke all on table public.character_activities
  from public, anon, authenticated;

grant select (
  id, character_id, event_type, repo_full_name, ref, title, url, occurred_at
) on table public.character_activities
  to anon, authenticated;

-- Supabase enables RLS by default; grant alone is not enough.
alter table public.character_activities enable row level security;

create policy character_activities_read on public.character_activities
  for select to anon, authenticated using (true);
