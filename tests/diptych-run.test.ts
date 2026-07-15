import { beforeEach, describe, expect, it, vi } from "vitest";

type Candidate = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string | null;
};

type SupabaseState = {
  candidates: Candidate[] | null;
  pickError?: Error | null;
  claims: Record<string, boolean>;
  claimErrors: Record<string, Error>;
  bodies: Record<string, string | null>;
  bodyError?: Error | null;
  rpcCalls: Array<{ name: string; args?: unknown }>;
  updates: unknown[];
  candidateQuery: unknown[];
};

const mocks = vi.hoisted(() => ({
  state: undefined as SupabaseState | undefined,
  generateDiptychText: vi.fn(),
  generateDiptychImage: vi.fn(),
  uploadDiptych: vi.fn(),
}));

vi.mock("../lib/supabase/server", () => ({
  supabaseService: () => createSupabase(mocks.state as SupabaseState),
}));

vi.mock("../lib/diptych/text", () => ({
  generateDiptychText: mocks.generateDiptychText,
}));

vi.mock("../lib/diptych/image", () => ({
  generateDiptychImage: mocks.generateDiptychImage,
}));

vi.mock("../lib/diptych/upload", () => ({
  uploadDiptych: mocks.uploadDiptych,
}));

import { runDiptychGeneration } from "../lib/diptych/run";

function createState(overrides: Partial<SupabaseState> = {}): SupabaseState {
  return {
    candidates: [],
    pickError: null,
    claims: {},
    claimErrors: {},
    bodies: {},
    bodyError: null,
    rpcCalls: [],
    updates: [],
    candidateQuery: [],
    ...overrides,
  };
}

function createSupabase(state: SupabaseState) {
  return {
    from(table: string) {
      if (table === "skill_stats") return createCandidateQuery(state);
      if (table === "skills") return createSkillsTable(state);
      throw new Error(`unexpected table ${table}`);
    },
    rpc(name: string, args?: unknown) {
      state.rpcCalls.push({ name, args });
      if (name === "claim_skill_diptych") {
        const skillId = (args as { p_skill_id: string }).p_skill_id;
        const err = state.claimErrors[skillId];
        if (err) return Promise.resolve({ data: null, error: err });
        return Promise.resolve({ data: state.claims[skillId] ?? false, error: null });
      }
      if (name === "refresh_skill_stats") {
        return Promise.resolve({ data: true, error: null });
      }
      return Promise.resolve({ data: null, error: new Error(`unexpected rpc ${name}`) });
    },
  };
}

function createCandidateQuery(state: SupabaseState) {
  const query = {
    select(columns: string) {
      state.candidateQuery.push({ method: "select", columns });
      return query;
    },
    in(column: string, values: string[]) {
      state.candidateQuery.push({ method: "in", column, values });
      return query;
    },
    order(column: string, options: unknown) {
      state.candidateQuery.push({ method: "order", column, options });
      return query;
    },
    limit(count: number) {
      state.candidateQuery.push({ method: "limit", count });
      return query;
    },
    then<TResult1 = { data: Candidate[] | null; error: Error | null }, TResult2 = never>(
      onfulfilled?: ((value: { data: Candidate[] | null; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve({
        data: state.candidates,
        error: state.pickError ?? null,
      }).then(onfulfilled, onrejected);
    },
  };
  return query;
}

function createSkillsTable(state: SupabaseState) {
  return {
    select(columns: string) {
      return createSelectBuilder(state, columns);
    },
    update(payload: unknown) {
      return createUpdateBuilder(state, payload);
    },
  };
}

function createSelectBuilder(state: SupabaseState, columns: string) {
  void columns;
  let pendingId: string | null = null;
  const builder = {
    eq(column: string, value: unknown) {
      if (column === "id") pendingId = value as string;
      return builder;
    },
    maybeSingle() {
      if (state.bodyError) return Promise.resolve({ data: null, error: state.bodyError });
      const readme_md = pendingId !== null ? state.bodies[pendingId] ?? null : null;
      return Promise.resolve({ data: readme_md ? { readme_md } : null, error: null });
    },
  };
  return builder;
}

function createUpdateBuilder(state: SupabaseState, payload: unknown) {
  const filters: Array<{ column: string; value: unknown }> = [];
  const update = {
    eq(column: string, value: unknown) {
      filters.push({ column, value });
      return update;
    },
    then<TResult1 = { error: null }, TResult2 = never>(
      onfulfilled?: ((value: { error: null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      state.updates.push({ payload, filters });
      return Promise.resolve({ error: null }).then(onfulfilled, onrejected);
    },
  };
  return update;
}

const SAMPLE_TEXT = {
  tagline: "Reviews your PR for bugs",
  before_text: "scary diff full of edge cases",
  after_text: "annotated review with the real issues",
};

describe("runDiptychGeneration", () => {
  beforeEach(() => {
    mocks.generateDiptychText.mockReset();
    mocks.generateDiptychImage.mockReset();
    mocks.uploadDiptych.mockReset();
    mocks.state = createState();
  });

  it("returns picking errors without attempting generation", async () => {
    mocks.state = createState({ pickError: new Error("select failed") });

    const stats = await runDiptychGeneration();

    expect(stats).toEqual({
      attempted: 0,
      generated: 0,
      failed: 0,
      estimatedCostUsd: 0,
      errors: ["pick candidates: select failed"],
    });
    expect(mocks.generateDiptychText).not.toHaveBeenCalled();
  });

  it("returns no-op stats when there are no candidates", async () => {
    mocks.state = createState({ candidates: [] });
    const stats = await runDiptychGeneration();
    expect(stats.attempted).toBe(0);
    expect(mocks.state!.rpcCalls).toEqual([]);
  });

  it("generates text + image, uploads, marks done, and refreshes stats", async () => {
    const candidate = {
      id: "skill-1",
      slug: "pr-review",
      name: "PR Review",
      description: "Use when reviewing pull requests",
      category: "coding",
    };
    mocks.state = createState({
      candidates: [candidate],
      claims: { "skill-1": true },
      bodies: { "skill-1": "# PR Review\nbody" },
    });
    mocks.generateDiptychText.mockResolvedValue({ text: SAMPLE_TEXT, estimatedCostUsd: 0.001 });
    mocks.generateDiptychImage.mockResolvedValue({
      bytes: Buffer.from("png"),
      prompt: "image prompt",
      estimatedCostUsd: 0.04,
    });
    mocks.uploadDiptych.mockResolvedValue("https://blob.test/diptych/pr-review.png");

    const stats = await runDiptychGeneration({ limit: 1, quality: "low", order: "first_seen" });

    expect(stats).toEqual({
      attempted: 1,
      generated: 1,
      failed: 0,
      estimatedCostUsd: 0.041,
      errors: [],
    });
    expect(mocks.state!.candidateQuery).toContainEqual({
      method: "order",
      column: "first_seen",
      options: { ascending: false },
    });
    expect(mocks.state!.candidateQuery).toContainEqual({ method: "limit", count: 1 });
    expect(mocks.generateDiptychText).toHaveBeenCalledWith({
      name: "PR Review",
      description: "Use when reviewing pull requests",
      body: "# PR Review\nbody",
    });
    expect(mocks.generateDiptychImage).toHaveBeenCalledWith(
      {
        name: "PR Review",
        before_text: SAMPLE_TEXT.before_text,
        after_text: SAMPLE_TEXT.after_text,
        category: "coding",
      },
      "low",
    );
    expect(mocks.uploadDiptych).toHaveBeenCalledWith("pr-review", expect.any(Buffer));
    expect(mocks.state!.updates).toHaveLength(1);
    const update = (mocks.state!.updates[0] as { payload: Record<string, unknown> }).payload;
    expect(update.tagline).toBe(SAMPLE_TEXT.tagline);
    expect(update.before_text).toBe(SAMPLE_TEXT.before_text);
    expect(update.after_text).toBe(SAMPLE_TEXT.after_text);
    expect(update.diptych_url).toBe("https://blob.test/diptych/pr-review.png");
    expect(update.diptych_status).toBe("done");
    expect(update.diptych_cost_usd).toBeCloseTo(0.041, 6);
    expect(mocks.state!.rpcCalls).toContainEqual({ name: "refresh_skill_stats", args: undefined });
  });

  it("uses hotness ordering by default", async () => {
    mocks.state = createState({ candidates: [] });
    await runDiptychGeneration();
    expect(mocks.state!.candidateQuery).toContainEqual({
      method: "order",
      column: "hotness",
      options: { ascending: false },
    });
  });

  it("skips candidates that cannot be claimed", async () => {
    mocks.state = createState({
      candidates: [{
        id: "skill-1",
        slug: "demo",
        name: "Demo Skill",
        description: "Already taken",
        category: null,
      }],
      claims: { "skill-1": false },
    });

    const stats = await runDiptychGeneration();
    expect(stats.attempted).toBe(0);
    expect(mocks.generateDiptychText).not.toHaveBeenCalled();
    expect(mocks.state!.updates).toEqual([]);
  });

  it("records the claim error and skips generation for that candidate", async () => {
    mocks.state = createState({
      candidates: [
        { id: "skill-1", slug: "boom", name: "Boom", description: "X", category: null },
      ],
      claimErrors: { "skill-1": new Error("rpc broke") },
    });

    const stats = await runDiptychGeneration();
    expect(stats.errors[0]).toBe("boom: claim failed: rpc broke");
    expect(stats.attempted).toBe(0);
    expect(mocks.generateDiptychText).not.toHaveBeenCalled();
  });

  it("marks failed when text gen throws", async () => {
    mocks.state = createState({
      candidates: [{
        id: "skill-1",
        slug: "fail-text",
        name: "Fail Text",
        description: "x",
        category: null,
      }],
      claims: { "skill-1": true },
      bodies: { "skill-1": "body" },
    });
    mocks.generateDiptychText.mockRejectedValue(new Error("openai exploded"));

    const stats = await runDiptychGeneration();

    expect(stats).toMatchObject({ attempted: 1, generated: 0, failed: 1 });
    expect(stats.errors[0]).toBe("fail-text: openai exploded");
    expect(mocks.state!.updates).toEqual([{
      payload: { diptych_status: "failed", diptych_error: "openai exploded", diptych_cost_usd: 0 },
      filters: [
        { column: "id", value: "skill-1" },
        { column: "diptych_status", value: "generating" },
      ],
    }]);
  });

  it("annotates the failure with cost when image succeeded but upload failed", async () => {
    mocks.state = createState({
      candidates: [{
        id: "skill-1",
        slug: "fail-upload",
        name: "Fail Upload",
        description: "x",
        category: "utils",
      }],
      claims: { "skill-1": true },
      bodies: { "skill-1": "body" },
    });
    mocks.generateDiptychText.mockResolvedValue({ text: SAMPLE_TEXT, estimatedCostUsd: 0.001 });
    mocks.generateDiptychImage.mockResolvedValue({
      bytes: Buffer.from("png"),
      prompt: "p",
      estimatedCostUsd: 0.19,
    });
    mocks.uploadDiptych.mockRejectedValue(new Error("blob unavailable"));

    const stats = await runDiptychGeneration({ quality: "high" });

    expect(stats).toEqual({
      attempted: 1,
      generated: 0,
      failed: 1,
      estimatedCostUsd: 0.191,
      errors: ["fail-upload (charged $0.19): blob unavailable"],
    });
  });

  it("marks failed when readme_md is missing on the row", async () => {
    mocks.state = createState({
      candidates: [{
        id: "skill-1",
        slug: "no-body",
        name: "No Body",
        description: "x",
        category: null,
      }],
      claims: { "skill-1": true },
      bodies: {},
    });

    const stats = await runDiptychGeneration();
    expect(stats.failed).toBe(1);
    expect(stats.errors[0]).toContain("no-body: missing readme_md");
  });
});
