import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type State = {
  rows: Array<{ slug: string; avatar_status: string }> | null;
  error: { message: string } | null;
  lastUpsertPayload?: unknown;
  lastConflict?: string;
};

const mocks = vi.hoisted(() => ({
  state: { rows: [], error: null } as State,
}));

vi.mock("../lib/supabase/server", () => ({
  supabaseService: () => ({
    from(table: string) {
      if (table !== "characters") throw new Error(`unexpected table ${table}`);
      const builder = {
        upsert(payload: unknown, opts: { onConflict?: string } = {}) {
          mocks.state.lastUpsertPayload = payload;
          mocks.state.lastConflict = opts.onConflict;
          return builder;
        },
        select(cols: string) {
          void cols;
          return Promise.resolve({ data: mocks.state.rows, error: mocks.state.error });
        },
      };
      return builder;
    },
  }),
}));

import { POST } from "../app/api/admin/characters/seed/route";
import { SEED_CHARACTERS } from "../lib/character/seed";

function call(opts: { secret?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.secret !== undefined) headers.authorization = `Bearer ${opts.secret}`;
  return POST(
    new Request("https://example.test/api/admin/characters/seed", {
      method: "POST",
      headers,
    }),
  );
}

describe("POST /api/admin/characters/seed", () => {
  beforeEach(() => {
    process.env.DIPTYCH_CRON_SECRET = "diptych-secret";
    mocks.state.rows = SEED_CHARACTERS.map((c) => ({ slug: c.slug, avatar_status: "pending" }));
    mocks.state.error = null;
    mocks.state.lastUpsertPayload = undefined;
    mocks.state.lastConflict = undefined;
  });

  afterEach(() => {
    delete process.env.DIPTYCH_CRON_SECRET;
    delete process.env.CRON_SECRET;
  });

  it("rejects unauthenticated requests", async () => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(mocks.state.lastUpsertPayload).toBeUndefined();
  });

  it("rejects when only CRON_SECRET is provided (no fallback for admin route)", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const res = await call({ secret: "cron-secret" });
    expect(res.status).toBe(401);
  });

  it("upserts SEED_CHARACTERS on slug with all expected columns", async () => {
    const res = await call({ secret: "diptych-secret" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; upserted: number };
    expect(body.ok).toBe(true);
    expect(body.upserted).toBe(SEED_CHARACTERS.length);
    expect(mocks.state.lastConflict).toBe("slug");

    const payload = mocks.state.lastUpsertPayload as Array<Record<string, unknown>>;
    expect(payload).toHaveLength(SEED_CHARACTERS.length);
    const zeke = payload.find((r) => r.slug === "zeke");
    expect(zeke).toMatchObject({
      slug: "zeke",
      kind: "zeke",
      name: "Zeke",
      gh_handle: "CarlosJunioor",
      x_handle: null,
      site_url: null,
    });
    const matt = payload.find((r) => r.slug === "matt-pocock");
    expect(matt).toMatchObject({
      kind: "influencer",
      gh_handle: "mattpocockuk",
      x_handle: "mpocock1",
    });
  });

  it("returns 500 on database error", async () => {
    mocks.state.error = { message: "boom" };
    mocks.state.rows = null;
    const res = await call({ secret: "diptych-secret" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "boom" });
  });
});

describe("SEED_CHARACTERS roster invariants", () => {
  it("contains the 7 launch characters with unique slugs", () => {
    expect(SEED_CHARACTERS).toHaveLength(7);
    const slugs = SEED_CHARACTERS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toContain("zeke");
  });

  it("has exactly one zeke kind and six influencers", () => {
    const zekes = SEED_CHARACTERS.filter((c) => c.kind === "zeke");
    const infls = SEED_CHARACTERS.filter((c) => c.kind === "influencer");
    expect(zekes).toHaveLength(1);
    expect(infls).toHaveLength(6);
  });

  it("every row has a non-empty bio and role", () => {
    for (const c of SEED_CHARACTERS) {
      expect(c.bio.trim().length).toBeGreaterThan(0);
      expect(c.role.trim().length).toBeGreaterThan(0);
    }
  });
});
