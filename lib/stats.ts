import "server-only";
import { supabaseAnon } from "./supabase/server";
import type { Character, SkillStats } from "./types";

const CHARACTER_PUBLIC_COLUMNS =
  "id, slug, kind, name, role, bio, gh_handle, x_handle, site_url, avatar_url";

const STATS_COLUMNS =
  "id, slug, name, description, cover_url, diptych_url, tagline, before_text, after_text, category, repo_url, source_repo, github_stars, vote_count, use_count, hotness, first_seen, last_seen, character_id, character_slug, character_name, character_avatar_url";

export type SortKey = "hot" | "new" | "votes" | "uses" | "stars";

const SORT_COLUMN: Record<SortKey, string> = {
  hot: "hotness",
  new: "first_seen",
  votes: "vote_count",
  uses: "use_count",
  stars: "github_stars",
};

export interface BrowseFilters {
  sort?: SortKey;
  category?: string | null;
  limit?: number;
  offset?: number;
  /** when true, return only skills with an AI-generated cover (cover_status='done'). */
  coveredOnly?: boolean;
}

/** Paginated browse query for the grid view. */
export async function fetchBrowse(filters: BrowseFilters = {}): Promise<{ skills: SkillStats[]; total: number }> {
  const sort = filters.sort ?? "hot";
  const limit = filters.limit ?? 60;
  const offset = filters.offset ?? 0;

  let q = supabaseAnon()
    .from("skill_stats")
    .select(STATS_COLUMNS, { count: "exact" })
    .order(SORT_COLUMN[sort], { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.category && filters.category !== "all") {
    q = filters.category === "other"
      ? q.is("category", null)
      : q.eq("category", filters.category);
  }

  if (filters.coveredOnly) {
    q = q.eq("cover_status", "done");
  }

  const { data, error, count } = await q;
  if (error) throw error;
  return { skills: (data ?? []) as SkillStats[], total: count ?? 0 };
}

export async function fetchTrending(limit = 12, sort: SortKey = "hot", coveredOnly = false): Promise<SkillStats[]> {
  let q = supabaseAnon()
    .from("skill_stats")
    .select(STATS_COLUMNS)
    .order(SORT_COLUMN[sort], { ascending: false })
    .limit(limit);
  if (coveredOnly) q = q.eq("cover_status", "done");
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SkillStats[];
}

export async function fetchNew(limit = 12, coveredOnly = false): Promise<SkillStats[]> {
  let q = supabaseAnon()
    .from("skill_stats")
    .select(STATS_COLUMNS)
    .order("first_seen", { ascending: false })
    .limit(limit);
  if (coveredOnly) q = q.eq("cover_status", "done");
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SkillStats[];
}

export async function fetchByCategory(category: string, limit = 12, coveredOnly = false): Promise<SkillStats[]> {
  let q = supabaseAnon()
    .from("skill_stats")
    .select(STATS_COLUMNS)
    .order("hotness", { ascending: false });

  q = category === "other" ? q.is("category", null) : q.eq("category", category);
  if (coveredOnly) q = q.eq("cover_status", "done");

  const { data, error } = await q.limit(limit);
  if (error) throw error;
  return (data ?? []) as SkillStats[];
}

export async function fetchSkillBySlug(slug: string): Promise<SkillStats | null> {
  const { data, error } = await supabaseAnon()
    .from("skill_stats")
    .select(STATS_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as SkillStats | null) ?? null;
}

export async function fetchSitemapSkills(limit = 50_000): Promise<Array<Pick<SkillStats, "slug" | "first_seen" | "last_seen">>> {
  const { data, error } = await supabaseAnon()
    .from("skill_stats")
    .select("slug, first_seen, last_seen")
    .order("last_seen", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Array<Pick<SkillStats, "slug" | "first_seen" | "last_seen">>;
}

export async function fetchReadme(slug: string): Promise<string | null> {
  const { data, error } = await supabaseAnon()
    .from("skills")
    .select("readme_md")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data?.readme_md as string | null) ?? null;
}

export async function fetchHero(limit = 3, coveredOnly = false): Promise<SkillStats[]> {
  return fetchTrending(limit, "hot", coveredOnly);
}

export async function fetchCharacterBySlug(slug: string): Promise<Character | null> {
  const { data, error } = await supabaseAnon()
    .from("characters")
    .select(CHARACTER_PUBLIC_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as Character | null) ?? null;
}

export async function fetchSkillsByCharacter(
  characterId: string,
  limit = 24,
): Promise<SkillStats[]> {
  const { data, error } = await supabaseAnon()
    .from("skill_stats")
    .select(STATS_COLUMNS)
    .eq("character_id", characterId)
    .order("hotness", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SkillStats[];
}
