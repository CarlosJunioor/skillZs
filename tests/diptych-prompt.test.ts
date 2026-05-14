import { describe, expect, it } from "vitest";
import { buildTextPrompt, buildImagePrompt, STYLE_VERSION } from "../lib/diptych/prompt";

describe("buildTextPrompt", () => {
  it("includes skill metadata and a JSON contract", () => {
    const prompt = buildTextPrompt({
      name: "PR Review",
      description: "Use when reviewing pull requests",
      body: "## Overview\nThis skill reviews PRs.",
    });

    expect(prompt).toContain("PR Review");
    expect(prompt).toContain("Use when reviewing pull requests");
    expect(prompt).toContain("## Overview");
    expect(prompt).toMatch(/"tagline"/);
    expect(prompt).toMatch(/"before_text"/);
    expect(prompt).toMatch(/"after_text"/);
  });

  it("truncates very long bodies to 6000 chars + marker", () => {
    const longBody = "A".repeat(20_000);
    const prompt = buildTextPrompt({
      name: "Big Skill",
      description: "Has a huge SKILL.md body",
      body: longBody,
    });

    expect(prompt).toContain("[...]");
    expect(prompt.length).toBeLessThan(8_000);
  });
});

describe("buildImagePrompt", () => {
  it("references both panel scenes and the style version", () => {
    const prompt = buildImagePrompt({
      name: "Cleans Code",
      before_text: "Messy half-finished functions everywhere",
      after_text: "Clean, idiomatic, well-named code",
      category: "coding",
    });

    expect(prompt).toContain("Cleans Code");
    expect(prompt).toContain("BEFORE");
    expect(prompt).toContain("AFTER");
    expect(prompt).toContain("Messy half-finished functions everywhere");
    expect(prompt).toContain("Clean, idiomatic, well-named code");
    expect(prompt).toMatch(/cluttered developer desk/i);
  });

  it("falls back to a generic setting when the category is unknown or null", () => {
    const known = buildImagePrompt({
      name: "X",
      before_text: "before",
      after_text: "after",
      category: "unmapped-category",
    });
    const nullCat = buildImagePrompt({
      name: "X",
      before_text: "before",
      after_text: "after",
      category: null,
    });

    expect(known).toContain("peeling wallpaper");
    expect(nullCat).toContain("peeling wallpaper");
  });

  it("uses the category hint when one is registered", () => {
    const prompt = buildImagePrompt({
      name: "X",
      before_text: "before",
      after_text: "after",
      category: "research",
    });

    expect(prompt).toContain("stacked books");
  });

  it("exports a stable STYLE_VERSION the cron uses to trigger regen", () => {
    expect(STYLE_VERSION).toMatch(/^v\d+-/);
  });
});
