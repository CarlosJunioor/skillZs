import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult = {
  data?: unknown;
  error?: Error | null;
  count?: number | null;
};

type QueryCall =
  | { method: "from"; table: string }
  | { method: "select"; columns: string; options?: unknown }
  | { method: "order"; column: string; options?: unknown }
  | { method: "range"; from: number; to: number }
  | { method: "eq"; column: string; value: unknown }
  | { method: "is"; column: string; value: unknown }
  | { method: "or"; filters: string }
  | { method: "limit"; count: number }
  | { method: "maybeSingle" };

const supabaseMock = vi.hoisted(() => ({
  client: undefined as unknown,
}));

vi.mock("../lib/supabase/server", () => ({
  supabaseAnon: () => supabaseMock.client,
}));

import {
  fetchBrowse,
  fetchByCategory,
  fetchNew,
  fetchReadme,
  fetchSitemapSkills,
  fetchSkillBySlug,
  fetchTrending,
  normalizeSearchQuery,
} from "../lib/stats";

function createClient(result: QueryResult) {
  const calls: QueryCall[] = [];
  const normalized = {
    data: result.data ?? null,
    error: result.error ?? null,
    count: result.count ?? null,
  };

  const query = {
    select(columns: string, options?: unknown) {
      calls.push({ method: "select", columns, options });
      return query;
    },
    order(column: string, options?: unknown) {
      calls.push({ method: "order", column, options });
      return query;
    },
    range(from: number, to: number) {
      calls.push({ method: "range", from, to });
      return query;
    },
    eq(column: string, value: unknown) {
      calls.push({ method: "eq", column, value });
      return query;
    },
    is(column: string, value: unknown) {
      calls.push({ method: "is", column, value });
      return query;
    },
    or(filters: string) {
      calls.push({ method: "or", filters });
      return query;
    },
    limit(count: number) {
      calls.push({ method: "limit", count });
      return query;
    },
    maybeSingle() {
      calls.push({ method: "maybeSingle" });
      return Promise.resolve(normalized);
    },
    then<TResult1 = typeof normalized, TResult2 = never>(
      onfulfilled?: ((value: typeof normalized) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve(normalized).then(onfulfilled, onrejected);
    },
  };

  const client = {
    from(table: string) {
      calls.push({ method: "from", table });
      return query;
    },
  };

  return { client, calls };
}

describe("stats queries", () => {
  beforeEach(() => {
    supabaseMock.client = undefined;
  });

  it("fetchBrowse applies pagination, sorting, category, and cover filters", async () => {
    const { client, calls } = createClient({ data: [{ id: "skill-1" }], count: 23 });
    supabaseMock.client = client;

    const result = await fetchBrowse({
      sort: "votes",
      category: "coding",
      coveredOnly: true,
      search: "React agent",
      limit: 5,
      offset: 10,
    });

    expect(result).toEqual({ skills: [{ id: "skill-1" }], total: 23 });
    expect(calls).toEqual([
      { method: "from", table: "skill_stats" },
      { method: "select", columns: expect.stringContaining("vote_count"), options: { count: "exact" } },
      { method: "order", column: "vote_count", options: { ascending: false } },
      { method: "range", from: 10, to: 14 },
      { method: "eq", column: "category", value: "coding" },
      { method: "eq", column: "cover_status", value: "done" },
      { method: "or", filters: "name.ilike.*React*,description.ilike.*React*,source_repo.ilike.*React*,slug.ilike.*React*,tagline.ilike.*React*,category.ilike.*React*" },
      { method: "or", filters: "name.ilike.*agent*,description.ilike.*agent*,source_repo.ilike.*agent*,slug.ilike.*agent*,tagline.ilike.*agent*,category.ilike.*agent*" },
    ]);
  });

  it("normalizes browse search text before building filters", async () => {
    const { client, calls } = createClient({ data: [], count: 0 });
    supabaseMock.client = client;

    await expect(fetchBrowse({ search: "  agent, markdown%%%  " })).resolves.toEqual({ skills: [], total: 0 });

    expect(calls).toContainEqual({
      method: "or",
      filters: "name.ilike.*agent*,description.ilike.*agent*,source_repo.ilike.*agent*,slug.ilike.*agent*,tagline.ilike.*agent*,category.ilike.*agent*",
    });
    expect(calls).toContainEqual({
      method: "or",
      filters: "name.ilike.*markdown*,description.ilike.*markdown*,source_repo.ilike.*markdown*,slug.ilike.*markdown*,tagline.ilike.*markdown*,category.ilike.*markdown*",
    });
  });

  it("exposes normalized search text for URL forms", () => {
    expect(normalizeSearchQuery("  React,agents%%%  ")).toBe("React agents");
    expect(normalizeSearchQuery("x".repeat(100))).toHaveLength(80);
  });

  it("fetchBrowse maps the other category to null and defaults empty results", async () => {
    const { client, calls } = createClient({});
    supabaseMock.client = client;

    const result = await fetchBrowse({ category: "other" });

    expect(result).toEqual({ skills: [], total: 0 });
    expect(calls).toContainEqual({ method: "order", column: "hotness", options: { ascending: false } });
    expect(calls).toContainEqual({ method: "range", from: 0, to: 59 });
    expect(calls).toContainEqual({ method: "is", column: "category", value: null });
  });

  it("fetchTrending and fetchNew use their expected sort columns", async () => {
    const trending = createClient({ data: [{ id: "hot" }] });
    supabaseMock.client = trending.client;
    await expect(fetchTrending(4, "stars", true)).resolves.toEqual([{ id: "hot" }]);

    expect(trending.calls).toContainEqual({ method: "order", column: "github_stars", options: { ascending: false } });
    expect(trending.calls).toContainEqual({ method: "limit", count: 4 });
    expect(trending.calls).toContainEqual({ method: "eq", column: "cover_status", value: "done" });

    const newest = createClient({ data: [{ id: "new" }] });
    supabaseMock.client = newest.client;
    await expect(fetchNew(2)).resolves.toEqual([{ id: "new" }]);

    expect(newest.calls).toContainEqual({ method: "order", column: "first_seen", options: { ascending: false } });
    expect(newest.calls).toContainEqual({ method: "limit", count: 2 });
  });

  it("fetchByCategory filters null categories before limiting", async () => {
    const { client, calls } = createClient({ data: [{ id: "uncategorized" }] });
    supabaseMock.client = client;

    await expect(fetchByCategory("other", 3, true)).resolves.toEqual([{ id: "uncategorized" }]);

    expect(calls).toEqual([
      { method: "from", table: "skill_stats" },
      { method: "select", columns: expect.stringContaining("hotness") },
      { method: "order", column: "hotness", options: { ascending: false } },
      { method: "is", column: "category", value: null },
      { method: "eq", column: "cover_status", value: "done" },
      { method: "limit", count: 3 },
    ]);
  });

  it("fetchSkillBySlug and fetchReadme read single rows by slug", async () => {
    const skill = createClient({ data: { id: "skill-1", slug: "demo" } });
    supabaseMock.client = skill.client;

    await expect(fetchSkillBySlug("demo")).resolves.toEqual({ id: "skill-1", slug: "demo" });
    expect(skill.calls).toContainEqual({ method: "from", table: "skill_stats" });
    expect(skill.calls).toContainEqual({ method: "eq", column: "slug", value: "demo" });
    expect(skill.calls).toContainEqual({ method: "maybeSingle" });

    const readme = createClient({ data: { readme_md: "# Demo" } });
    supabaseMock.client = readme.client;

    await expect(fetchReadme("demo")).resolves.toBe("# Demo");
    expect(readme.calls).toContainEqual({ method: "from", table: "skills" });
    expect(readme.calls).toContainEqual({ method: "select", columns: "readme_md" });
  });

  it("fetchSitemapSkills reads URL and freshness fields for metadata routes", async () => {
    const row = { slug: "demo", first_seen: "2026-01-01", last_seen: "2026-02-01" };
    const { client, calls } = createClient({ data: [row] });
    supabaseMock.client = client;

    await expect(fetchSitemapSkills(2)).resolves.toEqual([row]);
    expect(calls).toEqual([
      { method: "from", table: "skill_stats" },
      { method: "select", columns: "slug, first_seen, last_seen" },
      { method: "order", column: "last_seen", options: { ascending: false } },
      { method: "limit", count: 2 },
    ]);
  });

  it("throws Supabase errors instead of hiding them", async () => {
    const error = new Error("database unavailable");
    const { client } = createClient({ error });
    supabaseMock.client = client;

    await expect(fetchBrowse()).rejects.toThrow(error);
  });
});
