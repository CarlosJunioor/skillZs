import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runIngest: vi.fn(),
}));

vi.mock("../lib/ingest/run", () => ({
  runIngest: mocks.runIngest,
}));

import { GET, POST } from "../app/api/cron/ingest/route";

function request(secret = "test-secret"): Request {
  return new Request("https://skillzs.test/api/cron/ingest", {
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe("ingest cron route", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
    mocks.runIngest.mockReset();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("rejects unauthenticated requests", async () => {
    const res = await GET(new Request("https://skillzs.test/api/cron/ingest"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "unauthorized" });
    expect(mocks.runIngest).not.toHaveBeenCalled();
  });

  it("runs ingest for authorized GET requests", async () => {
    const stats = {
      reposScanned: 1,
      filesFound: 2,
      skillsUpserted: 2,
      skipped: 0,
      errors: [],
    };
    mocks.runIngest.mockResolvedValue(stats);

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, stats });
    expect(mocks.runIngest).toHaveBeenCalledOnce();
  });

  it("runs ingest for authorized POST requests", async () => {
    mocks.runIngest.mockResolvedValue({
      reposScanned: 0,
      filesFound: 0,
      skillsUpserted: 0,
      skipped: 0,
      errors: [],
    });

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(mocks.runIngest).toHaveBeenCalledOnce();
  });

  it("returns sanitized errors when ingest throws", async () => {
    mocks.runIngest.mockRejectedValue(new Error("github unavailable"));

    const res = await GET(request());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "github unavailable" });
  });
});
