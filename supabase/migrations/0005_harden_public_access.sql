-- Restrict public database access to the API surface the app actually needs.

revoke execute on function public.refresh_skill_stats()
  from public, anon, authenticated;
revoke execute on function public.try_consume_interaction(text, text, integer)
  from public, anon, authenticated;
revoke execute on function public.claim_skill_cover(uuid)
  from public, anon, authenticated;

grant execute on function public.refresh_skill_stats()
  to service_role;
grant execute on function public.try_consume_interaction(text, text, integer)
  to service_role;
grant execute on function public.claim_skill_cover(uuid)
  to service_role;

-- Keep catalog reads public through skill_stats and the displayed README body,
-- but do not expose operational columns like cover_prompt or cover_error.
revoke all on table public.skills
  from public, anon, authenticated;

grant select on table public.skill_stats
  to anon, authenticated;
grant select (slug, readme_md) on table public.skills
  to anon, authenticated;
