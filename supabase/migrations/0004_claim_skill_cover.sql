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
