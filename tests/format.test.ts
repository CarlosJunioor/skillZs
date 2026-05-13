import { describe, it, expect } from "vitest";
import { compactNumber, categoryEmoji, categoryLabel } from "../lib/format";

describe("compactNumber", () => {
  it("returns plain number under 1000", () => {
    expect(compactNumber(0)).toBe("0");
    expect(compactNumber(1)).toBe("1");
    expect(compactNumber(999)).toBe("999");
  });

  it("uses k with one decimal under 10k", () => {
    expect(compactNumber(1000)).toBe("1k");
    expect(compactNumber(1500)).toBe("1.5k");
    expect(compactNumber(9999)).toBe("10k");
  });

  it("uses k with no decimal between 10k and 1M", () => {
    expect(compactNumber(12_345)).toBe("12k");
    expect(compactNumber(999_499)).toBe("999k");
  });

  it("uses M for millions", () => {
    expect(compactNumber(1_000_000)).toBe("1M");
    expect(compactNumber(2_500_000)).toBe("2.5M");
  });
});

describe("categoryEmoji", () => {
  it("maps known categories", () => {
    expect(categoryEmoji("coding")).toBeTruthy();
    expect(categoryEmoji("creative")).toBeTruthy();
    expect(categoryEmoji("agent")).toBeTruthy();
    expect(categoryEmoji("utils")).toBeTruthy();
    expect(categoryEmoji("research")).toBeTruthy();
  });

  it("falls back for unknown / null", () => {
    const fallback = categoryEmoji(null);
    expect(fallback).toBe(categoryEmoji(undefined));
    expect(fallback).toBe(categoryEmoji("nonsense"));
  });
});

describe("categoryLabel", () => {
  it("capitalizes first letter", () => {
    expect(categoryLabel("coding")).toBe("Coding");
    expect(categoryLabel("agent")).toBe("Agent");
  });

  it("returns Other for null / undefined", () => {
    expect(categoryLabel(null)).toBe("Other");
    expect(categoryLabel(undefined)).toBe("Other");
  });
});
