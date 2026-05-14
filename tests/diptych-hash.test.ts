import { describe, expect, it } from "vitest";
import { contentHash } from "../lib/diptych/hash";

describe("contentHash", () => {
  it("returns a stable sha256 hex digest", () => {
    expect(contentHash("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("hashes the entire body, not just the first chunk", () => {
    const a = contentHash("body with trailing example A");
    const b = contentHash("body with trailing example B");
    expect(a).not.toBe(b);
  });

  it("is deterministic for the same input", () => {
    const body = "Some skill body\nwith multiple lines\n";
    expect(contentHash(body)).toBe(contentHash(body));
  });
});
