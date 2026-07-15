import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,119}$/;
/**
 * Admin endpoint: requeue a creator avatar for regeneration.
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

  const asset = new URL(req.url).searchParams.get("asset");
  if (asset && asset !== "avatar") {
    return NextResponse.json({ ok: false, error: "invalid asset" }, { status: 400 });
  }

  const sb = supabaseService();
  const { data, error } = await sb
    .from("characters")
    .update({
      avatar_status: "pending",
      avatar_error: null,
      // Reset the retry budget so the claim function (which refuses rows at the
      // attempts cap) will actually pick this requeued asset up again.
      avatar_attempts: 0,
    })
    .eq("slug", slug)
    // Don't clobber an in-flight generation the worker is about to commit.
    .neq("avatar_status", "generating")
    .select("slug, avatar_status")
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
