import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin spend dashboard. Returns recorded spend + per-status counts for the
 * paid gpt-image-1 pipelines so the owner can see roughly what AI gen has cost
 * and which rows are stuck: skill diptychs and creator avatars.
 *
 * Caveats (the figure is a lower bound, not an exact invoice):
 * - Per-row *_cost_usd reflects the MOST RECENT generation attempt, so spend on
 *   a row that was charged on an earlier failed attempt before succeeding (or
 *   before exhausting the 3-attempt cap) is approximate, not cumulative.
 * - Cover spend is not tracked per-row (no cost column; covers is manual-only,
 *   not on a cron), so it is out of scope here.
 *
 * Auth: DIPTYCH_CRON_SECRET. Service-role read, never exposed to anon.
 */
function sumCost(value: number | string | null | undefined): number {
  const cost = Number(value ?? 0);
  return Number.isFinite(cost) ? cost : 0;
}

function round(n: number): number {
  return Number(n.toFixed(4));
}

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
  type CharRow = {
    avatar_status: string | null;
    avatar_cost_usd: number | string | null;
  };

  const skills = (skillsRes.data ?? []) as SkillRow[];
  const skillByStatus: Record<string, number> = {};
  let skillTotal = 0;
  for (const r of skills) {
    const status = r.diptych_status ?? "pending";
    skillByStatus[status] = (skillByStatus[status] ?? 0) + 1;
    skillTotal += sumCost(r.diptych_cost_usd);
  }

  const characters = (charactersRes.data ?? []) as CharRow[];
  const avatarByStatus: Record<string, number> = {};
  let avatarTotal = 0;
  for (const r of characters) {
    const aStatus = r.avatar_status ?? "pending";
    avatarByStatus[aStatus] = (avatarByStatus[aStatus] ?? 0) + 1;
    avatarTotal += sumCost(r.avatar_cost_usd);
  }

  return NextResponse.json({
    ok: true,
    total_skills: skills.length,
    by_status: skillByStatus,
    total_usd: round(skillTotal),
    characters: {
      total: characters.length,
      by_status: avatarByStatus,
      total_usd: round(avatarTotal),
    },
    grand_total_usd: round(skillTotal + avatarTotal),
  });
}
