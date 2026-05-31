// lib/skill-md.ts
// Pure SKILL.md reader. No React, no server-only imports. Extracts a few
// high-signal structures from a skill's SKILL.md so the terminal preview can
// show the skill's OWN words instead of generic filler. Server/test side only —
// it is never imported by the "use client" preview component.
import matter from "gray-matter";

export const TERMINAL_WIDTH = 64;

/** Strip markdown decoration and collapse whitespace from a single line. */
export function sanitizeLine(raw: string): string {
  return raw
    .replace(/`([^`]*)`/g, "$1")             // inline code
    .replace(/\*\*([^*]+)\*\*/g, "$1")        // bold
    .replace(/\*([^*]+)\*/g, "$1")            // italic
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")  // links -> text
    .replace(/^\s*#{1,6}\s+/, "")             // heading hashes
    .replace(/^\s*>\s?/, "")                   // blockquote
    .replace(/^\s*[-*+]\s+/, "")              // bullet
    .replace(/^\s*\d+\.\s+/, "")              // ordered list number
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncate to terminal width with an ellipsis. */
export function truncateTerminal(value: string, width = TERMINAL_WIDTH): string {
  const clean = value.trim();
  return clean.length > width ? `${clean.slice(0, width - 1).trimEnd()}…` : clean;
}

/** Candidate user-request phrases from a skill's frontmatter `description`. */
export function extractTriggers(description: string | null | undefined): string[] {
  if (!description) return [];
  const out: string[] = [];

  // 1. Quoted phrases ('grill me', "red-green-refactor") — most direct.
  for (const m of description.matchAll(/['"]([^'"]{2,48})['"]/g)) {
    out.push(m[1]);
  }

  const useWhen = description.match(/use when\s+(.*)/i);
  if (useWhen) {
    // Clause boundaries are commas. Do NOT split on a bare "or" — it appears
    // inside phrases like "feature or bugfix" and would shred them.
    const clauses = useWhen[1]
      .split(/,/)
      .map((c) => c.trim())
      .filter(Boolean);
    // 2. "wants to X" clauses -> X.
    let matchedWants = false;
    for (const c of clauses) {
      const wants = c.match(/wants?\s+to\s+(.*)/i);
      if (wants) {
        out.push(wants[1]);
        matchedWants = true;
      }
    }
    // 3. Last resort: the first clause verbatim, only when nothing better matched.
    if (!matchedWants && clauses[0]) out.push(clauses[0]);
  }

  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const t of out) {
    const phrase = t.replace(/[.'"]+$/, "").replace(/\s+/g, " ").trim();
    if (phrase.length >= 2 && !seen.has(phrase.toLowerCase())) {
      seen.add(phrase.toLowerCase());
      cleaned.push(phrase);
    }
  }
  return cleaned.slice(0, 6);
}

const BORING_HEADERS =
  /^(overview|when to use|why|why .*matters|common rationalizations|red flags|verification checklist|when stuck|final rule|debugging integration|testing anti-patterns|the iron law|good tests|table of contents)/i;

interface Section {
  heading: string;
  content: string;
}

/** Split a markdown body into level-2 (`##`) sections. `###` stays in content. */
function splitSections(body: string): Section[] {
  const sections: Section[] = [];
  let cur: Section | null = null;
  for (const line of body.split("\n")) {
    const h = line.match(/^##\s+(.+?)\s*$/); // level-2 only ("### x" has no space after ##)
    if (h) {
      if (cur) sections.push(cur);
      cur = { heading: h[1].trim(), content: "" };
    } else if (cur) {
      cur.content += `${line}\n`;
    }
  }
  if (cur) sections.push(cur);
  return sections;
}

/** The skill's punchiest one-liner: Overview line, else Core principle, else first prose. */
export function extractEssence(body: string): string | null {
  const overview = splitSections(body).find((s) => /^overview$/i.test(s.heading));
  if (overview) {
    const first = overview.content
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("```") && !l.startsWith("**") && !l.startsWith("#"));
    if (first) return truncateTerminal(sanitizeLine(first));
  }
  const core = body.match(/\*\*core principle:?\*\*\s*(.+)/i);
  if (core) return truncateTerminal(sanitizeLine(core[1]));
  const prose = body
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#") && !l.startsWith("```") && !l.startsWith("---"));
  return prose ? truncateTerminal(sanitizeLine(prose)) : null;
}

/** The skill's method as a short ordered list of steps. */
export function extractSteps(body: string, max = 5): string[] {
  // 1. A top-level numbered list, if there is one.
  const numbered: string[] = [];
  for (const m of body.matchAll(/^\s{0,3}\d+\.\s+(.+)$/gm)) {
    const text = sanitizeLine(m[1]);
    if (text) numbered.push(truncateTerminal(text));
  }
  if (numbered.length >= 2) return numbered.slice(0, max);

  // 2. Otherwise, ## / ### headers that read like method steps.
  const headers: string[] = [];
  for (const m of body.matchAll(/^#{2,3}\s+(.+?)\s*$/gm)) {
    const h = sanitizeLine(m[1]);
    if (h && !BORING_HEADERS.test(h)) headers.push(truncateTerminal(h));
  }
  return headers.slice(0, max);
}
