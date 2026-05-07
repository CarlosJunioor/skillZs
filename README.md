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
   - Open SQL Editor and run `supabase/migrations/0001_initial.sql`.
   - Copy `Project URL`, `anon` key, `service_role` key into `.env.local`.

3. **Configure env**

   ```bash
   cp .env.example .env.local
   # fill in all 5 values
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
- `supabase/migrations/0001_initial.sql` - `skills`, `votes`, `usage_clicks` tables + `skill_stats` matview.

## Deploy

```bash
vercel --prod
```

Set the same env vars in Vercel project settings. Cron is declared in `vercel.json` (Sunday 6am UTC).

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
