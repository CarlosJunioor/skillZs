# skillZs

Roblox-style discovery feed for Claude skills. Hero carousel + horizontally-scrolling category rows. Anonymous votes, click-to-use counter, weekly auto-ingest from GitHub.

```txt
Next.js 16 (App Router) | Tailwind v4 | Framer Motion | Supabase | Vercel
```

## Quick start

1. **Install deps**

   ```bash
   pnpm install
   ```

2. **Spin up Supabase**

   - Create project at https://supabase.com.
   - Apply every file in `supabase/migrations/` in numeric order.
     Preferred: use the Supabase CLI with `supabase db push`.
     SQL Editor fallback: run `0001_initial.sql` through the latest migration, in order.
   - Copy `Project URL`, `anon` key, `service_role` key into `.env.local`.

3. **Configure env**

   ```bash
   cp .env.example .env.local
   # fill in all required values
   ```

4. **Trigger first ingest**

   ```bash
   pnpm dev
   # in another shell:
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/ingest"
   ```

5. **Open** http://localhost:3000.

## Architecture

- `app/page.tsx` - home. RSC fetches hero + 6 rows from `skill_stats` matview in parallel.
- `app/skill/[slug]/page.tsx` - detail page with rendered SKILL.md README.
- `app/api/vote` / `app/api/use` - anon POST endpoints, dedup and rate-limited by sha256(ip + salt + day).
- `app/api/cron/ingest` - scans `lib/ingest/sources.ts`, walks GitHub trees for `SKILL.md`, upserts to Supabase.
- `lib/ingest/*` - pipeline (sources, github client, frontmatter parser, categorizer).
- `supabase/migrations/*` - tables, materialized views, RLS, function grants, and public-read hardening.

## Deploy

```bash
vercel --prod
```

Set the same env vars in Vercel project settings. Cron is declared in `vercel.json` (Sunday 6am UTC).
Set `NEXT_PUBLIC_SITE_URL` to the production origin so canonical URLs, `sitemap.xml`, `robots.txt`, and social preview metadata point at the live domain.
Set `COVER_CRON_SECRET` when enabling `/api/cron/generate-covers` manually so cover generation does not share the ingest cron secret.
The anonymous interaction rate limit trusts Vercel's `x-vercel-forwarded-for` header. If this app moves behind another proxy, update `lib/ip-hash.ts` to use that platform's trusted client-IP source.

## Quality Ratchet

Use the fixed gate before merging:

```bash
npm run quality
```

That runs ESLint with zero warnings allowed, then Vitest coverage against the current baseline in `vitest.config.ts`.
CI runs the same gate on pull requests and pushes to `dev`.

When new tests improve coverage, intentionally ratchet the baseline upward:

```bash
npm run ratchet
```

## Adding a seed repo

Edit `lib/ingest/sources.ts`:

```ts
export const SEED_REPOS: SeedRepo[] = [
  { owner: "obra", repo: "superpowers" },
  { owner: "your-org", repo: "your-skills-repo" },
];
```

Re-run `/api/cron/ingest`.

## Roadmap

- AI-generated cover images (Vercel AI Gateway, cached in Supabase Storage)
- LLM-based categorization (replace keyword heuristic)
- Search bar
- Community submission form
- TikTok-style vertical feed mode
