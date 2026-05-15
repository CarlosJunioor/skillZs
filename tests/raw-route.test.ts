import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = {
  slug: string;
  name: string;
  repo_url: string;
  readme_md: string | null;
  content_hash: string | null;
};

type SupabaseState = {
  row: Row | null;
  error: { message: string } | null;
};

const mocks = vi.hoisted(() => ({
  state: { row: null, error: null } as SupabaseState,
}));

vi.mock("../lib/supabase/server", () => ({
  supabaseService: () => ({
    from(table: string) {
      if (table !== "skills") throw new Error(`unexpected table ${table}`);
      const query = {
        select(columns: string) {
          void columns;
          return query;
        },
        eq(column: string, value: unknown) {
          void column; void value;
          return query;
        },
        maybeSingle() {
          return Promise.resolve({ data: mocks.state.row, error: mocks.state.error });
        },
      };
      return query;
    },
  }),
}));

import { GET } from "../app/api/raw/[slug]/route";

function call(slug: string) {
  return GET(new Request(`https://skillzs.test/api/raw/${slug}`), {
    params: Promise.resolve({ slug }),
  });
}

describe("GET /api/raw/[slug]", () => {
  beforeEach(() => {
    mocks.state.row = null;
    mocks.state.error = null;
  });

  it("rejects malformed slugs without touching the database", async () => {
    const res = await call("NOT VALID!!");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid slug" });
  });

  it("returns 404 when the skill does not exist", async () => {
    const res = await call("missing-skill");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "not found" });
  });

  it("returns 500 on a database error", async () => {
    mocks.state.error = { message: "boom" };
    const res = await call("any-skill");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "server error" });
  });

  it("returns 410 when the row exists but the body was wiped", async () => {
    mocks.state.row = {
      slug: "demo",
      name: "Demo",
      repo_url: "https://github.com/x/y",
      readme_md: null,
      content_hash: "abc",
    };
    const res = await call("demo");
    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ ok: false, error: "skill body missing" });
  });

  it("returns 200 with manifest fields and cache headers on success", async () => {
    mocks.state.row = {
      slug: "pr-review",
      name: "PR Review",
      repo_url: "https://github.com/anthropics/skills/tree/main/pr-review",
      readme_md: "# PR Review\nbody",
      content_hash: "deadbeef",
    };

    const res = await call("pr-review");

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=3600");
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({
      slug: "pr-review",
      name: "PR Review",
      source_url: "https://github.com/anthropics/skills/tree/main/pr-review",
      skill_md: "# PR Review\nbody",
      checksum: "sha256:deadbeef",
    });
  });

  it("falls back to empty content_hash when none is stored yet", async () => {
    mocks.state.row = {
      slug: "fresh",
      name: "Fresh",
      repo_url: "https://github.com/x/y",
      readme_md: "body",
      content_hash: null,
    };
    const res = await call("fresh");
    expect((await res.json()).checksum).toBe("sha256:");
  });
});
