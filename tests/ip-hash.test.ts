import { describe, expect, it } from "vitest";
import { getClientIp, hashIp } from "../lib/ip-hash";

describe("getClientIp", () => {
  it("uses the Vercel-provided client IP header", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.9",
      "x-forwarded-for": "198.51.100.1, 198.51.100.2",
    });

    expect(getClientIp(headers)).toBe("203.0.113.9");
  });

  it("ignores spoofable generic proxy headers", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.6",
      "true-client-ip": "203.0.113.7",
      "x-real-ip": "203.0.113.8",
      "x-forwarded-for": "198.51.100.1, 198.51.100.2",
    });

    expect(getClientIp(headers)).toBe("0.0.0.0");
  });

  it("rejects invalid headers and falls back to zero address", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "not an ip",
    });

    expect(getClientIp(headers)).toBe("0.0.0.0");
  });
});

describe("hashIp", () => {
  it("is deterministic for the same salt and changes when salt changes", () => {
    const first = hashIp("203.0.113.9", "salt-a");
    const second = hashIp("203.0.113.9", "salt-a");
    const otherSalt = hashIp("203.0.113.9", "salt-b");

    expect(first).toBe(second);
    expect(first).not.toBe(otherSalt);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});
