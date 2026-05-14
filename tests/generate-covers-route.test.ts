import { afterEach, describe, expect, it } from "vitest";
import { GET } from "../app/api/cron/generate-covers/route";

function request(url: string): Request {
  return new Request(url, {
    headers: { authorization: "Bearer test-secret" },
  });
}

describe("generate-covers cron route", () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.COVER_CRON_SECRET;
  });

  it("rejects unauthenticated requests", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(new Request("https://example.test/api/cron/generate-covers"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "unauthorized" });
  });

  it("rejects invalid limit before starting work", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(request("https://example.test/api/cron/generate-covers?limit=-1"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid limit" });
  });

  it("rejects invalid quality before starting work", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(request("https://example.test/api/cron/generate-covers?quality=ultra"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid quality" });
  });

  it("rejects invalid order before starting work", async () => {
    process.env.CRON_SECRET = "test-secret";
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
});
