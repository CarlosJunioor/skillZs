import { describe, expect, it } from "vitest";
import {
  buildBuildingPrompt,
  BUILDING_STYLE_VERSION,
} from "../lib/character/building-prompt";

function p(over: Partial<Parameters<typeof buildBuildingPrompt>[0]> = {}) {
  return buildBuildingPrompt({
    slug: "matt-pocock",
    name: "Matt Pocock",
    role: "TypeScript explainer-in-chief",
    kind: "influencer",
    ...over,
  });
}

describe("buildBuildingPrompt", () => {
  it("includes the locked Style DNA tokens", () => {
    const out = p();
    expect(out).toContain("Fisheye");
    expect(out).toContain("THICK black ink lineart");
    expect(out).toContain("#C8C346");
    expect(out).toContain("#1A1A1A");
    expect(out).toContain("never pure white");
    expect(out).toContain("NO 3D");
  });

  it("frames the composition as a peek THROUGH a storefront INTO the interior", () => {
    const out = p().toLowerCase();
    // Storefront frame language
    expect(out).toMatch(/storefront|shopfront|window|door|grate/);
    // Locked interior reference
    expect(out).toContain("interior");
    // Subject is the character
    expect(p()).toContain("Matt Pocock");
  });

  it("rejects banned exterior-only tokens", () => {
    const out = p().toLowerCase();
    expect(out).not.toContain("pixel");
    expect(out).not.toContain("3d render");
    expect(out).not.toContain("glossy");
    expect(out).not.toContain("pastel");
  });

  it("derives a graffiti word from the role's first token, uppercased", () => {
    expect(p()).toContain('"TYPESCRIPT"');
  });

  it("falls back to the name when role is missing", () => {
    expect(p({ role: null, name: "OnlyName" })).toContain('"ONLYNAME"');
  });

  it("is deterministic per slug", () => {
    expect(p()).toBe(p());
  });

  it("varies across different slugs", () => {
    expect(p({ slug: "a", name: "A" })).not.toBe(p({ slug: "b-different", name: "B" }));
  });

  it("exposes a versioned style tag with the v1-fisheye-peek lineage", () => {
    expect(BUILDING_STYLE_VERSION).toBe("v1-fisheye-peek");
  });
});
