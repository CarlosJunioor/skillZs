export type Category = "coding" | "creative" | "agent" | "utils" | "research" | null;

export interface SkillRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover_url: string | null;
  /** AI-generated card visual (3:2 before/after). Falls back to cover_url. */
  diptych_url?: string | null;
  /** AI-condensed verb-led card headline. */
  tagline?: string | null;
  /** AI scene for the BEFORE panel; shown as fallback when diptych_url is null. */
  before_text?: string | null;
  /** AI scene for the AFTER panel; shown as fallback when diptych_url is null. */
  after_text?: string | null;
  category: Category;
  repo_url: string;
  source_repo: string;
  github_stars: number;
  readme_md?: string | null;
  first_seen: string;
  last_seen: string;
}

export interface SkillStats extends SkillRow {
  vote_count: number;
  use_count: number;
  hotness: number;
}
