import type { SupabaseClient } from "@supabase/supabase-js";

export type InteractionKind = "vote" | "use";

const TABLE_BY_KIND: Record<InteractionKind, "votes" | "usage_clicks"> = {
  vote: "votes",
  use: "usage_clicks",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DAILY_INTERACTION_LIMIT = 120;

export function isSkillId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export async function recordInteraction(
  sb: SupabaseClient,
  kind: InteractionKind,
  skillId: string,
  ipHash: string,
): Promise<number> {
  const { data: allowed, error: rateLimitError } = await sb.rpc("try_consume_interaction", {
    p_action: kind,
    p_ip_hash: ipHash,
    p_max_events: DAILY_INTERACTION_LIMIT,
  });
  if (rateLimitError) throw rateLimitError;
  if (!allowed) {
    const err = new Error("rate limit exceeded");
    err.name = "RateLimitError";
    throw err;
  }

  const table = TABLE_BY_KIND[kind];
  const { error } = await sb
    .from(table)
    .upsert({ skill_id: skillId, ip_hash: ipHash }, { onConflict: "skill_id,ip_hash", ignoreDuplicates: true });
  if (error) throw error;

  const { count, error: countError } = await sb
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("skill_id", skillId);
  if (countError) throw countError;

  return count ?? 0;
}
