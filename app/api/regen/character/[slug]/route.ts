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
  const attemptsCol = asset === "building" ? "building_attempts" : "avatar_attempts";

  const sb = supabaseService();
  const { data, error } = await sb
    .from("characters")
    .update({
      [statusCol]: "pending",
      [errorCol]: null,
      // Reset the retry budget so the claim function (which refuses rows at the
      // attempts cap) will actually pick this requeued asset up again.
      [attemptsCol]: 0,
    })
    .eq("slug", slug)
    // Don't clobber an in-flight generation the worker is about to commit.
    .neq(statusCol, "generating")
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
