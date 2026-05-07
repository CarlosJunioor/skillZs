/**
 * Seed list of GitHub repos to scan for SKILL.md files.
 * Branch defaults to the repo's default branch (resolved at fetch time).
 */
export interface SeedRepo {
  owner: string;
  repo: string;
  /** optional path prefix to limit scanning (e.g. "skills/") */
  pathPrefix?: string;
}

export const SEED_REPOS: SeedRepo[] = [
  { owner: "obra", repo: "superpowers" },
  { owner: "anthropics", repo: "skills" },
  { owner: "davila7", repo: "claude-code-templates" },
  { owner: "wshobson", repo: "agents" },
  { owner: "hesreallyhim", repo: "awesome-claude-code" },
];
