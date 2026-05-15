import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runAvatarGeneration: vi.fn(),
}));

vi.mock("../lib/character/run", () => ({
  runAvatarGeneration: mocks.runAvatarGeneration,
}));

import { GET, POST } from "../app/api/cron/generate-avatars/route";

function authRequest(url: string, token = "test-secret"): Request {
  return new Request(url, { headers: { authorization: `Bearer ${token}` } });
}

describe("generate-avatars cron route", () => {
  beforeEach(() => {
    mocks.runAvatarGeneration.mockReset();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.DIPTYCH_CRON_SECRET;
  });

  it("rejects unauthenticated requests", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(new Request("https://example.test/api/cron/generate-avatars"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "unauthorized" });
    expect(mocks.runAvatarGeneration).not.toHaveBeenCalled();
  });

  it("rejects invalid limit before starting work", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(authRequest("https://example.test/api/cron/generate-avatars?limit=-1"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid limit" });
  });

  it("rejects invalid quality", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(authRequest("https://example.test/api/cron/generate-avatars?quality=ultra"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid quality" });
  });

  it("accepts both DIPTYCH_CRON_SECRET (manual) and CRON_SECRET (Vercel cron)", async () => {
    process.env.CRON_SECRET = "vercel-secret";
    process.env.DIPTYCH_CRON_SECRET = "diptych-secret";

    const wrong = await GET(authRequest("https://example.test/api/cron/generate-avatars", "nope"));
    expect(wrong.status).toBe(401);

    mocks.runAvatarGeneration.mockResolvedValue({
      attempted: 0, generated: 0, failed: 0, estimatedCostUsd: 0, errors: [],
    });
    const manual = await GET(authRequest("https://example.test/api/cron/generate-avatars", "diptych-secret"));
    expect(manual.status).toBe(200);

    const cron = await GET(authRequest("https://example.test/api/cron/generate-avatars", "vercel-secret"));
    expect(cron.status).toBe(200);
  });

  it("clamps limit to max 100 and forwards quality", async () => {
    process.env.CRON_SECRET = "test-secret";
    mocks.runAvatarGeneration.mockResolvedValue({
      attempted: 5, generated: 5, failed: 0, estimatedCostUsd: 0.2, errors: [],
    });
    const res = await POST(authRequest("https://example.test/api/cron/generate-avatars?limit=9999&quality=medium"));
    expect(res.status).toBe(200);
    expect(mocks.runAvatarGeneration).toHaveBeenCalledWith({ limit: 100, quality: "medium" });
    const body = (await res.json()) as { ok: boolean; stats: { generated: number } };
    expect(body.ok).toBe(true);
    expect(body.stats.generated).toBe(5);
  });

  it("returns 500 when the run throws", async () => {
    process.env.CRON_SECRET = "test-secret";
    mocks.runAvatarGeneration.mockRejectedValue(new Error("openai unavailable"));
    const res = await GET(authRequest("https://example.test/api/cron/generate-avatars"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "openai unavailable" });
  });
});
