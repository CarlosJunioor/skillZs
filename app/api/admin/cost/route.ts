import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin spend dashboard. Returns totals + per-status counts for the diptych
 * pipeline so the owner can see what the AI gen has cost so far and which
 * skills are stuck.
 *
 * Auth: DIPTYCH_CRON_SECRET. Service-role read, never exposed to anon.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req, "DIPTYCH_CRON_SECRET")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const sb = supabaseService();
  const { data, error } = await sb
    .from("skills")
    .select("diptych_status, diptych_cost_usd");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  type Row = { diptych_status: string | null; diptych_cost_usd: number | string | null };
  const rows = (data ?? []) as Row[];
  const byStatus: Record<string, number> = {};
  let totalUsd = 0;
  for (const r of rows) {
    const status = r.diptych_status ?? "pending";
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    const cost = Number(r.diptych_cost_usd ?? 0);
    if (Number.isFinite(cost)) totalUsd += cost;
  }

  return NextResponse.json({
    ok: true,
    total_skills: rows.length,
    by_status: byStatus,
    total_usd: Number(totalUsd.toFixed(4)),
  });
}
