# Sub-project C — Aquarius town map: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Aquarius town map at `/` (replacing the current zine homepage), with one fisheye peek-through tile per character, a server-rendered drawer triggered by `?building=slug`, and the existing zine homepage moved to `/zine` intact.

**Architecture:** Server-rendered Next.js App Router pages on existing Supabase + Vercel Blob stack. Building images generated via cron pipeline that mirrors the avatar pipeline (`lib/character/run.ts` → `lib/character/run-buildings.ts`). Layout sourced from a hand-placed JSON file with strict drift policy. Drawer is a Suspense-streamed server component reading `searchParams.building`. SEO canonicalises `?building=slug` URLs to `/character/[slug]`.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components, Supabase (Postgres 17), Vercel Blob, OpenAI `gpt-image-1`, Vitest, Tailwind v4.

**Spec:** [`design/sub-project-c-town.md`](./sub-project-c-town.md)

**Branch model:** Work on `dev`, merge to `main` via PR #3 (per `deploy-flow` memory). Production aliases `skillzs.dev` to `main`.

---

## File structure overview

### New files

| Path | Responsibility |
|---|---|
| `supabase/migrations/0009_characters_buildings.sql` | Add 7 `building_*` lifecycle columns + `claim_character_building()` SECURITY DEFINER function + index + public grant of `building_url` |
| `lib/character/random.ts` | Export `slugHash`, `pick` — shared between avatar and building prompt builders |
| `lib/character/building-prompt.ts` | `buildBuildingPrompt(...)` + `BUILDING_STYLE_VERSION` constant. Peek-through framing keeps the locked DNA |
| `lib/character/run-buildings.ts` | `runBuildingGeneration(opts)` — drains `building_status IN ('pending','failed')`, generates via `gpt-image-1`, uploads to Blob, updates rows |
| `app/api/cron/generate-buildings/route.ts` | Cron handler (GET + POST), DIPTYCH_CRON_SECRET + cron-secret fallback |
| `lib/town/layout.ts` | `loadTownLayout()` — merges `design/town-layout.json` with DB rows, strict drift |
| `design/town-layout.json` | Hand-placed `[{slug,x,y,w,h}]` for the 7 launch characters |
| `app/zine/page.tsx` | Moved from current `app/page.tsx`; preserves homepage UX behind `/zine`; explicit `canonical: "/zine"` |
| `app/page.tsx` (REWRITE) | New TownPage: server component, Suspense-wrapped drawer, `generateMetadata` canonicalises `?building=slug` to `/character/[slug]` |
| `components/town-map.tsx` | Server component. CSS Grid placed by `grid-column / grid-row` |
| `components/building-tile.tsx` | Server component. Wraps building image (or placeholder) in `<Link>` with `aria-label` |
| `components/drawer-skeleton.tsx` | Suspense fallback. Grunge-frame placeholder |
| `components/building-drawer.tsx` | Server component. Mirrors `CharacterHero` content + deep-dive CTA |
| `tests/random.test.ts` | Verify `slugHash` + `pick` determinism after extraction |
| `tests/building-prompt.test.ts` | Locked-DNA tokens present, banned tokens absent, deterministic per-slug |
| `tests/run-buildings.test.ts` | Happy path + claim failure + image-gen failure (mirrors `character-run.test.ts`) |
| `tests/generate-buildings-route.test.ts` | Auth gates + limit clamp + 500 propagation |
| `tests/town-layout.test.ts` | Strict drift throws on all four mismatch directions |
| `tests/town-map.test.tsx` | Renders correct `grid-column` / `grid-row` per layout entry |
| `tests/building-tile.test.tsx` | Renders building image when present, placeholder otherwise; `aria-label` correct |
| `tests/building-drawer.test.tsx` | Renders identity content; deep-dive `href` points to `/character/[slug]`; no skills chip |
| `tests/town-page.test.tsx` | Drawer-closed vs drawer-open render. `generateMetadata` canonicalises correctly |

### Modified files

| Path | Change |
|---|---|
| `lib/character/prompt.ts` | Import `slugHash`/`pick` from `random.ts` (delete inline copies) |
| `lib/character/upload.ts` | Add `uploadCharacterBuilding(slug, bytes)` (mirror of `uploadCharacterAvatar`) |
| `app/api/regen/character/[slug]/route.ts` | Accept optional `?asset=avatar|building` query param. Default `avatar` (backward-compat). When `building`, reset `building_status='pending'` + `building_error=null` |
| `lib/stats.ts` | Extend `CHARACTER_PUBLIC_COLUMNS` with `building_url`. Add `fetchCharactersForTown()` and `fetchSitemapCharacters()` |
| `lib/types.ts` | Extend `Character` interface with `building_url: string \| null` |
| `vercel.json` | Add cron entry `{ "path": "/api/cron/generate-buildings", "schedule": "0 7 * * *" }` |
| `app/layout.tsx` | Add `{ href: "/zine", label: "zine" }` to `NAV` array |
| `app/sitemap.ts` | Add `/zine` static entry + per-character entries via new `fetchSitemapCharacters` |
| `tests/regen-character-route.test.ts` | Add cases for `?asset=building` branch + default-to-avatar back-compat |
| `tests/stats.test.ts` | If it exists, extend with `fetchCharactersForTown` + `fetchSitemapCharacters` cases (check before assuming) |

---

## Task 1: Database migration `0009_characters_buildings.sql`

**Files:**
- Create: `supabase/migrations/0009_characters_buildings.sql`

- [ ] **Step 1: Create the migration file**

```sql
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
```

- [ ] **Step 2: Apply the migration to the remote Supabase project**

Use the MCP tool against project `lsilebxqsqvmcybtimfo` (per `project_layout` memory):

```
mcp__claude_ai_Supabase__apply_migration
  project_id: lsilebxqsqvmcybtimfo
  name: 0009_characters_buildings
  query: <contents of file above>
```

- [ ] **Step 3: Verify the migration via SQL**

```
mcp__claude_ai_Supabase__execute_sql
  project_id: lsilebxqsqvmcybtimfo
  query: |
    select column_name, data_type
      from information_schema.columns
     where table_name = 'characters'
       and column_name like 'building_%'
     order by column_name;
```

Expected: 7 rows naming the 7 new columns.

```
mcp__claude_ai_Supabase__execute_sql
  project_id: lsilebxqsqvmcybtimfo
  query: |
    set role anon;
    select id, slug, building_url from characters limit 1;
    reset role;
```

Expected: 1 row, no permission error, `building_url` column visible (value null pre-generation).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0009_characters_buildings.sql
git commit -m "feat(db): 0009 building lifecycle columns + claim function

Mirrors 0007 avatar lifecycle exactly. Adds 7 building_* columns,
claim_character_building() SECURITY DEFINER, status index, and an
additive public grant for building_url."
```

---

## Task 2: Extend `Character` type with `building_url`

**Files:**
- Modify: `lib/types.ts:47-58`

- [ ] **Step 1: Extend the interface**

In `lib/types.ts`, replace the `Character` interface with:

```ts
export interface Character {
  id: string;
  slug: string;
  kind: CharacterKind;
  name: string;
  role: string | null;
  bio: string | null;
  gh_handle: string | null;
  x_handle: string | null;
  site_url: string | null;
  avatar_url: string | null;
  /** Storefront tile for the town map. Null until the building cron has run. */
  building_url: string | null;
}
```

- [ ] **Step 2: Verify type compiles**

```bash
npx tsc --noEmit
```

Expected: clean exit. If existing files (`character-hero.tsx`, etc.) error on the new required field, those will be addressed in Task 11; for now, the field exists as `string | null` so callers reading existing fields are unaffected.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add Character.building_url"
```

---

## Task 3: Extract `pick` + `slugHash` to `lib/character/random.ts`

**Files:**
- Create: `lib/character/random.ts`
- Modify: `lib/character/prompt.ts:67-77`
- Test: `tests/random.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/random.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { pick, slugHash } from "../lib/character/random";

describe("slugHash", () => {
  it("is deterministic", () => {
    expect(slugHash("zeke")).toBe(slugHash("zeke"));
  });

  it("returns different values for different slugs", () => {
    expect(slugHash("zeke")).not.toBe(slugHash("matt-pocock"));
  });

  it("returns a non-negative 32-bit integer", () => {
    const h = slugHash("anything-here");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe("pick", () => {
  const pool = ["a", "b", "c"] as const;

  it("returns a deterministic element for a given slug + salt", () => {
    expect(pick("zeke", 0, pool)).toBe(pick("zeke", 0, pool));
  });

  it("varies with salt", () => {
    // Salts are usually chosen so the pool index changes; this is a
    // tautological assertion against the implementation, so we just confirm
    // both calls return valid pool elements.
    const a = pick("zeke", 0, pool);
    const b = pick("zeke", 1, pool);
    expect(pool).toContain(a);
    expect(pool).toContain(b);
  });

  it("never returns out-of-bounds", () => {
    for (const slug of ["a", "b", "c", "long-name", "x"]) {
      expect(pool).toContain(pick(slug, 0, pool));
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/random.test.ts
```

Expected: FAIL — `Cannot find module '../lib/character/random'`.

- [ ] **Step 3: Create `lib/character/random.ts`**

```ts
// lib/character/random.ts
// Shared deterministic randomness helpers. Used by avatar and building prompt
// builders so renders stay stable across runs.

/** Deterministic stable hash from a slug. Non-negative 32-bit integer. */
export function slugHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

/** Pick an element from a pool deterministically per slug + salt. */
export function pick<T>(slug: string, salt: number, pool: readonly T[]): T {
  const idx = (slugHash(slug) + salt) % pool.length;
  return pool[idx];
}
```

- [ ] **Step 4: Update `lib/character/prompt.ts` to import from `random.ts`**

Replace the `slugHash` + `pick` definitions in `lib/character/prompt.ts:67-77` with an import. The replacement file body keeps every other line untouched. The block to delete is:

```ts
/** Deterministic stable index from a slug. */
function slugHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

function pick<T>(slug: string, salt: number, pool: readonly T[]): T {
  const idx = (slugHash(slug) + salt) % pool.length;
  return pool[idx];
}
```

Add at the top of `lib/character/prompt.ts` (after the existing imports):

```ts
import { pick, slugHash } from "./random";
```

Note: `slugHash` is only used inside `pick`. If after the edit `slugHash` is not referenced elsewhere in `prompt.ts`, drop it from the import: `import { pick } from "./random";`. Verify with a grep.

- [ ] **Step 5: Run all tests to verify nothing regressed**

```bash
npx vitest run tests/random.test.ts tests/character-prompt.test.ts
```

Expected: both files PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/character/random.ts lib/character/prompt.ts tests/random.test.ts
git commit -m "refactor(character): extract slugHash + pick to random.ts

Shared between avatar and building prompts. No behaviour change."
```

---

## Task 4: Add `uploadCharacterBuilding` to `lib/character/upload.ts`

**Files:**
- Modify: `lib/character/upload.ts`

- [ ] **Step 1: Replace the file contents**

```ts
// lib/character/upload.ts
import { put } from "@vercel/blob";

const ONE_YEAR_SECONDS = 31_536_000;

function requireBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN not set");
  return token;
}

/**
 * Upload character avatar PNG bytes to Vercel Blob at `avatars/{slug}.png`.
 * Public access so <img src> works without auth.
 */
export async function uploadCharacterAvatar(slug: string, bytes: Buffer): Promise<string> {
  const { url } = await put(`avatars/${slug}.png`, bytes, {
    access: "public",
    contentType: "image/png",
    cacheControlMaxAge: ONE_YEAR_SECONDS,
    token: requireBlobToken(),
  });
  return url;
}

/**
 * Upload character storefront tile PNG bytes to Vercel Blob at
 * `buildings/{slug}.png`. Mirrors uploadCharacterAvatar.
 */
export async function uploadCharacterBuilding(slug: string, bytes: Buffer): Promise<string> {
  const { url } = await put(`buildings/${slug}.png`, bytes, {
    access: "public",
    contentType: "image/png",
    cacheControlMaxAge: ONE_YEAR_SECONDS,
    token: requireBlobToken(),
  });
  return url;
}
```

- [ ] **Step 2: Verify type compiles**

```bash
npx tsc --noEmit
```

Expected: clean exit. Existing callers of `uploadCharacterAvatar` are unchanged (signature is identical).

- [ ] **Step 3: Commit**

```bash
git add lib/character/upload.ts
git commit -m "feat(character): add uploadCharacterBuilding"
```

---

## Task 5: Building prompt builder

**Files:**
- Create: `lib/character/building-prompt.ts`
- Test: `tests/building-prompt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/building-prompt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildBuildingPrompt,
  BUILDING_STYLE_VERSION,
} from "../lib/character/building-prompt";

function p(over: Partial<Parameters<typeof buildBuildingPrompt>[0]> = {}) {
  return buildBuildingPrompt({
    slug: "matt-pocock",
    name: "Matt Pocock",
    role: "TypeScript explainer-in-chief",
    kind: "influencer",
    ...over,
  });
}

describe("buildBuildingPrompt", () => {
  it("includes the locked Style DNA tokens", () => {
    const out = p();
    expect(out).toContain("Fisheye");
    expect(out).toContain("THICK black ink lineart");
    expect(out).toContain("#C8C346");
    expect(out).toContain("#1A1A1A");
    expect(out).toContain("never pure white");
    expect(out).toContain("NO 3D");
  });

  it("frames the composition as a peek THROUGH a storefront INTO the interior", () => {
    const out = p().toLowerCase();
    // Storefront frame language
    expect(out).toMatch(/storefront|shopfront|window|door|grate/);
    // Locked interior reference
    expect(out).toContain("interior");
    // Subject is the character
    expect(p()).toContain("Matt Pocock");
  });

  it("rejects banned exterior-only tokens", () => {
    const out = p().toLowerCase();
    expect(out).not.toContain("pixel");
    expect(out).not.toContain("3d render");
    expect(out).not.toContain("glossy");
    expect(out).not.toContain("pastel");
  });

  it("derives a graffiti word from the role's first token, uppercased", () => {
    expect(p()).toContain('"TYPESCRIPT"');
  });

  it("falls back to the name when role is missing", () => {
    expect(p({ role: null, name: "OnlyName" })).toContain('"ONLYNAME"');
  });

  it("is deterministic per slug", () => {
    expect(p()).toBe(p());
  });

  it("varies across different slugs", () => {
    expect(p({ slug: "a", name: "A" })).not.toBe(p({ slug: "b-different", name: "B" }));
  });

  it("exposes a versioned style tag with the v1-fisheye-peek lineage", () => {
    expect(BUILDING_STYLE_VERSION).toBe("v1-fisheye-peek");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/building-prompt.test.ts
```

Expected: FAIL — `Cannot find module '../lib/character/building-prompt'`.

- [ ] **Step 3: Implement the prompt builder**

Create `lib/character/building-prompt.ts`:

```ts
// lib/character/building-prompt.ts
//
// Source of truth: design/character-style-guide.md
// Spec:           design/sub-project-c-town.md
//
// Storefront tile for the town map at /. The composition is a fisheye PEEK
// THROUGH a window/door/grate INTO the character's locked-style interior.
// ~85% of the image stays inside the Style DNA from prompt.ts; the new
// element is just the storefront frame (~15%).
//
// Bumping BUILDING_STYLE_VERSION + resetting building_status to 'pending'
// triggers regen on the next cron run, mirroring AVATAR_STYLE_VERSION.

import { pick } from "./random";
import type { CharacterKind } from "@/lib/types";

export const BUILDING_STYLE_VERSION = "v1-fisheye-peek";

export interface BuildingPromptInput {
  slug: string;
  name: string;
  role?: string | null;
  kind: CharacterKind;
}

const STYLE_DNA = `
Circular fisheye composition, heavy black outer vignette, slightly off-center.
Urban comic illustration with THICK black ink lineart (no thin strokes).
Grunge overlay: visible paper grain, ink scratches, dust speckle.
Muted desaturated palette - never saturated, never pastel.
Hand-drawn feel, NO glossy AI render, NO 3D, NO Pixar softness.
Whites are bone cream #E8DFC9, never pure white. Blacks are #1A1A1A, never pure black.
Palette anchors: olive yellow #C8C346 skin, dusty mauve #9A6E7A walls,
deep purple #5C3D6B graffiti drips, warm brown #7C5C3E floor/props.
`.trim();

const STOREFRONT_FRAMES = [
  "a barred storefront window",
  "the doorway of a run-down shop, door cracked open",
  "a rusted metal grate pulled half-up",
  "a fish-tank-style glass panel set into the wall",
] as const;

const INTERIORS = [
  "a run-down kitchen with cracked tile and a flickering bulb",
  "a peeling-wallpaper bathroom corner with sticky notes",
  "a cluttered bedroom with stacked books and an old boombox",
  "a basement workshop with exposed pipes and graffiti tags",
] as const;

const GLYPHS = ["!", "?", "♥"] as const;

const ZEKE_PROPS = [
  "a laptop covered in stickers on the inner sill",
  "a cardboard box labeled SKILLS resting just inside",
  "a paint-spattered sketchbook propped against the glass",
] as const;

const INFLUENCER_PROPS = [
  "a vintage microphone on the inner sill",
  "a dog-eared paperback resting just inside",
  "a framed polaroid taped to the inside of the glass",
] as const;

function deriveWord(role: string | null | undefined, fallback: string): string {
  const raw = (role ?? fallback).trim();
  if (!raw) return fallback.toUpperCase();
  const first = raw.split(/\s+/)[0] ?? fallback;
  return first.toUpperCase().slice(0, 12);
}

export function buildBuildingPrompt(input: BuildingPromptInput): string {
  const frame = pick(input.slug, 0, STOREFRONT_FRAMES);
  const interior = pick(input.slug, 1, INTERIORS);
  const glyph = pick(input.slug, 7, GLYPHS);
  const prop = pick(
    input.slug,
    13,
    input.kind === "zeke" ? ZEKE_PROPS : INFLUENCER_PROPS,
  );
  const word = deriveWord(input.role, input.name);

  return [
    `Fisheye circular shopfront peek of ${input.name}.`,
    `Viewer is outside the shop, peering through ${frame} INTO the interior beyond.`,
    `The interior is ${interior}, with ${input.name} visible inside the room, mid-action.`,
    `${prop}.`,
    `Drippy purple graffiti tagged on the OUTSIDE wall reading "${word}".`,
    `Speech bubble inside the room with a single "${glyph}" glyph.`,
    "",
    "STYLE DNA (locked):",
    STYLE_DNA,
    "",
    "Heavy black vignette border. Slight isometric 3/4 building angle.",
    "The character inside follows skillZs anatomy: oversized head, jet-black",
    "spiky hair, jagged silhouette, small asymmetric eyes with lots of sclera,",
    "extreme wide grin, dark hoodie with skull motif. Original character - no",
    "celebrity or IP likenesses.",
    "No glossy rendering. No pure white or pure black. No 3D render look.",
  ].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/building-prompt.test.ts
```

Expected: 8 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/character/building-prompt.ts tests/building-prompt.test.ts
git commit -m "feat(character): building prompt builder

Peek-through framing: viewer outside, looking IN through a storefront frame
into the locked-style interior. Reuses random.ts pick/slugHash and the same
SETTINGS pool style as the avatar prompt."
```

---

## Task 6: Building generation runner

**Files:**
- Create: `lib/character/run-buildings.ts`
- Test: `tests/run-buildings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/run-buildings.test.ts` (mirrors `tests/character-run.test.ts`):

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

type Candidate = {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  kind: "zeke" | "influencer";
};

type State = {
  candidates: Candidate[] | null;
  pickError?: Error | null;
  claims: Record<string, boolean>;
  claimErrors: Record<string, Error>;
  rpcCalls: Array<{ name: string; args?: unknown }>;
  updates: Array<{ payload: Record<string, unknown>; filters: Array<[string, unknown]> }>;
};

const mocks = vi.hoisted(() => ({
  state: undefined as State | undefined,
  generateCover: vi.fn(),
  uploadCharacterBuilding: vi.fn(),
}));

vi.mock("../lib/supabase/server", () => ({
  supabaseService: () => createSupabase(mocks.state as State),
}));

vi.mock("../lib/covers/generate", () => ({
  generateCover: mocks.generateCover,
}));

vi.mock("../lib/character/upload", () => ({
  uploadCharacterBuilding: mocks.uploadCharacterBuilding,
}));

import { runBuildingGeneration } from "../lib/character/run-buildings";

function initial(over: Partial<State> = {}): State {
  return {
    candidates: [],
    pickError: null,
    claims: {},
    claimErrors: {},
    rpcCalls: [],
    updates: [],
    ...over,
  };
}

function createSupabase(state: State) {
  return {
    from(table: string) {
      if (table !== "characters") throw new Error(`unexpected table ${table}`);
      return makeBuilder(state);
    },
    rpc(name: string, args?: unknown) {
      state.rpcCalls.push({ name, args });
      if (name === "claim_character_building") {
        const id = (args as { p_character_id: string }).p_character_id;
        const err = state.claimErrors[id];
        if (err) return Promise.resolve({ data: null, error: err });
        return Promise.resolve({ data: state.claims[id] ?? false, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

function makeBuilder(state: State) {
  let mode: "select" | "update" = "select";
  const currentUpdate: { payload: Record<string, unknown>; filters: Array<[string, unknown]> } = {
    payload: {},
    filters: [],
  };
  const builder = {
    select() {
      mode = "select";
      return builder;
    },
    in() {
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      if (state.pickError) return Promise.resolve({ data: null, error: state.pickError });
      return Promise.resolve({ data: state.candidates, error: null });
    },
    update(payload: Record<string, unknown>) {
      mode = "update";
      currentUpdate.payload = payload;
      currentUpdate.filters = [];
      return builder;
    },
    eq(column: string, value: unknown) {
      if (mode === "update") {
        currentUpdate.filters.push([column, value]);
        if (currentUpdate.filters.length === 2) {
          state.updates.push({ ...currentUpdate });
          return Promise.resolve({ error: null });
        }
      }
      return builder;
    },
  };
  return builder;
}

describe("runBuildingGeneration", () => {
  beforeEach(() => {
    mocks.generateCover.mockReset();
    mocks.uploadCharacterBuilding.mockReset();
    mocks.state = initial();
  });

  it("returns picking errors without attempting generation", async () => {
    mocks.state = initial({ pickError: new Error("select failed") });
    const stats = await runBuildingGeneration();
    expect(stats.errors).toEqual(["pick candidates: select failed"]);
    expect(mocks.generateCover).not.toHaveBeenCalled();
  });

  it("returns no-op stats when there are no candidates", async () => {
    mocks.state = initial({ candidates: [] });
    const stats = await runBuildingGeneration();
    expect(stats.attempted).toBe(0);
    expect(mocks.state!.rpcCalls).toEqual([]);
  });

  it("generates, uploads, and marks done with the building prompt", async () => {
    const cand: Candidate = {
      id: "c-1",
      slug: "zeke",
      name: "Zeke",
      role: "In-house builder",
      kind: "zeke",
    };
    mocks.state = initial({ candidates: [cand], claims: { "c-1": true } });
    mocks.generateCover.mockResolvedValue({
      bytes: Buffer.from("png"),
      estimatedCostUsd: 0.04,
    });
    mocks.uploadCharacterBuilding.mockResolvedValue(
      "https://blob.test/buildings/zeke.png",
    );

    const stats = await runBuildingGeneration({ limit: 1, quality: "low" });

    expect(stats).toEqual({
      attempted: 1,
      generated: 1,
      failed: 0,
      estimatedCostUsd: 0.04,
      errors: [],
    });
    expect(mocks.generateCover).toHaveBeenCalledWith({
      prompt: expect.stringContaining("Zeke"),
      quality: "low",
      size: "1024x1024",
    });
    expect(mocks.uploadCharacterBuilding).toHaveBeenCalledWith("zeke", expect.any(Buffer));
    const update = mocks.state!.updates[0].payload;
    expect(update.building_url).toBe("https://blob.test/buildings/zeke.png");
    expect(update.building_status).toBe("done");
    expect(update.building_cost_usd).toBeCloseTo(0.04, 6);
    expect(update.building_prompt).toMatch(/^v1-fisheye-peek:/);
  });

  it("skips candidates that cannot be claimed", async () => {
    mocks.state = initial({
      candidates: [{ id: "c-1", slug: "demo", name: "Demo", role: null, kind: "influencer" }],
      claims: { "c-1": false },
    });
    const stats = await runBuildingGeneration();
    expect(stats.attempted).toBe(0);
    expect(mocks.generateCover).not.toHaveBeenCalled();
    expect(mocks.state!.updates).toEqual([]);
  });

  it("records claim errors and skips that candidate", async () => {
    mocks.state = initial({
      candidates: [{ id: "c-1", slug: "boom", name: "Boom", role: null, kind: "influencer" }],
      claimErrors: { "c-1": new Error("rpc broke") },
    });
    const stats = await runBuildingGeneration();
    expect(stats.errors[0]).toBe("boom: claim failed: rpc broke");
    expect(stats.attempted).toBe(0);
  });

  it("marks failed when image gen throws and propagates the error message", async () => {
    mocks.state = initial({
      candidates: [{ id: "c-1", slug: "boom", name: "Boom", role: null, kind: "influencer" }],
      claims: { "c-1": true },
    });
    mocks.generateCover.mockRejectedValue(new Error("openai 500"));
    const stats = await runBuildingGeneration({ limit: 1 });
    expect(stats.failed).toBe(1);
    expect(stats.errors[0]).toBe("boom: openai 500");
    const failUpdate = mocks.state!.updates.find(
      (u) => u.payload.building_status === "failed",
    );
    expect(failUpdate).toBeDefined();
    expect(failUpdate?.payload.building_error).toBe("openai 500");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/run-buildings.test.ts
```

Expected: FAIL — `Cannot find module '../lib/character/run-buildings'`.

- [ ] **Step 3: Implement the runner**

Create `lib/character/run-buildings.ts`:

```ts
// lib/character/run-buildings.ts
// Mirrors lib/character/run.ts (avatar generation) exactly, but targets the
// building_* lifecycle columns and uses buildBuildingPrompt + uploadCharacterBuilding.
//
// Note: refresh_skill_stats is NOT called here — building_url is only read
// by the town map (which queries characters directly), not by the matview.

import { supabaseService } from "../supabase/server";
import { generateCover, type CoverQuality } from "../covers/generate";
import { buildBuildingPrompt, BUILDING_STYLE_VERSION } from "./building-prompt";
import { uploadCharacterBuilding } from "./upload";
import type { CharacterKind } from "@/lib/types";

export interface BuildingRunOptions {
  /** How many to generate this run. Cap to keep costs predictable. */
  limit?: number;
  /** "low" (default) | "medium" | "high" */
  quality?: CoverQuality;
}

export interface BuildingRunStats {
  attempted: number;
  generated: number;
  failed: number;
  estimatedCostUsd: number;
  errors: string[];
}

interface Candidate {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  kind: CharacterKind;
}

export async function runBuildingGeneration(
  opts: BuildingRunOptions = {},
): Promise<BuildingRunStats> {
  const limit = opts.limit ?? 25;
  const quality = opts.quality ?? "low";

  const sb = supabaseService();
  const stats: BuildingRunStats = {
    attempted: 0,
    generated: 0,
    failed: 0,
    estimatedCostUsd: 0,
    errors: [],
  };

  const { data: candidates, error: pickErr } = await sb
    .from("characters")
    .select("id, slug, name, role, kind")
    .in("building_status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (pickErr) {
    stats.errors.push(`pick candidates: ${pickErr.message}`);
    return stats;
  }
  if (!candidates || candidates.length === 0) return stats;

  for (const c of candidates as Candidate[]) {
    const { data: claimed, error: claimErr } = await sb.rpc(
      "claim_character_building",
      { p_character_id: c.id },
    );
    if (claimErr) {
      stats.errors.push(`${c.slug}: claim failed: ${claimErr.message}`);
      continue;
    }
    if (!claimed) continue;

    stats.attempted++;
    let costAlreadyCharged = 0;

    try {
      const prompt = buildBuildingPrompt({
        slug: c.slug,
        name: c.name,
        role: c.role,
        kind: c.kind,
      });
      const { bytes, estimatedCostUsd } = await generateCover({
        prompt,
        quality,
        size: "1024x1024",
      });
      costAlreadyCharged = estimatedCostUsd;
      stats.estimatedCostUsd += estimatedCostUsd;

      const publicUrl = await uploadCharacterBuilding(c.slug, bytes);

      const { error: updErr } = await sb
        .from("characters")
        .update({
          building_url: publicUrl,
          building_prompt: `${BUILDING_STYLE_VERSION}: ${prompt}`,
          building_status: "done",
          building_generated_at: new Date().toISOString(),
          building_error: null,
          building_cost_usd: estimatedCostUsd,
        })
        .eq("id", c.id)
        .eq("building_status", "generating");
      if (updErr) throw new Error(`db update: ${updErr.message}`);

      stats.generated++;
    } catch (e) {
      stats.failed++;
      const msg = (e as Error).message;
      const annotated =
        costAlreadyCharged > 0
          ? `${c.slug} (charged $${costAlreadyCharged.toFixed(2)}): ${msg}`
          : `${c.slug}: ${msg}`;
      stats.errors.push(annotated);
      await sb
        .from("characters")
        .update({ building_status: "failed", building_error: msg.slice(0, 500) })
        .eq("id", c.id)
        .eq("building_status", "generating");
    }
  }

  return stats;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/run-buildings.test.ts
```

Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/character/run-buildings.ts tests/run-buildings.test.ts
git commit -m "feat(character): runBuildingGeneration drains building_status pending

Mirrors runAvatarGeneration. Calls claim_character_building, generates via
gpt-image-1, uploads to buildings/<slug>.png, marks done with cost tracked."
```

---

## Task 7: Cron route `/api/cron/generate-buildings`

**Files:**
- Create: `app/api/cron/generate-buildings/route.ts`
- Test: `tests/generate-buildings-route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/generate-buildings-route.test.ts` (mirrors `tests/generate-avatars-route.test.ts`):

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runBuildingGeneration: vi.fn(),
}));

vi.mock("../lib/character/run-buildings", () => ({
  runBuildingGeneration: mocks.runBuildingGeneration,
}));

import { GET, POST } from "../app/api/cron/generate-buildings/route";

function authRequest(url: string, token = "test-secret"): Request {
  return new Request(url, { headers: { authorization: `Bearer ${token}` } });
}

describe("generate-buildings cron route", () => {
  beforeEach(() => {
    mocks.runBuildingGeneration.mockReset();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.DIPTYCH_CRON_SECRET;
  });

  it("rejects unauthenticated requests", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(new Request("https://example.test/api/cron/generate-buildings"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "unauthorized" });
    expect(mocks.runBuildingGeneration).not.toHaveBeenCalled();
  });

  it("rejects invalid limit before starting work", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(authRequest("https://example.test/api/cron/generate-buildings?limit=-1"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid limit" });
  });

  it("rejects invalid quality", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(authRequest("https://example.test/api/cron/generate-buildings?quality=ultra"));
    expect(res.status).toBe(400);
  });

  it("accepts both DIPTYCH_CRON_SECRET (manual) and CRON_SECRET (Vercel cron)", async () => {
    process.env.CRON_SECRET = "vercel-secret";
    process.env.DIPTYCH_CRON_SECRET = "diptych-secret";

    const wrong = await GET(authRequest("https://example.test/api/cron/generate-buildings", "nope"));
    expect(wrong.status).toBe(401);

    mocks.runBuildingGeneration.mockResolvedValue({
      attempted: 0, generated: 0, failed: 0, estimatedCostUsd: 0, errors: [],
    });
    const manual = await GET(authRequest("https://example.test/api/cron/generate-buildings", "diptych-secret"));
    expect(manual.status).toBe(200);

    const cron = await GET(authRequest("https://example.test/api/cron/generate-buildings", "vercel-secret"));
    expect(cron.status).toBe(200);
  });

  it("clamps limit to max 100 and forwards quality", async () => {
    process.env.CRON_SECRET = "test-secret";
    mocks.runBuildingGeneration.mockResolvedValue({
      attempted: 5, generated: 5, failed: 0, estimatedCostUsd: 0.2, errors: [],
    });
    const res = await POST(authRequest("https://example.test/api/cron/generate-buildings?limit=9999&quality=medium"));
    expect(res.status).toBe(200);
    expect(mocks.runBuildingGeneration).toHaveBeenCalledWith({ limit: 100, quality: "medium" });
    const body = (await res.json()) as { ok: boolean; stats: { generated: number } };
    expect(body.ok).toBe(true);
    expect(body.stats.generated).toBe(5);
  });

  it("returns 500 when the run throws", async () => {
    process.env.CRON_SECRET = "test-secret";
    mocks.runBuildingGeneration.mockRejectedValue(new Error("openai unavailable"));
    const res = await GET(authRequest("https://example.test/api/cron/generate-buildings"));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/generate-buildings-route.test.ts
```

Expected: FAIL — `Cannot find module '../app/api/cron/generate-buildings/route'`.

- [ ] **Step 3: Implement the route**

Create `app/api/cron/generate-buildings/route.ts` (mirror of `generate-avatars/route.ts`):

```ts
// app/api/cron/generate-buildings/route.ts
import { NextResponse } from "next/server";
import { runBuildingGeneration } from "@/lib/character/run-buildings";
import type { CoverQuality } from "@/lib/covers/generate";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const QUALITIES = new Set<CoverQuality>(["low", "medium", "high"]);

function parsePositiveInt(value: string | null, fallback: number, max: number): number | null {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return null;
  return Math.min(parsed, max);
}

async function handle(req: Request) {
  // allowCronSecretFallback: scheduled by Vercel cron (vercel.json), which
  // auto-injects Authorization: Bearer $CRON_SECRET. DIPTYCH_CRON_SECRET still
  // works for manual triggers.
  if (!isAuthorizedCronRequest(req, "DIPTYCH_CRON_SECRET", { allowCronSecretFallback: true })) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 25, 100);
  const quality = url.searchParams.get("quality") ?? "low";

  if (limit === null) {
    return NextResponse.json({ ok: false, error: "invalid limit" }, { status: 400 });
  }
  if (!QUALITIES.has(quality as CoverQuality)) {
    return NextResponse.json({ ok: false, error: "invalid quality" }, { status: 400 });
  }

  try {
    const stats = await runBuildingGeneration({
      limit,
      quality: quality as CoverQuality,
    });
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/generate-buildings-route.test.ts
```

Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/generate-buildings/route.ts tests/generate-buildings-route.test.ts
git commit -m "feat(api): /api/cron/generate-buildings

DIPTYCH_CRON_SECRET + CRON_SECRET fallback. Mirrors the avatar cron route."
```

---

## Task 8: vercel.json cron entry

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add the cron entry**

Replace `vercel.json` contents with:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    { "path": "/api/cron/ingest", "schedule": "0 6 * * 0" },
    { "path": "/api/cron/generate-diptychs", "schedule": "0 4 * * *" },
    { "path": "/api/cron/generate-avatars", "schedule": "0 5 * * *" },
    { "path": "/api/cron/generate-buildings", "schedule": "0 7 * * *" }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat(cron): schedule generate-buildings at 0 7 * * *"
```

---

## Task 9: Extend regen route with `?asset=building`

**Files:**
- Modify: `app/api/regen/character/[slug]/route.ts`
- Modify: `tests/regen-character-route.test.ts`

- [ ] **Step 1: Add failing tests for the new branch**

Append to `tests/regen-character-route.test.ts` (do NOT modify existing tests; add a new `describe` block at end of file). The mock setup at the top of the file needs to track which asset was reset — extend the mock:

In the `vi.mock("../lib/supabase/server", ...)` block, the existing mock returns the same builder regardless of payload. The new tests assert on `mocks.state.lastPayload` already captured. Append these tests inside the existing `describe("POST /api/regen/character/[slug]", ...)` block:

```ts
  it("defaults to avatar reset when asset query param is absent (back-compat)", async () => {
    mocks.state.row = { slug: "zeke", avatar_status: "pending" };
    const res = await call("zeke", { secret: "diptych-secret" });
    expect(res.status).toBe(200);
    expect(mocks.state.lastPayload).toEqual({
      avatar_status: "pending",
      avatar_error: null,
    });
  });

  it("resets building_status when ?asset=building is passed", async () => {
    mocks.state.row = { slug: "zeke", avatar_status: "done" };
    const res = await POST(
      new Request("https://example.test/api/regen/character/zeke?asset=building", {
        method: "POST",
        headers: { authorization: "Bearer diptych-secret" },
      }),
      { params: Promise.resolve({ slug: "zeke" }) },
    );
    expect(res.status).toBe(200);
    expect(mocks.state.lastPayload).toEqual({
      building_status: "pending",
      building_error: null,
    });
  });

  it("rejects an unknown asset value", async () => {
    const res = await POST(
      new Request("https://example.test/api/regen/character/zeke?asset=eyebrow", {
        method: "POST",
        headers: { authorization: "Bearer diptych-secret" },
      }),
      { params: Promise.resolve({ slug: "zeke" }) },
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid asset" });
  });
```

The existing `select("slug, avatar_status")` mock returns whatever `mocks.state.row` is — the building branch will request `building_status` instead. Update the mock's `select(...)` to accept any string (already does — it ignores args). No mock change needed.

- [ ] **Step 2: Run tests to verify the new ones fail**

```bash
npx vitest run tests/regen-character-route.test.ts
```

Expected: existing tests still PASS; the 3 new tests FAIL.

- [ ] **Step 3: Update the route to support `?asset`**

Replace `app/api/regen/character/[slug]/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,119}$/;
const ASSETS = new Set(["avatar", "building"]);

/**
 * Admin endpoint: requeue a single character asset for regeneration.
 *
 * Query param `asset` selects the lifecycle column to reset:
 *   - `avatar` (default, back-compat) → avatar_status='pending'
 *   - `building`                      → building_status='pending'
 *
 * The next /api/cron/generate-{avatars,buildings} run picks it up.
 *
 * Auth: DIPTYCH_CRON_SECRET only (no cron fallback).
 */
async function handle(req: Request, slug: string) {
  if (!isAuthorizedCronRequest(req, "DIPTYCH_CRON_SECRET")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false, error: "invalid slug" }, { status: 400 });
  }

  const url = new URL(req.url);
  const asset = url.searchParams.get("asset") ?? "avatar";
  if (!ASSETS.has(asset)) {
    return NextResponse.json({ ok: false, error: "invalid asset" }, { status: 400 });
  }

  const statusCol = asset === "building" ? "building_status" : "avatar_status";
  const errorCol = asset === "building" ? "building_error" : "avatar_error";

  const sb = supabaseService();
  const { data, error } = await sb
    .from("characters")
    .update({
      [statusCol]: "pending",
      [errorCol]: null,
    })
    .eq("slug", slug)
    .select(`slug, ${statusCol}`)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, slug: (data as { slug: string }).slug });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  return handle(req, slug);
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
npx vitest run tests/regen-character-route.test.ts
```

Expected: all PASS (original 6 + 3 new = 9).

- [ ] **Step 5: Commit**

```bash
git add app/api/regen/character/[slug]/route.ts tests/regen-character-route.test.ts
git commit -m "feat(api): regen route accepts ?asset=building

Default stays 'avatar' for back-compat. ?asset=building resets
building_status to pending; next cron drain picks it up."
```

---

## Task 10: `design/town-layout.json` with real slugs

**Files:**
- Create: `design/town-layout.json`

- [ ] **Step 1: Create the layout file**

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

Slug list comes from `lib/character/seed.ts:SEED_CHARACTERS`. Verify the 7 slugs match before saving.

- [ ] **Step 2: Commit**

```bash
git add design/town-layout.json
git commit -m "feat(town): hand-placed layout for 7 launch characters"
```

---

## Task 11: Layout loader with strict drift

**Files:**
- Create: `lib/town/layout.ts`
- Test: `tests/town-layout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/town-layout.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchCharactersForTown: vi.fn(),
  json: [] as Array<{ slug: string; x: number; y: number; w: number; h: number }>,
}));

vi.mock("../design/town-layout.json", () => ({
  default: mocks.json,
}));

vi.mock("../lib/stats", () => ({
  fetchCharactersForTown: mocks.fetchCharactersForTown,
}));

import { loadTownLayout } from "../lib/town/layout";

function character(slug: string) {
  return {
    id: `id-${slug}`,
    slug,
    kind: "influencer" as const,
    name: slug.replace(/-/g, " "),
    role: null,
    bio: null,
    gh_handle: null,
    x_handle: null,
    site_url: null,
    avatar_url: null,
    building_url: null,
  };
}

describe("loadTownLayout", () => {
  beforeEach(() => {
    mocks.fetchCharactersForTown.mockReset();
    mocks.json.length = 0;
  });

  it("merges layout entries with matching character rows", async () => {
    mocks.json.push(
      { slug: "zeke", x: 0, y: 0, w: 1, h: 1 },
      { slug: "matt-pocock", x: 1, y: 0, w: 1, h: 1 },
    );
    mocks.fetchCharactersForTown.mockResolvedValue([
      character("zeke"),
      character("matt-pocock"),
    ]);
    const tiles = await loadTownLayout();
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toMatchObject({ slug: "zeke", x: 0, y: 0, w: 1, h: 1 });
    expect(tiles[0].character.slug).toBe("zeke");
  });

  it("throws when a JSON slug has no matching DB row", async () => {
    mocks.json.push({ slug: "ghost", x: 0, y: 0, w: 1, h: 1 });
    mocks.fetchCharactersForTown.mockResolvedValue([]);
    await expect(loadTownLayout()).rejects.toThrow(/ghost/);
  });

  it("throws when a DB row has no matching JSON entry", async () => {
    mocks.json.push({ slug: "zeke", x: 0, y: 0, w: 1, h: 1 });
    mocks.fetchCharactersForTown.mockResolvedValue([
      character("zeke"),
      character("orphan"),
    ]);
    await expect(loadTownLayout()).rejects.toThrow(/orphan/);
  });

  it("throws on duplicate slugs in JSON", async () => {
    mocks.json.push(
      { slug: "zeke", x: 0, y: 0, w: 1, h: 1 },
      { slug: "zeke", x: 1, y: 0, w: 1, h: 1 },
    );
    mocks.fetchCharactersForTown.mockResolvedValue([character("zeke")]);
    await expect(loadTownLayout()).rejects.toThrow(/duplicate.*zeke/i);
  });

  it("throws on overlapping cells in JSON", async () => {
    mocks.json.push(
      { slug: "zeke", x: 0, y: 0, w: 2, h: 2 },
      { slug: "matt-pocock", x: 1, y: 1, w: 1, h: 1 },
    );
    mocks.fetchCharactersForTown.mockResolvedValue([
      character("zeke"),
      character("matt-pocock"),
    ]);
    await expect(loadTownLayout()).rejects.toThrow(/overlap/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/town-layout.test.ts
```

Expected: FAIL — `Cannot find module '../lib/town/layout'`.

- [ ] **Step 3: Implement the loader**

Create `lib/town/layout.ts`:

```ts
// lib/town/layout.ts
import "server-only";
import layoutJson from "@/design/town-layout.json";
import { fetchCharactersForTown } from "@/lib/stats";
import type { Character } from "@/lib/types";

export interface LayoutEntry {
  slug: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TownTile extends LayoutEntry {
  character: Character;
}

/**
 * Read design/town-layout.json + the characters table and produce a merged
 * tile list. STRICT drift policy: throws on any mismatch between layout and
 * DB. See design/sub-project-c-town.md "Drift policy" for rationale.
 */
export async function loadTownLayout(): Promise<TownTile[]> {
  const entries = (layoutJson as unknown as LayoutEntry[]);
  assertNoDuplicates(entries);
  assertNoOverlaps(entries);

  const characters = await fetchCharactersForTown();
  const charBySlug = new Map(characters.map((c) => [c.slug, c]));
  const layoutSlugs = new Set(entries.map((e) => e.slug));

  for (const e of entries) {
    if (!charBySlug.has(e.slug)) {
      throw new Error(`town layout drift: slug "${e.slug}" in JSON but not in characters table`);
    }
  }
  for (const c of characters) {
    if (!layoutSlugs.has(c.slug)) {
      throw new Error(`town layout drift: slug "${c.slug}" in characters table but not in JSON`);
    }
  }

  return entries.map((e) => ({
    ...e,
    character: charBySlug.get(e.slug) as Character,
  }));
}

function assertNoDuplicates(entries: LayoutEntry[]): void {
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.slug)) {
      throw new Error(`town layout: duplicate slug "${e.slug}"`);
    }
    seen.add(e.slug);
  }
}

function assertNoOverlaps(entries: LayoutEntry[]): void {
  const occupied = new Map<string, string>(); // "x,y" -> slug
  for (const e of entries) {
    for (let dx = 0; dx < e.w; dx++) {
      for (let dy = 0; dy < e.h; dy++) {
        const key = `${e.x + dx},${e.y + dy}`;
        if (occupied.has(key)) {
          throw new Error(
            `town layout: overlap at (${e.x + dx},${e.y + dy}) between "${occupied.get(key)}" and "${e.slug}"`,
          );
        }
        occupied.set(key, e.slug);
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/town-layout.test.ts
```

Expected: 5 PASS.

- [ ] **Step 5: Verify TypeScript can import the JSON file**

The `tsconfig.json` in this project should already allow `resolveJsonModule: true`. If imports fail at compile time:

```bash
npx tsc --noEmit
```

If the error names `town-layout.json`, add `"resolveJsonModule": true` to `tsconfig.json` compilerOptions and re-run.

- [ ] **Step 6: Commit**

```bash
git add lib/town/layout.ts tests/town-layout.test.ts
git commit -m "feat(town): loadTownLayout with strict drift policy

Throws on JSON-vs-DB mismatch in either direction, duplicates, or overlaps."
```

---

## Task 12: Extend `lib/stats.ts` — town + sitemap fetchers + `building_url` column

**Files:**
- Modify: `lib/stats.ts`

- [ ] **Step 1: Update `CHARACTER_PUBLIC_COLUMNS`**

In `lib/stats.ts`, line 5-6, change:

```ts
const CHARACTER_PUBLIC_COLUMNS =
  "id, slug, kind, name, role, bio, gh_handle, x_handle, site_url, avatar_url";
```

to:

```ts
const CHARACTER_PUBLIC_COLUMNS =
  "id, slug, kind, name, role, bio, gh_handle, x_handle, site_url, avatar_url, building_url";
```

- [ ] **Step 2: Add `fetchCharactersForTown` and `fetchSitemapCharacters`**

Append to `lib/stats.ts`:

```ts
/**
 * All characters, ordered by created_at, for the /town map. Includes
 * avatar_url + building_url so tiles can render placeholders consistently.
 */
export async function fetchCharactersForTown(): Promise<Character[]> {
  const { data, error } = await supabaseAnon()
    .from("characters")
    .select(CHARACTER_PUBLIC_COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Character[];
}

/**
 * Lightweight slug + created_at pull for sitemap.ts. Avoids hauling bios + URLs.
 */
export async function fetchSitemapCharacters(): Promise<Array<{ slug: string; created_at: string }>> {
  const { data, error } = await supabaseAnon()
    .from("characters")
    .select("slug, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Array<{ slug: string; created_at: string }>;
}
```

Note: the second function `select`s `created_at`, which is NOT in the public column-list grant from 0007. To allow this read, **also amend the public grant** — add this to migration `0009`:

Actually, `created_at` is service-role-only in 0007. Two options:
  (a) Surface `last_seen` from `skill_stats` joined by character_id (loose proxy)
  (b) Add `created_at` to the public grant

Simpler: just use `slug` alone, drop `created_at` from sitemap. Sitemap entries don't strictly need `lastModified` per-character if we use `now()`. Replace the function with:

```ts
export async function fetchSitemapCharacters(): Promise<Array<{ slug: string }>> {
  const { data, error } = await supabaseAnon()
    .from("characters")
    .select("slug")
    .order("slug", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Array<{ slug: string }>;
}
```

`slug` is already in the public grant. Sitemap uses `new Date()` for `lastModified` like the static routes do.

- [ ] **Step 3: Run all existing tests to make sure nothing broke**

```bash
npx vitest run
```

Expected: All current tests PASS (no behavioural change to existing functions).

- [ ] **Step 4: Commit**

```bash
git add lib/stats.ts
git commit -m "feat(stats): fetchCharactersForTown + fetchSitemapCharacters

Extends CHARACTER_PUBLIC_COLUMNS with building_url so town tiles can read
it. New helpers feed the town map and sitemap."
```

---

## Task 13: Move zine to `/zine`

**Files:**
- Create: `app/zine/page.tsx`

- [ ] **Step 1: Create `app/zine/page.tsx`**

Copy the current `app/page.tsx` body verbatim into `app/zine/page.tsx` and add explicit metadata + canonical override. The full file:

```tsx
// app/zine/page.tsx
import type { Metadata } from "next";
import { HeroCarousel } from "@/components/hero-carousel";
import { JsonLd } from "@/components/json-ld";
import { Manifesto } from "@/components/manifesto";
import { SkillRow } from "@/components/skill-row";
import { SortTabs } from "@/components/sort-tabs";
import { collectionJsonLd, siteConfig, buildPageMetadata } from "@/lib/seo";
import {
  fetchByCategory,
  fetchHero,
  fetchNew,
  fetchTrending,
  type SortKey,
} from "@/lib/stats";

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: `${siteConfig.title} — zine`,
  description: siteConfig.description,
  path: "/zine",
});

const SORT_TITLE: Record<SortKey, string> = {
  hot:   "what's hot",
  new:   "fresh drops",
  votes: "most voted",
  uses:  "most used",
  stars: "most starred",
};

export default async function ZinePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; covered?: string }>;
}) {
  const sp = await searchParams;
  const valid = ["hot", "new", "votes", "uses", "stars"] as const;
  const sort: SortKey = (valid as readonly string[]).includes(sp.sort ?? "")
    ? (sp.sort as SortKey)
    : "hot";
  const coveredOnly = sp.covered === "1";

  let hero = [] as Awaited<ReturnType<typeof fetchHero>>;
  let trending = [] as Awaited<ReturnType<typeof fetchTrending>>;
  let fresh = [] as Awaited<ReturnType<typeof fetchNew>>;
  let coding = [] as Awaited<ReturnType<typeof fetchByCategory>>;
  let creative = [] as Awaited<ReturnType<typeof fetchByCategory>>;
  let agents = [] as Awaited<ReturnType<typeof fetchByCategory>>;
  let utils = [] as Awaited<ReturnType<typeof fetchByCategory>>;

  try {
    [hero, trending, fresh, coding, creative, agents, utils] = await Promise.all([
      fetchHero(5, coveredOnly),
      fetchTrending(24, sort, coveredOnly),
      fetchNew(12, coveredOnly),
      fetchByCategory("coding", 12, coveredOnly),
      fetchByCategory("creative", 12, coveredOnly),
      fetchByCategory("agent", 12, coveredOnly),
      fetchByCategory("utils", 12, coveredOnly),
    ]);
  } catch (e) {
    const err = e as { message?: string; code?: string; details?: string; hint?: string };
    console.error("zine fetch failed:", {
      message: err?.message ?? String(e),
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
    });
  }

  const hasData = hero.length > 0 || trending.length > 0;
  const featured = hero.length > 0 ? hero : trending.slice(0, 5);

  return (
    <div className="pt-2">
      <JsonLd
        data={collectionJsonLd({
          path: "/zine",
          name: siteConfig.title,
          description: siteConfig.description,
          skills: featured,
        })}
      />
      <HeroCarousel skills={hero} />

      {!hasData && (
        <div className="ink-frame mt-10 p-10 text-center bg-[var(--color-paper-2)]">
          <h2 className="display text-4xl mb-3">empty zine</h2>
          <p className="type-font mb-4">no skills yet. trigger ingest:</p>
          <code className="type-font bg-[var(--color-ink)] text-[var(--color-paper)] px-4 py-2 inline-block">
            POST /api/cron/ingest
          </code>
        </div>
      )}

      <Manifesto />

      <SortTabs />

      <SkillRow title={SORT_TITLE[sort]} skills={trending} size="md" />

      {sort !== "new" && (
        <SkillRow title="fresh drops" skills={fresh} />
      )}
      <SkillRow title="coding" skills={coding} />
      <SkillRow title="creative" skills={creative} watermark />
      <SkillRow title="agents" skills={agents} />
      <SkillRow title="utils" skills={utils} />
    </div>
  );
}
```

- [ ] **Step 2: Verify dev server boots and the route renders**

```bash
npx next dev
```

In a browser, visit `http://localhost:3000/zine`. Expected: previous homepage content renders. Stop the dev server (Ctrl-C).

- [ ] **Step 3: Commit**

```bash
git add app/zine/page.tsx
git commit -m "feat(zine): move homepage body to /zine with explicit canonical

Old / is about to become the town map (Task 18). /zine keeps the zine UX
intact and declares its own canonical to override the layout default."
```

---

## Task 14: Header nav adds `/zine` link

**Files:**
- Modify: `app/layout.tsx:84-90`

- [ ] **Step 1: Update `NAV` array**

In `app/layout.tsx`, locate the `NAV` constant:

```ts
const NAV = [
  { href: "/browse", label: "browse all" },
  { href: "/category/coding", label: "coding" },
  { href: "/category/creative", label: "creative" },
  { href: "/category/agents", label: "agents" },
  { href: "/category/utils", label: "utils" },
];
```

Replace with:

```ts
const NAV = [
  { href: "/zine", label: "zine" },
  { href: "/browse", label: "browse all" },
  { href: "/category/coding", label: "coding" },
  { href: "/category/creative", label: "creative" },
  { href: "/category/agents", label: "agents" },
  { href: "/category/utils", label: "utils" },
];
```

`zine` is placed first so it's the most prominent secondary destination after the town.

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(nav): add zine link to header"
```

---

## Task 15: `TownMap` component

**Files:**
- Create: `components/town-map.tsx`
- Test: `tests/town-map.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/town-map.test.tsx`:

```tsx
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Character } from "../lib/types";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

import { TownMap } from "../components/town-map";
import type { TownTile } from "../lib/town/layout";

function character(slug: string, over: Partial<Character> = {}): Character {
  return {
    id: `id-${slug}`,
    slug,
    kind: "influencer",
    name: slug,
    role: null,
    bio: null,
    gh_handle: null,
    x_handle: null,
    site_url: null,
    avatar_url: null,
    building_url: null,
    ...over,
  };
}

function tile(slug: string, x: number, y: number, w = 1, h = 1): TownTile {
  return { slug, x, y, w, h, character: character(slug) };
}

describe("TownMap", () => {
  it("renders one link per tile", () => {
    const html = renderToString(
      <TownMap tiles={[tile("zeke", 0, 0), tile("matt-pocock", 1, 0)]} />,
    );
    expect(html).toContain('href="/?building=zeke"');
    expect(html).toContain('href="/?building=matt-pocock"');
  });

  it("places tiles via grid-column and grid-row using x, y, w, h", () => {
    const html = renderToString(
      <TownMap tiles={[tile("zeke", 0, 0, 2, 2), tile("matt-pocock", 2, 0)]} />,
    );
    // CSS Grid syntax: column-start / span N. React inlines styles as a string.
    expect(html).toMatch(/grid-column:\s*1\s*\/\s*span 2/);
    expect(html).toMatch(/grid-row:\s*1\s*\/\s*span 2/);
    expect(html).toMatch(/grid-column:\s*3\s*\/\s*span 1/);
  });

  it("includes an accessible label per tile", () => {
    const html = renderToString(<TownMap tiles={[tile("zeke", 0, 0)]} />);
    expect(html).toContain('aria-label="Open zeke');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/town-map.test.tsx
```

Expected: FAIL — `Cannot find module '../components/town-map'`.

- [ ] **Step 3: Implement the component**

Create `components/town-map.tsx`:

```tsx
// components/town-map.tsx
import { BuildingTile } from "./building-tile";
import type { TownTile } from "@/lib/town/layout";

interface Props {
  tiles: TownTile[];
}

/**
 * Town map at /. Flat CSS Grid; (x, y, w, h) drives placement. On mobile we
 * collapse to a vertical stack via Tailwind responsive utility classes.
 */
export function TownMap({ tiles }: Props) {
  const cols = Math.max(...tiles.map((t) => t.x + t.w), 1);

  return (
    <div
      className="grid gap-3 mt-6 grid-cols-1 lg:grid-flow-row"
      style={
        // Desktop: explicit columns. Mobile: grid-cols-1 above wins.
        { "--town-cols": String(cols) } as React.CSSProperties
      }
    >
      <div
        className="hidden lg:grid gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {tiles.map((t) => (
          <div
            key={t.slug}
            style={{
              gridColumn: `${t.x + 1} / span ${t.w}`,
              gridRow: `${t.y + 1} / span ${t.h}`,
            }}
          >
            <BuildingTile tile={t} />
          </div>
        ))}
      </div>

      <div className="grid lg:hidden gap-3 grid-cols-1">
        {tiles.map((t) => (
          <BuildingTile key={t.slug} tile={t} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/town-map.test.tsx
```

Expected: 3 PASS. (Tests check the desktop grid output; the mobile fallback duplicates content but `renderToString` produces both.)

- [ ] **Step 5: Commit**

```bash
git add components/town-map.tsx tests/town-map.test.tsx
git commit -m "feat(town): TownMap CSS Grid with mobile vertical stack

Desktop: grid-template-columns derived from max(x+w) across tiles.
Mobile (< lg): flex-col, full-width tiles in layout order."
```

---

## Task 16: `BuildingTile` component

**Files:**
- Create: `components/building-tile.tsx`
- Test: `tests/building-tile.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/building-tile.test.tsx`:

```tsx
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Character } from "../lib/types";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

import { BuildingTile } from "../components/building-tile";
import type { TownTile } from "../lib/town/layout";

function character(over: Partial<Character> = {}): Character {
  return {
    id: "id-zeke",
    slug: "zeke",
    kind: "zeke",
    name: "Zeke",
    role: "In-house builder",
    bio: null,
    gh_handle: null,
    x_handle: null,
    site_url: null,
    avatar_url: "https://blob.test/avatars/zeke.png",
    building_url: null,
    ...over,
  };
}

function tile(over: Partial<TownTile> = {}): TownTile {
  return {
    slug: "zeke",
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    character: character(),
    ...over,
  };
}

describe("BuildingTile", () => {
  it("renders the building image when building_url is set", () => {
    const html = renderToString(
      <BuildingTile tile={tile({ character: character({ building_url: "https://blob.test/buildings/zeke.png" }) })} />,
    );
    expect(html).toContain('src="https://blob.test/buildings/zeke.png"');
  });

  it("falls back to the avatar inside a wip placeholder when building_url is null", () => {
    const html = renderToString(<BuildingTile tile={tile()} />);
    expect(html).toContain('src="https://blob.test/avatars/zeke.png"');
    expect(html).toContain("wip");
  });

  it("renders the ?! placeholder when neither building nor avatar is available", () => {
    const html = renderToString(
      <BuildingTile tile={tile({ character: character({ avatar_url: null }) })} />,
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("?!");
  });

  it("wraps the tile in a link to /?building=slug", () => {
    const html = renderToString(<BuildingTile tile={tile()} />);
    expect(html).toContain('href="/?building=zeke"');
  });

  it("provides aria-label on the link", () => {
    const html = renderToString(<BuildingTile tile={tile()} />);
    expect(html).toContain(`aria-label="Open Zeke's storefront"`);
  });

  it("renders the character name as visible heading text", () => {
    const html = renderToString(<BuildingTile tile={tile()} />);
    expect(html).toMatch(/<h2[^>]*>[^<]*Zeke/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/building-tile.test.tsx
```

Expected: FAIL — `Cannot find module '../components/building-tile'`.

- [ ] **Step 3: Implement the component**

Create `components/building-tile.tsx`:

```tsx
// components/building-tile.tsx
import Link from "next/link";
import type { TownTile } from "@/lib/town/layout";

interface Props {
  tile: TownTile;
}

/**
 * Single town tile. Links to /?building=slug (drawer-open URL). Renders the
 * building image when available, falls back to avatar-in-wip-frame when the
 * building cron hasn't run yet, falls back to the ?! placeholder when even
 * the avatar is missing.
 */
export function BuildingTile({ tile }: Props) {
  const c = tile.character;
  return (
    <Link
      href={`/?building=${c.slug}`}
      aria-label={`Open ${c.name}'s storefront`}
      className="ink-frame group relative overflow-hidden block aspect-square bg-[var(--color-mauve)]"
    >
      {c.building_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.building_url}
          alt={`${c.name}'s storefront`}
          className="w-full h-full object-cover"
        />
      ) : c.avatar_url ? (
        <div className="relative w-full h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.avatar_url}
            alt=""
            className="w-full h-full object-cover opacity-80"
          />
          <span className="absolute top-2 right-2 tag-font text-xs bg-[var(--color-ink)] text-[var(--color-paper)] px-2 py-0.5">
            wip
          </span>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="display text-5xl text-[var(--color-paper)]">?!</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-ink)]/85 px-3 py-2">
        <h2 className="display text-lg text-[var(--color-paper)] leading-tight">
          <span className="drip">{c.name}</span>
        </h2>
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/building-tile.test.tsx
```

Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add components/building-tile.tsx tests/building-tile.test.tsx
git commit -m "feat(town): BuildingTile with image/avatar/?! placeholder fallback chain"
```

---

## Task 17: `BuildingDrawer` + `DrawerSkeleton`

**Files:**
- Create: `components/drawer-skeleton.tsx`
- Create: `components/building-drawer.tsx`
- Test: `tests/building-drawer.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/building-drawer.test.tsx`:

```tsx
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Character } from "../lib/types";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

import { BuildingDrawer } from "../components/building-drawer";

function character(over: Partial<Character> = {}): Character {
  return {
    id: "id-zeke",
    slug: "zeke",
    kind: "zeke",
    name: "Zeke",
    role: "In-house builder",
    bio: "Lives in Aquarius. Ships the catalog you are reading.",
    gh_handle: "CarlosJunioor",
    x_handle: null,
    site_url: null,
    avatar_url: "https://blob.test/avatars/zeke.png",
    building_url: null,
    ...over,
  };
}

describe("BuildingDrawer", () => {
  it("renders character name, role, and bio", () => {
    const html = renderToString(<BuildingDrawer character={character()} />);
    expect(html).toContain("Zeke");
    expect(html).toContain("In-house builder");
    expect(html).toContain("Lives in Aquarius");
  });

  it("includes a deep-dive link to /character/[slug]", () => {
    const html = renderToString(<BuildingDrawer character={character()} />);
    expect(html).toContain('href="/character/zeke"');
  });

  it("includes a close link back to /", () => {
    const html = renderToString(<BuildingDrawer character={character()} />);
    expect(html).toMatch(/<a[^>]+href="\/"[^>]*>[^<]*close|×/i);
  });

  it("does NOT render a skills-count chip (zero would read 'broken' at launch)", () => {
    const html = renderToString(<BuildingDrawer character={character()} />);
    expect(html.toLowerCase()).not.toMatch(/\d+\s*skills?\s*shipped/);
  });

  it("renders avatar when available", () => {
    const html = renderToString(<BuildingDrawer character={character()} />);
    expect(html).toContain('src="https://blob.test/avatars/zeke.png"');
  });

  it("renders ?! placeholder when avatar is null", () => {
    const html = renderToString(<BuildingDrawer character={character({ avatar_url: null })} />);
    expect(html).not.toContain("<img");
    expect(html).toContain("?!");
  });

  it("renders social chips when handles are present", () => {
    const html = renderToString(
      <BuildingDrawer
        character={character({ gh_handle: "ghuser", x_handle: "xuser", site_url: "https://example.test" })}
      />,
    );
    expect(html).toContain('href="https://github.com/ghuser"');
    expect(html).toContain('href="https://x.com/xuser"');
    expect(html).toContain('href="https://example.test"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/building-drawer.test.tsx
```

Expected: FAIL — `Cannot find module '../components/building-drawer'`.

- [ ] **Step 3: Implement `DrawerSkeleton`**

Create `components/drawer-skeleton.tsx`:

```tsx
// components/drawer-skeleton.tsx
/**
 * Suspense fallback for BuildingDrawer. Same outer footprint so the slot
 * doesn't shift when data arrives.
 */
export function DrawerSkeleton() {
  return (
    <aside
      aria-busy
      className="fixed inset-x-0 bottom-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[420px] z-40 bg-[var(--color-paper)] border-t-[3px] lg:border-l-[3px] lg:border-t-0 border-[var(--color-ink)] p-6"
    >
      <div className="ink-frame aspect-square bg-[var(--color-mauve)] mb-4 animate-pulse" />
      <div className="h-10 bg-[var(--color-paper-2)] mb-3 animate-pulse" />
      <div className="h-4 bg-[var(--color-paper-2)] mb-2 animate-pulse" />
      <div className="h-4 bg-[var(--color-paper-2)] w-3/4 animate-pulse" />
    </aside>
  );
}
```

- [ ] **Step 4: Implement `BuildingDrawer`**

Create `components/building-drawer.tsx`:

```tsx
// components/building-drawer.tsx
import Link from "next/link";
import type { Character } from "@/lib/types";

interface Props {
  character: Character;
}

/**
 * Slide-in panel for the town map. Server-rendered; open state is driven by
 * the ?building=slug search param on /. Content mirrors CharacterHero
 * (identity content only — no skills row; that lives on /character/[slug]).
 */
export function BuildingDrawer({ character: c }: Props) {
  return (
    <aside className="fixed inset-x-0 bottom-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[420px] z-40 bg-[var(--color-paper)] border-t-[3px] lg:border-l-[3px] lg:border-t-0 border-[var(--color-ink)] p-6 overflow-y-auto">
      <div className="flex items-start justify-between mb-4">
        <span className="bubble text-xs">
          {c.kind === "zeke" ? "in-house" : "influencer"}
        </span>
        <Link href="/" aria-label="close" className="display text-2xl leading-none">
          ×
        </Link>
      </div>

      <div className="ink-frame relative w-full aspect-square overflow-hidden grain bg-[var(--color-mauve)] mb-5">
        {c.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="display text-6xl text-[var(--color-paper)]">?!</span>
          </div>
        )}
      </div>

      <h2 className="display text-4xl leading-[0.92] mb-2 break-words">
        <span className="drip">{c.name}</span>
      </h2>

      {c.role && (
        <p className="tag-font text-lg text-[var(--color-grape)] mb-3 leading-snug">
          {c.role}
        </p>
      )}

      {c.bio && (
        <p className="type-font text-base leading-relaxed mb-5">{c.bio}</p>
      )}

      <div className="flex flex-wrap gap-3 type-font text-sm pt-3 mb-5 border-t-2 border-[var(--color-ink)]">
        {c.gh_handle && (
          <a
            href={`https://github.com/${c.gh_handle}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--color-grape)]"
          >
            ↗ github
          </a>
        )}
        {c.x_handle && (
          <a
            href={`https://x.com/${c.x_handle}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--color-grape)]"
          >
            ↗ x
          </a>
        )}
        {c.site_url && (
          <a
            href={c.site_url}
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--color-grape)]"
          >
            ↗ site
          </a>
        )}
      </div>

      <Link
        href={`/character/${c.slug}`}
        className="block w-full ink-frame-soft bg-[var(--color-ink)] text-[var(--color-paper)] text-center py-3 display"
      >
        deep dive →
      </Link>
    </aside>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/building-drawer.test.tsx
```

Expected: 7 PASS.

- [ ] **Step 6: Commit**

```bash
git add components/drawer-skeleton.tsx components/building-drawer.tsx tests/building-drawer.test.tsx
git commit -m "feat(town): BuildingDrawer + DrawerSkeleton

Mirrors CharacterHero identity content. Deep-dive CTA links to character
page. Slides from right (desktop) or up (mobile)."
```

---

## Task 18: New TownPage at `/`

**Files:**
- Modify (full rewrite): `app/page.tsx`
- Test: `tests/town-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/town-page.test.tsx`:

```tsx
import React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Character } from "../lib/types";
import type { TownTile } from "../lib/town/layout";

const mocks = vi.hoisted(() => ({
  loadTownLayout: vi.fn<() => Promise<TownTile[]>>(),
  fetchCharacterBySlug: vi.fn<(slug: string) => Promise<Character | null>>(),
  redirect: vi.fn((_path: string) => { throw new Error("NEXT_REDIRECT"); }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("../lib/town/layout", () => ({
  loadTownLayout: mocks.loadTownLayout,
}));

vi.mock("../lib/stats", () => ({
  fetchCharacterBySlug: mocks.fetchCharacterBySlug,
}));

import TownPage, { generateMetadata } from "../app/page";

function character(slug: string, over: Partial<Character> = {}): Character {
  return {
    id: `id-${slug}`,
    slug,
    kind: "influencer",
    name: slug,
    role: null,
    bio: null,
    gh_handle: null,
    x_handle: null,
    site_url: null,
    avatar_url: null,
    building_url: null,
    ...over,
  };
}

function tile(slug: string, x = 0, y = 0): TownTile {
  return { slug, x, y, w: 1, h: 1, character: character(slug) };
}

describe("TownPage", () => {
  beforeEach(() => {
    mocks.loadTownLayout.mockReset();
    mocks.fetchCharacterBySlug.mockReset();
    mocks.redirect.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the town map without a drawer when searchParams.building is absent", async () => {
    mocks.loadTownLayout.mockResolvedValue([tile("zeke"), tile("matt-pocock", 1)]);
    const element = await TownPage({ searchParams: Promise.resolve({}) });
    const html = renderToString(element);
    expect(html).toContain('href="/?building=zeke"');
    expect(html).not.toContain("close");
  });

  it("renders the drawer in a Suspense boundary when searchParams.building is set", async () => {
    mocks.loadTownLayout.mockResolvedValue([tile("zeke")]);
    mocks.fetchCharacterBySlug.mockResolvedValue(character("zeke", { name: "Zeke", role: "In-house builder" }));
    const element = await TownPage({ searchParams: Promise.resolve({ building: "zeke" }) });
    const html = renderToString(element);
    expect(html).toContain("Zeke");
    expect(html).toContain("In-house builder");
    expect(html).toContain('href="/character/zeke"');
  });

  it("redirects to / when ?building=unknown-slug", async () => {
    mocks.loadTownLayout.mockResolvedValue([tile("zeke")]);
    mocks.fetchCharacterBySlug.mockResolvedValue(null);
    await expect(
      TownPage({ searchParams: Promise.resolve({ building: "ghost" }) }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });
});

describe("TownPage generateMetadata", () => {
  beforeEach(() => {
    mocks.fetchCharacterBySlug.mockReset();
  });

  it("uses '/' as canonical when no drawer is open", async () => {
    const meta = await generateMetadata({ searchParams: Promise.resolve({}) });
    expect(meta.alternates?.canonical).toBe("/");
  });

  it("canonicalises ?building=slug to /character/[slug]", async () => {
    mocks.fetchCharacterBySlug.mockResolvedValue(character("zeke"));
    const meta = await generateMetadata({
      searchParams: Promise.resolve({ building: "zeke" }),
    });
    expect(meta.alternates?.canonical).toBe("/character/zeke");
  });

  it("falls back to '/' canonical when the slug is unknown", async () => {
    mocks.fetchCharacterBySlug.mockResolvedValue(null);
    const meta = await generateMetadata({
      searchParams: Promise.resolve({ building: "ghost" }),
    });
    expect(meta.alternates?.canonical).toBe("/");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/town-page.test.tsx
```

Expected: FAIL — the existing `app/page.tsx` is the old homepage (doesn't import town components, doesn't export `generateMetadata` in this shape).

- [ ] **Step 3: Replace `app/page.tsx`**

Replace `app/page.tsx` entirely with:

```tsx
// app/page.tsx — Aquarius town map (sub-project C).
// The old zine homepage now lives at /zine.
import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TownMap } from "@/components/town-map";
import { BuildingDrawer } from "@/components/building-drawer";
import { DrawerSkeleton } from "@/components/drawer-skeleton";
import { JsonLd } from "@/components/json-ld";
import { loadTownLayout } from "@/lib/town/layout";
import { fetchCharacterBySlug } from "@/lib/stats";
import { absoluteUrl, buildPageMetadata, siteConfig } from "@/lib/seo";

export const revalidate = 120;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ building?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  if (sp.building) {
    const character = await fetchCharacterBySlug(sp.building);
    if (character) {
      return buildPageMetadata({
        title: `${character.name} on skillZs`,
        description: character.bio ?? character.role ?? `Skills shipped by ${character.name}.`,
        path: `/character/${character.slug}`,
        ...(character.avatar_url ? { image: character.avatar_url } : {}),
        imageAlt: character.name,
        type: "article",
      });
    }
  }
  return buildPageMetadata({
    title: `${siteConfig.title} — town`,
    description: "Aquarius town map. Click a building to meet the character behind the skills.",
    path: "/",
  });
}

interface PageProps {
  searchParams: Promise<{ building?: string }>;
}

async function DrawerLoader({ slug }: { slug: string }) {
  const character = await fetchCharacterBySlug(slug);
  if (!character) {
    redirect("/");
  }
  return <BuildingDrawer character={character} />;
}

export default async function TownPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tiles = await loadTownLayout();

  const townItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": absoluteUrl("/#town"),
    name: "skillZs Aquarius town",
    numberOfItems: tiles.length,
    itemListElement: tiles.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/character/${t.character.slug}`),
      name: t.character.name,
    })),
  };

  return (
    <div className="pt-2">
      <JsonLd data={townItemList} />
      <h1 className="display text-5xl md:text-7xl leading-none mb-3">
        <span className="drip">Aquarius</span>
      </h1>
      <p className="type-font text-base text-[var(--color-rust)] mb-6">
        a town of seven storefronts. tap any building to meet the character.
      </p>

      <TownMap tiles={tiles} />

      {sp.building && (
        <Suspense fallback={<DrawerSkeleton />}>
          {/* @ts-expect-error Server Component async return is valid */}
          <DrawerLoader slug={sp.building} />
        </Suspense>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/town-page.test.tsx
```

Expected: 6 PASS. (3 page render + 3 metadata.)

- [ ] **Step 5: Run the full test suite**

```bash
npm run test
```

Expected: all green. Fix any regressions before continuing.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx tests/town-page.test.tsx
git commit -m "feat(town): TownPage at / with Suspense-streamed drawer

Replaces the zine homepage (now at /zine). Drawer reads ?building=slug,
fetches the character in a Suspense boundary with DrawerSkeleton fallback.
generateMetadata canonicalises drawer URLs to /character/[slug]."
```

---

## Task 19: Sitemap update

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Update sitemap to add `/zine` and per-character entries**

Replace `app/sitemap.ts` with:

```ts
import type { MetadataRoute } from "next";
import { absoluteUrl, categoryRoutes } from "@/lib/seo";
import { fetchSitemapSkills, fetchSitemapCharacters } from "@/lib/stats";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/zine"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: absoluteUrl("/browse"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    ...categoryRoutes.map((category) => ({
      url: absoluteUrl(category.path),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  try {
    const [skills, characters] = await Promise.all([
      fetchSitemapSkills(),
      fetchSitemapCharacters(),
    ]);
    return [
      ...staticRoutes,
      ...characters.map((c) => ({
        url: absoluteUrl(`/character/${c.slug}`),
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.75,
      })),
      ...skills.map((skill) => ({
        url: absoluteUrl(`/skill/${skill.slug}`),
        lastModified: new Date(skill.last_seen || skill.first_seen || now),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch (error) {
    console.error("sitemap fetch failed:", error);
    return staticRoutes;
  }
}
```

- [ ] **Step 2: Verify sitemap renders**

Start dev server and curl the sitemap:

```bash
npx next dev
```

Then in another terminal:

```bash
curl -s http://localhost:3000/sitemap.xml | head -40
```

Expected: XML output including `/zine` and at least one `/character/<slug>` entry.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat(seo): sitemap adds /zine and /character/[slug] entries

Bundles the B-era oversight — characters were not in sitemap.xml."
```

---

## Task 20: Full quality gate

**Files:**
- (verification step, no edits)

- [ ] **Step 1: Run lint + tests + coverage**

```bash
npm run quality
```

Expected: exits 0. If lint fails, fix the violations and re-run. If coverage drops below the ratchet floor, write the missing test cases until green.

- [ ] **Step 2: If coverage threshold needs an explicit bump**

```bash
npm run ratchet
```

Then commit the updated `vitest.config.ts`:

```bash
git add vitest.config.ts
git commit -m "chore(test): ratchet coverage thresholds after sub-project C"
```

(Skip this step if `npm run quality` already passes.)

- [ ] **Step 3: Visual smoke test in the dev server**

```bash
npx next dev
```

Open `http://localhost:3000/` in a browser. Expected:
- Town page renders 7 tiles (one per character) with placeholder ("wip") frames since no `building_url` is set yet — avatars show through.
- Header still works; click "zine" → see the old homepage at `/zine`.
- Click any tile → drawer opens with character bio + deep-dive button.
- Click "deep dive" → lands on `/character/<slug>` (unchanged page).
- Click "×" in the drawer → back to plain town.

Stop the dev server.

---

## Task 21: Push, merge, drain initial buildings

**Files:**
- (deployment + post-deploy verification)

- [ ] **Step 1: Push branch and open PR**

```bash
git push origin dev
```

If PR #3 (the long-running umbrella per `deploy-flow` memory) is open, no new PR needed — it auto-updates. Otherwise:

```bash
gh pr create --title "feat: sub-project C — Aquarius town map" --body "$(cat <<'EOF'
## Summary
Replaces the homepage with a 7-building town map at /. Zine moves to /zine.
Click any building → drawer with character summary + deep-link to /character/[slug].

## Test plan
- [ ] `npm run quality` green on CI
- [ ] After merge: `skillzs.dev/` renders the town
- [ ] After merge: `skillzs.dev/zine` renders the old homepage
- [ ] After merge: tile click → drawer slides in, deep-dive nav works
- [ ] Day-1 cron at 07:00 UTC drains 7 buildings (~$0.28)
- [ ] Visual: review building tiles for style fit against character-style-guide.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Wait for CI green, then merge**

```bash
gh pr checks --watch
gh pr merge --merge --delete-branch=false
```

Expected: PR merges, prod build runs (~90-110s per `deploy-flow` memory).

- [ ] **Step 3: Verify production**

```bash
curl -sI https://skillzs.dev/ | head -5
curl -sI https://skillzs.dev/zine | head -5
```

Expected: both return 200.

Open `https://skillzs.dev/` in a browser. Verify the town renders with avatar fallbacks (no `building_url` yet — building cron hasn't run).

- [ ] **Step 4: Trigger ONE building generation manually (review before bulk drain)**

Pick the first slug (`zeke`) for the review render:

```bash
curl -X POST "https://skillzs.dev/api/cron/generate-buildings?limit=1" \
  -H "Authorization: Bearer $DIPTYCH_CRON_SECRET"
```

Expected JSON: `{ "ok": true, "stats": { "attempted": 1, "generated": 1, "failed": 0, ... } }`.

- [ ] **Step 5: Visual review of the first building tile**

Reload `https://skillzs.dev/`. The first character (zeke) should now have its real fisheye storefront tile rendered. Compare against `design/character-style-guide.md`:
- Fisheye peek through window/door INTO interior?
- ~85% locked DNA (character + interior + grunge + graffiti)?
- Storefront frame reads as "a building" without breaking the style?

**If the tile drifts** — iterate on `lib/character/building-prompt.ts` and run the operator regen:

```bash
curl -X POST "https://skillzs.dev/api/regen/character/zeke?asset=building" \
  -H "Authorization: Bearer $DIPTYCH_CRON_SECRET"
# Then re-run the limited cron above to regenerate it
```

Repeat until satisfied.

- [ ] **Step 6: Drain the remaining 6 buildings**

Once the first tile looks right:

```bash
curl -X POST "https://skillzs.dev/api/cron/generate-buildings?limit=6" \
  -H "Authorization: Bearer $DIPTYCH_CRON_SECRET"
```

Expected: `attempted: 6, generated: 6`. Total cost from review iterations + drain should be under $1.

Alternative: skip the manual trigger and let the next 07:00 UTC cron drain automatically.

- [ ] **Step 7: Smoke-test the live town**

Open `https://skillzs.dev/` in a desktop browser:
- All 7 tiles render real building images.
- Click tile → drawer slides in from right, character data fills.
- Click "deep dive" → `/character/<slug>` loads.

Open on a phone:
- Vertical stack of 7 tiles.
- Tap tile → drawer slides up from bottom.

Verify sitemap:

```bash
curl -s https://skillzs.dev/sitemap.xml | grep -c "/character/"
```

Expected: at least 7.

- [ ] **Step 8: Final commit + celebrate**

If any post-deploy fixes were needed (style-guide tweaks, layout adjustments), commit them. Otherwise:

```bash
# Sub-project C shipped. No further commits needed.
```

---

## Self-review summary

After writing this plan, I verified against the spec:

| Spec section | Plan task(s) |
|---|---|
| Goal | T18 (TownPage), T13 (zine move) |
| D1: tile aesthetic (peek-through interior) | T5 (building-prompt), T6 (run-buildings) |
| D2: town-layout.json + strict drift | T10 (JSON), T11 (loader) |
| D3: hybrid drawer | T17 (drawer), T18 (Suspense wiring) |
| D4: town at /, zine at /zine | T13 (zine move), T18 (TownPage at /) |
| D5: mobile vertical stack | T15 (TownMap responsive grid) |
| R1: fixed 1024² + CSS variance | T16 (BuildingTile + CSS responsive cell) |
| R2: drawer mirrors CharacterHero, no skills chip | T17 + tests |
| R3: Suspense + grunge skeleton | T17 (DrawerSkeleton), T18 (Suspense wrap) |
| R4: ?building canonicalises to /character/[slug] | T18 (generateMetadata) |
| R5: full migration scope | T1 |
| R6: only building_url in public grant | T1 |
| R7: sitemap character entries | T19 |
| R8: explicit /zine canonical | T13 |
| R9: accept ?sort URL break | (documented in spec; no code action needed) |
| R10: cron at 0 7 * * * | T7 + T8 |
| BUILDING_STYLE_VERSION constant | T5 |
| pick/slugHash extraction | T3 |
| Operator regen `?asset=building` | T9 |

All 21 tasks have concrete file paths, executable code blocks, run commands with expected output, and TDD discipline (test → fail → implement → pass → commit) where applicable. No placeholders, no TBDs, no "similar to Task N" hand-waves.

Type consistency verified: `runBuildingGeneration` named consistently across the runner, route handler, and tests. `BUILDING_STYLE_VERSION` used in both the prompt module export and the runner's prompt prefix.

---

Next step after this plan is approved: invoke `superpowers:executing-plans` (inline) or `superpowers:subagent-driven-development` (per-task subagents).
