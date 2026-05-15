import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type State = {
  row: { slug: string; diptych_status: string } | null;
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
      if (table !== "skills") throw new Error(`unexpected table ${table}`);
      const builder = {
        _payload: undefined as unknown,
        update(payload: unknown) {
          builder._payload = payload;
          mocks.state.lastPayload = payload;
          return builder;
        },
        eq(column: string, value: unknown) {
          mocks.state.lastFilter = { column, value };
          return builder;
        },
        select(cols: string) {
          void cols;
          return builder;
        },
        maybeSingle() {
          return Promise.resolve({ data: mocks.state.row, error: mocks.state.error });
        },
      };
      return builder;
    },
  }),
}));

import { POST } from "../app/api/regen/[slug]/route";

function call(slug: string, opts: { secret?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.secret !== undefined) headers.authorization = `Bearer ${opts.secret}`;
  return POST(
    new Request(`https://example.test/api/regen/${slug}`, { method: "POST", headers }),
    { params: Promise.resolve({ slug }) },
  );
}

describe("POST /api/regen/[slug]", () => {
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
    const res = await call("pr-review");
    expect(res.status).toBe(401);
    expect(mocks.state.lastPayload).toBeUndefined();
  });

  it("rejects malformed slugs before touching the database", async () => {
    const res = await call("Bad Slug", { secret: "diptych-secret" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid slug" });
  });

  it("returns 404 when the slug is unknown", async () => {
    const res = await call("missing-slug", { secret: "diptych-secret" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "not found" });
  });

  it("returns 500 on a database error", async () => {
    mocks.state.error = { message: "boom" };
    const res = await call("any", { secret: "diptych-secret" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "boom" });
  });

  it("resets diptych_status to pending and clears the error on success", async () => {
    mocks.state.row = { slug: "pr-review", diptych_status: "pending" };

    const res = await call("pr-review", { secret: "diptych-secret" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, slug: "pr-review" });
    expect(mocks.state.lastPayload).toEqual({
      diptych_status: "pending",
      diptych_error: null,
    });
    expect(mocks.state.lastFilter).toEqual({ column: "slug", value: "pr-review" });
  });
});
