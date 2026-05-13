import matter from "gray-matter";

export const MAX_SKILL_NAME_CHARS = 120;
export const MAX_SKILL_DESCRIPTION_CHARS = 1_000;
export const MAX_SKILL_BODY_CHARS = 200_000;

export interface ParsedSkill {
  name: string;
  description: string;
  body: string;
  /** Raw frontmatter for inspection */
  meta: Record<string, unknown>;
}

/**
 * Parse a SKILL.md file. Skills follow Anthropic's format:
 *
 *   ---
 *   name: skill-name
 *   description: Use when ...
 *   ---
 *   <body>
 *
 * If frontmatter is absent or missing required fields, returns null.
 */
export function parseSkill(raw: string): ParsedSkill | null {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch {
    return null;
  }
  const meta = parsed.data as Record<string, unknown>;
  const name = typeof meta.name === "string" ? meta.name.trim() : "";
  const description = typeof meta.description === "string" ? meta.description.trim() : "";
  if (!name || !description) return null;
  if (name.length > MAX_SKILL_NAME_CHARS || description.length > MAX_SKILL_DESCRIPTION_CHARS) {
    return null;
  }
  const body = parsed.content.trim();
  if (body.length > MAX_SKILL_BODY_CHARS) return null;
  return { name, description, body, meta };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
