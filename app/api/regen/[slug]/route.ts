import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,119}$/;

/**
 * Admin endpoint: requeue a single skill for diptych regeneration.
 *
 * Resets diptych_status from 'done' or 'failed' back to 'pending' and clears
 * the error. The next /api/cron/generate-diptychs run will pick it up.
 *
 * Auth: DIPTYCH_CRON_SECRET (Bearer or x-cron-secret header).
 */
async function handle(req: Request, slug: string) {
  if (!isAuthorizedCronRequest(req, "DIPTYCH_CRON_SECRET")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false, error: "invalid slug" }, { status: 400 });
  }

  const sb = supabaseService();
  const { data, error } = await sb
    .from("skills")
    .update({
      diptych_status: "pending",
      diptych_error: null,
      // Reset the retry budget: a deliberate requeue is a fresh request, and the
      // claim function refuses rows at the attempts cap. Without this, requeuing
      // an exhausted row would report success but never actually regenerate.
      diptych_attempts: 0,
    })
    .eq("slug", slug)
    // Never clobber an in-flight generation back to 'pending' — the worker's
    // own update filters on diptych_status='generating' and would silently drop
    // the (already paid-for) result it is about to commit.
    .neq("diptych_status", "generating")
    .select("slug, diptych_status")
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
