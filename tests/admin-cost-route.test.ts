import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = { diptych_status: string | null; diptych_cost_usd: number | string | null };
type State = { rows: Row[]; error: { message: string } | null };

const mocks = vi.hoisted(() => ({
  state: { rows: [], error: null } as State,
}));

vi.mock("../lib/supabase/server", () => ({
  supabaseService: () => ({
    from(table: string) {
      if (table !== "skills") throw new Error(`unexpected table ${table}`);
      return {
        select(cols: string) {
          void cols;
          return Promise.resolve({ data: mocks.state.rows, error: mocks.state.error });
        },
      };
    },
  }),
}));

import { GET } from "../app/api/admin/cost/route";

function call(secret?: string) {
  const headers: Record<string, string> = {};
  if (secret !== undefined) headers.authorization = `Bearer ${secret}`;
  return GET(new Request("https://example.test/api/admin/cost", { headers }));
}

describe("GET /api/admin/cost", () => {
  beforeEach(() => {
    process.env.DIPTYCH_CRON_SECRET = "diptych-secret";
    mocks.state.rows = [];
    mocks.state.error = null;
  });

  afterEach(() => {
    delete process.env.DIPTYCH_CRON_SECRET;
    delete process.env.CRON_SECRET;
  });

  it("rejects unauthenticated requests", async () => {
    const res = await call();
    expect(res.status).toBe(401);
  });

  it("surfaces database errors", async () => {
    mocks.state.error = { message: "select broke" };
    const res = await call("diptych-secret");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "select broke" });
  });

  it("returns zeros when there are no skills", async () => {
    const res = await call("diptych-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      total_skills: 0,
      by_status: {},
      total_usd: 0,
    });
  });

  it("aggregates per-status counts and total spend", async () => {
    mocks.state.rows = [
      { diptych_status: "done", diptych_cost_usd: 0.04 },
      { diptych_status: "done", diptych_cost_usd: 0.04 },
      { diptych_status: "pending", diptych_cost_usd: 0 },
      { diptych_status: "failed", diptych_cost_usd: 0.19 },
      { diptych_status: null, diptych_cost_usd: null },
      { diptych_status: "done", diptych_cost_usd: "0.10" },
    ];
    const res = await call("diptych-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      total_skills: 6,
      by_status: { done: 3, pending: 2, failed: 1 },
      total_usd: 0.37,
    });
  });

  it("ignores non-finite cost values", async () => {
    mocks.state.rows = [
      { diptych_status: "done", diptych_cost_usd: 0.04 },
      { diptych_status: "done", diptych_cost_usd: "not-a-number" },
    ];
    const res = await call("diptych-secret");
    expect((await res.json()).total_usd).toBe(0.04);
  });
});
