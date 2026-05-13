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
});
