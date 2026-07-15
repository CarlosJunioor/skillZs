import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type SkillRow = { diptych_status: string | null; diptych_cost_usd: number | string | null };
type CharRow = {
  avatar_status: string | null;
  avatar_cost_usd: number | string | null;
};
type State = {
  skills: SkillRow[];
  skillsError: { message: string } | null;
  characters: CharRow[];
  charactersError: { message: string } | null;
};

const mocks = vi.hoisted(() => ({
  state: {
    skills: [], skillsError: null, characters: [], charactersError: null,
  } as State,
}));

vi.mock("../lib/supabase/server", () => ({
  supabaseService: () => ({
    from(table: string) {
      if (table === "skills") {
        return {
          select(cols: string) {
            void cols;
            return Promise.resolve({ data: mocks.state.skills, error: mocks.state.skillsError });
          },
        };
      }
      if (table === "characters") {
        return {
          select(cols: string) {
            void cols;
            return Promise.resolve({ data: mocks.state.characters, error: mocks.state.charactersError });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
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
    mocks.state.skills = [];
    mocks.state.skillsError = null;
    mocks.state.characters = [];
    mocks.state.charactersError = null;
  });

  afterEach(() => {
    delete process.env.DIPTYCH_CRON_SECRET;
    delete process.env.CRON_SECRET;
  });

  it("rejects unauthenticated requests", async () => {
    const res = await call();
    expect(res.status).toBe(401);
  });

  it("surfaces skills-table database errors", async () => {
    mocks.state.skillsError = { message: "select broke" };
    const res = await call("diptych-secret");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "select broke" });
  });

  it("surfaces characters-table database errors", async () => {
    mocks.state.charactersError = { message: "characters broke" };
    const res = await call("diptych-secret");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "characters broke" });
  });

  it("returns zeros when both tables are empty", async () => {
    const res = await call("diptych-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      total_skills: 0,
      by_status: {},
      total_usd: 0,
      characters: {
        total: 0,
        by_status: {},
        total_usd: 0,
      },
      grand_total_usd: 0,
    });
  });

  it("aggregates per-status counts and totals", async () => {
    mocks.state.skills = [
      { diptych_status: "done", diptych_cost_usd: 0.04 },
      { diptych_status: "done", diptych_cost_usd: 0.04 },
      { diptych_status: "pending", diptych_cost_usd: 0 },
      { diptych_status: "failed", diptych_cost_usd: 0.19 },
      { diptych_status: null, diptych_cost_usd: null },
      { diptych_status: "done", diptych_cost_usd: "0.10" },
    ];
    mocks.state.characters = [
      { avatar_status: "done", avatar_cost_usd: 0.04 },
      { avatar_status: "done", avatar_cost_usd: 0.04 },
      { avatar_status: "pending", avatar_cost_usd: 0 },
    ];
    const res = await call("diptych-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      total_skills: 6,
      by_status: { done: 3, pending: 2, failed: 1 },
      total_usd: 0.37,
      characters: {
        total: 3,
        by_status: { done: 2, pending: 1 },
        total_usd: 0.08,
      },
      grand_total_usd: 0.45,
    });
  });

  it("ignores non-finite cost values in both pipelines", async () => {
    mocks.state.skills = [
      { diptych_status: "done", diptych_cost_usd: 0.04 },
      { diptych_status: "done", diptych_cost_usd: "not-a-number" },
    ];
    mocks.state.characters = [
      { avatar_status: "done", avatar_cost_usd: "nope" },
      { avatar_status: "done", avatar_cost_usd: 0.04 },
    ];
    const body = (await (await call("diptych-secret")).json()) as {
      total_usd: number;
      characters: { total_usd: number };
    };
    expect(body.total_usd).toBe(0.04);
    expect(body.characters.total_usd).toBe(0.04);
  });
});
