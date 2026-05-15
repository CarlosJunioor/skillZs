-- supabase/migrations/0009_characters_buildings.sql
-- skillZs sub-project C: storefront tile lifecycle for characters.
-- Mirrors the avatar lifecycle pattern from 0007_characters.sql exactly.

alter table characters
  add column building_url           text,
  add column building_prompt        text,
  add column building_status        text not null default 'pending'
    check (building_status in ('pending','generating','done','failed','skipped')),
  add column building_generated_at  timestamptz,
  add column building_attempts      integer not null default 0,
  add column building_error         text,
  add column building_cost_usd      numeric(8,4) not null default 0;

create index if not exists characters_building_status_idx
  on characters (building_status);

-- Atomic state transition. Mirrors claim_character_avatar exactly.
create or replace function claim_character_building(p_character_id uuid)
  returns boolean
  language plpgsql security definer
  set search_path = public
as $$
declare claimed uuid;
begin
  update characters
     set building_status   = 'generating',
         building_attempts = building_attempts + 1,
         building_error    = null
   where id = p_character_id
     and building_status in ('pending','failed')
   returning id into claimed;
  return claimed is not null;
end;
$$;

revoke execute on function public.claim_character_building(uuid)
  from public, anon, authenticated;
grant  execute on function public.claim_character_building(uuid)
  to service_role;

-- Additive: extend the column-list grant from 0007 with building_url ONLY.
-- Status / prompt / error / cost stay service-role-only (operational columns).
grant select (building_url) on table public.characters
  to anon, authenticated;
