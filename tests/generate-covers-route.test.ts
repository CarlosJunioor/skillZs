import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runCoverGeneration: vi.fn(),
}));

vi.mock("../lib/covers/run", () => ({
  runCoverGeneration: mocks.runCoverGeneration,
}));

import { GET } from "../app/api/cron/generate-covers/route";

function request(url: string): Request {
  return new Request(url, {
    headers: { authorization: "Bearer test-secret" },
  });
}

describe("generate-covers cron route", () => {
  beforeEach(() => {
    mocks.runCoverGeneration.mockReset();
    process.env.COVER_CRON_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.COVER_CRON_SECRET;
  });

  it("rejects unauthenticated requests", async () => {
    const res = await GET(new Request("https://example.test/api/cron/generate-covers"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "unauthorized" });
    expect(mocks.runCoverGeneration).not.toHaveBeenCalled();
  });

  it("rejects invalid limit before starting work", async () => {
    const res = await GET(request("https://example.test/api/cron/generate-covers?limit=-1"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid limit" });
    expect(mocks.runCoverGeneration).not.toHaveBeenCalled();
  });

  it("rejects invalid quality before starting work", async () => {
    const res = await GET(request("https://example.test/api/cron/generate-covers?quality=ultra"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid quality" });
  });

  it("rejects invalid order before starting work", async () => {
    const res = await GET(request("https://example.test/api/cron/generate-covers?order=random"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid order" });
  });

  it("prefers the cover-specific cron secret when configured", async () => {
    process.env.CRON_SECRET = "legacy-secret";
    process.env.COVER_CRON_SECRET = "cover-secret";

    const legacy = await GET(request("https://example.test/api/cron/generate-covers?limit=-1"));
    expect(legacy.status).toBe(401);

    const specific = await GET(new Request("https://example.test/api/cron/generate-covers?limit=-1", {
      headers: { authorization: "Bearer cover-secret" },
    }));
    expect(specific.status).toBe(400);
    expect(await specific.json()).toEqual({ ok: false, error: "invalid limit" });
  });

  it("rejects CRON_SECRET when COVER_CRON_SECRET is not configured", async () => {
    delete process.env.COVER_CRON_SECRET;
    process.env.CRON_SECRET = "test-secret";

    const res = await GET(request("https://example.test/api/cron/generate-covers?limit=-1"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "unauthorized" });
    expect(mocks.runCoverGeneration).not.toHaveBeenCalled();
  });

  it("starts cover generation with validated options", async () => {
    const stats = {
      attempted: 2,
      generated: 2,
      failed: 0,
      estimatedCostUsd: 0.2,
      errors: [],
    };
    mocks.runCoverGeneration.mockResolvedValue(stats);

    const res = await GET(request("https://example.test/api/cron/generate-covers?limit=500&quality=medium&order=first_seen"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, stats });
    expect(mocks.runCoverGeneration).toHaveBeenCalledWith({
      limit: 100,
      quality: "medium",
      order: "first_seen",
    });
  });

  it("returns sanitized errors when cover generation throws", async () => {
    mocks.runCoverGeneration.mockRejectedValue(new Error("openai unavailable"));

    const res = await GET(request("https://example.test/api/cron/generate-covers"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "openai unavailable" });
  });
});
