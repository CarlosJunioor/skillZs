import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runDiptychGeneration: vi.fn(),
}));

vi.mock("../lib/diptych/run", () => ({
  runDiptychGeneration: mocks.runDiptychGeneration,
}));

import { GET } from "../app/api/cron/generate-diptychs/route";

function request(url: string): Request {
  return new Request(url, {
    headers: { authorization: "Bearer test-secret" },
  });
}

describe("generate-diptychs cron route", () => {
  beforeEach(() => {
    mocks.runDiptychGeneration.mockReset();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.DIPTYCH_CRON_SECRET;
  });

  it("rejects unauthenticated requests", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(new Request("https://example.test/api/cron/generate-diptychs"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "unauthorized" });
    expect(mocks.runDiptychGeneration).not.toHaveBeenCalled();
  });

  it("rejects invalid limit before starting work", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(request("https://example.test/api/cron/generate-diptychs?limit=-1"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid limit" });
  });

  it("rejects invalid quality", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(request("https://example.test/api/cron/generate-diptychs?quality=ultra"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid quality" });
  });

  it("rejects invalid order", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(request("https://example.test/api/cron/generate-diptychs?order=random"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid order" });
  });

  it("prefers the diptych-specific cron secret when configured", async () => {
    process.env.CRON_SECRET = "legacy-secret";
    process.env.DIPTYCH_CRON_SECRET = "diptych-secret";

    const legacy = await GET(request("https://example.test/api/cron/generate-diptychs?limit=-1"));
    expect(legacy.status).toBe(401);

    const specific = await GET(new Request("https://example.test/api/cron/generate-diptychs?limit=-1", {
      headers: { authorization: "Bearer diptych-secret" },
    }));
    expect(specific.status).toBe(400);
  });

  it("starts generation with validated options and caps very large limits", async () => {
    process.env.CRON_SECRET = "test-secret";
    const stats = {
      attempted: 2,
      generated: 2,
      failed: 0,
      estimatedCostUsd: 0.08,
      errors: [],
    };
    mocks.runDiptychGeneration.mockResolvedValue(stats);

    const res = await GET(request("https://example.test/api/cron/generate-diptychs?limit=500&quality=medium&order=first_seen"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, stats });
    expect(mocks.runDiptychGeneration).toHaveBeenCalledWith({
      limit: 100,
      quality: "medium",
      order: "first_seen",
    });
  });

  it("returns sanitized errors when generation throws", async () => {
    process.env.CRON_SECRET = "test-secret";
    mocks.runDiptychGeneration.mockRejectedValue(new Error("openai unavailable"));

    const res = await GET(request("https://example.test/api/cron/generate-diptychs"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "openai unavailable" });
  });
});
