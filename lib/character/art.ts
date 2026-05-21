// lib/character/art.ts
import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Character } from "@/lib/types";

/** Max art panels probed per character — see public/characters/<slug>/N.png.
 *  Bump this when designs need more than a handful of panels per character. */
const MAX_ART_PANELS = 4;

/**
 * Probe public/characters/<slug>/{1..MAX_ART_PANELS}.png at request time and
 * return the public URLs that resolve. Cheap on Vercel: pages set revalidate
 * so the result is cached for the lifetime of the ISR window.
 */
export function loadCharacterArt(slug: string): string[] {
  const urls: string[] = [];
  for (let i = 1; i <= MAX_ART_PANELS; i++) {
    const rel = `characters/${slug}/${i}.png`;
    const abs = path.join(process.cwd(), "public", rel);
    if (existsSync(abs)) urls.push(`/${rel}`);
  }
  return urls;
}

/**
 * Pick the best hero image for a character. Prefers locally shipped art
 * (public/characters/<slug>/1.png), then falls back to the DB-stored
 * avatar_url, then null so the caller can render a placeholder.
 */
export function resolveCharacterHero(character: Character): string | null {
  const art = loadCharacterArt(character.slug);
  return art[0] ?? character.avatar_url ?? null;
}
