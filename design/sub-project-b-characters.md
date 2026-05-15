# skillZs — Sub-project B: Characters (Zeke + Influencer Personas)

## Context

Sub-project A delivered the new card visual + install pill. Cards now describe *what* a skill does. **B turns "skills" into "stories" — every skill belongs to a character**, and every character has a presence on the site (a story page, an avatar, a small canon). Characters are the hook that lets the catalog feel like a town instead of a directory.

Two character kinds at launch:
- **Zeke** — the in-house "builder" persona. Owns first-party skills + any skill skillZs itself authored. Single canonical character; its page is the closest thing the site has to an "About" page until sub-project E lands.
- **Influencers** — well-known people in the agentic-coding/AI ecosystem (e.g. Matt Pocock, Theo, Geoffrey Huntley, Cole Medin). Each has a story page that surfaces the skills the catalog has attributed to them.

A skill can map to **at most one character** (`skills.character_id` FK, nullable). Skills without a character keep working — they just don't show a character chip on the card.

**Visual contract is already locked**: `design/character-style-guide.md` defines the urban-comic fisheye style. B is the first sub-project that consumes it — every avatar generated for a character uses the same prompt template.

B is the foundation for C (town map — character buildings on a map) and D (influencer activity tracker — depends on having an `influencer` row to attach feed events to).

---

## Decisions locked during this plan

| # | Decision |
|---|---|
| 1 | Characters live in **one `characters` table** with a `kind` column (`zeke` \| `influencer`). Cleaner than two tables, mirrors how `skills.category` is one table not five. |
| 2 | Skill → Character is **one-to-many via `skills.character_id` FK**, NOT M:N. Plan A originally hinted at M:N; in practice a skill is authored by exactly one character. (A future M:N "co-authored" feature is sub-project D scope.) |
| 3 | Character avatar = **single AI-generated PNG** at character-create time, using the locked style guide prompt template. Not animated. Not regenerated on every render. |
| 4 | Character → Skill attribution is **derived at ingest time**: the existing `lib/ingest/sources.ts` parses `SKILL.md` frontmatter `author:` and matches it against `characters.handle_*` fields. Manual override allowed via a small admin route. |
| 5 | Story page = **`/character/[slug]` server component**, same render contract as `/skill/[slug]`: a top hero band (avatar + bio + socials), then a SkillCard grid of attributed skills. No new client interactivity. |
| 6 | Character chip on existing skill cards is **opt-in**: shows only when `character_id` is set. Falls back to current `byline = skill.name` when null. No layout reflow on skills without a character. |
| 7 | Cost guard mirrors the diptych pattern. **`MAX_NEW_AVATAR_PER_RUN`** caps avatar gen per cron run. Re-using `gpt-image-1 quality=low` (same per-image cost as diptych ≈ $0.04). |

---

## Scope

**In scope (B):**
- `characters` table + lifecycle columns + claim RPC (mirrors `claim_skill_diptych`).
- `skills.character_id` FK (additive, nullable).
- Avatar generation pipeline (`lib/character/run.ts` + `lib/character/prompt.ts` + reuses `lib/covers/generate.ts`).
- Auto-attribution at ingest: parse `author:` frontmatter, match against `characters.gh_handle` / `characters.x_handle`.
- `/character/[slug]` story page (server component).
- `<CharacterChip />` shown on `<SkillCard />` when `character_id` set.
- `/api/cron/generate-avatars` route (Vercel cron, mirrors `generate-diptychs`).
- `/api/regen/character/[slug]` (admin, requeue avatar).
- `/api/admin/cost` extended to surface avatar spend.
- Seed data for **Zeke + 6 launch influencers** (Matt Pocock, Theo Browne, Geoffrey Huntley, Cole Medin, Mitchell Hashimoto, Gergely Orosz). Seed list lives in code; users can grow it via admin.
- Tests for: schema migration, prompt builder, run.ts, route auth, character-skill join query, attribution matcher, story-page render fallback.

**Out of scope (deferred):**
- **Town map UI** — sub-project C. Buildings, roads, navigation overlay all come later.
- **Influencer activity feed** (X/GitHub poller) — sub-project D. B only ships the static character page.
- **User auth + "follow this character"** — sub-project E.
- Multi-avatar / pose variation per character.
- Editable bios via UI. (Bios are seed-or-ingest only in B.)
- Character search. (Browse-by-character is list-only on `/character`.)

---

## Architecture — end-to-end flow

```
Weekly ingest cron (existing /api/cron/ingest)
  -> lib/ingest/sources.ts
       -> parse SKILL.md frontmatter (author, etc.) -- existing
       -> NEW: lib/character/attribute.ts
            -> if SKILL.md `author:` matches characters.gh_handle
               OR characters.x_handle (case-insensitive),
               set skills.character_id on upsert
            -> else leave character_id null
       -> upsert skills row (existing)

Daily cron (NEW /api/cron/generate-avatars at 0 5 * * *)
  -> lib/character/run.ts
       -> select characters where avatar_status in ('pending','failed')
            order by created_at asc
            limit MAX_NEW_AVATAR_PER_RUN (default 25)
       -> for each:
            claim_character_avatar(p_character_id) -- atomic
            buildAvatarPrompt(character) -- uses locked style template
            generateCover({ prompt, quality:'low', size:'1024x1024' })
            uploadCharacterAvatar(slug, bytes) -> Vercel Blob
            update characters set
              avatar_url, avatar_status='done',
              avatar_generated_at, avatar_cost_usd

User hits / (homepage)
  -> RSC fetches skill_stats (existing)
  -> SkillCard renders + (NEW) CharacterChip when skill.character_id set

User hits /character/[slug]
  -> RSC fetches character + character.skills (FK join)
  -> CharacterHero renders avatar + name + role + bio + socials
  -> Grid of SkillCard for attributed skills, sorted by hotness desc
```

---

## Data model — Supabase migration

`supabase/migrations/0007_characters.sql` — additive only.

```sql
-- characters: one row per Zeke + per influencer
create table characters (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,                -- url-safe, lowercase, hyphens
  kind         text not null check (kind in ('zeke','influencer')),
  name         text not null,                       -- "Matt Pocock"
  role         text,                                -- "TypeScript explainer"
  bio          text,                                -- 1-3 sentences for hero band
  gh_handle    text,                                -- "mattpocockuk" (no @)
  x_handle     text,                                -- "mpocock1"
  site_url     text,                                -- canonical homepage
  -- avatar lifecycle (mirrors diptych_*)
  avatar_url           text,
  avatar_prompt        text,
  avatar_status        text not null default 'pending'
                       check (avatar_status in ('pending','generating','done','failed','skipped')),
  avatar_generated_at  timestamptz,
  avatar_attempts      integer not null default 0,
  avatar_error         text,
  avatar_cost_usd      numeric(8,4) not null default 0,
  -- lifecycle
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index characters_kind_idx          on characters (kind);
create index characters_avatar_status_idx on characters (avatar_status);
create unique index characters_gh_handle_idx
  on characters (lower(gh_handle)) where gh_handle is not null;
create unique index characters_x_handle_idx
  on characters (lower(x_handle)) where x_handle is not null;

-- attribution: a skill belongs to at most one character
alter table skills
  add column if not exists character_id uuid references characters(id) on delete set null;
create index if not exists skills_character_id_idx on skills (character_id);

-- claim function (mirrors claim_skill_diptych)
create or replace function claim_character_avatar(p_character_id uuid) returns boolean
  language plpgsql security definer set search_path = public
as $$
declare claimed uuid;
begin
  update characters
     set avatar_status   = 'generating',
         avatar_attempts = avatar_attempts + 1,
         avatar_error    = null
   where id = p_character_id
     and avatar_status in ('pending','failed')
   returning id into claimed;
  return claimed is not null;
end;
$$;
revoke execute on function public.claim_character_avatar(uuid) from public, anon, authenticated;
grant  execute on function public.claim_character_avatar(uuid) to service_role;

-- read access: anon needs character bio/avatar for /character/[slug]
grant select on table public.characters to anon, authenticated;

-- refresh skill_stats to surface character_id
drop materialized view if exists skill_stats;
-- (re-create with character_id added — full body in the migration)
```

Refresh the `skill_stats` matview body to include `s.character_id`. Add a helper view `character_skill_stats` that joins `characters` with the matview, returning per-character aggregates (skill_count, total_uses, total_votes, last_skill_added_at) for a future `/character` index page.

---

## Seed — characters loaded by code

`lib/character/seed.ts` — exported array, applied by an idempotent admin endpoint `POST /api/admin/characters/seed` (DIPTYCH_CRON_SECRET-gated; reuses the operator-only auth pattern):

```ts
export const SEED_CHARACTERS: SeedCharacter[] = [
  {
    slug: 'zeke',
    kind: 'zeke',
    name: 'Zeke',
    role: 'In-house builder of skillZs',
    bio: 'Lives in Aquarius. Ships the catalog you are reading. Talks like a caveman.',
    gh_handle: 'CarlosJunioor',
  },
  {
    slug: 'matt-pocock',
    kind: 'influencer',
    name: 'Matt Pocock',
    role: 'TypeScript explainer-in-chief',
    bio: 'Builds Total TypeScript. Most-cited type wizard in agentic coding.',
    gh_handle: 'mattpocockuk',
    x_handle: 'mpocock1',
    site_url: 'https://www.totaltypescript.com',
  },
  // theo, ghuntley, coleam00, mitchellh, gergely orosz...
];
```

The seed endpoint upserts on `slug`. Re-running is safe; new fields land, existing fields get updated.

---

## Ingest pipeline change — auto-attribution

`lib/character/attribute.ts` (new):

```ts
export interface Attribution {
  character_id: string | null;
  match_reason: 'gh_handle' | 'x_handle' | 'manual' | null;
}

export async function attributeSkillToCharacter(
  sb: SupabaseClient,
  parsed: ParsedSkillFrontmatter,
): Promise<Attribution> {
  const handle = (parsed.author ?? parsed.author_handle ?? '').trim().toLowerCase();
  if (!handle) return { character_id: null, match_reason: null };

  // Strip leading @, common url prefixes
  const norm = handle.replace(/^@/, '').replace(/^https?:\/\/(github|twitter|x)\.com\//, '');

  const { data } = await sb
    .from('characters')
    .select('id, gh_handle, x_handle')
    .or(`gh_handle.ilike.${norm},x_handle.ilike.${norm}`)
    .limit(1);

  if (!data?.[0]) return { character_id: null, match_reason: null };
  const c = data[0];
  return {
    character_id: c.id,
    match_reason: c.gh_handle?.toLowerCase() === norm ? 'gh_handle' : 'x_handle',
  };
}
```

Hook in `lib/ingest/sources.ts` after frontmatter parse, before upsert. Existing skills with no character keep `character_id = null`.

**Manual override** — `POST /api/admin/skill/[slug]/character` (DIPTYCH_CRON_SECRET-gated): set or clear `skills.character_id`. Used to fix bad attributions without re-ingesting.

---

## UI surface

**Character story page — `app/character/[slug]/page.tsx` (new, server component):**

```tsx
export default async function CharacterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const character = await fetchCharacter(slug);          // 404 if not found
  const skills = await fetchSkillsByCharacter(character.id);
  return (
    <main>
      <CharacterHero character={character} />
      <h2 className="display">Skills shipped by {character.name}</h2>
      <SkillRow skills={skills} />                       {/* reuse existing component */}
    </main>
  );
}
```

**`components/character-hero.tsx` (new):** avatar (left), name + role + bio (center), social chips (right). Uses the same `ink-frame` + `wobble` cosmetic primitives as `<SkillCard>`.

**`components/character-chip.tsx` (new):**

```tsx
export function CharacterChip({ slug, name, avatarUrl }: Props) {
  return (
    <Link href={`/character/${slug}`} className="character-chip">
      {avatarUrl ? <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                 : <span className="w-5 h-5 rounded-full bg-mauve" />}
      <span className="text-xs">{name}</span>
    </Link>
  );
}
```

`<SkillCard>` change: if `skill.character_id` set, replace the existing byline with `<CharacterChip />`. Layout stays identical; only the byline element swaps.

**Falls back** when avatar not yet generated — chip still renders with the mauve placeholder + name. Story page uses the same placeholder in the hero band.

---

## API endpoints

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/cron/generate-avatars` | POST/GET | DIPTYCH_CRON_SECRET + Vercel cron fallback | Drain pending avatars |
| `/api/regen/character/[slug]` | POST | DIPTYCH_CRON_SECRET | Requeue one character's avatar |
| `/api/admin/characters/seed` | POST | DIPTYCH_CRON_SECRET | Idempotently upsert SEED_CHARACTERS |
| `/api/admin/skill/[slug]/character` | POST | DIPTYCH_CRON_SECRET | Manual character attribution override |
| `/api/admin/cost` | GET | DIPTYCH_CRON_SECRET | Existing — extended to also count `characters.avatar_cost_usd` |

The cron route mirrors `generate-diptychs` exactly: `limit` query param (default 25, max 100), `quality` (default low), Vercel-cron-friendly auth via `allowCronSecretFallback`.

---

## Avatar generation — `lib/character/`

```
lib/character/
├── prompt.ts        # buildAvatarPrompt(character) — fills the locked template
├── run.ts           # runAvatarGeneration() — selects pending, claims, generates, uploads
├── upload.ts        # uploadCharacterAvatar(slug, bytes) -> Vercel Blob URL
├── attribute.ts     # attributeSkillToCharacter() — handle matcher
└── seed.ts          # SEED_CHARACTERS array
```

`prompt.ts` reads `design/character-style-guide.md` Style DNA verbatim and slots in:
- `{CHARACTER}` → `character.name`
- `{POSE/EXPRESSION}` → derived from `character.role` (small lookup map)
- `{SETTING}` → kitchen | bathroom | bedroom | basement (hash slug → 1 of 4 for stable variety)
- `{WORD}` → graffiti tag = first word of `character.role`
- `{GLYPH}` → ! | ? | ♥ (hash slug → 1 of 3)
- `{PROP}` → derived from `character.kind` (`zeke` → laptop sticker; `influencer` → mic / book / framed photo)

Image size: 1024×1024 square (matches the fisheye composition; diptych uses 1536×1024). Cost: same `$0.04` per image as diptych.

---

## Cost / cache strategy

| Lever | Default | Purpose |
|---|---|---|
| `characters.avatar_status` | `'pending'` on insert | Cron picks up only pending/failed |
| `MAX_NEW_AVATAR_PER_RUN` | 25 (cron `?limit=` param) | Smooth Vercel-cron spend |
| `MAX_AVATAR_RETRY_ATTEMPTS` | 3 | Stop retrying broken characters |
| Vercel Blob storage | public | Free egress on Vercel |
| Manual one-shot drain | `pnpm backfill:avatars` | Mirror of `pnpm backfill:diptychs` |

**Steady-state cost**: 7 launch characters × $0.04 = **$0.28** total at launch. Each new influencer added = $0.04 once. Negligible vs diptych spend.

---

## Critical files to be modified / created

**Modified:**
- `lib/ingest/sources.ts` — call `attributeSkillToCharacter` before upsert; persist `character_id`.
- `lib/types.ts` — `SkillRow.character_id`, new `Character` + `CharacterStats` interfaces.
- `components/skill-card.tsx` — swap byline for `<CharacterChip />` when `character_id` set.
- `app/api/admin/cost/route.ts` — sum `characters.avatar_cost_usd` into the existing payload.
- `vercel.json` — add `{ "path": "/api/cron/generate-avatars", "schedule": "0 5 * * *" }`.

**Created (this repo):**
- `supabase/migrations/0007_characters.sql`
- `lib/character/prompt.ts`
- `lib/character/run.ts`
- `lib/character/upload.ts`
- `lib/character/attribute.ts`
- `lib/character/seed.ts`
- `app/api/cron/generate-avatars/route.ts`
- `app/api/regen/character/[slug]/route.ts`
- `app/api/admin/characters/seed/route.ts`
- `app/api/admin/skill/[slug]/character/route.ts`
- `app/character/[slug]/page.tsx`
- `components/character-hero.tsx`
- `components/character-chip.tsx`
- `scripts/backfill-avatars.mjs` (mirror of `scripts/backfill-diptychs.mjs`)

**Reused (already exist):**
- `lib/covers/generate.ts` — image gen via OpenAI gpt-image-1.
- `lib/diptych/upload.ts` pattern — copy-paste structure for `lib/character/upload.ts`.
- `lib/cron-auth.ts` `allowCronSecretFallback` — added in commit 51f4165.
- `lib/supabase/server.ts` — service-role client.

---

## Testing

| File | Covers |
|---|---|
| `tests/character-prompt.test.ts` | Locked DNA tokens present in every output; `{CHARACTER}` substitution; deterministic glyph/setting picks per slug |
| `tests/character-attribute.test.ts` | gh handle match (case-insensitive); x handle match; @-prefix tolerated; no match returns null |
| `tests/character-run.test.ts` | claim → gen → upload → update flow with mocks; failure marks status='failed' + error; budget cap respected |
| `tests/generate-avatars-route.test.ts` | Auth (both DIPTYCH_CRON_SECRET and CRON_SECRET via fallback); invalid limit/quality reject; happy path returns stats |
| `tests/regen-character-route.test.ts` | Slug validation; auth required; resets status from done/failed → pending |
| `tests/character-seed-route.test.ts` | Auth; idempotent upsert; rejects malformed payload |
| `tests/character-page.test.tsx` | renderToString — hero shows avatar OR mauve placeholder; skill grid renders attributed skills; 404 path |
| `tests/character-chip.test.tsx` | renders avatar img when present; placeholder div when null; href is `/character/<slug>` |
| `tests/skill-card.test.tsx` (extend) | When `character_id` set, byline is `<CharacterChip>` not the bare name |

Coverage ratchet must stay green. New ratio targets:
- `lib/character/*.ts` — 95%+ lines (cheap to hit, few branches).
- `app/api/cron/generate-avatars/route.ts` — 90%+ (mirror existing diptych route ratio).

---

## End-to-end verification (manual, after build)

1. Apply migration locally. `pnpm dev`.
2. `curl -H "Authorization: Bearer $DIPTYCH_CRON_SECRET" -X POST http://localhost:3000/api/admin/characters/seed` → 7 rows in `characters`, all `avatar_status='pending'`.
3. `curl -H "Authorization: Bearer $DIPTYCH_CRON_SECRET" -X POST http://localhost:3000/api/cron/generate-avatars?limit=2` → 2 avatars in Vercel Blob, rows updated to `'done'`.
4. Visit `http://localhost:3000/character/zeke` → hero band renders, skill grid shows Zeke's authored skills.
5. Visit `/` — skills attributed to Zeke now show his chip in the byline; un-attributed skills unchanged.
6. Hit `/api/admin/cost` → response now contains `characters: { by_status: {...}, total_usd: ... }` block alongside the existing diptych block.
7. Re-trigger seed → idempotent (no duplicate rows; status stays `done` for already-generated avatars).
8. `pnpm backfill:avatars` → drains the rest in batches.

---

## Build order (suggested)

1. **Migration `0007_characters.sql`** + types update. Ship first; safe additive.
2. **Seed array + admin seed route** + tests. Lets you populate `characters` empty-of-avatar.
3. **Avatar prompt + run + upload + cron route** + tests.
4. **Auto-attribution at ingest** + tests.
5. **Manual override route** + tests.
6. **`<CharacterChip />` + `<SkillCard>` byline swap** + extended skill-card test.
7. **`/character/[slug]` page + hero component** + tests.
8. **`vercel.json` cron entry** + `scripts/backfill-avatars.mjs` for one-shot drain.
9. **Trigger seed on prod**, then run drain. ~$0.28 total cost.

Each step atomically commit-able and reversible (drop the migration to rollback the data layer; remove the chip swap to rollback the UI).

---

## Open questions to resolve before starting

- [ ] **Influencer roster freeze.** Lock the launch list to exactly 6 names so the seed file is stable. Current proposal: Pocock, Theo, Huntley, Medin, Hashimoto, Orosz. Replace any.
- [ ] **Bio source.** Hand-write all 7 bios now, or auto-generate via gpt-4o-mini at seed time? (~$0.001 each, but uneven quality.) Recommendation: hand-write — 7 short bios is 30 min of work, quality matters for first impression.
- [ ] **Chip placement.** Replace the existing byline (which currently shows skill name when there's a tagline) or *add* a third row above the install pill? Plan currently says replace. Confirm.
- [ ] **404 vs filtered list.** Should `/character/some-unknown-slug` 404 hard, or render a friendly "no such character" with a link back? Plan says 404. Keep?

---

## Deferred to later sub-projects (for reference, not part of B)

- **C — Aquarius town map UI**: characters become buildings on an isometric map; navigation overlays the existing card feed.
- **D — Influencer activity tracker**: poll X + GitHub feeds per character (gh_handle / x_handle from the row); daily digest; "what Matt shipped this week" inset on the character page.
- **E — Personal daily driver**: auth (Clerk via Vercel Marketplace), `following` table, "today's pick from characters you follow."

C and D both depend on `characters` being populated, so B unblocks both.
