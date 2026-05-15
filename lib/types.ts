export type Category = "coding" | "creative" | "agent" | "utils" | "research" | null;

export type CharacterKind = "zeke" | "influencer";

export type AvatarStatus =
  | "pending"
  | "generating"
  | "done"
  | "failed"
  | "skipped";

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
  /** FK to characters.id; null when no character has been attributed yet. */
  character_id?: string | null;
}

export interface SkillStats extends SkillRow {
  vote_count: number;
  use_count: number;
  hotness: number;
  /** Joined from characters when character_id is set — drives the chip on SkillCard. */
  character_slug?: string | null;
  character_name?: string | null;
  character_avatar_url?: string | null;
}

export interface Character {
  id: string;
  slug: string;
  kind: CharacterKind;
  name: string;
  role: string | null;
  bio: string | null;
  gh_handle: string | null;
  x_handle: string | null;
  site_url: string | null;
  avatar_url: string | null;
}

export interface CharacterStats extends Character {
  skill_count: number;
  total_uses: number;
  total_votes: number;
  last_skill_added_at: string | null;
}
