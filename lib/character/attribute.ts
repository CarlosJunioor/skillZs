import type { SupabaseClient } from "@supabase/supabase-js";
import { characterForSource } from "./seed";

export type MatchReason = "gh_handle" | "x_handle" | "source_repo";

export interface Attribution {
  character_id: string | null;
  match_reason: MatchReason | null;
}

/**
 * Normalise a free-form author handle from SKILL.md frontmatter.
 *
 * Accepts:
 *   "@mpocock1"
 *   "mpocock1"
 *   "https://github.com/mattpocockuk"
 *   "https://twitter.com/theo"
 *   "https://x.com/theo"
 *
 * Returns lowercase username, or "" when nothing usable was found.
 */
export function normaliseHandle(input: string | null | undefined): string {
  if (!input) return "";
  let h = String(input).trim().toLowerCase();
  if (!h) return "";
  // Strip URL prefix to bare username.
  h = h.replace(/^https?:\/\/(?:www\.)?(github|twitter|x)\.com\//, "");
  // Strip leading @, trailing slash, trailing whitespace artefacts.
  h = h.replace(/^@+/, "").replace(/\/+$/, "");
  // Allowlist real handle characters: GitHub usernames are [a-z0-9-] (<=39 chars),
  // X handles [a-z0-9_] (<=15). This rejects junk early and is defense-in-depth —
  // attribution no longer interpolates the value into any query (see below).
  if (!/^[a-z0-9_-]{1,39}$/.test(h)) return "";
  return h;
}

/**
 * Attribute a parsed skill by its `author`/`author_handle` frontmatter, then
 * fall back to the operator-curated source repository map.
 *
 * Case-insensitive. Returns null match when no candidate handle is present.
 */
export async function attributeSkillToCharacter(
  sb: SupabaseClient,
  meta: Record<string, unknown>,
  sourceRepo?: string,
): Promise<Attribution> {
  const raw =
    (typeof meta.author === "string" ? meta.author : null) ??
    (typeof meta.author_handle === "string" ? meta.author_handle : null) ??
    "";
  const authoredHandle = normaliseHandle(raw);
  const sourceCharacter = sourceRepo ? characterForSource(sourceRepo) : null;
  const sourceHandle = normaliseHandle(sourceCharacter?.gh_handle ?? sourceCharacter?.x_handle);
  const norm = authoredHandle || sourceHandle;
  if (!norm) return { character_id: null, match_reason: null };

  // The character roster is a small, operator-curated set, so fetch it whole and
  // match in JS. This deliberately keeps the untrusted handle OUT of the query:
  // no `.ilike()` (whose `_`/`%` wildcards could over-match) and no interpolated
  // `.or()` string (which could be injected). The match is an exact,
  // case-insensitive equality on gh_handle / x_handle.
  const { data, error } = await sb
    .from("characters")
    .select("id, gh_handle, x_handle");

  if (error || !data) {
    return { character_id: null, match_reason: null };
  }

  const rows = data as Array<{ id: string; gh_handle: string | null; x_handle: string | null }>;
  for (const row of rows) {
    if ((row.gh_handle ?? "").toLowerCase() === norm) {
      return { character_id: row.id, match_reason: authoredHandle ? "gh_handle" : "source_repo" };
    }
    if ((row.x_handle ?? "").toLowerCase() === norm) {
      return { character_id: row.id, match_reason: authoredHandle ? "x_handle" : "source_repo" };
    }
  }
  return { character_id: null, match_reason: null };
}
