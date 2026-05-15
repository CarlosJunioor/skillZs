import type { SupabaseClient } from "@supabase/supabase-js";

export type MatchReason = "gh_handle" | "x_handle";

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
  // GitHub usernames can include hyphens; reject anything with whitespace.
  if (/\s/.test(h)) return "";
  return h;
}

/**
 * Try to attribute a parsed skill to a character row by matching its `author`
 * (or `author_handle`) frontmatter against characters.gh_handle / .x_handle.
 *
 * Case-insensitive. Returns null match when no candidate handle is present.
 */
export async function attributeSkillToCharacter(
  sb: SupabaseClient,
  meta: Record<string, unknown>,
): Promise<Attribution> {
  const raw =
    (typeof meta.author === "string" ? meta.author : null) ??
    (typeof meta.author_handle === "string" ? meta.author_handle : null) ??
    "";
  const norm = normaliseHandle(raw);
  if (!norm) return { character_id: null, match_reason: null };

  const { data, error } = await sb
    .from("characters")
    .select("id, gh_handle, x_handle")
    .or(`gh_handle.ilike.${norm},x_handle.ilike.${norm}`)
    .limit(1);

  if (error || !data || data.length === 0) {
    return { character_id: null, match_reason: null };
  }

  const row = data[0] as { id: string; gh_handle: string | null; x_handle: string | null };
  const reason: MatchReason =
    (row.gh_handle ?? "").toLowerCase() === norm ? "gh_handle" : "x_handle";
  return { character_id: row.id, match_reason: reason };
}
