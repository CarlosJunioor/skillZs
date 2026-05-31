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
