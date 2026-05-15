import { describe, expect, it } from "vitest";
import { buildAvatarPrompt, AVATAR_STYLE_VERSION } from "../lib/character/prompt";

function p(over: Partial<Parameters<typeof buildAvatarPrompt>[0]> = {}) {
  return buildAvatarPrompt({
    slug: "matt-pocock",
    name: "Matt Pocock",
    role: "TypeScript explainer-in-chief",
    kind: "influencer",
    ...over,
  });
}

describe("buildAvatarPrompt", () => {
  it("includes the locked Style DNA tokens", () => {
    const out = p();
    expect(out).toContain("Fisheye circular portrait");
    expect(out).toContain("THICK black ink lineart");
    expect(out).toContain("#C8C346");
    expect(out).toContain("#1A1A1A");
    expect(out).toContain("never pure white");
    expect(out).toContain("NO 3D");
  });

  it("substitutes the character name and a derived word", () => {
    const out = p();
    expect(out).toContain("Matt Pocock");
    // role's first word, uppercased
    expect(out).toContain('"TYPESCRIPT"');
  });

  it("picks an influencer prop for kind=influencer", () => {
    const out = p({ kind: "influencer" });
    const pool = ["microphone", "paperback", "polaroid"];
    expect(pool.some((needle) => out.toLowerCase().includes(needle))).toBe(true);
  });

  it("picks a zeke prop for kind=zeke", () => {
    const out = p({ slug: "zeke", name: "Zeke", role: "In-house builder of skillZs", kind: "zeke" });
    const pool = ["laptop", "cardboard box", "sketchbook"];
    expect(pool.some((needle) => out.toLowerCase().includes(needle))).toBe(true);
  });

  it("is deterministic per slug — same input, same prompt", () => {
    expect(p()).toBe(p());
  });

  it("varies setting/glyph across different slugs", () => {
    const a = p({ slug: "slug-a", name: "A" });
    const b = p({ slug: "slug-b-different", name: "B" });
    expect(a).not.toBe(b);
  });

  it("falls back to the name when role is missing for word derivation", () => {
    const out = p({ role: null, name: "OnlyName" });
    expect(out).toContain('"ONLYNAME"');
  });

  it("exposes a versioned style tag", () => {
    expect(AVATAR_STYLE_VERSION).toMatch(/^v\d/);
  });
});
