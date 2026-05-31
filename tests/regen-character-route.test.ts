import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type State = {
  row: { slug: string; avatar_status: string } | null;
  error: { message: string } | null;
  lastPayload?: unknown;
  lastFilter?: { column: string; value: unknown };
};

const mocks = vi.hoisted(() => ({
  state: { row: null, error: null } as State,
}));

vi.mock("../lib/supabase/server", () => ({
  supabaseService: () => ({
    from(table: string) {
      if (table !== "characters") throw new Error(`unexpected table ${table}`);
      const builder = {
        update(payload: unknown) {
          mocks.state.lastPayload = payload;
          return builder;
        },
        eq(column: string, value: unknown) {
          mocks.state.lastFilter = { column, value };
          return builder;
        },
        neq() { return builder; },
        select() { return builder; },
        maybeSingle() {
          return Promise.resolve({ data: mocks.state.row, error: mocks.state.error });
        },
      };
      return builder;
    },
  }),
}));

import { POST } from "../app/api/regen/character/[slug]/route";

function call(slug: string, opts: { secret?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.secret !== undefined) headers.authorization = `Bearer ${opts.secret}`;
  return POST(
    new Request(`https://example.test/api/regen/character/${slug}`, { method: "POST", headers }),
    { params: Promise.resolve({ slug }) },
  );
}

describe("POST /api/regen/character/[slug]", () => {
  beforeEach(() => {
    process.env.DIPTYCH_CRON_SECRET = "diptych-secret";
    mocks.state.row = null;
    mocks.state.error = null;
    mocks.state.lastPayload = undefined;
    mocks.state.lastFilter = undefined;
  });

  afterEach(() => {
    delete process.env.DIPTYCH_CRON_SECRET;
    delete process.env.CRON_SECRET;
  });

  it("rejects unauthenticated requests", async () => {
    const res = await call("zeke");
    expect(res.status).toBe(401);
    expect(mocks.state.lastPayload).toBeUndefined();
  });

  it("rejects when only CRON_SECRET is set (no fallback on admin route)", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const res = await call("zeke", { secret: "cron-secret" });
    expect(res.status).toBe(401);
  });

  it("rejects malformed slugs before touching the database", async () => {
    const res = await call("Bad Slug", { secret: "diptych-secret" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid slug" });
    expect(mocks.state.lastPayload).toBeUndefined();
  });

  it("returns 404 when the slug is unknown", async () => {
    const res = await call("missing-character", { secret: "diptych-secret" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "not found" });
  });

  it("returns 500 on a database error", async () => {
    mocks.state.error = { message: "boom" };
    const res = await call("any", { secret: "diptych-secret" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "boom" });
  });

  it("resets avatar_status to pending and clears the error on success", async () => {
    mocks.state.row = { slug: "zeke", avatar_status: "pending" };
    const res = await call("zeke", { secret: "diptych-secret" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, slug: "zeke" });
    expect(mocks.state.lastPayload).toEqual({
      avatar_status: "pending",
      avatar_error: null,
      avatar_attempts: 0,
    });
    expect(mocks.state.lastFilter).toEqual({ column: "slug", value: "zeke" });
  });

  it("defaults to avatar reset when asset query param is absent (back-compat)", async () => {
    mocks.state.row = { slug: "zeke", avatar_status: "pending" };
    const res = await call("zeke", { secret: "diptych-secret" });
    expect(res.status).toBe(200);
    expect(mocks.state.lastPayload).toEqual({
      avatar_status: "pending",
      avatar_error: null,
      avatar_attempts: 0,
    });
  });

  it("resets building_status when ?asset=building is passed", async () => {
    mocks.state.row = { slug: "zeke", avatar_status: "done" };
    const res = await POST(
      new Request("https://example.test/api/regen/character/zeke?asset=building", {
        method: "POST",
        headers: { authorization: "Bearer diptych-secret" },
      }),
      { params: Promise.resolve({ slug: "zeke" }) },
    );
    expect(res.status).toBe(200);
    expect(mocks.state.lastPayload).toEqual({
      building_status: "pending",
      building_error: null,
      building_attempts: 0,
    });
  });

  it("rejects an unknown asset value", async () => {
    const res = await POST(
      new Request("https://example.test/api/regen/character/zeke?asset=eyebrow", {
        method: "POST",
        headers: { authorization: "Bearer diptych-secret" },
      }),
      { params: Promise.resolve({ slug: "zeke" }) },
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid asset" });
  });
});
