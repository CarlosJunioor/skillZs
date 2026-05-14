import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "../lib/csp";

const originalNodeEnv = process.env.NODE_ENV;

function directives(csp: string): Map<string, string> {
  return new Map(
    csp.split(";").map((d) => {
      const trimmed = d.trim();
      const space = trimmed.indexOf(" ");
      return space === -1 ? [trimmed, ""] : [trimmed.slice(0, space), trimmed.slice(space + 1)];
    }),
  );
}

describe("contentSecurityPolicy", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "production";
  });
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("locks down clickjacking, plugins, and base tag", () => {
    const d = directives(contentSecurityPolicy("abc123"));
    expect(d.get("frame-ancestors")).toBe("'none'");
    expect(d.get("object-src")).toBe("'none'");
    expect(d.get("base-uri")).toBe("'self'");
    expect(d.get("form-action")).toBe("'self'");
    expect(d.get("default-src")).toBe("'self'");
  });

  it("embeds the per-request nonce in script-src with strict-dynamic", () => {
    const script = directives(contentSecurityPolicy("nonce-xyz")).get("script-src")!;
    expect(script).toContain("'nonce-nonce-xyz'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).toContain("'self'");
  });

  it("omits unsafe-eval in production", () => {
    const script = directives(contentSecurityPolicy("n")).get("script-src")!;
    expect(script).not.toContain("'unsafe-eval'");
  });

  it("allows unsafe-eval only in development", () => {
    process.env.NODE_ENV = "development";
    const script = directives(contentSecurityPolicy("n")).get("script-src")!;
    expect(script).toContain("'unsafe-eval'");
  });

  it("whitelists the trusted image hosts for covers and GitHub", () => {
    const img = directives(contentSecurityPolicy("n")).get("img-src")!;
    for (const src of [
      "'self'",
      "data:",
      "blob:",
      "https://opengraph.githubassets.com",
      "https://raw.githubusercontent.com",
      "https://github.com",
      "https://avatars.githubusercontent.com",
      "https://*.public.blob.vercel-storage.com",
    ]) {
      expect(img).toContain(src);
    }
  });

  it("emits a single-line policy joined by semicolons", () => {
    const csp = contentSecurityPolicy("n");
    expect(csp).not.toContain("\n");
    expect(csp.split(";").length).toBeGreaterThanOrEqual(9);
  });
});
