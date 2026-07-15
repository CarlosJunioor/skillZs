# skillZs

[![skills.sh](https://skills.sh/b/CarlosJunioor/skillZs)](https://skills.sh/CarlosJunioor/skillZs/find-agent-skills)

Image-free discovery index for reusable AI agent skills. The catalog mirrors the live
skills.sh ecosystem with install rankings, search, lightweight tags, full `SKILL.md`
manuals, and security-audit results.

## Public resources

- [Agent Skills Directory](https://skillzs.dev/browse)
- [How to create Agent Skills](https://skillzs.dev/guides/how-to-create-agent-skills)
- [How to publish Agent Skills](https://skillzs.dev/guides/how-to-publish-agent-skills)
- [Agent Skills Ecosystem Report 2026](https://skillzs.dev/research/agent-skills-report-2026)
- [Agent Skill security checklist](https://skillzs.dev/guides/agent-skill-security)

Install the first-party discovery skill from this repository:

```bash
npx skills add CarlosJunioor/skillZs --skill find-agent-skills
```

```txt
Next.js 16 (App Router) | Tailwind v4 | skills.sh API | Vercel OIDC
```

## Quick start

1. **Install dependencies and link the Vercel project**

   ```bash
   npm install
   vercel link
   ```

2. **Start with the Vercel development environment**

   ```bash
   vercel env run -- npm run dev
   ```

3. **Open** http://localhost:3000.

The Vercel project must have OIDC enabled because the skills.sh API is authenticated
with `@vercel/oidc`. Supabase variables are used by creator attribution, creator profiles,
avatar generation, and the legacy admin/ingest tools; the primary catalog does not depend on Supabase.

## Architecture

- `app/page.tsx` - image-free top-10 leaderboard by real installs.
- `app/browse/page.tsx` - paginated all-time, trending, hot, and search views.
- `app/loops/page.tsx` - curated agent loops with terminal previews and copyable prompts.
- `app/skills/[...id]/page.tsx` - canonical skill detail and rendered `SKILL.md` manual.
- `app/character/[slug]/page.tsx` - creator credit pages with portraits and attributed skills.
- `app/skill/[slug]/page.tsx` - permanent redirects for legacy indexed URLs.
- `lib/skills-sh.ts` - typed OIDC-authenticated skills.sh API client.
- `app/sitemap.ts` - catalog sitemap shards capped at 50,000 URLs.

## Deploy

```bash
vercel --prod
```

Enable OIDC for the Vercel project and set the legacy environment variables only for
the Supabase-backed creator and admin routes. Cron schedules are declared in `vercel.json`.
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

Skill cover generation is intentionally not scheduled. The primary catalog stays
text-first so catalog growth does not create per-skill image-generation cost.
