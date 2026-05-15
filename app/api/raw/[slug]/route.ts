import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Matches the slug shape produced by lib/ingest/parse-skill.ts#slugify.
// 1..120 lowercase alphanumerics or hyphens.
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,119}$/;

interface SkillRow {
  slug: string;
  name: string;
  repo_url: string;
  readme_md: string | null;
  content_hash: string | null;
}

/**
 * Public manifest endpoint used by the `skillzs` CLI to install a skill.
 *
 * GET /api/raw/<slug> -> 200 {
 *   slug, name, source_url, skill_md, checksum
 * }
 *
 * Cached aggressively (5 min browser / 1 hour CDN). No auth: SKILL.md is
 * already public on GitHub. The route uses the service-role client to bypass
 * the column-level RLS grants set in migration 0005, then projects only the
 * fields a fresh install needs.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false, error: "invalid slug" }, { status: 400 });
  }

  const sb = supabaseService();
  const { data, error } = await sb
    .from("skills")
    .select("slug, name, repo_url, readme_md, content_hash")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const row = data as SkillRow;
  if (!row.readme_md) {
    return NextResponse.json({ ok: false, error: "skill body missing" }, { status: 410 });
  }

  return NextResponse.json(
    {
      slug: row.slug,
      name: row.name,
      source_url: row.repo_url,
      skill_md: row.readme_md,
      checksum: `sha256:${row.content_hash ?? ""}`,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600",
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
}
