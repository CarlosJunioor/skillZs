import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { SEED_CHARACTERS } from "@/lib/character/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Idempotently upsert the SEED_CHARACTERS roster on `slug`.
 *
 * - Existing rows have their public fields updated, avatar lifecycle untouched.
 * - New rows land with avatar_status='pending' so the next /api/cron/generate-avatars
 *   run picks them up.
 *
 * Auth: DIPTYCH_CRON_SECRET (no cron fallback — operator-triggered only).
 */
export async function POST(req: Request) {
  if (!isAuthorizedCronRequest(req, "DIPTYCH_CRON_SECRET")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const sb = supabaseService();
  const rows = SEED_CHARACTERS.map((c) => ({
    slug: c.slug,
    kind: c.kind,
    name: c.name,
    role: c.role,
    bio: c.bio,
    gh_handle: c.gh_handle ?? null,
    x_handle: c.x_handle ?? null,
    site_url: c.site_url ?? null,
  }));

  const { data, error } = await sb
    .from("characters")
    .upsert(rows, { onConflict: "slug" })
    .select("slug, avatar_status");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    upserted: rows.length,
    rows: (data ?? []) as Array<{ slug: string; avatar_status: string }>,
  });
}
