// lib/character/run-buildings.ts
// Mirrors lib/character/run.ts (avatar generation) exactly, but targets the
// building_* lifecycle columns and uses buildBuildingPrompt + uploadCharacterBuilding.
//
// Note: refresh_skill_stats is NOT called here — building_url is only read
// by the town map (which queries characters directly), not by the matview.

import { supabaseService } from "../supabase/server";
import { generateCover, type CoverQuality } from "../covers/generate";
import { buildBuildingPrompt, BUILDING_STYLE_VERSION } from "./building-prompt";
import { uploadCharacterBuilding } from "./upload";
import type { CharacterKind } from "@/lib/types";

export interface BuildingRunOptions {
  /** How many to generate this run. Cap to keep costs predictable. */
  limit?: number;
  /** "low" (default) | "medium" | "high" */
  quality?: CoverQuality;
}

export interface BuildingRunStats {
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

export async function runBuildingGeneration(
  opts: BuildingRunOptions = {},
): Promise<BuildingRunStats> {
  const limit = opts.limit ?? 25;
  const quality = opts.quality ?? "low";

  const sb = supabaseService();
  const stats: BuildingRunStats = {
    attempted: 0,
    generated: 0,
    failed: 0,
    estimatedCostUsd: 0,
    errors: [],
  };

  const { data: candidates, error: pickErr } = await sb
    .from("characters")
    .select("id, slug, name, role, kind")
    .in("building_status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (pickErr) {
    stats.errors.push(`pick candidates: ${pickErr.message}`);
    return stats;
  }
  if (!candidates || candidates.length === 0) return stats;

  for (const c of candidates as Candidate[]) {
    const { data: claimed, error: claimErr } = await sb.rpc(
      "claim_character_building",
      { p_character_id: c.id },
    );
    if (claimErr) {
      stats.errors.push(`${c.slug}: claim failed: ${claimErr.message}`);
      continue;
    }
    if (!claimed) continue;

    stats.attempted++;
    let costAlreadyCharged = 0;

    try {
      const prompt = buildBuildingPrompt({
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

      const publicUrl = await uploadCharacterBuilding(c.slug, bytes);

      const { error: updErr } = await sb
        .from("characters")
        .update({
          building_url: publicUrl,
          building_prompt: `${BUILDING_STYLE_VERSION}: ${prompt}`,
          building_status: "done",
          building_generated_at: new Date().toISOString(),
          building_error: null,
          building_cost_usd: estimatedCostUsd,
        })
        .eq("id", c.id)
        .eq("building_status", "generating");
      if (updErr) throw new Error(`db update: ${updErr.message}`);

      stats.generated++;
    } catch (e) {
      stats.failed++;
      const msg = (e as Error).message;
      const annotated =
        costAlreadyCharged > 0
          ? `${c.slug} (charged $${costAlreadyCharged.toFixed(2)}): ${msg}`
          : `${c.slug}: ${msg}`;
      stats.errors.push(annotated);
      await sb
        .from("characters")
        .update({ building_status: "failed", building_error: msg.slice(0, 500) })
        .eq("id", c.id)
        .eq("building_status", "generating");
    }
  }

  return stats;
}
