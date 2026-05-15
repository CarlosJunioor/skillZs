---
name: sub-project-c-town
description: skillZs sub-project C — Aquarius town map at /, zine moves to /zine, hybrid drawer over character pages
status: spec
date: 2026-05-15
revised: 2026-05-15 (grill pass)
depends-on: sub-project-b-characters
---

# Sub-project C — Aquarius town map

## Goal

Replace the homepage with a 7-building town. Each tile is a **fisheye peek through a storefront window/door INTO** the existing locked-style character interior. Clicking a tile opens a drawer summary with a deep-link to `/character/[slug]`. The current zine homepage (hero carousel, manifesto, skill rows) moves to `/zine`, intact.

Sub-project B already built the data foundation (`characters` table, 7 live rows, avatars on Blob). C consumes those rows. No new characters needed.

## Decisions locked

| # | Decision | Choice |
|---|---|---|
| D1 | Tile aesthetic | Tile grid of fisheye **peek-through interior** renders — viewer peers through a window/door INTO the character's locked-style interior. ~85% of image stays inside the Style DNA; new element is just the storefront frame (~15%). One `gpt-image-1` low render per character (~$0.28 one-time for 7) |
| D2 | Layout source of truth | `design/town-layout.json`, explicit `(x, y, w, h)` per slug. **Strict drift policy** — any divergence between JSON and DB throws |
| D3 | Building click behavior | Hybrid drawer: slides in (right on desktop, bottom sheet on mobile). URL = `?building=slug`. "Deep dive" link goes to `/character/[slug]` |
| D4 | Homepage placement | Town **replaces** `/`. Current zine moves to `/zine`. Header nav gains `zine` entry |
| D5 | Mobile fallback | Vertical single-column stack — CSS Grid flips to `flex-col` at `< lg`. Drawer becomes bottom sheet |

## Refinements resolved during grill pass

| # | Topic | Resolution |
|---|---|---|
| R1 | Tile aspect ratio vs circular fisheye | Image is always **fixed 1024×1024**. Cell-size variance from `(w, h)` is filled by hand-coded CSS storefront decoration (extra brick texture, second-story sign, stoop, alley) that scales with cell size. Image cost flat regardless of layout |
| R2 | Drawer contents | Mirror `<CharacterHero/>` shape (avatar, name, role, bio, social chips). **No skills-count chip** (would read "0" on launch). Deep dive → `/character/[slug]` carries the skills row + future activity |
| R3 | Drawer perceived perf | Wrap drawer in `<Suspense fallback={<DrawerSkeleton/>}>`. Map stays put; drawer slot streams in with a grunge-frame skeleton while `fetchCharacterBySlug` runs (~150ms) |
| R4 | Drawer SEO canonicalization | When `searchParams.building` is set, page's `generateMetadata` returns `alternates.canonical = /character/${slug}`. Drawer URLs remain shareable; SEO weight accrues on the character page |
| R5 | Migration scope | Mirror `0007_characters.sql` exactly: 7 lifecycle cols + claim function + indexes (see Database section). My v1 spec was too thin |
| R6 | Grant column-list | Only `building_url` joins the public grant. Status / prompt / error / cost stay service-role-only (matches avatar precedent). Page renders placeholder when `building_url IS NULL` |
| R7 | Sitemap B-era gap | `app/sitemap.ts` currently has zero `/character/[slug]` entries. C bundles the fix — new `fetchSitemapCharacters()` in `lib/stats.ts` |
| R8 | `/zine` canonical | `layout.tsx` defaults `alternates.canonical = "/"` for all pages. `/zine/page.tsx` must explicitly set `canonical: "/zine"` so Google doesn't treat zine as duplicate of town |
| R9 | URL contract for `?sort=*` and `?covered=1` | These move with the body to `/zine`. Old inbound `/?sort=hot` links land on the town (which ignores them). **Accept the break** — site is 2 weeks old, no redirect added |
| R10 | Cron necessity | Stays. `0 7 * * *` daily. Idle 99% of the time but maintains parity with avatars/diptychs and auto-handles future character adds |

## Unilateral spec-level calls

These were not part of D1–D5 or R1–R10 but follow from them. Flag during spec review if any are wrong.

1. **Drawer is server-rendered, URL-driven** — not a client modal. Simpler, SEO-friendly, no client JS for state.
2. **Iso "feel" lives in the artwork**, not in CSS — layout is a plain CSS Grid; the 3/4 angle is in the fisheye image itself. No CSS skew gymnastics.
3. **Placeholder for `building_url IS NULL`** = existing avatar inside a grunge frame + "wip" tag-font label, mirroring the avatar-fallback pattern in `components/character-hero.tsx`.
4. **Invalid `?building=slug`** → server redirects to `/` (drops the param). Same shape as the `notFound()` path on `/character/[slug]`.
5. **`BUILDING_STYLE_VERSION = "v1-fisheye-peek"`** — mirror the `AVATAR_STYLE_VERSION` reset pattern. Bumping the version + resetting `building_status='pending'` triggers regen on the next cron drain.

## Architecture

### Database

Migration: `supabase/migrations/0009_characters_buildings.sql`

Mirrors `0007_characters.sql` lifecycle pattern exactly.

```sql
-- Building lifecycle columns (mirrors avatar_* pattern in 0007)
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

-- Atomic state transition (mirrors claim_character_avatar)
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

-- Public grant: ONLY building_url. Status / prompt / error / cost stay
-- service-role-only (matches the avatar precedent in 0007).
revoke all on table public.characters
  from public, anon, authenticated;

grant select (
  id, slug, kind, name, role, bio,
  gh_handle, x_handle, site_url,
  avatar_url,
  building_url
) on table public.characters
  to anon, authenticated;
```

RLS policy `characters_read` (from `0008_characters_rls.sql`) is `USING (true)` — already covers row visibility. Only the column grant changes.

### Storage

Vercel Blob path: `buildings/{slug}-{hash}.png` (public). Mirrors the existing `avatars/` and `diptych/` schemes.

### Image generation pipeline (mirrors avatars)

| File | Role |
|---|---|
| `lib/character/random.ts` | **NEW**. Extract `slugHash` + `pick` utilities from current `lib/character/prompt.ts` so both avatar and building prompts can share them. Avatar prompt updated to import from here |
| `lib/character/building-prompt.ts` | Style-guide-locked prompt template. Subject = fisheye peek through {window/door/grate/fish-tank-glass} INTO the character's {SETTINGS} interior. Reuses `SETTINGS` pool from avatar prompt where appropriate. Exports `BUILDING_STYLE_VERSION = "v1-fisheye-peek"` |
| `lib/character/generate-building.ts` | `generateBuildingForCharacter(slug)`. Calls `claim_character_building(id)`; on true, invokes `gpt-image-1` (low ~$0.04 / image, 1024×1024), uploads to Blob, updates `building_url`, `building_status='done'`, `building_generated_at`, `building_cost_usd`. On failure sets `building_status='failed'` + `building_error`. Mirrors `lib/character/run.ts` |
| `app/api/cron/generate-buildings/route.ts` | Cron handler. Lists `building_status IN ('pending','failed')` rows (failed rows auto-retry, matches avatar precedent), iterates and calls `generateBuildingForCharacter`. Auth: `DIPTYCH_CRON_SECRET` primary + `allowCronSecretFallback: true` (per `cron-auth-fallback` memory) |
| `vercel.json` | Add `{ "path": "/api/cron/generate-buildings", "schedule": "0 7 * * *" }` |
| `app/api/regen/character/[slug]/route.ts` | Extend existing operator regen route to accept `?asset=building` — resets `building_status='pending'`, triggers single-row rebuild. Auth unchanged (`DIPTYCH_CRON_SECRET`, no fallback) |

Initial population: deploy → next 07:00 UTC cron drains 7 rows at ~$0.04 each ≈ $0.28 one-time. Operator can backfill manually via the regen route.

### Routes

| Path | After C |
|---|---|
| `/` | NEW `app/page.tsx` — TownPage (server) |
| `/zine` | NEW `app/zine/page.tsx` — body of current `app/page.tsx` moved here verbatim; preserves `revalidate = 300` and the homepage metadata pattern. Adds explicit `alternates: { canonical: "/zine" }` to override the layout default |
| `/character/[slug]` | unchanged |
| `/browse`, `/category/*`, `/skill/*` | unchanged |

`app/layout.tsx` `NAV` array gains `{ href: "/zine", label: "zine" }`. Logo `<Link href="/">` now semantically means "town home" — correct.

### Components

All server-rendered. No client state.

| File | Responsibility |
|---|---|
| `components/town-map.tsx` | Reads merged layout × characters list, renders flat CSS Grid. Each cell placed via `grid-column: x / span w; grid-row: y / span h;` |
| `components/building-tile.tsx` | One tile. `<Link href="/?building=slug" aria-label="Open {name}'s storefront">` wraps the building image (or placeholder if `building_url IS NULL`). CSS decoration panels (brick, signage, stoop) scale with cell `w / h` |
| `components/building-drawer.tsx` | Accepts `character` prop. Renders the same identity content as `<CharacterHero/>` — avatar, name, role chip, bio, GH/X/site social chips — plus a primary CTA `→ deep dive` linking to `/character/[slug]`. Close link = `/`. Slides in from right on desktop, up on mobile |
| `components/drawer-skeleton.tsx` | Suspense fallback. Renders a grunge-frame skeleton in the same outer shape as `<BuildingDrawer/>` so the slot doesn't shift when data arrives |

Implementation note: extract `<CharacterIdentity/>` shared between `CharacterHero` and `BuildingDrawer`, OR render `<CharacterHero/>` directly inside the drawer. Decide during implementation; both are clean.

### Layout config

`design/town-layout.json` (real slugs):

```json
[
  { "slug": "zeke",               "x": 0, "y": 0, "w": 2, "h": 2 },
  { "slug": "matt-pocock",        "x": 2, "y": 0, "w": 1, "h": 1 },
  { "slug": "theo-browne",        "x": 3, "y": 0, "w": 1, "h": 1 },
  { "slug": "geoffrey-huntley",   "x": 4, "y": 0, "w": 1, "h": 1 },
  { "slug": "cole-medin",         "x": 2, "y": 1, "w": 1, "h": 1 },
  { "slug": "mitchell-hashimoto", "x": 3, "y": 1, "w": 2, "h": 1 },
  { "slug": "gergely-orosz",      "x": 0, "y": 2, "w": 2, "h": 1 }
]
```

(Exact placement is illustrative — designer iterates during execution.)

`lib/town/layout.ts` exposes `loadTownLayout()`:

- Imports JSON at build time
- Fetches all `characters` rows via a new `fetchCharactersForTown()` in `lib/stats.ts`
- **Strict drift policy (R10 / D2):**
  - slug in JSON, not in DB → **throw**
  - slug in DB, not in JSON → **throw**
  - duplicate slugs in JSON → **throw**
  - overlapping cells in JSON → **throw**
- All four failure modes log the offending slug. Page 500s; ops sees the error and reconciles.

### Data flow

```
TownPage (server, app/page.tsx)
  ├─ Always render:
  │    <TownMap tiles={await loadTownLayout()} />
  │
  └─ If searchParams.building:
       <Suspense fallback={<DrawerSkeleton/>}>
         <BuildingDrawerLoader slug={searchParams.building} />
       </Suspense>

  BuildingDrawerLoader (async server component):
    character = await fetchCharacterBySlug(slug)
    if (!character) redirect("/")
    return <BuildingDrawer character={character} />
```

Click flow:
1. Tap tile → `<Link href="/?building=zeke">` → server re-renders w/ drawer in Suspense
2. Map stays put (cached); drawer slot streams in ~150ms
3. Tap "deep dive" → `/character/zeke` (full nav)
4. Tap close → `<Link href="/">` → drawer state cleared

`revalidate = 120` on `/` (matches `/character/[slug]`).

### SEO

- **`/`**: WebPage + ItemList JSON-LD over the 7 characters. Each tile renders the character name as visible heading text (`h2`/`h3`) and adds `aria-label="Open {name}'s storefront"` on the link wrapper
- **`/?building=slug`**: `generateMetadata` reads `searchParams.building`. If set, returns `alternates: { canonical: "/character/${slug}" }`. Title can stay as town title (Google uses canonical for content attribution)
- **`/zine`**: explicit `alternates: { canonical: "/zine" }` overriding the layout default. Reuses `collectionJsonLd` block verbatim from current homepage
- **`/character/[slug]`**: unchanged
- **`app/sitemap.ts`**: add `/zine` static entry + one `/character/{slug}` entry per row in `characters`. New `fetchSitemapCharacters()` in `lib/stats.ts`. `?building=` variants excluded
- **`app/robots.ts`**: no change
- **URL contract break**: old `/?sort=hot` and `/?covered=1` inbound links land on the town and the town ignores them. Documented, no redirect added (site is 2 weeks old, traffic low)

### Error handling

| Condition | Behavior |
|---|---|
| `building_url IS NULL` (status `pending`/`generating`/`failed`/`skipped`) | Render placeholder tile: existing avatar inside grunge frame + "wip" tag-font label |
| Slug in JSON missing from DB | **Throw** at request time → 500. Logs offending slug |
| Slug in DB missing from JSON | **Throw** at request time → 500. Logs offending slug |
| Duplicate or overlapping JSON entries | **Throw** at request time → 500. Logs name(s) |
| `?building=unknown-slug` | `fetchCharacterBySlug` returns null → server `redirect("/")` |
| `?building=` set + character has no avatar | Drawer still renders with `?!` avatar fallback (current `CharacterHero` behavior) |
| Supabase fetch failure | Render the existing "empty zine" placeholder pattern at `/` (mirrors current homepage fallback) |

### Tests (vitest)

All tests live in the flat `tests/` directory (project convention).

| Test file | Covers |
|---|---|
| `tests/town-layout.test.ts` | JSON parse, **all four throw paths** (slug-in-JSON-not-DB, slug-in-DB-not-JSON, duplicates, overlaps), happy-path merge |
| `tests/building-prompt.test.ts` | Style guide tokens present (fisheye, ink, grunge, palette anchors). Banned tokens absent (pixel, 3D, glossy, pastel). `BUILDING_STYLE_VERSION` exported |
| `tests/generate-building.test.ts` | Mock OpenAI + Blob + Supabase. Asserts success path updates URL/status/cost; failure path sets `building_error` |
| `tests/town-map.test.tsx` | Renders correct `grid-column` / `grid-row` positions from layout array |
| `tests/building-drawer.test.tsx` | Renders mirrored CharacterHero content. "Deep dive" link points to `/character/[slug]`. No skills chip rendered |
| `tests/town-page.test.tsx` | Drawer open (with `?building=`) vs closed states. `generateMetadata` returns correct canonical |
| `tests/generate-buildings-route.test.ts` | Auth gates: CRON_SECRET fallback works, DIPTYCH_CRON_SECRET works, unauthed 401 |

Coverage ratchet: run `npm run quality`; if coverage drops below current floor, fix until green. Bump intentionally via `npm run ratchet`.

## Out of scope

Deferred to sub-projects D and E (per `design/sub-project-b-characters.md` lines 428–432):

- Influencer activity feed (D) — "Matt shipped X this week" inset inside drawer
- Auth + following + personalized homepage (E)
- Multi-neighborhood map / zoom levels
- Animated tile transitions, day/night cycle, weather
- Replacing `town-layout.json` with a CMS (only relevant at 30+ characters)
- Switching drawer to client-side `history.pushState` (only if perf complaint)
- Sort URL redirects from `/` to `/zine` (revisit if analytics show real traffic on `/?sort=*`)

## Risks

- **Style drift on building tiles** — the locked DNA was tuned for character close-ups. Adding the storefront frame (~15% of the image) is a new composition. **Mitigation**: generate ONE tile first via the operator regen route, review for style fit, iterate on `building-prompt.ts`, then let the cron drain the remaining six. Do not bulk-generate before review.
- **CSS storefront decoration carries cell-size variance** — if the CSS panels (brick, signage, stoop) don't read as "more building" for tall/wide cells, the layout looks like 7 stickers on a grid. Mitigation: prototype the 1×1, 1×2, and 2×1 variants on a dev sketch before committing the layout JSON.
- **`/zine` SEO regression** — moving the indexed homepage to `/zine` will cause a short rank drop. Mitigation: explicit `canonical: "/zine"` on zine page + sitemap entry. Accepted because skillzs.dev is 2 weeks old.
- **Strict drift policy = full page 500 on JSON/DB mismatch** — if a character is seeded but the deploy didn't include a layout update, `/` returns 500 until reconciled. Mitigation: bundle layout updates in the same PR that touches `SEED_CHARACTERS`; vitest test on `town-layout` catches obvious omissions in CI.

## File touch list (full breakdown in implementation plan)

New:
- `supabase/migrations/0009_characters_buildings.sql`
- `lib/character/random.ts` (extracted from `prompt.ts`)
- `lib/character/building-prompt.ts`
- `lib/character/generate-building.ts`
- `lib/town/layout.ts`
- `app/api/cron/generate-buildings/route.ts`
- `app/zine/page.tsx`
- `components/town-map.tsx`
- `components/building-tile.tsx`
- `components/building-drawer.tsx`
- `components/drawer-skeleton.tsx`
- `design/town-layout.json`
- 7 new files in `tests/` (see Tests table above)

Modified:
- `app/page.tsx` (full rewrite — TownPage)
- `app/layout.tsx` (NAV adds zine entry)
- `app/sitemap.ts` (zine + character entries)
- `lib/stats.ts` (extend `CHARACTER_PUBLIC_COLUMNS` with `building_url`, add `fetchCharactersForTown`, add `fetchSitemapCharacters`)
- `lib/seo.ts` (zine route metadata helper)
- `lib/character/prompt.ts` (import `pick`/`slugHash` from `random.ts` instead of defining inline)
- `vercel.json` (new cron entry `0 7 * * *`)
- `app/api/regen/character/[slug]/route.ts` (accept `?asset=building`)

---

Next step after spec approval: invoke `superpowers:writing-plans` to produce the implementation plan.
