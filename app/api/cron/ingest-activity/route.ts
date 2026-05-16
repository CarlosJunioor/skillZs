import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { supabaseService } from "@/lib/supabase/server";
import { ingestActivityForCharacter } from "@/lib/character/ingest-activity";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

interface CharRow {
  id: string;
  slug: string;
  gh_handle: string | null;
}

async function handle(req: Request) {
  if (!isAuthorizedCronRequest(req, "DIPTYCH_CRON_SECRET", { allowCronSecretFallback: true })) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = supabaseService();
  const { data, error } = await supabase
    .from("characters")
    .select("id, slug, gh_handle")
    .not("gh_handle", "is", null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const chars = (data ?? []) as CharRow[];
  const totals = { inserted: 0, skipped: 0, errored: 0, characters: chars.length };

  for (const c of chars) {
    try {
      const r = await ingestActivityForCharacter(c);
      totals.inserted += r.inserted;
      totals.skipped += r.skipped;
      totals.errored += r.errored;
    } catch (err) {
      console.error(`[ingest-activity-route] unexpected throw for ${c.slug}:`, err);
      totals.errored += 1;
    }
  }

  return NextResponse.json({ ok: true, totals });
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
