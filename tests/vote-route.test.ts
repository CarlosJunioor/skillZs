import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "../app/api/vote/route";

const ORIGIN = "https://skillzs.test";

function jsonReq(init: { body?: string; headers?: Record<string, string> } = {}): Request {
  return new Request(`${ORIGIN}/api/vote`, {
    method: "POST",
    headers: {
      host: "skillzs.test",
      "content-type": "application/json",
      origin: ORIGIN,
      ...(init.headers ?? {}),
    },
    body: init.body,
  });
}

describe("POST /api/vote", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://stub.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "stub-service-key";
    process.env.IP_HASH_SALT = "stub-salt";
  });
  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
    delete process.env.IP_HASH_SALT;
  });

  it("rejects non-JSON content type with 415", async () => {
    const res = await POST(jsonReq({ headers: { "content-type": "text/plain" } }));
    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ ok: false, error: "invalid content type" });
  });

  it("rejects oversized declared bodies with 413", async () => {
    const res = await POST(jsonReq({ headers: { "content-length": "4097" } }));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ ok: false, error: "request body too large" });
  });

  it("rejects cross-site origins with 403", async () => {
    const res = await POST(jsonReq({ headers: { origin: "https://evil.test" } }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, error: "cross-site request" });
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await POST(jsonReq({ body: "{" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "bad json" });
  });

  it("rejects non-UUID skillId with 400", async () => {
    const res = await POST(jsonReq({ body: JSON.stringify({ skillId: "not-a-uuid" }) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid skillId" });
  });

  it("rejects missing skillId with 400", async () => {
    const res = await POST(jsonReq({ body: JSON.stringify({}) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid skillId" });
  });

  it("rejects path-traversal-shaped skillId payload with 400", async () => {
    const res = await POST(jsonReq({ body: JSON.stringify({ skillId: "../../etc/passwd" }) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid skillId" });
  });

  it("returns 500 when IP_HASH_SALT is not configured", async () => {
    delete process.env.IP_HASH_SALT;
    const res = await POST(jsonReq({
      body: JSON.stringify({ skillId: "123e4567-e89b-42d3-a456-426614174000" }),
    }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "server not configured" });
  });
});
