import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordInteraction: vi.fn(),
  supabaseClient: { kind: "supabase-service" },
}));

vi.mock("../lib/supabase/server", () => ({
  supabaseService: () => mocks.supabaseClient,
}));

vi.mock("../lib/interactions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/interactions")>();
  return {
    ...actual,
    recordInteraction: mocks.recordInteraction,
  };
});

import { POST } from "../app/api/use/route";

const ORIGIN = "https://skillzs.test";
const SKILL_ID = "123e4567-e89b-42d3-a456-426614174000";

function jsonReq(init: { body?: string; headers?: Record<string, string> } = {}): Request {
  return new Request(`${ORIGIN}/api/use`, {
    method: "POST",
    headers: {
      host: "skillzs.test",
      "content-type": "application/json",
      origin: ORIGIN,
      "x-vercel-forwarded-for": "203.0.113.42",
      ...(init.headers ?? {}),
    },
    body: init.body,
  });
}

describe("POST /api/use", () => {
  beforeEach(() => {
    process.env.IP_HASH_SALT = "stub-salt";
    mocks.recordInteraction.mockReset();
  });

  afterEach(() => {
    delete process.env.IP_HASH_SALT;
    vi.restoreAllMocks();
  });

  it("rejects non-JSON content type with 415", async () => {
    const res = await POST(jsonReq({ headers: { "content-type": "text/plain" } }));

    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ ok: false, error: "invalid content type" });
    expect(mocks.recordInteraction).not.toHaveBeenCalled();
  });

  it("rejects cross-site origins before reading the body", async () => {
    const res = await POST(jsonReq({
      body: JSON.stringify({ skillId: SKILL_ID }),
      headers: { origin: "https://evil.test" },
    }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, error: "cross-site request" });
    expect(mocks.recordInteraction).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await POST(jsonReq({ body: "{" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "bad json" });
    expect(mocks.recordInteraction).not.toHaveBeenCalled();
  });

  it("rejects invalid skill IDs with 400", async () => {
    const res = await POST(jsonReq({ body: JSON.stringify({ skillId: "../../etc/passwd" }) }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid skillId" });
    expect(mocks.recordInteraction).not.toHaveBeenCalled();
  });

  it("returns 500 when IP_HASH_SALT is missing", async () => {
    delete process.env.IP_HASH_SALT;

    const res = await POST(jsonReq({ body: JSON.stringify({ skillId: SKILL_ID }) }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "server not configured" });
    expect(mocks.recordInteraction).not.toHaveBeenCalled();
  });

  it("records a valid use interaction", async () => {
    mocks.recordInteraction.mockResolvedValue(9);

    const res = await POST(jsonReq({ body: JSON.stringify({ skillId: SKILL_ID }) }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 9 });
    expect(mocks.recordInteraction).toHaveBeenCalledWith(
      mocks.supabaseClient,
      "use",
      SKILL_ID,
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
  });

  it("returns 429 when the interaction rate limit is exceeded", async () => {
    const err = new Error("rate limit exceeded");
    err.name = "RateLimitError";
    mocks.recordInteraction.mockRejectedValue(err);

    const res = await POST(jsonReq({ body: JSON.stringify({ skillId: SKILL_ID }) }));

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ok: false, error: "rate limit exceeded" });
  });

  it("hides unexpected persistence errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.recordInteraction.mockRejectedValue(new Error("database is down"));

    const res = await POST(jsonReq({ body: JSON.stringify({ skillId: SKILL_ID }) }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "server error" });
    expect(errorSpy).toHaveBeenCalled();
  });
});
