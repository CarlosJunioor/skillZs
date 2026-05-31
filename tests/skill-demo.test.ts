import { describe, expect, it } from "vitest";
import {
  DEFAULT_SPEED_MS,
  demoScriptFor,
  sampleTaskFor,
  buildDerivedScenario,
  synthesizeUserAsk,
  type DemoFrame,
} from "../lib/skill-demo";
import { readSkillDoc } from "../lib/skill-md";
import type { Category, SkillStats } from "../lib/types";

function makeSkill(overrides: Partial<SkillStats> = {}): SkillStats {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "pr-review",
    name: "PR Review",
    description: "Reviews pull requests with structured findings.",
    cover_url: null,
    diptych_url: null,
    tagline: "Catch bugs before merge",
    before_text: "diffs get skimmed manually",
    after_text: "review findings are grouped by risk",
    category: "coding",
    repo_url: "https://github.com/example/pr-review",
    source_repo: "example/pr-review",
    github_stars: 42,
    readme_md: null,
    first_seen: "2026-01-01T00:00:00Z",
    last_seen: "2026-05-01T00:00:00Z",
    vote_count: 10,
    use_count: 25,
    hotness: 100,
    ...overrides,
  };
}

const SUPERPOWERS_MARKETPLACE = "claude-plugins-official";

describe("demoScriptFor: superpowers", () => {
  const skill = makeSkill({
    slug: "superpowers",
    name: "Superpowers",
    category: "agent",
    tagline: "the meta-skill that loads other skills",
    description: "Loads brainstorming, tdd, diagnose, and more on demand.",
    source_repo: "obra/superpowers",
  });

  it("starts every loop with the install command", () => {
    for (let i = 0; i < 4; i += 1) {
      const frames = demoScriptFor(skill, SUPERPOWERS_MARKETPLACE, i);
      expect(frames[0]).toEqual(
        expect.objectContaining({
          kind: "prompt",
          text: `/plugin install superpowers@${SUPERPOWERS_MARKETPLACE}`,
        }),
      );
    }
  });

  it("rotates across 4 subskills (brainstorming, diagnose, tdd, writing-plans)", () => {
    const subskills = [0, 1, 2, 3].map((i) => {
      const frames = demoScriptFor(skill, SUPERPOWERS_MARKETPLACE, i);
      const thinking = frames.find(
        (f) => f.kind === "thinking" && f.text.startsWith("using "),
      );
      return thinking?.text ?? "";
    });
    expect(subskills[0]).toContain("brainstorming");
    expect(subskills[1]).toContain("diagnose");
    expect(subskills[2]).toContain("tdd");
    expect(subskills[3]).toContain("writing-plans");
  });

  it("wraps around after the last rotation", () => {
    const loop0 = demoScriptFor(skill, SUPERPOWERS_MARKETPLACE, 0);
    const loop4 = demoScriptFor(skill, SUPERPOWERS_MARKETPLACE, 4);
    expect(loop4.map((f) => f.text)).toEqual(loop0.map((f) => f.text));
  });

  it("includes a user prompt that doesn't start with a slash", () => {
    const frames = demoScriptFor(skill, SUPERPOWERS_MARKETPLACE, 0);
    const userPrompt = frames.filter((f) => f.kind === "prompt")[1];
    expect(userPrompt).toBeDefined();
    expect(userPrompt.text.startsWith("/")).toBe(false);
  });
});

describe("demoScriptFor: category fallback", () => {
  it("uses the slash invoke for unknown slugs", () => {
    const frames = demoScriptFor(
      makeSkill({ slug: "pr-review", category: "coding" }),
      "example/pr-review",
      0,
    );
    expect(frames[0].text).toBe("/plugin install pr-review@example/pr-review");
    expect(frames.find((f) => f.text === "registered trigger /pr-review")).toBeTruthy();
    expect(frames.find((f) => f.text.includes("auto-selected coding"))).toBeTruthy();
  });

  it.each<{ category: Category; flavor: string; output: string }>([
    { category: "coding", flavor: "scanning diff", output: "findings, patch plan" },
    { category: "creative", flavor: "generated 3 directions", output: "directions, variants" },
    { category: "agent", flavor: "delegated step 1", output: "delegated steps" },
    { category: "utils", flavor: "normalized input", output: "normalized data" },
    { category: "research", flavor: "fetched 8 sources", output: "summary, sources" },
    { category: null, flavor: "applied the skill", output: "focused instructions" },
  ])("emits category flavor and fallback output for $category", ({ category, flavor, output }) => {
    const frames = demoScriptFor(
      makeSkill({
        slug: `demo-${category ?? "other"}`,
        category,
        before_text: null,
        after_text: null,
      }),
      "demo/marketplace",
      0,
    );
    const all = frames.map((f) => f.text).join("\n");
    expect(all).toContain(flavor);
    expect(all).toContain(`output: ${output}`);
  });

  it("emits before/after lines when those texts are present (even if only before is set)", () => {
    const frames = demoScriptFor(
      makeSkill({ slug: "lopsided", before_text: "only before", after_text: null }),
      "demo/marketplace",
      0,
    );
    const all = frames.map((f) => f.text).join("\n");
    expect(all).toContain("before: only before");
    expect(all).toContain("after: structured output");
  });

  it("emits before/after lines when only after_text is present", () => {
    const frames = demoScriptFor(
      makeSkill({ slug: "lopsided", before_text: null, after_text: "only after" }),
      "demo/marketplace",
      0,
    );
    const all = frames.map((f) => f.text).join("\n");
    expect(all).toContain("before: unstructured request");
    expect(all).toContain("after: only after");
  });

  it("falls back to description when tagline is empty", () => {
    const frames = demoScriptFor(
      makeSkill({
        slug: "no-tagline",
        tagline: "   ",
        description: "Plain description here.",
      }),
      "demo/marketplace",
      0,
    );
    const intent = frames.find((f) => f.text.startsWith("intent: "));
    expect(intent?.text).toBe("intent: Plain description here.");
  });

  it("truncates very long intent text to 96 chars", () => {
    const long = "x".repeat(200);
    const frames = demoScriptFor(
      makeSkill({ slug: "long", tagline: long }),
      "demo/marketplace",
      0,
    );
    const intent = frames.find((f) => f.text.startsWith("intent: "));
    expect(intent).toBeDefined();
    // "intent: " (8) + content (<=96) + "..." (3) = <=107
    expect(intent!.text.length).toBeLessThanOrEqual(8 + 96);
    expect(intent!.text.endsWith("...")).toBe(true);
  });
});

describe("sampleTaskFor", () => {
  it.each<{ category: Category; expected: string }>([
    { category: "coding", expected: "review this change and propose the next patch" },
    { category: "creative", expected: "turn this rough idea into a usable concept" },
    { category: "agent", expected: "coordinate the next steps for this workflow" },
    { category: "utils", expected: "clean this input and make it actionable" },
    { category: "research", expected: "find the signal and cite the useful parts" },
  ])("returns the expected task for $category", ({ category, expected }) => {
    expect(sampleTaskFor(makeSkill({ category }))).toBe(expected);
  });

  it("falls back to a name-based task when category is null", () => {
    expect(sampleTaskFor(makeSkill({ name: "MyTool", category: null }))).toBe(
      "apply MyTool to this task",
    );
  });
});

describe("DemoFrame defaults", () => {
  it("exposes default per-kind typing speeds", () => {
    expect(DEFAULT_SPEED_MS.prompt).toBeGreaterThan(0);
    expect(DEFAULT_SPEED_MS.response).toBeGreaterThan(0);
    expect(DEFAULT_SPEED_MS.thinking).toBeGreaterThan(0);
  });

  it("frames declare a kind from the allowed set", () => {
    const frames: DemoFrame[] = demoScriptFor(
      makeSkill({ slug: "superpowers", name: "Superpowers" }),
      SUPERPOWERS_MARKETPLACE,
      0,
    );
    const kinds = new Set(frames.map((f) => f.kind));
    for (const k of kinds) {
      expect(["prompt", "response", "thinking"]).toContain(k);
    }
  });
});

const GRILL_MD = `---
name: grill-me
description: Use when the user wants to stress-test a plan, or mentions 'grill me'.
---

# Grill Me

## Overview

Interview the user relentlessly until shared understanding.

## The Process

1. Ask one question at a time
2. Resolve each branch
3. Recommend an answer
`;

describe("synthesizeUserAsk", () => {
  it("uses a quoted trigger phrase when available", () => {
    const doc = readSkillDoc(GRILL_MD)!;
    const ask = synthesizeUserAsk(doc, makeSkill({ slug: "grill-me", name: "Grill Me" }));
    expect(ask).toBe("grill me");
  });

  it("falls back to the tagline when there is no usable trigger", () => {
    const ask = synthesizeUserAsk(
      { triggers: [], essence: null, steps: [], terminalLines: [], examples: [] },
      makeSkill({ tagline: "Catch bugs before merge" }),
    );
    expect(ask).toBe("catch bugs before merge");
  });
});

describe("buildDerivedScenario", () => {
  it("assembles install -> user ask -> activation -> body frames", () => {
    const doc = readSkillDoc(GRILL_MD)!;
    const frames = buildDerivedScenario(
      makeSkill({ slug: "grill-me", name: "Grill Me" }),
      "mattpocock/skills",
      doc,
      doc.steps,
    );
    expect(frames[0]).toEqual(
      expect.objectContaining({ kind: "prompt", text: "/plugin install grill-me@mattpocock/skills" }),
    );
    expect(frames.some((f) => f.kind === "user" && f.text === "grill me")).toBe(true);
    expect(frames.some((f) => f.kind === "thinking" && f.text.startsWith("using grill-me"))).toBe(true);
    expect(frames.some((f) => f.kind === "response" && f.text.includes("Ask one question at a time"))).toBe(true);
  });
});
