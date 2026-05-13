import { describe, expect, it } from "vitest";
import { buildPrompt } from "../lib/covers/style";

const skill = {
  name: "Debug Wizard",
  description: "Use when tests fail and stack traces need investigation.",
  category: "coding",
  slug: "debug-wizard",
};

describe("buildPrompt", () => {
  it("is deterministic for the same skill", () => {
    expect(buildPrompt(skill)).toBe(buildPrompt(skill));
  });

  it("includes bounded skill-specific context", () => {
    const prompt = buildPrompt(skill);

    expect(prompt).toMatch(/Debug Wizard/);
    expect(prompt).toMatch(/DEBUG|WIZARD/);
    expect(prompt).toMatch(/tests fail and stack traces need investigation/);
    expect(prompt).toMatch(/no copyrighted likenesses/i);
  });
});
