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
