import { supabaseService } from "../supabase/server";
import { generateCover, type CoverQuality } from "../covers/generate";
import { buildAvatarPrompt, AVATAR_STYLE_VERSION } from "./prompt";
import { uploadCharacterAvatar } from "./upload";
import type { CharacterKind } from "@/lib/types";

export interface AvatarRunOptions {
  /** How many to generate this run. Cap to keep costs predictable. */
  limit?: number;
  /** "low" (default) | "medium" | "high" */
  quality?: CoverQuality;
}

export interface AvatarRunStats {
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
  role: string | null;
  kind: CharacterKind;
}

export async function runAvatarGeneration(opts: AvatarRunOptions = {}): Promise<AvatarRunStats> {
  const limit = opts.limit ?? 25;
  const quality = opts.quality ?? "low";

  const sb = supabaseService();
  const stats: AvatarRunStats = {
    attempted: 0,
    generated: 0,
    failed: 0,
    estimatedCostUsd: 0,
    errors: [],
  };

  const { data: candidates, error: pickErr } = await sb
    .from("characters")
    .select("id, slug, name, role, kind")
    .in("avatar_status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (pickErr) {
    stats.errors.push(`pick candidates: ${pickErr.message}`);
    return stats;
  }
  if (!candidates || candidates.length === 0) return stats;

  for (const c of candidates as Candidate[]) {
    const { data: claimed, error: claimErr } = await sb.rpc("claim_character_avatar", {
      p_character_id: c.id,
    });
    if (claimErr) {
      stats.errors.push(`${c.slug}: claim failed: ${claimErr.message}`);
      continue;
    }
    if (!claimed) continue;

    stats.attempted++;
    let costAlreadyCharged = 0;

    try {
      const prompt = buildAvatarPrompt({
        slug: c.slug,
        name: c.name,
        role: c.role,
        kind: c.kind,
      });
      const { bytes, estimatedCostUsd } = await generateCover({
        prompt,
        quality,
        size: "1024x1024",
      });
      costAlreadyCharged = estimatedCostUsd;
      stats.estimatedCostUsd += estimatedCostUsd;

      const publicUrl = await uploadCharacterAvatar(c.slug, bytes);

      const { error: updErr } = await sb
        .from("characters")
        .update({
          avatar_url: publicUrl,
          avatar_prompt: `${AVATAR_STYLE_VERSION}: ${prompt}`,
          avatar_status: "done",
          avatar_generated_at: new Date().toISOString(),
          avatar_error: null,
          avatar_cost_usd: estimatedCostUsd,
        })
        .eq("id", c.id)
        .eq("avatar_status", "generating");
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
        .from("characters")
        .update({ avatar_status: "failed", avatar_error: msg.slice(0, 500) })
        .eq("id", c.id)
        .eq("avatar_status", "generating");
    }
  }

  // Refresh skill_stats so the new avatar_url propagates to the chip on cards.
  await sb.rpc("refresh_skill_stats");

  return stats;
}
