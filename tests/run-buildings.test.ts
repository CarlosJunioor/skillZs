import { beforeEach, describe, expect, it, vi } from "vitest";

type Candidate = {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  kind: "zeke" | "influencer";
};

type State = {
  candidates: Candidate[] | null;
  pickError?: Error | null;
  claims: Record<string, boolean>;
  claimErrors: Record<string, Error>;
  rpcCalls: Array<{ name: string; args?: unknown }>;
  updates: Array<{ payload: Record<string, unknown>; filters: Array<[string, unknown]> }>;
};

const mocks = vi.hoisted(() => ({
  state: undefined as State | undefined,
  generateCover: vi.fn(),
  uploadCharacterBuilding: vi.fn(),
}));

vi.mock("../lib/supabase/server", () => ({
  supabaseService: () => createSupabase(mocks.state as State),
}));

vi.mock("../lib/covers/generate", () => ({
  generateCover: mocks.generateCover,
}));

vi.mock("../lib/character/upload", () => ({
  uploadCharacterBuilding: mocks.uploadCharacterBuilding,
}));

import { runBuildingGeneration } from "../lib/character/run-buildings";

function initial(over: Partial<State> = {}): State {
  return {
    candidates: [],
    pickError: null,
    claims: {},
    claimErrors: {},
    rpcCalls: [],
    updates: [],
    ...over,
  };
}

function createSupabase(state: State) {
  return {
    from(table: string) {
      if (table !== "characters") throw new Error(`unexpected table ${table}`);
      return makeBuilder(state);
    },
    rpc(name: string, args?: unknown) {
      state.rpcCalls.push({ name, args });
      if (name === "claim_character_building") {
        const id = (args as { p_character_id: string }).p_character_id;
        const err = state.claimErrors[id];
        if (err) return Promise.resolve({ data: null, error: err });
        return Promise.resolve({ data: state.claims[id] ?? false, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

function makeBuilder(state: State) {
  let mode: "select" | "update" = "select";
  const currentUpdate: { payload: Record<string, unknown>; filters: Array<[string, unknown]> } = {
    payload: {},
    filters: [],
  };
  const builder = {
    select() {
      mode = "select";
      return builder;
    },
    in() {
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      if (state.pickError) return Promise.resolve({ data: null, error: state.pickError });
      return Promise.resolve({ data: state.candidates, error: null });
    },
    update(payload: Record<string, unknown>) {
      mode = "update";
      currentUpdate.payload = payload;
      currentUpdate.filters = [];
      return builder;
    },
    eq(column: string, value: unknown) {
      if (mode === "update") {
        currentUpdate.filters.push([column, value]);
        if (currentUpdate.filters.length === 2) {
          state.updates.push({ ...currentUpdate });
          return Promise.resolve({ error: null });
        }
      }
      return builder;
    },
  };
  return builder;
}

describe("runBuildingGeneration", () => {
  beforeEach(() => {
    mocks.generateCover.mockReset();
    mocks.uploadCharacterBuilding.mockReset();
    mocks.state = initial();
  });

  it("returns picking errors without attempting generation", async () => {
    mocks.state = initial({ pickError: new Error("select failed") });
    const stats = await runBuildingGeneration();
    expect(stats.errors).toEqual(["pick candidates: select failed"]);
    expect(mocks.generateCover).not.toHaveBeenCalled();
  });

  it("returns no-op stats when there are no candidates", async () => {
    mocks.state = initial({ candidates: [] });
    const stats = await runBuildingGeneration();
    expect(stats.attempted).toBe(0);
    expect(mocks.state!.rpcCalls).toEqual([]);
  });

  it("generates, uploads, and marks done with the building prompt", async () => {
    const cand: Candidate = {
      id: "c-1",
      slug: "zeke",
      name: "Zeke",
      role: "In-house builder",
      kind: "zeke",
    };
    mocks.state = initial({ candidates: [cand], claims: { "c-1": true } });
    mocks.generateCover.mockResolvedValue({
      bytes: Buffer.from("png"),
      estimatedCostUsd: 0.04,
    });
    mocks.uploadCharacterBuilding.mockResolvedValue(
      "https://blob.test/buildings/zeke.png",
    );

    const stats = await runBuildingGeneration({ limit: 1, quality: "low" });

    expect(stats).toEqual({
      attempted: 1,
      generated: 1,
      failed: 0,
      estimatedCostUsd: 0.04,
      errors: [],
    });
    expect(mocks.generateCover).toHaveBeenCalledWith({
      prompt: expect.stringContaining("Zeke"),
      quality: "low",
      size: "1024x1024",
    });
    expect(mocks.uploadCharacterBuilding).toHaveBeenCalledWith("zeke", expect.any(Buffer));
    const update = mocks.state!.updates[0].payload;
    expect(update.building_url).toBe("https://blob.test/buildings/zeke.png");
    expect(update.building_status).toBe("done");
    expect(update.building_cost_usd).toBeCloseTo(0.04, 6);
    expect(update.building_prompt).toMatch(/^v1-fisheye-peek:/);
    // Buildings are NOT in skill_stats matview — runner must not refresh it.
    expect(mocks.state!.rpcCalls.map((c) => c.name)).not.toContain("refresh_skill_stats");
  });

  it("skips candidates that cannot be claimed", async () => {
    mocks.state = initial({
      candidates: [{ id: "c-1", slug: "demo", name: "Demo", role: null, kind: "influencer" }],
      claims: { "c-1": false },
    });
    const stats = await runBuildingGeneration();
    expect(stats.attempted).toBe(0);
    expect(mocks.generateCover).not.toHaveBeenCalled();
    expect(mocks.state!.updates).toEqual([]);
  });

  it("records claim errors and skips that candidate", async () => {
    mocks.state = initial({
      candidates: [{ id: "c-1", slug: "boom", name: "Boom", role: null, kind: "influencer" }],
      claimErrors: { "c-1": new Error("rpc broke") },
    });
    const stats = await runBuildingGeneration();
    expect(stats.errors[0]).toBe("boom: claim failed: rpc broke");
    expect(stats.attempted).toBe(0);
  });

  it("marks failed when image gen throws and propagates the error message", async () => {
    mocks.state = initial({
      candidates: [{ id: "c-1", slug: "boom", name: "Boom", role: null, kind: "influencer" }],
      claims: { "c-1": true },
    });
    mocks.generateCover.mockRejectedValue(new Error("openai 500"));
    const stats = await runBuildingGeneration({ limit: 1 });
    expect(stats.failed).toBe(1);
    expect(stats.errors[0]).toBe("boom: openai 500");
    const failUpdate = mocks.state!.updates.find(
      (u) => u.payload.building_status === "failed",
    );
    expect(failUpdate).toBeDefined();
    expect(failUpdate?.payload.building_error).toBe("openai 500");
  });
});
