-- skillZs covers add-on
-- Adds AI cover lifecycle columns + a public storage bucket.

alter table skills add column if not exists cover_status text not null default 'pending';
-- 'pending' | 'generating' | 'done' | 'failed' | 'skipped'

alter table skills add column if not exists cover_prompt text;
alter table skills add column if not exists cover_generated_at timestamptz;
alter table skills add column if not exists cover_attempts integer not null default 0;
alter table skills add column if not exists cover_error text;

create index if not exists skills_cover_status_idx on skills (cover_status);

create or replace function claim_skill_cover(p_skill_id uuid) returns boolean
  language plpgsql security definer
  set search_path = public
as $$
declare
  claimed uuid;
begin
  update skills
  set
    cover_status = 'generating',
    cover_attempts = cover_attempts + 1,
    cover_error = null
  where id = p_skill_id
    and cover_status in ('pending', 'failed')
  returning id into claimed;

  return claimed is not null;
end;
$$;

-- Recreate skill_stats matview to expose cover_status (needed so the UI can
-- distinguish "AI cover ready" from "OG fallback").
drop materialized view if exists skill_stats;
create materialized view skill_stats as
select
  s.id,
  s.slug,
  s.name,
  s.description,
  s.cover_url,
  s.cover_status,
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

-- Public storage bucket for AI-generated covers.
insert into storage.buckets (id, name, public)
values ('skill-covers', 'skill-covers', true)
on conflict (id) do nothing;

-- Public read policy so <img src> works without auth.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'skill_covers_public_read'
  ) then
    create policy skill_covers_public_read on storage.objects
      for select using (bucket_id = 'skill-covers');
  end if;
end$$;
