import "server-only";
import { fetchPublicEvents, normalizeEvent, type NormalizedActivity } from "@/lib/character/github-events";
import { supabaseService } from "@/lib/supabase/server";

export interface IngestArgs {
  id: string;
  slug: string;
  gh_handle: string | null;
}

export interface IngestResult {
  inserted: number;
  skipped: number;
  errored: number;
}

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Fetch a character's recent public GitHub events, normalize, filter to the
 * last 14 days, and upsert with ignoreDuplicates on github_event_id.
 *
 * - `gh_handle` null → skipped=1, no fetch
 * - GH 404 (handle gone) → fetchPublicEvents returns [], inserted=0
 * - Network / other GH error → caught, errored=1, no throw
 * - Insert error → errored=1, no throw
 */
export async function ingestActivityForCharacter(c: IngestArgs): Promise<IngestResult> {
  if (!c.gh_handle) return { inserted: 0, skipped: 1, errored: 0 };

  let raw;
  try {
    raw = await fetchPublicEvents(c.gh_handle);
  } catch (err) {
    console.error(`[ingest-activity] fetch failed for ${c.slug}:`, err);
    return { inserted: 0, skipped: 0, errored: 1 };
  }

  const cutoffMs = Date.now() - FOURTEEN_DAYS_MS;
  const rows: NormalizedActivity[] = [];
  for (const evt of raw) {
    if (new Date(evt.created_at).getTime() < cutoffMs) continue;
    const row = normalizeEvent(evt, c.id);
    if (row) rows.push(row);
  }

  if (rows.length === 0) return { inserted: 0, skipped: 0, errored: 0 };

  const supabase = supabaseService();
  const { error } = await supabase
    .from("character_activities")
    .upsert(rows, { onConflict: "github_event_id", ignoreDuplicates: true });

  if (error) {
    console.error(`[ingest-activity] insert failed for ${c.slug}:`, error);
    return { inserted: 0, skipped: 0, errored: 1 };
  }

  return { inserted: rows.length, skipped: 0, errored: 0 };
}
