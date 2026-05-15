// lib/town/layout.ts
import "server-only";
import layoutJson from "@/design/town-layout.json";
import { fetchCharactersForTown } from "@/lib/stats";
import type { Character } from "@/lib/types";

export interface LayoutEntry {
  slug: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TownTile extends LayoutEntry {
  character: Character;
}

/**
 * Read design/town-layout.json + the characters table and produce a merged
 * tile list. STRICT drift policy: throws on any mismatch between layout and
 * DB. See design/sub-project-c-town.md "Drift policy" for rationale.
 */
export async function loadTownLayout(): Promise<TownTile[]> {
  const entries = (layoutJson as unknown as LayoutEntry[]);
  assertNoDuplicates(entries);
  assertNoOverlaps(entries);

  const characters = await fetchCharactersForTown();
  const charBySlug = new Map(characters.map((c) => [c.slug, c]));
  const layoutSlugs = new Set(entries.map((e) => e.slug));

  for (const e of entries) {
    if (!charBySlug.has(e.slug)) {
      throw new Error(`town layout drift: slug "${e.slug}" in JSON but not in characters table`);
    }
  }
  for (const c of characters) {
    if (!layoutSlugs.has(c.slug)) {
      throw new Error(`town layout drift: slug "${c.slug}" in characters table but not in JSON`);
    }
  }

  return entries.map((e) => ({
    ...e,
    character: charBySlug.get(e.slug) as Character,
  }));
}

function assertNoDuplicates(entries: LayoutEntry[]): void {
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.slug)) {
      throw new Error(`town layout: duplicate slug "${e.slug}"`);
    }
    seen.add(e.slug);
  }
}

function assertNoOverlaps(entries: LayoutEntry[]): void {
  const occupied = new Map<string, string>(); // "x,y" -> slug
  for (const e of entries) {
    for (let dx = 0; dx < e.w; dx++) {
      for (let dy = 0; dy < e.h; dy++) {
        const key = `${e.x + dx},${e.y + dy}`;
        if (occupied.has(key)) {
          throw new Error(
            `town layout: overlap at (${e.x + dx},${e.y + dy}) between "${occupied.get(key)}" and "${e.slug}"`,
          );
        }
        occupied.set(key, e.slug);
      }
    }
  }
}
