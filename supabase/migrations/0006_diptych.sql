-- skillZs diptych add-on
-- Adds AI before/after diptych lifecycle to the `skills` table, mirroring the
-- existing cover-image flow. The card renders `diptych_url` + `tagline`; if
-- generation has not run (or failed), the card falls back to `cover_url`.

-- ----- diptych content -------------------------------------------------------
alter table skills add column if not exists tagline      text;  -- <= 80 chars, verb-led AI summary
alter table skills add column if not exists before_text  text;  -- left panel hook
alter table skills add column if not exists after_text   text;  -- right panel outcome
alter table skills add column if not exists diptych_url  text;  -- Vercel Blob public URL

-- ----- diptych lifecycle (mirrors cover_* fields) ----------------------------
alter table skills add column if not exists diptych_status text not null default 'pending';
-- 'pending' | 'generating' | 'done' | 'failed' | 'skipped'
alter table skills add column if not exists diptych_prompt       text;
alter table skills add column if not exists diptych_generated_at timestamptz;
alter table skills add column if not exists diptych_attempts     integer not null default 0;
alter table skills add column if not exists diptych_error        text;

-- ----- caching: detect upstream SKILL.md edits ------------------------------
-- sha256(readme_md). When upstream content changes the cron resets status to
-- 'pending' so the next run regenerates. Stored on the skills row, not the
-- matview, so the cron can compare cheaply.
alter table skills add column if not exists content_hash text;

-- ----- per-skill cost tracking (covers + diptych summed) --------------------
-- Reused by the admin /api/admin/cost endpoint. cover lifecycle does not write
-- here; we keep cover spend separate via cover_status counts.
alter table skills add column if not exists diptych_cost_usd numeric(8,4) not null default 0;

create index if not exists skills_diptych_status_idx on skills (diptych_status);

-- ----- claim function (mirrors claim_skill_cover) ---------------------------
create or replace function claim_skill_diptych(p_skill_id uuid) returns boolean
  language plpgsql security definer
  set search_path = public
as $$
declare
  claimed uuid;
begin
  update skills
  set
    diptych_status   = 'generating',
    diptych_attempts = diptych_attempts + 1,
    diptych_error    = null
  where id = p_skill_id
    and diptych_status in ('pending', 'failed')
  returning id into claimed;

  return claimed is not null;
end;
$$;

-- Match the access policy applied to claim_skill_cover in 0005: only the
-- service role may invoke it.
revoke execute on function public.claim_skill_diptych(uuid)
  from public, anon, authenticated;
grant  execute on function public.claim_skill_diptych(uuid)
  to service_role;

-- ----- skill_stats matview: surface the new card fields ---------------------
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
  coalesce(v.cnt, 0)::int as vote_count,
  coalesce(u.cnt, 0)::int as use_count,
  (coalesce(v.cnt, 0) * 2 + coalesce(u.cnt, 0) * 3 + s.github_stars)::int as hotness
from skills s
left join (select skill_id, count(*)::int as cnt from votes        group by skill_id) v on v.skill_id = s.id
left join (select skill_id, count(*)::int as cnt from usage_clicks group by skill_id) u on u.skill_id = s.id;

create unique index if not exists skill_stats_id_idx          on skill_stats (id);
create index        if not exists skill_stats_hotness_idx     on skill_stats (hotness desc);
create index        if not exists skill_stats_first_seen_idx  on skill_stats (first_seen desc);
create index        if not exists skill_stats_category_idx    on skill_stats (category);
create index        if not exists skill_stats_diptych_status_idx on skill_stats (diptych_status);

-- Anon needs to read the new matview columns. The grant on the matview itself
-- already covers them, but re-issue for clarity in case a future migration
-- narrowed it.
grant select on table public.skill_stats to anon, authenticated;
