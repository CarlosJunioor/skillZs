import { describe, expect, it } from "vitest";
import { readJsonBodyWithLimit, validateJsonMutationRequest } from "../lib/request-security";

function req(headers: HeadersInit): Request {
  return new Request("https://skillzs.test/api/vote", {
    method: "POST",
    headers: {
      host: "skillzs.test",
      ...headers,
    },
  });
}

function bodyReq(body: string): Request {
  return new Request("https://skillzs.test/api/vote", {
    method: "POST",
    headers: {
      host: "skillzs.test",
      "content-type": "application/json",
      origin: "https://skillzs.test",
    },
    body,
  });
}

describe("validateJsonMutationRequest", () => {
  it("accepts same-origin JSON requests", () => {
    expect(validateJsonMutationRequest(req({
      "content-type": "application/json; charset=utf-8",
      origin: "https://skillzs.test",
      "sec-fetch-site": "same-origin",
    }))).toBeNull();
  });

  it("rejects non-JSON requests", () => {
    expect(validateJsonMutationRequest(req({
      "content-type": "text/plain",
      origin: "https://skillzs.test",
    }))).toBe("invalid content type");
  });

  it("rejects oversized declared bodies", () => {
    expect(validateJsonMutationRequest(req({
      "content-type": "application/json",
      "content-length": "4097",
      origin: "https://skillzs.test",
    }))).toBe("request body too large");
  });

  it("rejects cross-site browser requests", () => {
    expect(validateJsonMutationRequest(req({
      "content-type": "application/json",
      origin: "https://evil.test",
    }))).toBe("cross-site request");

    expect(validateJsonMutationRequest(req({
      "content-type": "application/json",
      "sec-fetch-site": "cross-site",
    }))).toBe("cross-site request");
  });

  it("parses small JSON bodies", async () => {
    await expect(readJsonBodyWithLimit(bodyReq('{"skillId":"abc"}'))).resolves.toEqual({
      ok: true,
      body: { skillId: "abc" },
    });
  });

  it("rejects oversized streamed bodies even without content-length", async () => {
    const result = await readJsonBodyWithLimit(bodyReq(JSON.stringify({ value: "x".repeat(4_096) })));

    expect(result).toEqual({ ok: false, error: "request body too large" });
  });

  it("rejects malformed JSON bodies", async () => {
    await expect(readJsonBodyWithLimit(bodyReq("{"))).resolves.toEqual({
      ok: false,
      error: "bad json",
    });
  });
});
