import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin spend dashboard. Returns totals + per-status counts for the diptych
 * pipeline and the character-avatar pipeline so the owner can see what the
 * AI gen has cost so far and which rows are stuck.
 *
 * Auth: DIPTYCH_CRON_SECRET. Service-role read, never exposed to anon.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req, "DIPTYCH_CRON_SECRET")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const sb = supabaseService();

  const skillsRes = await sb
    .from("skills")
    .select("diptych_status, diptych_cost_usd");
  if (skillsRes.error) {
    return NextResponse.json({ ok: false, error: skillsRes.error.message }, { status: 500 });
  }

  const charactersRes = await sb
    .from("characters")
    .select("avatar_status, avatar_cost_usd");
  if (charactersRes.error) {
    return NextResponse.json({ ok: false, error: charactersRes.error.message }, { status: 500 });
  }

  type SkillRow = { diptych_status: string | null; diptych_cost_usd: number | string | null };
  type CharRow = { avatar_status: string | null; avatar_cost_usd: number | string | null };

  const skills = (skillsRes.data ?? []) as SkillRow[];
  const skillByStatus: Record<string, number> = {};
  let skillTotal = 0;
  for (const r of skills) {
    const status = r.diptych_status ?? "pending";
    skillByStatus[status] = (skillByStatus[status] ?? 0) + 1;
    const cost = Number(r.diptych_cost_usd ?? 0);
    if (Number.isFinite(cost)) skillTotal += cost;
  }

  const characters = (charactersRes.data ?? []) as CharRow[];
  const charByStatus: Record<string, number> = {};
  let charTotal = 0;
  for (const r of characters) {
    const status = r.avatar_status ?? "pending";
    charByStatus[status] = (charByStatus[status] ?? 0) + 1;
    const cost = Number(r.avatar_cost_usd ?? 0);
    if (Number.isFinite(cost)) charTotal += cost;
  }

  return NextResponse.json({
    ok: true,
    total_skills: skills.length,
    by_status: skillByStatus,
    total_usd: Number(skillTotal.toFixed(4)),
    characters: {
      total: characters.length,
      by_status: charByStatus,
      total_usd: Number(charTotal.toFixed(4)),
    },
    grand_total_usd: Number((skillTotal + charTotal).toFixed(4)),
  });
}
