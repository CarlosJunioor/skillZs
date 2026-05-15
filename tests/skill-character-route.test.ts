import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type State = {
  characterLookup: { row: { id: string } | null; error: { message: string } | null };
  skillUpdate: { row: { slug: string; character_id: string | null } | null; error: { message: string } | null };
  lastSkillPayload?: Record<string, unknown>;
  lastSkillFilter?: { column: string; value: unknown };
  lastCharacterSlug?: unknown;
  rpcCalls: Array<string>;
};

const mocks = vi.hoisted(() => ({
  state: undefined as State | undefined,
}));

function initial(over: Partial<State> = {}): State {
  return {
    characterLookup: { row: { id: "char-1" }, error: null },
    skillUpdate: { row: { slug: "pr-review", character_id: "char-1" }, error: null },
    rpcCalls: [],
    ...over,
  };
}

vi.mock("../lib/supabase/server", () => ({
  supabaseService: () => {
    const s = mocks.state as State;
    return {
      from(table: string) {
        if (table === "characters") {
          const builder = {
            select() { return builder; },
            eq(_col: string, v: unknown) { s.lastCharacterSlug = v; return builder; },
            maybeSingle() {
              return Promise.resolve({ data: s.characterLookup.row, error: s.characterLookup.error });
            },
          };
          return builder;
        }
        if (table === "skills") {
          const builder = {
            update(payload: Record<string, unknown>) { s.lastSkillPayload = payload; return builder; },
            eq(col: string, value: unknown) { s.lastSkillFilter = { column: col, value }; return builder; },
            select() { return builder; },
            maybeSingle() {
              return Promise.resolve({ data: s.skillUpdate.row, error: s.skillUpdate.error });
            },
          };
          return builder;
        }
        throw new Error(`unexpected table ${table}`);
      },
      rpc(name: string) {
        s.rpcCalls.push(name);
        return Promise.resolve({ data: null, error: null });
      },
    };
  },
}));

import { POST } from "../app/api/admin/skill/[slug]/character/route";

function call(slug: string, opts: { secret?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.secret !== undefined) headers.authorization = `Bearer ${opts.secret}`;
  const init: RequestInit = { method: "POST", headers };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  return POST(
    new Request(`https://example.test/api/admin/skill/${slug}/character`, init),
    { params: Promise.resolve({ slug }) },
  );
}

describe("POST /api/admin/skill/[slug]/character", () => {
  beforeEach(() => {
    process.env.DIPTYCH_CRON_SECRET = "diptych-secret";
    mocks.state = initial();
  });
  afterEach(() => {
    delete process.env.DIPTYCH_CRON_SECRET;
    delete process.env.CRON_SECRET;
  });

  it("rejects unauthenticated requests", async () => {
    const res = await call("pr-review", { body: { character_slug: "matt-pocock" } });
    expect(res.status).toBe(401);
    expect(mocks.state!.lastSkillPayload).toBeUndefined();
  });

  it("rejects malformed slug", async () => {
    const res = await call("Bad Slug", { secret: "diptych-secret", body: { character_slug: "x" } });
    expect(res.status).toBe(400);
  });

  it("rejects when body is not valid JSON", async () => {
    const res = await POST(
      new Request("https://example.test/api/admin/skill/pr-review/character", {
        method: "POST",
        headers: { authorization: "Bearer diptych-secret", "content-type": "application/json" },
        body: "{not json",
      }),
      { params: Promise.resolve({ slug: "pr-review" }) },
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid json" });
  });

  it("rejects when character_slug is wrong type", async () => {
    const res = await call("pr-review", { secret: "diptych-secret", body: { character_slug: 42 } });
    expect(res.status).toBe(400);
  });

  it("rejects when character_slug is malformed", async () => {
    const res = await call("pr-review", { secret: "diptych-secret", body: { character_slug: "Bad Slug" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 when character is not found", async () => {
    mocks.state = initial({ characterLookup: { row: null, error: null } });
    const res = await call("pr-review", { secret: "diptych-secret", body: { character_slug: "ghost" } });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "character not found" });
  });

  it("returns 404 when skill is not found", async () => {
    mocks.state = initial({ skillUpdate: { row: null, error: null } });
    const res = await call("missing-skill", { secret: "diptych-secret", body: { character_slug: "matt-pocock" } });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "skill not found" });
  });

  it("sets character_id when given a valid character_slug and refreshes stats", async () => {
    const res = await call("pr-review", { secret: "diptych-secret", body: { character_slug: "matt-pocock" } });
    expect(res.status).toBe(200);
    expect(mocks.state!.lastCharacterSlug).toBe("matt-pocock");
    expect(mocks.state!.lastSkillPayload).toEqual({ character_id: "char-1" });
    expect(mocks.state!.rpcCalls).toContain("refresh_skill_stats");
    expect(await res.json()).toEqual({ ok: true, slug: "pr-review", character_id: "char-1" });
  });

  it("clears character_id when character_slug is null", async () => {
    mocks.state = initial({
      skillUpdate: { row: { slug: "pr-review", character_id: null }, error: null },
    });
    const res = await call("pr-review", { secret: "diptych-secret", body: { character_slug: null } });
    expect(res.status).toBe(200);
    expect(mocks.state!.lastSkillPayload).toEqual({ character_id: null });
    expect(await res.json()).toEqual({ ok: true, slug: "pr-review", character_id: null });
  });

  it("returns 500 on skill update db error", async () => {
    mocks.state = initial({
      skillUpdate: { row: null, error: { message: "boom" } },
    });
    const res = await call("pr-review", { secret: "diptych-secret", body: { character_slug: "matt-pocock" } });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "boom" });
  });
});
