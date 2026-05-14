import { afterEach, describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "../lib/cron-auth";

function withHeaders(headers: Record<string, string>): Request {
  return new Request("https://skillzs.test/api/cron/x", { headers });
}

describe("isAuthorizedCronRequest", () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.COVER_CRON_SECRET;
  });

  it("rejects when no secret env is set", () => {
    expect(isAuthorizedCronRequest(
      withHeaders({ authorization: "Bearer anything" }),
      "COVER_CRON_SECRET",
    )).toBe(false);
  });

  it("rejects when request has no credential", () => {
    process.env.CRON_SECRET = "real-secret";
    expect(isAuthorizedCronRequest(withHeaders({}), "COVER_CRON_SECRET")).toBe(false);
  });

  it("accepts a matching Authorization: Bearer token", () => {
    process.env.CRON_SECRET = "real-secret";
    expect(isAuthorizedCronRequest(
      withHeaders({ authorization: "Bearer real-secret" }),
      "COVER_CRON_SECRET",
    )).toBe(true);
  });

  it("accepts a matching x-cron-secret header", () => {
    process.env.CRON_SECRET = "real-secret";
    expect(isAuthorizedCronRequest(
      withHeaders({ "x-cron-secret": "real-secret" }),
      "COVER_CRON_SECRET",
    )).toBe(true);
  });

  it("rejects a wrong credential", () => {
    process.env.CRON_SECRET = "real-secret";
    expect(isAuthorizedCronRequest(
      withHeaders({ authorization: "Bearer wrong-secret" }),
      "COVER_CRON_SECRET",
    )).toBe(false);
  });

  it("prefers the route-specific secret over CRON_SECRET when set", () => {
    process.env.CRON_SECRET = "legacy";
    process.env.COVER_CRON_SECRET = "specific";

    expect(isAuthorizedCronRequest(
      withHeaders({ authorization: "Bearer legacy" }),
      "COVER_CRON_SECRET",
    )).toBe(false);

    expect(isAuthorizedCronRequest(
      withHeaders({ authorization: "Bearer specific" }),
      "COVER_CRON_SECRET",
    )).toBe(true);
  });

  it("with allowCronSecretFallback also accepts CRON_SECRET when route secret is set", () => {
    process.env.CRON_SECRET = "vercel-cron";
    process.env.COVER_CRON_SECRET = "manual-only";

    // Without the fallback, CRON_SECRET is rejected (isolation default).
    expect(isAuthorizedCronRequest(
      withHeaders({ authorization: "Bearer vercel-cron" }),
      "COVER_CRON_SECRET",
    )).toBe(false);

    // With the fallback, both secrets are accepted.
    expect(isAuthorizedCronRequest(
      withHeaders({ authorization: "Bearer vercel-cron" }),
      "COVER_CRON_SECRET",
      { allowCronSecretFallback: true },
    )).toBe(true);
    expect(isAuthorizedCronRequest(
      withHeaders({ authorization: "Bearer manual-only" }),
      "COVER_CRON_SECRET",
      { allowCronSecretFallback: true },
    )).toBe(true);
    // Wrong tokens still rejected.
    expect(isAuthorizedCronRequest(
      withHeaders({ authorization: "Bearer not-either-of-them" }),
      "COVER_CRON_SECRET",
      { allowCronSecretFallback: true },
    )).toBe(false);
  });

  it("matches Bearer prefix case-insensitively and trims whitespace", () => {
    process.env.CRON_SECRET = "real-secret";
    expect(isAuthorizedCronRequest(
      withHeaders({ authorization: "bearer    real-secret  " }),
      "COVER_CRON_SECRET",
    )).toBe(true);
  });

  it("does not accept different-length credentials as equal", () => {
    process.env.CRON_SECRET = "short";
    expect(isAuthorizedCronRequest(
      withHeaders({ authorization: "Bearer shorter-than-not" }),
      "COVER_CRON_SECRET",
    )).toBe(false);
  });
});
