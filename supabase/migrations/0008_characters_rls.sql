-- sub-project B follow-up: enable anon reads through RLS.
-- 0007 granted SELECT to anon but Supabase enables RLS by default on new
-- tables, so anon was getting zero rows (no permission error, just empty).
-- Mirror the existing skills_read policy (USING true) for the same intent:
-- the column-level grant already restricts which fields anon can touch.

alter table characters enable row level security;

drop policy if exists characters_read on characters;
create policy characters_read on characters
  for select
  to anon, authenticated
  using (true);
