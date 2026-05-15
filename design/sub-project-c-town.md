---
name: sub-project-c-town
description: skillZs sub-project C — Aquarius town map at /, zine moves to /zine, hybrid drawer over character pages
status: spec
date: 2026-05-15
depends-on: sub-project-b-characters
---

# Sub-project C — Aquarius town map

## Goal

Replace the homepage with a 7-building town. Each building is a fisheye render of one character's storefront. Clicking a building opens a drawer summary with a deep-link to the existing `/character/[slug]` page. The current zine homepage (hero carousel, manifesto, skill rows) moves to `/zine`, intact.

Sub-project B already built the data foundation (`characters` table, 7 live rows, avatars on Blob). C consumes those rows. No new characters needed.

## Decisions locked (brainstorm session 2026-05-15)

| # | Decision | Choice |
|---|---|---|
| D1 | Tile aesthetic | Tile grid of fisheye **building exteriors**, one new `gpt-image-1` render per character (~$0.28 one-time for 7) |
| D2 | Layout source of truth | `design/town-layout.json`, explicit `(x, y, w, h)` per slug. Auto-tail rule for slugs in DB but absent from JSON |
| D3 | Building click behavior | Hybrid drawer: slides in (right on desktop, bottom sheet on mobile). URL = `?building=slug`. "Deep dive" link goes to `/character/[slug]` |
| D4 | Homepage placement | Town **replaces** `/`. Current zine moves to `/zine`. Header nav gains `zine` entry |
| D5 | Mobile fallback | Vertical single-column stack — CSS Grid flips to `flex-col` at `< lg` |

## Unilateral spec-level calls

These were not part of D1–D5 but follow from them. Flag in spec review if any are wrong.

1. **Drawer is server-rendered, URL-driven** — not a client modal. Simpler, SEO-friendly, no client JS for state. Trade-off: each open/close is a small server roundtrip.
2. **Iso "feel" lives in the artwork**, not in CSS — layout is a plain CSS Grid. Each tile is painted at a fisheye 3/4 angle. No CSS skew gymnastics, mobile cost = 0.
3. **Cron schedule `0 7 * * *` UTC** for building generation. Avoids collisions with ingest (Sun 06:00), avatars (05:00), diptychs (04:00).
4. **Placeholder for `building_status≠done`** = existing avatar inside a grunge frame, mirroring the avatar-fallback pattern already in `components/character-hero.tsx`.
5. **Invalid `?building=slug`** → server redirects to `/` (drop the param). Same shape as the `notFound()` path on `/character/[slug]`.

## Architecture

### Database

Migration: `supabase/migrations/0009_characters_buildings.sql`

```sql
alter table characters
  add column building_url text,
  add column building_status text not null default 'pending'
    check (building_status in ('pending', 'queued', 'done', 'failed')),
  add column building_prompt text;

-- per supabase-rls-default memory: extend grant + ensure policy covers new cols
grant select (
  id, slug, kind, name, role, bio, gh_handle, x_handle, site_url, avatar_url,
  building_url, building_status
) on characters to anon, authenticated;
```

Policy `characters_read` from `0008_characters_rls.sql` is `using (true)` — already covers row visibility. Only the column grant changes.

`building_prompt` is intentionally NOT in the public grant (operator-only debug).

### Storage

Vercel Blob path: `buildings/{slug}-{hash}.png` (public). Mirrors the existing avatar path scheme.

### Image generation pipeline (mirrors avatars)

| File | Role |
|---|---|
| `lib/character/building-prompt.ts` | Style-guide-locked prompt template. Subject = character's storefront, fisheye 3/4 angle, character peeking through window/door, graffiti tag = name, speech bubble glyph |
| `lib/character/generate-building.ts` | `generateBuildingForCharacter(slug)` — calls OpenAI `gpt-image-1` (low), uploads to Blob, updates `characters.building_url` + `building_status='done'` |
| `app/api/cron/generate-buildings/route.ts` | Cron handler. Drains `building_status='pending'` (or `queued`) in batches. Auth: `DIPTYCH_CRON_SECRET` primary + `allowCronSecretFallback: true` (per `cron-auth-fallback` memory) |
| `vercel.json` | Add `{ "path": "/api/cron/generate-buildings", "schedule": "0 7 * * *" }` |
| `app/api/regen/character/[slug]/route.ts` | Extend existing operator regen route to also accept `?asset=building` — triggers a one-shot rebuild |

Initial population: deploy → cron fires next morning → 7 builds at ~$0.04 each. Operator can backfill manually via the regen route.

### Routes

| Path | After C |
|---|---|
| `/` | NEW `app/page.tsx` — TownPage (server) |
| `/zine` | NEW `app/zine/page.tsx` — body of current `app/page.tsx` moved here verbatim; keeps current metadata + `revalidate = 300` |
| `/character/[slug]` | unchanged |
| `/browse`, `/category/*`, `/skill/*` | unchanged |

`app/layout.tsx` `NAV` array gains `{ href: "/zine", label: "zine" }`. Logo `<Link href="/">` semantically now means "town home", which is correct.

### Components

All server-rendered. No client state.

| File | Responsibility |
|---|---|
| `components/town-map.tsx` | Reads merged layout × characters list, renders flat CSS Grid. Each cell placed via `grid-column: x / span w; grid-row: y / span h;` |
| `components/building-tile.tsx` | One tile. `<Link href="/?building=slug">` wraps a building image (or placeholder if `building_status≠done`). Honors `w/h` for cell size |
| `components/building-drawer.tsx` | Accepts `character` prop. Renders avatar, name, role, bio excerpt, "skills shipped" count chip, and a primary CTA `→ deep dive` linking to `/character/[slug]`. Close link = `/`. Drawer slides in from right on desktop, bottom on mobile |

The drawer is part of the same server response as the map — open state is just `searchParams.building` being set.

### Layout config

`design/town-layout.json`:

```json
[
  { "slug": "zeke",    "x": 0, "y": 0, "w": 2, "h": 2 },
  { "slug": "matt",    "x": 2, "y": 0, "w": 1, "h": 1 },
  { "slug": "swyx",    "x": 3, "y": 0, "w": 2, "h": 1 },
  { "slug": "simon",   "x": 2, "y": 1, "w": 1, "h": 1 },
  { "slug": "andrej",  "x": 3, "y": 1, "w": 1, "h": 1 },
  { "slug": "harper",  "x": 4, "y": 1, "w": 1, "h": 1 },
  { "slug": "mitchell","x": 0, "y": 2, "w": 1, "h": 1 }
]
```

(Exact placement is illustrative — designer will iterate during execution.)

`lib/town/layout.ts` exposes `loadTownLayout()`:

- Reads JSON (build-time `import` is fine; no runtime FS)
- Fetches all `characters` rows
- Merge rules:
  - slug in JSON, not in DB → **skip** + `console.warn`
  - slug in DB, not in JSON → **auto-tail** into the next free 1×1 cell in row-major order. Grid width is `max(x + w)` across JSON entries; scan starts at `(0, 0)` and advances to a new row once the current one is saturated
  - duplicate slugs in JSON → **throw** (fail loud at request time; surfaces in `console.error` and 500)
  - overlapping cells in JSON → **throw** (same reason)

### Data flow

```
TownPage (server)
  └─ parallel:
       ├─ loadTownLayout()  → tiles[]
       └─ if searchParams.building:
            fetchCharacterBySlug(slug)  → drawerCharacter
  └─ render:
       <TownMap tiles={tiles} />
       {drawerCharacter && <BuildingDrawer character={drawerCharacter} />}
```

Click flow:

1. User taps tile → `<Link href="/?building=zeke">` → server re-renders w/ drawer open
2. Tap "deep dive" → standard nav to `/character/zeke`
3. Tap close (or backdrop) → `<Link href="/">` → drawer state cleared

`revalidate = 120` on `/` (matches `/character/[slug]`).

### SEO

- `/`: WebPage + ItemList JSON-LD covering the 7 characters. Each tile renders the character name as visible heading text (`h2`/`h3`) and adds `aria-label="Open {name}'s storefront"` to the link wrapper — crawler-readable + screen-reader-friendly
- `/zine`: inherits all current homepage metadata + `collectionJsonLd` block verbatim
- `app/sitemap.ts`: add `/zine` static entry + one `/character/{slug}` entry per row in `characters` (new `fetchSitemapCharacters()` in `lib/stats.ts`). `?building=` query variants are excluded
- `app/robots.ts`: no change
- `lib/seo.ts`: extend `categoryRoutes` or add a `staticRoutes` entry for `/zine`

### Error handling

| Condition | Behavior |
|---|---|
| `building_status='pending'` or row has no `building_url` | Render placeholder tile: existing avatar inside grunge frame + "wip" tag-font label |
| `building_status='failed'` | Same placeholder, no auto-retry from page (cron handles retries) |
| Slug present in JSON but missing from DB | Skip tile, `console.warn`. Page still renders the rest |
| Slug present in DB but missing from JSON | Auto-tail into next free cell |
| Duplicate or overlapping JSON entries | Throw → 500. Logs name the offending slug |
| `?building=unknown-slug` | Server detects null character, redirects to `/` |
| Supabase fetch failure | Render empty town with the same "empty zine" placeholder pattern used today on homepage |

### Tests (vitest)

All tests live in the flat `tests/` directory (project convention).

| Test file | Covers |
|---|---|
| `tests/town-layout.test.ts` | JSON parse, duplicate detection, overlap detection, auto-tail placement |
| `tests/building-prompt.test.ts` | Style guide tokens present (fisheye, ink, grunge, palette terms), no banned tokens (pixel, 3D, glossy) |
| `tests/generate-building.test.ts` | Mock OpenAI + Blob, asserts row update on success + failure paths |
| `tests/town-map.test.tsx` | Renders correct cell positions from layout array |
| `tests/building-drawer.test.tsx` | Renders character data, "deep dive" link points to `/character/[slug]` |
| `tests/town-page.test.tsx` | Drawer open vs closed states based on `?building=` searchParam |
| `tests/generate-buildings-route.test.ts` | Auth gates (CRON_SECRET fallback works, DIPTYCH_CRON_SECRET works, unauthed 401) |

Coverage ratchet: run `npm run quality`; if coverage drops below current floor, fix until green. Bump intentionally via `npm run ratchet`.

## Out of scope

Deferred to sub-projects D and E (per `design/sub-project-b-characters.md` lines 428–432):

- Influencer activity feed (D) — "Matt shipped X this week" inset inside drawer
- Auth + following + personalized homepage (E)
- Multi-neighborhood map / zoom levels
- Animated tile transitions, day/night cycle, weather
- Replacing `town-layout.json` with a CMS (only relevant at 30+ characters)
- Switching drawer to client-side `history.pushState` (only if perf complaint)

## Risks

- **Style drift on building tiles** — the locked fisheye DNA was tuned for character close-ups. Storefront exteriors are a different composition. The first 1–2 rendered tiles must be reviewed before bulk-generating all 7; if drift is bad, iterate on `building-prompt.ts` before the cron drains the queue.
- **Iso feel on flat grid** — if the artwork doesn't carry the iso vibe on its own, the result looks like 7 stickers on a wall. Mitigation: prompt template enforces 3/4 angle + shared ground line.
- **`/zine` SEO regression** — moving the indexed homepage to `/zine` will cause a short rank drop. Acceptable: skillzs.dev is young enough that the cost is small, and the town is the new identity.

## File touch list (rough — full breakdown in implementation plan)

New:
- `supabase/migrations/0009_characters_buildings.sql`
- `lib/character/building-prompt.ts`
- `lib/character/generate-building.ts`
- `lib/town/layout.ts`
- `app/api/cron/generate-buildings/route.ts`
- `app/zine/page.tsx`
- `components/town-map.tsx`
- `components/building-tile.tsx`
- `components/building-drawer.tsx`
- `design/town-layout.json`
- 7 new files in `tests/` (see Tests table above)

Modified:
- `app/page.tsx` (full rewrite — TownPage)
- `app/layout.tsx` (NAV adds zine entry)
- `app/sitemap.ts` (zine + character entries)
- `lib/stats.ts` (extend `CHARACTER_PUBLIC_COLUMNS`, add `fetchCharactersForTown`, `fetchSitemapCharacters`)
- `lib/seo.ts` (zine route metadata)
- `vercel.json` (new cron entry)
- `app/api/regen/character/[slug]/route.ts` (accept `?asset=building`)

---

Next step after spec approval: invoke `superpowers:writing-plans` to produce the implementation plan.
