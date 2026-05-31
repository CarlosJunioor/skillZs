import { describe, expect, it } from "vitest";
import { sanitizeLine, truncateTerminal, TERMINAL_WIDTH } from "../lib/skill-md";

describe("sanitizeLine", () => {
  it("strips markdown decoration and collapses whitespace", () => {
    expect(sanitizeLine("## **Core**   principle")).toBe("Core principle");
    expect(sanitizeLine("- write the `test` first")).toBe("write the test first");
    expect(sanitizeLine("see [the docs](http://x.io) now")).toBe("see the docs now");
    expect(sanitizeLine("1. reproduce consistently")).toBe("reproduce consistently");
    expect(sanitizeLine("> quoted note")).toBe("quoted note");
  });
});

describe("truncateTerminal", () => {
  it("leaves short lines intact", () => {
    expect(truncateTerminal("short line")).toBe("short line");
  });
  it("truncates long lines to the terminal width with an ellipsis", () => {
    const out = truncateTerminal("x".repeat(200));
    expect(out.length).toBeLessThanOrEqual(TERMINAL_WIDTH);
    expect(out.endsWith("…")).toBe(true);
  });
});

import { extractTriggers } from "../lib/skill-md";

describe("extractTriggers", () => {
  it("returns [] for empty description", () => {
    expect(extractTriggers(null)).toEqual([]);
    expect(extractTriggers("")).toEqual([]);
  });

  it("prefers quoted phrases", () => {
    const triggers = extractTriggers(
      "Use when user wants to stress-test a plan, or mentions 'grill me'.",
    );
    expect(triggers[0]).toBe("grill me");
  });

  it("falls back to 'wants to X' clauses", () => {
    const triggers = extractTriggers(
      "Use when the user wants to review a pull request before merge.",
    );
    expect(triggers).toContain("review a pull request before merge");
  });

  it("falls back to the 'Use when X' clause when there is no 'wants to'", () => {
    const triggers = extractTriggers(
      "Use when implementing any feature or bugfix, before writing code.",
    );
    expect(triggers[0]).toBe("implementing any feature or bugfix");
  });
});

import { extractEssence, extractSteps } from "../lib/skill-md";

const TDD_BODY = `# Test-Driven Development

## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch it fail, you don't know it works.

## When to Use

Always.

## Red-Green-Refactor

### RED - Write Failing Test
text
### GREEN - Minimal Code
text
### REFACTOR - Clean Up
text

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "x"    | "y"     |
`;

const NUMBERED_BODY = `# Debugging

## The Four Phases

1. **Read Error Messages Carefully**
2. Reproduce Consistently
3. Form a hypothesis
`;

describe("extractEssence", () => {
  it("returns the Overview one-liner", () => {
    expect(extractEssence(TDD_BODY)).toBe(
      "Write the test first. Watch it fail. Write minimal code to pass.",
    );
  });
});

describe("extractSteps", () => {
  it("uses ## / ### method headers, skipping boilerplate headers", () => {
    const steps = extractSteps(TDD_BODY);
    expect(steps).toContain("Red-Green-Refactor");
    expect(steps).toContain("RED - Write Failing Test");
    expect(steps).not.toContain("Overview");
    expect(steps).not.toContain("When to Use");
    expect(steps).not.toContain("Common Rationalizations");
  });

  it("prefers a numbered list when present", () => {
    const steps = extractSteps(NUMBERED_BODY);
    expect(steps[0]).toBe("Read Error Messages Carefully");
    expect(steps[1]).toBe("Reproduce Consistently");
  });
});
