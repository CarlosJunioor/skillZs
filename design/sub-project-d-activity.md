---
name: sub-project-d-activity
description: skillZs sub-project D — daily GitHub activity feed per character, "this week" inset on character page
status: spec
date: 2026-05-16
depends-on: sub-project-b-characters
---

# Sub-project D — Influencer activity feed

## Goal

Each `/character/[slug]` page gains a "this week" inset listing up to 5 GitHub activity items from the last 7 days. Items are pulled daily by a cron from the GitHub Events API (`/users/{handle}/events/public`), filtered to releases and default-branch pushes, deduped on `github_event_id`, and rendered as outbound links.

This is the foundation for E (auth + following + personalized feed) and future weekly digests / per-character RSS exports. C (town) and the building drawer remain unchanged in scope D.

## Decisions locked

| # | Decision | Choice |
|---|---|---|
| D1 | Sources | GitHub Events API only. No X, no RSS, no Mastodon. Unauthed (60 req/hr per IP — comfortably above the 7 req/day cron load) |
| D2 | Event filter | `ReleaseEvent` + `PushEvent` where `payload.ref` matches `refs/heads/main` or `refs/heads/master` (heuristic — see Risks) |
| D3 | Surface | Inset on `/character/[slug]` between skills row and footer. **Drawer and town unchanged.** |
| D4 | Window | Last 7 days, max 5 items per character |
| D5 | Storage | New `character_activities` table; daily cron at `0 8 * * *` UTC; dedupe via `github_event_id` unique constraint |
| D6 | M:N co-authored skills | Deferred to E |
| D7 | Section heading | "this week" — matches the framing used in sub-project B and C scope notes |

## Unilateral spec-level calls

These follow from D1–D7 but were not voted on. Flag during spec review if any are wrong.

1. **Default-branch heuristic stays v1** — no per-repo `default_branch` lookup. Repos with custom defaults (`develop`, `trunk`, …) get filtered out. Revisit if a known-active character shows "quiet week." for 2+ weeks despite obvious pushes.
2. **Item link target** — `target="_blank" rel="noreferrer"`. Outbound, opens new tab. Consistent with the GH/X/site chips already on `<CharacterHero/>`.
3. **Empty state** — `quiet week.` in `tag-font` (same family as the WIP labels in C). No avatar, no fluff. Quietness is signal.
4. **Ingest filter window** — cron filters to **last 14 days** before insert (display reads last 7). The 7-day buffer prevents "events I saw yesterday silently disappeared" when a cron run is delayed across midnight UTC.
5. **`payload` jsonb stays service-role-only** — public reads see only the normalized display columns. Matches the `building_url`-only grant pattern from C.
6. **No backfill route in v1** — if a character is added mid-week, they accrue activity from the next cron forward. Historical events older than 7 days never appear. Acceptable; revisit only if a launch character joins outside of a Sunday seed.
7. **No `activity_status` lifecycle column on `characters`** — unlike avatars/diptychs/buildings (which gate expensive image generation), ingest is cheap, idempotent, and shared across all characters in one cron run. A per-character status row would be noise.

## Architecture

### Database

Migration: `supabase/migrations/0010_character_activities.sql`

```sql
create table character_activities (
  id              uuid primary key default gen_random_uuid(),
  character_id    uuid not null references characters(id) on delete cascade,
  github_event_id text not null unique,
  event_type      text not null check (event_type in ('PushEvent','ReleaseEvent')),
  repo_full_name  text not null,
  ref             text,           -- 'refs/heads/main' for push, null for release
  title           text not null,  -- "Released v1.2.0" / "Pushed 3 commits to main"
  url             text not null,
  occurred_at     timestamptz not null,
  payload         jsonb not null,
  ingested_at     timestamptz not null default now()
);

create index character_activities_lookup_idx
  on character_activities (character_id, occurred_at desc);

-- Mirror characters pattern: anon reads display cols only.
-- payload + ingested_at stay service-role-only.
revoke all on table public.character_activities
  from public, anon, authenticated;

grant select (
  id, character_id, event_type, repo_full_name, ref, title, url, occurred_at
) on table public.character_activities
  to anon, authenticated;

-- Supabase enables RLS by default on new tables (see supabase-rls-default memory).
-- Grant alone is not enough; a policy is required for anon SELECT to return rows.
alter table public.character_activities enable row level security;

create policy character_activities_read on public.character_activities
  for select to anon, authenticated using (true);
```

### Ingest pipeline

| File | Role |
|---|---|
| `lib/character/github-events.ts` | **NEW**. `fetchPublicEvents(handle: string): Promise<RawEvent[]>` calls `https://api.github.com/users/{handle}/events/public?per_page=30`. `normalizeEvent(raw: RawEvent, characterId: string): ActivityRow \| null` maps PushEvent (default branch only) and ReleaseEvent to normalized rows; returns null for everything else. Title format: `Released {tag_name}` / `Pushed {n} commit{s} to {repo_full_name}`. URL: release `html_url` for releases, `https://github.com/{repo}/compare/{before}...{head}` for pushes |
| `lib/character/ingest-activity.ts` | **NEW**. `ingestActivityForCharacter({ id, slug, gh_handle })`: fetch, normalize, filter to `occurred_at > now() - interval '14 days'`, insert with `on conflict (github_event_id) do nothing`. Returns `{ inserted, skipped, errored }`. Skips silently if `gh_handle` is null |
| `app/api/cron/ingest-activity/route.ts` | **NEW**. Lists `select id, slug, gh_handle from characters where gh_handle is not null`, iterates, calls `ingestActivityForCharacter` with per-character try/catch. Auth: `isAuthorizedCronRequest(req, "DIPTYCH_CRON_SECRET", { allowCronSecretFallback: true })` per `cron-auth-fallback` memory. Logs per-character outcomes; returns aggregate counts |
| `vercel.json` | Add `{ "path": "/api/cron/ingest-activity", "schedule": "0 8 * * *" }` |

GitHub API is unauthed. Limit is 60 req/hr per egress IP, shared with anyone hitting GH from Vercel's IPs. Cron uses 7 reqs/day → comfortable.

### Display

| File | Role |
|---|---|
| `components/character-activity.tsx` | **NEW**. Async server component. Props: `{ characterId: string }`. Calls `fetchActivityForCharacter(characterId)`. Renders `<section>` with `<h2>this week</h2>` heading + `<ol>` of items. Each item: `<li><a href={url} target="_blank" rel="noreferrer">↗ {title} in {repo_full_name} · {timeAgo}</a></li>`. Empty state: `<p class="tag-font">quiet week.</p>` |
| `components/activity-skeleton.tsx` | **NEW**. Suspense fallback. 5 skeleton rows matching item height + heading bar |
| `lib/stats.ts` | Extend with `fetchActivityForCharacter(characterId: string): Promise<ActivityRow[]>` → `select … where character_id = $1 and occurred_at > now() - interval '7 days' order by occurred_at desc limit 5`. Use the `anon` client (RLS allows read) |
| `app/character/[slug]/page.tsx` | Insert `<Suspense fallback={<ActivitySkeleton/>}><CharacterActivity characterId={c.id} /></Suspense>` between the skills row and the footer |

Time-ago format: bespoke `formatTimeAgo(date: Date): string` in `lib/format.ts` (or wherever the project already has formatters — confirm during execution). Output examples: `2h ago`, `3d ago`, `6d ago`. Always relative to now; no absolute dates.

### Data flow

```
Daily 08:00 UTC cron
  → /api/cron/ingest-activity (auth OK)
    → for each character (gh_handle is not null):
         fetchPublicEvents(handle)         // GH API
           → normalizeEvent each
             → filter last 14 days
               → upsert (on conflict do nothing)

Page request: /character/[slug]
  → CharacterPage (server)
    → renders identity, skills, …
    → <Suspense fallback={<ActivitySkeleton/>}>
         <CharacterActivity characterId={c.id} />
           → fetchActivityForCharacter(id)
             → SELECT last 7d, limit 5
           → renders <ol> or empty state
```

`revalidate = 120` on the character page already; daily cron + 2-minute SWR means activity appears within ~2 minutes of cron completion.

### SEO

- `/character/[slug]` — unchanged metadata. Activity items are semantic `<ol>` / `<li>` with outbound links. No new JSON-LD; items aren't canonical content (they're pointers to GitHub).
- `app/sitemap.ts` — unchanged (no new public URLs).
- `app/robots.ts` — unchanged.
- No new canonical concerns; activity lives inside an existing page.

### Error handling

| Condition | Behavior |
|---|---|
| Character `gh_handle is null` | Cron skips silently. Component renders empty state ("quiet week.") |
| GitHub 404 (handle deleted/renamed) | Log slug + 404. Continue to next character. No character marked broken |
| GitHub 429 (rate-limited) | Log. Abort remaining iterations in this run. Cron exits 200 with `partial: true` in body. Next day's run picks up |
| GitHub network error | Per-character try/catch. One failure doesn't kill the loop |
| Normalize returns null | Event silently dropped (it was filtered by design) |
| Insert hits unique conflict on `github_event_id` | Silent (idempotent re-runs are the point) |
| `fetchActivityForCharacter` returns 0 rows | Component renders empty state. Not an error |
| Supabase fetch failure inside component | Suspense boundary catches; React error boundary at page level shows fallback for that section only (rest of page intact) |

### Tests (vitest, flat `tests/` directory)

| Test file | Covers |
|---|---|
| `tests/github-events.test.ts` | `normalizeEvent`: ReleaseEvent → row; PushEvent to `refs/heads/main` → row; PushEvent to `refs/heads/feature-x` → null; PushEvent missing `payload.ref` → null; WatchEvent → null; IssuesEvent → null. Title formatting for singular vs plural commits. URL construction (release html_url, push compare URL) |
| `tests/ingest-activity.test.ts` | Mock GH fetch + Supabase. Happy path inserts N. Dedupe: re-running same events inserts 0. 14-day filter caps results. `gh_handle` null returns early. GH 404 returns errored=1 without throw. Network error caught per-character |
| `tests/ingest-activity-route.test.ts` | Auth gates: `DIPTYCH_CRON_SECRET` 200, `CRON_SECRET` fallback 200, no bearer 401, wrong bearer 401, malformed header 401. Iterates all `gh_handle is not null` characters; returns aggregate counts |
| `tests/character-activity.test.tsx` | Renders 5 items with correct title/URL/time-ago. Empty state renders "quiet week." in tag-font. Items render in `occurred_at desc` order. Outbound links have `target="_blank" rel="noreferrer"` |
| `tests/character-page.test.tsx` | Existing test extended: Suspense slot for activity present with `<CharacterActivity/>` child |

Coverage ratchet: `npm run quality` must pass. Bump via `npm run ratchet` if floor moves.

## Out of scope (defer to E or later)

- X / RSS / Mastodon / Bluesky sources
- Per-event richness beyond title + URL (no commit summaries, no diff stats, no language breakdown)
- Activity in drawer or on town page
- Weekly digest email
- Per-character RSS export
- Webhooks (replace polling)
- M:N co-authored skills schema (originally tagged D-scope in B's spec; moved to E)
- Admin view of failed ingests
- Backfill route for new characters
- Per-repo `default_branch` lookup
- GitHub PAT / GraphQL / higher cadence

## Risks

- **Default-branch heuristic misses repos using `develop`, `trunk`, etc.** Filter drops legitimate pushes from those repos entirely. Mitigation: accept v1; revisit if a character shows "quiet week." for 2+ weeks despite known activity. Real fix is `fetch_repo_metadata` cache, which is a separate spec.
- **60 req/hr shared across Vercel egress IPs.** Cron uses 7. Any ad-hoc backfill or future per-repo metadata fetches would blow the budget. Mitigation: no backfill route in v1. If needed later, add a `GITHUB_TOKEN` PAT env var (separate decision, separate PR).
- **"Quiet week." is a frequent state.** Writers (Gergely) and infrastructure maintainers (Hashimoto on a release-cycle lull) will show empty state most weeks. Mitigation: intentional — design treats quietness as signal, not failure.
- **Cron failure goes unnoticed.** No alerting in v1. If `/api/cron/ingest-activity` 500s for a week, all 7 characters show "quiet week." simultaneously. Mitigation: weekly manual check until E adds an admin dashboard; or add a healthcheck cron later.
- **GH event ID collisions across characters.** Theoretically two characters could co-author the same commit and GH could surface the same event under both handles. The `github_event_id` unique constraint would reject the second insert silently. Mitigation: accepted — first-write-wins is fine for v1; second character just doesn't see the duplicate event in their feed.

## Cost

$0. No image generation, no LLM calls. Only GH egress + ~35 inserts/week to Supabase (7 chars × ~5 events/week median).

## File touch list

**New:**
- `supabase/migrations/0010_character_activities.sql`
- `lib/character/github-events.ts`
- `lib/character/ingest-activity.ts`
- `app/api/cron/ingest-activity/route.ts`
- `components/character-activity.tsx`
- `components/activity-skeleton.tsx`
- 5 new files in `tests/` (see Tests table)

**Modified:**
- `lib/stats.ts` (add `fetchActivityForCharacter`, plus shared `ActivityRow` type if not added elsewhere)
- `app/character/[slug]/page.tsx` (insert activity Suspense block)
- `vercel.json` (new cron entry `0 8 * * *`)
- `lib/format.ts` if a formatter module exists; otherwise add `formatTimeAgo` inline in `components/character-activity.tsx` and lift to shared if reused

---

Next step after spec approval: invoke `superpowers:writing-plans` to produce the implementation plan.
