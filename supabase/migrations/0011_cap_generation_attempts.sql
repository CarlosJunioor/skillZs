-- skillZs: cap image-generation retries to stop a paid re-billing loop.
--
-- BUG (cost runaway). All four image-gen runners (covers, diptych, avatar,
-- building) select candidates with status in ('pending','failed'), and the
-- claim_* functions flip status to 'generating' while incrementing the
-- *_attempts counter — but NOTHING ever read those counters. The paid
-- gpt-image-1 call happens BEFORE the Blob upload and the 'done' DB update, so
-- a row that fails AFTER generation (transient Blob outage, oversize PNG, a 5xx
-- on the update) was reset to 'failed' and re-claimed on the next cron run,
-- re-billing the image. diptych/avatar/building crons run daily (vercel.json),
-- so a deterministically-post-failing row was re-billed once per day forever.
--
-- FIX. Each claim_* now does two things atomically:
--   1. Retire the presented row to the terminal 'skipped' status if it has
--      already exhausted its retry budget (attempts >= 3). 'skipped' is NOT in
--      the runners' ('pending','failed') candidate filter, so the row leaves the
--      retry pool entirely and can no longer starve fresh rows of candidate slots.
--   2. Claim the row only while attempts < 3, so the paid call never runs for an
--      exhausted row (claim returns false -> the runner's `if (!claimed) continue`).
-- 3 = one initial attempt + two retries.
--
-- This migration is safe to apply before OR after the matching app deploy: it
-- only replaces functions (the previous definitions keep working) and adds no
-- columns the app code requires. `create or replace function` preserves grants;
-- revoke/grant pairs are re-issued for parity with the original migrations.

create or replace function claim_skill_cover(p_skill_id uuid) returns boolean
  language plpgsql security definer
  set search_path = public
as $$
declare
  claimed uuid;
begin
  update skills set cover_status = 'skipped'
    where id = p_skill_id and cover_status = 'failed' and cover_attempts >= 3;

  update skills
  set
    cover_status = 'generating',
    cover_attempts = cover_attempts + 1,
    cover_error = null
  where id = p_skill_id
    and cover_status in ('pending', 'failed')
    and cover_attempts < 3
  returning id into claimed;

  return claimed is not null;
end;
$$;

create or replace function claim_skill_diptych(p_skill_id uuid) returns boolean
  language plpgsql security definer
  set search_path = public
as $$
declare
  claimed uuid;
begin
  update skills set diptych_status = 'skipped'
    where id = p_skill_id and diptych_status = 'failed' and diptych_attempts >= 3;

  update skills
  set
    diptych_status   = 'generating',
    diptych_attempts = diptych_attempts + 1,
    diptych_error    = null
  where id = p_skill_id
    and diptych_status in ('pending', 'failed')
    and diptych_attempts < 3
  returning id into claimed;

  return claimed is not null;
end;
$$;

revoke execute on function public.claim_skill_diptych(uuid)
  from public, anon, authenticated;
grant  execute on function public.claim_skill_diptych(uuid)
  to service_role;

create or replace function claim_character_avatar(p_character_id uuid) returns boolean
  language plpgsql security definer
  set search_path = public
as $$
declare claimed uuid;
begin
  update characters set avatar_status = 'skipped'
    where id = p_character_id and avatar_status = 'failed' and avatar_attempts >= 3;

  update characters
     set avatar_status   = 'generating',
         avatar_attempts = avatar_attempts + 1,
         avatar_error    = null
   where id = p_character_id
     and avatar_status in ('pending','failed')
     and avatar_attempts < 3
   returning id into claimed;
  return claimed is not null;
end;
$$;

revoke execute on function public.claim_character_avatar(uuid)
  from public, anon, authenticated;
grant  execute on function public.claim_character_avatar(uuid)
  to service_role;

create or replace function claim_character_building(p_character_id uuid) returns boolean
  language plpgsql security definer
  set search_path = public
as $$
declare claimed uuid;
begin
  update characters set building_status = 'skipped'
    where id = p_character_id and building_status = 'failed' and building_attempts >= 3;

  update characters
     set building_status   = 'generating',
         building_attempts = building_attempts + 1,
         building_error    = null
   where id = p_character_id
     and building_status in ('pending','failed')
     and building_attempts < 3
   returning id into claimed;
  return claimed is not null;
end;
$$;

revoke execute on function public.claim_character_building(uuid)
  from public, anon, authenticated;
grant  execute on function public.claim_character_building(uuid)
  to service_role;

-- One-time normalization. The old regen/ingest requeue paths set status back to
-- 'pending' WITHOUT resetting the attempt counter. With the new cap, any such
-- pre-existing 'pending' row whose counter already reached the cap would be
-- un-claimable forever (the claim refuses it, and the 'skipped' retirement above
-- only fires for 'failed' rows). Give every currently-pending row a fresh budget
-- so the cap starts clean. (Going forward, the requeue paths reset attempts too.)
update skills     set cover_attempts    = 0 where cover_status    = 'pending' and cover_attempts    > 0;
update skills     set diptych_attempts  = 0 where diptych_status  = 'pending' and diptych_attempts  > 0;
update characters set avatar_attempts   = 0 where avatar_status   = 'pending' and avatar_attempts   > 0;
update characters set building_attempts = 0 where building_status = 'pending' and building_attempts > 0;
