import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,119}$/;

/**
 * Manually set or clear a skill's character_id. Used to fix bad
 * auto-attributions without re-ingesting.
 *
 * Body: { "character_slug": "matt-pocock" }  // sets to that character
 *       { "character_slug": null }           // clears attribution
 *
 * Auth: DIPTYCH_CRON_SECRET (no cron fallback — operator-triggered only).
 */
async function handle(req: Request, slug: string) {
  if (!isAuthorizedCronRequest(req, "DIPTYCH_CRON_SECRET")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false, error: "invalid slug" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const raw = (body as { character_slug?: unknown })?.character_slug;
  if (raw !== null && typeof raw !== "string") {
    return NextResponse.json({ ok: false, error: "character_slug must be string or null" }, { status: 400 });
  }
  if (typeof raw === "string" && !SLUG_RE.test(raw)) {
    return NextResponse.json({ ok: false, error: "invalid character_slug" }, { status: 400 });
  }

  const sb = supabaseService();

  let characterId: string | null = null;
  if (typeof raw === "string") {
    const { data: chr, error: chrErr } = await sb
      .from("characters")
      .select("id")
      .eq("slug", raw)
      .maybeSingle();
    if (chrErr) {
      return NextResponse.json({ ok: false, error: chrErr.message }, { status: 500 });
    }
    if (!chr) {
      return NextResponse.json({ ok: false, error: "character not found" }, { status: 404 });
    }
    characterId = (chr as { id: string }).id;
  }

  const { data, error } = await sb
    .from("skills")
    .update({ character_id: characterId })
    .eq("slug", slug)
    .select("slug, character_id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "skill not found" }, { status: 404 });
  }

  // Propagate the join to the matview so cards pick up the new chip.
  await sb.rpc("refresh_skill_stats");

  return NextResponse.json({
    ok: true,
    slug: (data as { slug: string }).slug,
    character_id: (data as { character_id: string | null }).character_id,
  });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  return handle(req, slug);
}
