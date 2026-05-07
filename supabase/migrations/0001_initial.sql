-- skillZs initial schema
-- Run via Supabase SQL editor or `supabase db push`.

create extension if not exists "pgcrypto";

create table if not exists skills (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  description  text not null,
  source_repo  text not null,
  source_path  text not null,
  repo_url     text not null,
  category     text,
  cover_url    text,
  github_stars integer not null default 0,
  readme_md    text,
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz not null default now()
);
create index if not exists skills_category_idx on skills (category);
create index if not exists skills_last_seen_idx on skills (last_seen desc);
create index if not exists skills_first_seen_idx on skills (first_seen desc);

create table if not exists votes (
  id         uuid primary key default gen_random_uuid(),
  skill_id   uuid not null references skills(id) on delete cascade,
  ip_hash    text not null,
  created_at timestamptz not null default now(),
  unique (skill_id, ip_hash)
);
create index if not exists votes_skill_idx on votes (skill_id);

create table if not exists usage_clicks (
  id         uuid primary key default gen_random_uuid(),
  skill_id   uuid not null references skills(id) on delete cascade,
  ip_hash    text not null,
  created_at timestamptz not null default now(),
  unique (skill_id, ip_hash)
);
create index if not exists usage_skill_idx on usage_clicks (skill_id);

create table if not exists interaction_rate_limits (
  action       text not null,
  ip_hash      text not null,
  window_start date not null default current_date,
  count        integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (action, ip_hash, window_start)
);
create index if not exists interaction_rate_limits_updated_idx on interaction_rate_limits (updated_at);

drop materialized view if exists skill_stats;
create materialized view skill_stats as
select
  s.id,
  s.slug,
  s.name,
  s.description,
  s.cover_url,
  s.category,
  s.repo_url,
  s.source_repo,
  s.github_stars,
  s.first_seen,
  s.last_seen,
  coalesce(v.cnt, 0)::int as vote_count,
  coalesce(u.cnt, 0)::int as use_count,
  (coalesce(v.cnt, 0) * 2 + coalesce(u.cnt, 0) * 3 + s.github_stars)::int as hotness
from skills s
left join (select skill_id, count(*)::int as cnt from votes group by skill_id) v on v.skill_id = s.id
left join (select skill_id, count(*)::int as cnt from usage_clicks group by skill_id) u on u.skill_id = s.id;

create unique index if not exists skill_stats_id_idx on skill_stats (id);
create index if not exists skill_stats_hotness_idx on skill_stats (hotness desc);
create index if not exists skill_stats_first_seen_idx on skill_stats (first_seen desc);
create index if not exists skill_stats_category_idx on skill_stats (category);

-- Helper function for API routes to refresh the matview cheaply.
create or replace function refresh_skill_stats() returns void
  language sql security definer
  set search_path = public
as $$
  refresh materialized view concurrently skill_stats;
$$;

create or replace function try_consume_interaction(
  p_action text,
  p_ip_hash text,
  p_max_events integer
) returns boolean
  language plpgsql security definer
  set search_path = public
as $$
declare
  consumed integer;
begin
  insert into interaction_rate_limits (action, ip_hash, window_start, count, updated_at)
  values (p_action, p_ip_hash, current_date, 1, now())
  on conflict (action, ip_hash, window_start)
  do update set
    count = interaction_rate_limits.count + 1,
    updated_at = now()
  where interaction_rate_limits.count < p_max_events
  returning count into consumed;

  return consumed is not null and consumed <= p_max_events;
end;
$$;

-- RLS: allow anon SELECT on public catalog; mutation only via service role.
alter table skills enable row level security;
alter table votes enable row level security;
alter table usage_clicks enable row level security;
alter table interaction_rate_limits enable row level security;

drop policy if exists skills_read on skills;
create policy skills_read on skills for select using (true);

-- Votes/usage are written via API routes using the service-role key,
-- so no public INSERT policy is needed. Readers also don't need raw rows
-- (they read aggregated counts via skill_stats).
