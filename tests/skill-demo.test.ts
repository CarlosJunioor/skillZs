import { describe, expect, it } from "vitest";
import {
  DEFAULT_SPEED_MS,
  buildDemoScenarios,
  buildDerivedScenario,
  sampleTaskFor,
  synthesizeUserAsk,
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

const READELESS = null;

describe("buildDemoScenarios: superpowers", () => {
  const skill = makeSkill({
    slug: "superpowers",
    name: "Superpowers",
    category: "agent",
    source_repo: "obra/superpowers",
  });

  it("returns one scenario per curated rotation (4)", () => {
    const scenarios = buildDemoScenarios(skill, SUPERPOWERS_MARKETPLACE, READELESS);
    expect(scenarios).toHaveLength(4);
    for (const frames of scenarios) {
      expect(frames[0]).toEqual(
        expect.objectContaining({
          kind: "prompt",
          text: `/plugin install superpowers@${SUPERPOWERS_MARKETPLACE}`,
        }),
      );
    }
  });

  it("rotates across the 4 subskills and marks the task as a user turn", () => {
    const scenarios = buildDemoScenarios(skill, SUPERPOWERS_MARKETPLACE, READELESS);
    const thinkings = scenarios.map(
      (frames) => frames.find((f) => f.kind === "thinking" && f.text.startsWith("using "))?.text ?? "",
    );
    expect(thinkings[0]).toContain("brainstorming");
    expect(thinkings[1]).toContain("diagnose");
    expect(thinkings[2]).toContain("tdd");
    expect(thinkings[3]).toContain("writing-plans");
    // the task line is now a user turn, not a slash prompt
    for (const frames of scenarios) {
      expect(frames.some((f) => f.kind === "user")).toBe(true);
    }
  });
});

describe("buildDemoScenarios: derived from SKILL.md", () => {
  const readme = `---
name: pr-review
description: Use when the user wants to review a pull request, or mentions 'review this PR'.
---

# PR Review

## Overview

Group review findings by risk before you comment.

## Example: Risky diff

\`\`\`bash
$ git diff --stat
3 files changed, 142 insertions(+)
\`\`\`
findings: 1 high, 1 nit

## Example: Clean diff

\`\`\`bash
$ git diff --stat
1 file changed, 4 insertions(+)
\`\`\`
findings: none
`;

  it("derives a scenario that shows the real ask + real terminal output", () => {
    const scenarios = buildDemoScenarios(
      makeSkill({ slug: "pr-review", name: "PR Review", category: "coding" }),
      "example/pr-review",
      readme,
    );
    const all = scenarios.flat().map((f) => f.text).join("\n");
    expect(all).toContain("/plugin install pr-review@example/pr-review");
    expect(scenarios.flat().some((f) => f.kind === "user" && f.text === "review this PR")).toBe(true);
    expect(all).toContain("$ git diff --stat");
  });

  it("rotates when the readme yields 2+ examples", () => {
    const scenarios = buildDemoScenarios(
      makeSkill({ slug: "pr-review", name: "PR Review" }),
      "example/pr-review",
      readme,
    );
    expect(scenarios.length).toBeGreaterThanOrEqual(2);
  });
});

describe("buildDemoScenarios: fallback", () => {
  it("uses the category script when there is no readme", () => {
    const scenarios = buildDemoScenarios(
      makeSkill({ slug: "pr-review", category: "coding" }),
      "example/pr-review",
      READELESS,
    );
    expect(scenarios).toHaveLength(1);
    const all = scenarios[0].map((f) => f.text).join("\n");
    expect(all).toContain("auto-selected coding workflow");
  });

  it("falls back when the readme has no usable body", () => {
    const scenarios = buildDemoScenarios(
      makeSkill({ slug: "thin", category: "research" }),
      "demo/marketplace",
      "---\nname: thin\ndescription: Use when x.\n---\n\nJust prose, no steps.\n",
    );
    const all = scenarios[0].map((f) => f.text).join("\n");
    expect(all).toContain("auto-selected research workflow");
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
  it("exposes default per-kind typing speeds including user", () => {
    expect(DEFAULT_SPEED_MS.prompt).toBeGreaterThan(0);
    expect(DEFAULT_SPEED_MS.user).toBeGreaterThan(0);
    expect(DEFAULT_SPEED_MS.response).toBeGreaterThan(0);
    expect(DEFAULT_SPEED_MS.thinking).toBeGreaterThan(0);
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

describe("buildDemoScenarios: body preference", () => {
  // A skill with a real method but also a stray, unrelated fenced code block.
  const readme = `---
name: debug-it
description: Use when encountering any bug.
---

# Debug It

## Overview

Find the root cause before fixing.

## The Four Phases

1. Read the error message carefully
2. Reproduce the failure consistently
3. Form a single hypothesis

## Aside

\`\`\`bash
echo "unrelated config dump"
export FOO=bar
cat /tmp/whatever
\`\`\`
`;

  it("prefers the skill's method steps over an unrelated code block", () => {
    const scenarios = buildDemoScenarios(
      makeSkill({ slug: "debug-it", name: "Debug It", category: "coding" }),
      "someone/skills",
      readme,
    );
    const all = scenarios.flat().map((f) => f.text).join("\n");
    expect(all).toContain("Read the error message carefully");
    expect(all).not.toContain("unrelated config dump");
  });
});

describe("buildDemoScenarios: superpowers sub-skills", () => {
  // The catalog has no meta "superpowers" entry — only obra-superpowers-* sub-skills,
  // all with source_repo "obra/superpowers". They must derive their OWN preview, not
  // inherit the curated meta-plugin rotation.
  const readme = `---
name: test-driven-development
description: Use when implementing any feature or bugfix.
---

# TDD

## Overview

Write the test first. Watch it fail.

## Red-Green-Refactor

1. Write a failing test
2. Write minimal code to pass
3. Refactor once green
`;

  it("derives its own preview instead of the curated rotation", () => {
    const scenarios = buildDemoScenarios(
      makeSkill({
        slug: "obra-superpowers-test-driven-development",
        name: "test-driven-development",
        source_repo: "obra/superpowers",
        category: "coding",
      }),
      "obra/superpowers",
      readme,
    );
    const all = scenarios.flat().map((f) => f.text).join("\n");
    expect(all).toContain("/plugin install obra-superpowers-test-driven-development@obra/superpowers");
    expect(all).toContain("Write a failing test");
    expect(all).not.toContain("registered 14 subskills"); // curated-rotation marker
  });

  it("still gives the meta superpowers plugin entry the curated rotation", () => {
    const scenarios = buildDemoScenarios(
      makeSkill({ slug: "superpowers", name: "Superpowers", source_repo: "obra/superpowers" }),
      SUPERPOWERS_MARKETPLACE,
      null,
    );
    expect(scenarios).toHaveLength(4);
    expect(scenarios[0].some((f) => f.text === "registered 14 subskills")).toBe(true);
  });
});
