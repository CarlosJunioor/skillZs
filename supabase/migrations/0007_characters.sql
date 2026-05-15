-- skillZs sub-project B: Characters (Zeke + influencer personas)
-- Additive. Mirrors the diptych lifecycle from 0006 for character avatars.
-- A skill belongs to at most one character via skills.character_id (nullable).

-- ----- characters table ------------------------------------------------------
create table if not exists characters (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  kind         text not null check (kind in ('zeke','influencer')),
  name         text not null,
  role         text,
  bio          text,
  gh_handle    text,
  x_handle     text,
  site_url     text,
  -- avatar lifecycle (mirrors diptych_*)
  avatar_url           text,
  avatar_prompt        text,
  avatar_status        text not null default 'pending'
                       check (avatar_status in ('pending','generating','done','failed','skipped')),
  avatar_generated_at  timestamptz,
  avatar_attempts      integer not null default 0,
  avatar_error         text,
  avatar_cost_usd      numeric(8,4) not null default 0,
  -- lifecycle
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index        if not exists characters_kind_idx          on characters (kind);
create index        if not exists characters_avatar_status_idx on characters (avatar_status);
create unique index if not exists characters_gh_handle_idx
  on characters (lower(gh_handle)) where gh_handle is not null;
create unique index if not exists characters_x_handle_idx
  on characters (lower(x_handle)) where x_handle is not null;

-- ----- skills.character_id FK ------------------------------------------------
alter table skills
  add column if not exists character_id uuid references characters(id) on delete set null;
create index if not exists skills_character_id_idx on skills (character_id);

-- ----- claim function (mirrors claim_skill_diptych) --------------------------
create or replace function claim_character_avatar(p_character_id uuid) returns boolean
  language plpgsql security definer
  set search_path = public
as $$
declare claimed uuid;
begin
  update characters
     set avatar_status   = 'generating',
         avatar_attempts = avatar_attempts + 1,
         avatar_error    = null
   where id = p_character_id
     and avatar_status in ('pending','failed')
   returning id into claimed;
  return claimed is not null;
end;
$$;

revoke execute on function public.claim_character_avatar(uuid)
  from public, anon, authenticated;
grant  execute on function public.claim_character_avatar(uuid)
  to service_role;

-- ----- skill_stats matview: surface character columns ------------------------
-- Drop + recreate so the SkillCard chip can render character_slug/name/avatar
-- without a second query. Mirrors how 0006 expanded the matview for diptych.
drop materialized view if exists skill_stats;
create materialized view skill_stats as
select
  s.id,
  s.slug,
  s.name,
  s.description,
  s.cover_url,
  s.cover_status,
  s.tagline,
  s.before_text,
  s.after_text,
  s.diptych_url,
  s.diptych_status,
  s.category,
  s.repo_url,
  s.source_repo,
  s.github_stars,
  s.first_seen,
  s.last_seen,
  s.character_id,
  c.slug         as character_slug,
  c.name         as character_name,
  c.avatar_url   as character_avatar_url,
  coalesce(v.cnt, 0)::int as vote_count,
  coalesce(u.cnt, 0)::int as use_count,
  (coalesce(v.cnt, 0) * 2 + coalesce(u.cnt, 0) * 3 + s.github_stars)::int as hotness
from skills s
left join characters c on c.id = s.character_id
left join (select skill_id, count(*)::int as cnt from votes        group by skill_id) v on v.skill_id = s.id
left join (select skill_id, count(*)::int as cnt from usage_clicks group by skill_id) u on u.skill_id = s.id;

create unique index if not exists skill_stats_id_idx              on skill_stats (id);
create        index if not exists skill_stats_hotness_idx         on skill_stats (hotness desc);
create        index if not exists skill_stats_first_seen_idx      on skill_stats (first_seen desc);
create        index if not exists skill_stats_category_idx        on skill_stats (category);
create        index if not exists skill_stats_diptych_status_idx  on skill_stats (diptych_status);
create        index if not exists skill_stats_character_id_idx    on skill_stats (character_id);

grant select on table public.skill_stats to anon, authenticated;

-- ----- character_skill_stats: per-character aggregates -----------------------
-- Plain view (not materialized) — used by a future /character index page;
-- character_id list is small enough that on-the-fly is fine.
create or replace view character_skill_stats as
select
  c.id,
  c.slug,
  c.kind,
  c.name,
  c.role,
  c.bio,
  c.avatar_url,
  c.gh_handle,
  c.x_handle,
  c.site_url,
  coalesce(agg.skill_count,        0)::int as skill_count,
  coalesce(agg.total_uses,         0)::int as total_uses,
  coalesce(agg.total_votes,        0)::int as total_votes,
  agg.last_skill_added_at
from characters c
left join (
  select
    s.character_id,
    count(*)::int           as skill_count,
    sum(s.use_count)::int   as total_uses,
    sum(s.vote_count)::int  as total_votes,
    max(s.first_seen)       as last_skill_added_at
  from skill_stats s
  where s.character_id is not null
  group by s.character_id
) agg on agg.character_id = c.id;

-- ----- public-read grants ----------------------------------------------------
-- Mirror the column-list pattern from 0005_harden_public_access for skills:
-- the /character/[slug] page reads slug/kind/name/role/bio/handles/site/avatar
-- only. Operational columns (prompt, error, attempts, cost, status) stay
-- service-role-only.
revoke all on table public.characters
  from public, anon, authenticated;

grant select (
  id, slug, kind, name, role, bio,
  gh_handle, x_handle, site_url,
  avatar_url
) on table public.characters
  to anon, authenticated;

grant select on table public.character_skill_stats
  to anon, authenticated;
