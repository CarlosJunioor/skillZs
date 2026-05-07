export type Category = "coding" | "creative" | "agent" | "utils" | "research" | null;

export interface SkillRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover_url: string | null;
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
