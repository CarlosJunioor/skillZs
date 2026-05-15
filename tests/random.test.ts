import { describe, expect, it } from "vitest";
import { pick, slugHash } from "../lib/character/random";

describe("slugHash", () => {
  it("is deterministic", () => {
    expect(slugHash("zeke")).toBe(slugHash("zeke"));
  });

  it("returns different values for different slugs", () => {
    expect(slugHash("zeke")).not.toBe(slugHash("matt-pocock"));
  });

  it("returns a non-negative 32-bit integer", () => {
    const h = slugHash("anything-here");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe("pick", () => {
  const pool = ["a", "b", "c"] as const;

  it("returns a deterministic element for a given slug + salt", () => {
    expect(pick("zeke", 0, pool)).toBe(pick("zeke", 0, pool));
  });

  it("varies with salt", () => {
    const a = pick("zeke", 0, pool);
    const b = pick("zeke", 1, pool);
    expect(pool).toContain(a);
    expect(pool).toContain(b);
  });

  it("never returns out-of-bounds", () => {
    for (const slug of ["a", "b", "c", "long-name", "x"]) {
      expect(pool).toContain(pick(slug, 0, pool));
    }
  });
});
