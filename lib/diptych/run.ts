import { supabaseService } from "../supabase/server";
import { generateDiptychText } from "./text";
import { generateDiptychImage } from "./image";
import { uploadDiptych } from "./upload";
import { STYLE_VERSION } from "./prompt";
import type { CoverQuality } from "../covers/generate";

export interface DiptychRunOptions {
  /** how many to generate this run. Cap to keep image-gen costs predictable. */
  limit?: number;
  /** "low" (default) | "medium" | "high" — passed through to gpt-image-1. */
  quality?: CoverQuality;
  /** Order: "hotness" (top voted/used/starred) or "first_seen" (newest first). */
  order?: "hotness" | "first_seen";
}

export interface DiptychRunStats {
  attempted: number;
  generated: number;
  failed: number;
  estimatedCostUsd: number;
  errors: string[];
}

interface Candidate {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string | null;
}

export async function runDiptychGeneration(opts: DiptychRunOptions = {}): Promise<DiptychRunStats> {
  const limit = opts.limit ?? 25;
  const quality = opts.quality ?? "low";
  const order = opts.order ?? "hotness";

  const sb = supabaseService();
  const stats: DiptychRunStats = {
    attempted: 0,
    generated: 0,
    failed: 0,
    estimatedCostUsd: 0,
    errors: [],
  };

  const { data: candidates, error: pickErr } = await sb
    .from("skill_stats")
    .select("id, slug, name, description, category")
    .in("diptych_status", ["pending", "failed"])
    .order(order === "hotness" ? "hotness" : "first_seen", { ascending: false })
    .limit(limit);

  if (pickErr) {
    stats.errors.push(`pick candidates: ${pickErr.message}`);
    return stats;
  }
  if (!candidates || candidates.length === 0) return stats;

  for (const c of candidates as Candidate[]) {
    const { data: claimed, error: claimErr } = await sb.rpc("claim_skill_diptych", {
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
      const body = await loadSkillBody(sb, c.id);
      if (!body) throw new Error("missing readme_md");

      const { text, estimatedCostUsd: textCost } = await generateDiptychText({
        name: c.name,
        description: c.description,
        body,
      });
      costAlreadyCharged += textCost;
      stats.estimatedCostUsd += textCost;

      const { bytes, prompt, estimatedCostUsd: imageCost } = await generateDiptychImage(
        {
          name: c.name,
          before_text: text.before_text,
          after_text: text.after_text,
          category: c.category,
        },
        quality,
      );
      costAlreadyCharged += imageCost;
      stats.estimatedCostUsd += imageCost;

      const publicUrl = await uploadDiptych(c.slug, bytes);

      const { error: updErr } = await sb
        .from("skills")
        .update({
          tagline:         text.tagline,
          before_text:     text.before_text,
          after_text:      text.after_text,
          diptych_url:     publicUrl,
          diptych_prompt:  `${STYLE_VERSION}: ${prompt}`,
          diptych_status:  "done",
          diptych_generated_at: new Date().toISOString(),
          diptych_error:   null,
          diptych_cost_usd: costAlreadyCharged,
        })
        .eq("id", c.id)
        .eq("diptych_status", "generating");
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
        // Persist the cost already charged for this attempt so the admin spend
        // dashboard sees post-generation failures (charged but not committed),
        // not just successes. Reflects this attempt's charge, not a cumulative total.
        .update({ diptych_status: "failed", diptych_error: msg.slice(0, 500), diptych_cost_usd: costAlreadyCharged })
        .eq("id", c.id)
        .eq("diptych_status", "generating");
    }
  }

  await sb.rpc("refresh_skill_stats");
  return stats;
}

async function loadSkillBody(
  sb: ReturnType<typeof supabaseService>,
  skillId: string,
): Promise<string | null> {
  const { data, error } = await sb
    .from("skills")
    .select("readme_md")
    .eq("id", skillId)
    .maybeSingle();
  if (error) throw new Error(`fetch body: ${error.message}`);
  return (data?.readme_md as string | null) ?? null;
}
