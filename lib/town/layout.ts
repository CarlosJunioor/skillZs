// lib/town/layout.ts
import "server-only";
import layoutJson from "@/design/town-layout.json";
import { loadCharacterArt } from "@/lib/character/art";
import { fetchCharactersForTown } from "@/lib/stats";
import type { Character } from "@/lib/types";

/** Hotspot box on the Aquarius map image. All values are 0..1 fractions of
 *  the rendered map width/height — independent of the underlying PNG size. */
export interface Hotspot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutEntry {
  slug: string;
  /** Human-readable building label as drawn on the map (e.g. "TGH BUILDING"). */
  building: string;
  hotspot: Hotspot;
}

export interface TownTile extends LayoutEntry {
  character: Character;
  /** Public URLs of user-drawn art panels for this character, in display order.
   *  Empty when no panels have been added under public/characters/<slug>/N.png. */
  artUrls: string[];
}

/**
 * Read design/town-layout.json + the characters table and produce a merged
 * tile list. STRICT drift policy: throws on any mismatch between layout and
 * DB. Hotspot coords are validated (0..1) but overlaps are allowed because
 * the map is hand-drawn isometric — illustrated buildings naturally bleed.
 */
export async function loadTownLayout(): Promise<TownTile[]> {
  const entries = layoutJson as unknown as LayoutEntry[];
  assertNoDuplicates(entries);
  assertValidHotspots(entries);

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
    artUrls: loadCharacterArt(e.slug),
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

function assertValidHotspots(entries: LayoutEntry[]): void {
  for (const e of entries) {
    const { x, y, w, h } = e.hotspot;
    const inRange = (v: number) => v >= 0 && v <= 1;
    if (![x, y, w, h].every(inRange) || x + w > 1.0001 || y + h > 1.0001) {
      throw new Error(
        `town layout: hotspot for "${e.slug}" out of bounds — must be 0..1 fractions inside the map`,
      );
    }
  }
}
