// lib/plugin-config.ts
// Plain static JSON — safe to import from both server and client. The skill
// catalog page renders cards inside a "use client" carousel, so the helper
// has to be reachable from client bundles too. No secrets live here.
import configJson from "@/design/plugin-config.json";

export interface SubSkill {
  /** Slug of the sub-skill within the plugin (e.g. "brainstorming"). */
  name: string;
  /** When-to-use description, typically lifted from the skill's frontmatter. */
  description: string;
}

export interface PluginConfig {
  /** Marketplace identifier for the `/plugin install <name>@<marketplace>`
   *  command — falls back to the skill's `source_repo` when not configured. */
  marketplace: string;
  /** Skills bundled inside the plugin, surfaced on /skill/[slug] so users see
   *  what they actually get when they install it. */
  subSkills: SubSkill[];
}

const CONFIG = configJson as Record<string, PluginConfig>;

/**
 * Per-plugin static config keyed by skill slug. Lets us point each plugin at
 * the right Claude Code marketplace and enumerate its sub-skills without a
 * DB migration. Returns null when no override is configured — callers fall
 * back to the source_repo / no list rendering.
 */
export function getPluginConfig(slug: string): PluginConfig | null {
  return CONFIG[slug] ?? null;
}

/**
 * Returns the marketplace alias for a skill, preferring an explicit override
 * from plugin-config.json, then the source_repo as a sensible default. This
 * matches the two ways Claude Code resolves marketplaces: a named alias
 * registered via `/plugin marketplace add`, or a raw `<owner>/<repo>` ref.
 */
export function resolveMarketplace(slug: string, sourceRepo: string): string {
  return CONFIG[slug]?.marketplace ?? sourceRepo;
}
