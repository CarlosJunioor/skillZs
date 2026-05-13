import { supabaseService } from "../supabase/server";
import { buildPrompt, STYLE_VERSION } from "./style";
import { generateCover, type CoverQuality } from "./generate";
import { uploadCover } from "./upload";

export interface CoverRunOptions {
  /** how many to generate this run. Cap to keep costs predictable. */
  limit?: number;
  /** "low" (default) | "medium" | "high" */
  quality?: CoverQuality;
  /** Order: "hotness" (top voted/used/starred) or "first_seen" (newest first). */
  order?: "hotness" | "first_seen";
}

export interface CoverRunStats {
  attempted: number;
  generated: number;
  failed: number;
  estimatedCostUsd: number;
  errors: string[];
}

export async function runCoverGeneration(opts: CoverRunOptions = {}): Promise<CoverRunStats> {
  const limit = opts.limit ?? 50;
  const quality = opts.quality ?? "low";
  const order = opts.order ?? "hotness";

  const sb = supabaseService();
  const stats: CoverRunStats = {
    attempted: 0,
    generated: 0,
    failed: 0,
    estimatedCostUsd: 0,
    errors: [],
  };

  const { data: candidates, error: pickErr } = await sb
    .from("skill_stats")
    .select("id, slug, name, description, category")
    .in("cover_status", ["pending", "failed"])
    .order(order === "hotness" ? "hotness" : "first_seen", { ascending: false })
    .limit(limit);

  if (pickErr) {
    stats.errors.push(`pick candidates: ${pickErr.message}`);
    return stats;
  }
  if (!candidates || candidates.length === 0) return stats;

  for (const c of candidates) {
    const { data: claimed, error: claimErr } = await sb.rpc("claim_skill_cover", {
      p_skill_id: c.id,
    });
    if (claimErr) {
      stats.errors.push(`${c.slug}: claim failed: ${claimErr.message}`);
      continue;
    }
    if (!claimed) continue;

    stats.attempted++;
    let costAlreadyCharged = 0;

    try {
      const prompt = buildPrompt({
        name: c.name,
        description: c.description,
        category: (c as { category?: string | null }).category,
        slug: c.slug,
      });
      const { bytes, estimatedCostUsd } = await generateCover({ prompt, quality });
      costAlreadyCharged = estimatedCostUsd;
      stats.estimatedCostUsd += estimatedCostUsd;

      const publicUrl = await uploadCover(c.slug, bytes);

      const { error: updErr } = await sb
        .from("skills")
        .update({
          cover_url: publicUrl,
          cover_prompt: `${STYLE_VERSION}: ${prompt}`,
          cover_status: "done",
          cover_generated_at: new Date().toISOString(),
          cover_error: null,
        })
        .eq("id", c.id)
        .eq("cover_status", "generating");
      if (updErr) throw new Error(`db update: ${updErr.message}`);

      stats.generated++;
    } catch (e) {
      stats.failed++;
      const msg = (e as Error).message;
      const annotated = costAlreadyCharged > 0
        ? `${c.slug} (charged $${costAlreadyCharged.toFixed(2)}): ${msg}`
        : `${c.slug}: ${msg}`;
      stats.errors.push(annotated);
      await sb
        .from("skills")
        .update({ cover_status: "failed", cover_error: msg.slice(0, 500) })
        .eq("id", c.id)
        .eq("cover_status", "generating");
    }
  }

  await sb.rpc("refresh_skill_stats");

  return stats;
}
