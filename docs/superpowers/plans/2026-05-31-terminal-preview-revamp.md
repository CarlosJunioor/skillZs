# Terminal Preview Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the per-skill terminal preview derive its transcript from each skill's SKILL.md (real trigger, method, and terminal sessions) instead of generic category filler.

**Architecture:** A new pure `lib/skill-md.ts` reader extracts high-signal structures from raw SKILL.md. `lib/skill-demo.ts` turns a parsed doc into one or more believable Claude Code "scenarios" (frame-lists), keeping the curated superpowers rotation and the category fallback. Parsing runs server-side in `app/skill/[slug]/page.tsx`; the client component becomes a pure animator that cycles the provided scenarios. Client-safe frame types/constants move to `lib/skill-demo-types.ts` so the parser + `gray-matter` never reach the browser bundle.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, TypeScript, Vitest 4, gray-matter (already a dependency).

---

## File Structure

- **Create** `lib/skill-demo-types.ts` — client-safe frame kinds/constants (no parser deps).
- **Create** `lib/skill-md.ts` — pure SKILL.md reader → `SkillDoc`.
- **Create** `tests/skill-md.test.ts` — unit tests for the reader.
- **Modify** `lib/skill-demo.ts` — import/re-export types from `skill-demo-types`; add `buildDemoScenarios`, `synthesizeUserAsk`, `buildDerivedScenario`, `deriveScenarios`; switch the superpowers user task to the new `user` frame kind. Keep `superpowersScript`, `categoryScript`, `sampleTaskFor`.
- **Modify** `tests/skill-demo.test.ts` — rewrite for `buildDemoScenarios`.
- **Modify** `components/skill-terminal-preview.tsx` — new `scenarios`/`slug` prop contract; render the `user` kind.
- **Modify** `tests/skill-terminal-preview.test.tsx` — rewrite for the `scenarios` prop.
- **Modify** `app/globals.css:269-281` — add `.terminal-preview__line--user`; tint `--prompt`.
- **Modify** `app/skill/[slug]/page.tsx:66-69,167` — compute scenarios server-side, pass props.

**Commands** (verified against `package.json` / `vitest.config.ts`):
- Run one test file: `npx vitest run tests/<file>`
- Run all tests: `npm test`
- Lint: `npm run lint`
- Typecheck: `npx tsc --noEmit`

Tests import the unit-under-test by relative path (e.g. `../lib/skill-md`), matching the existing suite. Source files use the `@/` alias.

---

## Task 1: Extract client-safe frame types/constants

**Files:**
- Create: `lib/skill-demo-types.ts`
- Modify: `lib/skill-demo.ts:4-19` (replace the local type/const declarations with re-exports)
- Test: existing `tests/skill-demo.test.ts` must stay green (no rewrite yet)

- [ ] **Step 1: Create the shared types module**

Create `lib/skill-demo-types.ts`:

```ts
// lib/skill-demo-types.ts
// Client-safe frame primitives for the terminal preview. NO parser or server
// imports here — the "use client" component imports from this file, so anything
// pulled in lands in the browser bundle. Keep it tiny.

export type DemoFrameKind = "prompt" | "user" | "response" | "thinking";

export interface DemoFrame {
  kind: DemoFrameKind;
  text: string;
  speedMs?: number;
  pauseAfterMs?: number;
}

export const DEFAULT_SPEED_MS: Record<DemoFrameKind, number> = {
  prompt: 32,
  user: 30,
  response: 16,
  thinking: 22,
};

export const LOOP_PAUSE_MS = 2500;
```

- [ ] **Step 2: Re-export from skill-demo.ts**

In `lib/skill-demo.ts`, replace the existing block (lines 4-19: the `DemoFrameKind`/`DemoFrame`/`DEFAULT_SPEED_MS`/`LOOP_PAUSE_MS` declarations) with:

```ts
import {
  DEFAULT_SPEED_MS,
  LOOP_PAUSE_MS,
  type DemoFrame,
  type DemoFrameKind,
} from "./skill-demo-types";

export { DEFAULT_SPEED_MS, LOOP_PAUSE_MS, type DemoFrame, type DemoFrameKind };
```

Leave the rest of the file (`SlugScript`, `SUPERPOWERS_*`, `demoScriptFor`, `superpowersScript`, `categoryScript`, etc.) unchanged for now.

- [ ] **Step 3: Run the existing suite to verify nothing broke**

Run: `npm test`
Expected: PASS (all existing `skill-demo` and `skill-terminal-preview` tests still green; adding the `user` kind is additive).

- [ ] **Step 4: Commit**

```bash
git add lib/skill-demo-types.ts lib/skill-demo.ts
git commit -m "refactor(preview): extract client-safe frame types into skill-demo-types"
```

---

## Task 2: SKILL.md sanitization primitives

**Files:**
- Create: `lib/skill-md.ts`
- Test: `tests/skill-md.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/skill-md.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/skill-md.test.ts`
Expected: FAIL — `Cannot find module '../lib/skill-md'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/skill-md.ts`:

```ts
// lib/skill-md.ts
// Pure SKILL.md reader. No React, no server-only imports. Extracts a few
// high-signal structures from a skill's SKILL.md so the terminal preview can
// show the skill's OWN words instead of generic filler. Server/test side only —
// it is never imported by the "use client" preview component.
import matter from "gray-matter";

export const TERMINAL_WIDTH = 64;

/** Strip markdown decoration and collapse whitespace from a single line. */
export function sanitizeLine(raw: string): string {
  return raw
    .replace(/`([^`]*)`/g, "$1")             // inline code
    .replace(/\*\*([^*]+)\*\*/g, "$1")        // bold
    .replace(/\*([^*]+)\*/g, "$1")            // italic
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")  // links -> text
    .replace(/^\s*#{1,6}\s+/, "")             // heading hashes
    .replace(/^\s*>\s?/, "")                   // blockquote
    .replace(/^\s*[-*+]\s+/, "")              // bullet
    .replace(/^\s*\d+\.\s+/, "")              // ordered list number
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncate to terminal width with an ellipsis. */
export function truncateTerminal(value: string, width = TERMINAL_WIDTH): string {
  const clean = value.trim();
  return clean.length > width ? `${clean.slice(0, width - 1).trimEnd()}…` : clean;
}
```

Note: `matter` is imported now so later tasks can use it without re-editing the import.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/skill-md.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/skill-md.ts tests/skill-md.test.ts
git commit -m "feat(skill-md): add line sanitization + truncation primitives"
```

---

## Task 3: Frontmatter triggers extraction

**Files:**
- Modify: `lib/skill-md.ts`
- Test: `tests/skill-md.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/skill-md.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/skill-md.test.ts`
Expected: FAIL — `extractTriggers is not exported`.

- [ ] **Step 3: Write minimal implementation**

Append to `lib/skill-md.ts`:

```ts
/** Candidate user-request phrases from a skill's frontmatter `description`. */
export function extractTriggers(description: string | null | undefined): string[] {
  if (!description) return [];
  const out: string[] = [];

  // 1. Quoted phrases ('grill me', "red-green-refactor") — most direct.
  for (const m of description.matchAll(/['"]([^'"]{2,48})['"]/g)) {
    out.push(m[1]);
  }

  const useWhen = description.match(/use when\s+(.*)/i);
  if (useWhen) {
    // Clause boundaries are commas. Do NOT split on a bare "or" — it appears
    // inside phrases like "feature or bugfix" and would shred them.
    const clauses = useWhen[1]
      .split(/,/)
      .map((c) => c.trim())
      .filter(Boolean);
    // 2. "wants to X" clauses -> X.
    let matchedWants = false;
    for (const c of clauses) {
      const wants = c.match(/wants?\s+to\s+(.*)/i);
      if (wants) {
        out.push(wants[1]);
        matchedWants = true;
      }
    }
    // 3. Last resort: the first clause verbatim, only when nothing better matched.
    if (!matchedWants && clauses[0]) out.push(clauses[0]);
  }

  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const t of out) {
    const phrase = t.replace(/[.'"]+$/, "").replace(/\s+/g, " ").trim();
    if (phrase.length >= 2 && !seen.has(phrase.toLowerCase())) {
      seen.add(phrase.toLowerCase());
      cleaned.push(phrase);
    }
  }
  return cleaned.slice(0, 6);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/skill-md.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/skill-md.ts tests/skill-md.test.ts
git commit -m "feat(skill-md): extract trigger phrases from frontmatter description"
```

---

## Task 4: Essence + method steps extraction

**Files:**
- Modify: `lib/skill-md.ts`
- Test: `tests/skill-md.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/skill-md.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/skill-md.test.ts`
Expected: FAIL — `extractEssence is not exported`.

- [ ] **Step 3: Write minimal implementation**

Append to `lib/skill-md.ts`:

```ts
const BORING_HEADERS =
  /^(overview|when to use|why|why .*matters|common rationalizations|red flags|verification checklist|when stuck|final rule|debugging integration|testing anti-patterns|the iron law|good tests|table of contents)/i;

interface Section {
  heading: string;
  content: string;
}

/** Split a markdown body into level-2 (`##`) sections. `###` stays in content. */
function splitSections(body: string): Section[] {
  const sections: Section[] = [];
  let cur: Section | null = null;
  for (const line of body.split("\n")) {
    const h = line.match(/^##\s+(.+?)\s*$/); // level-2 only ("### x" has no space after ##)
    if (h) {
      if (cur) sections.push(cur);
      cur = { heading: h[1].trim(), content: "" };
    } else if (cur) {
      cur.content += `${line}\n`;
    }
  }
  if (cur) sections.push(cur);
  return sections;
}

/** The skill's punchiest one-liner: Overview line, else Core principle, else first prose. */
export function extractEssence(body: string): string | null {
  const overview = splitSections(body).find((s) => /^overview$/i.test(s.heading));
  if (overview) {
    const first = overview.content
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("```") && !l.startsWith("**") && !l.startsWith("#"));
    if (first) return truncateTerminal(sanitizeLine(first));
  }
  const core = body.match(/\*\*core principle:?\*\*\s*(.+)/i);
  if (core) return truncateTerminal(sanitizeLine(core[1]));
  const prose = body
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#") && !l.startsWith("```") && !l.startsWith("---"));
  return prose ? truncateTerminal(sanitizeLine(prose)) : null;
}

/** The skill's method as a short ordered list of steps. */
export function extractSteps(body: string, max = 5): string[] {
  // 1. A top-level numbered list, if there is one.
  const numbered: string[] = [];
  for (const m of body.matchAll(/^\s{0,3}\d+\.\s+(.+)$/gm)) {
    const text = sanitizeLine(m[1]);
    if (text) numbered.push(truncateTerminal(text));
  }
  if (numbered.length >= 2) return numbered.slice(0, max);

  // 2. Otherwise, ## / ### headers that read like method steps.
  const headers: string[] = [];
  for (const m of body.matchAll(/^#{2,3}\s+(.+?)\s*$/gm)) {
    const h = sanitizeLine(m[1]);
    if (h && !BORING_HEADERS.test(h)) headers.push(truncateTerminal(h));
  }
  return headers.slice(0, max);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/skill-md.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/skill-md.ts tests/skill-md.test.ts
git commit -m "feat(skill-md): extract essence one-liner and method steps"
```

---

## Task 5: Terminal sessions + worked examples extraction

**Files:**
- Modify: `lib/skill-md.ts`
- Test: `tests/skill-md.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/skill-md.test.ts`:

```ts
import { extractTerminalLines, extractExamples } from "../lib/skill-md";

const EXAMPLE_BODY = [
  "# Skill",
  "",
  "## Example: Bug Fix",
  "",
  "**RED**",
  "```typescript",
  "test('rejects empty email', () => {});",
  "```",
  "",
  "**Verify RED**",
  "```bash",
  "$ npm test",
  "FAIL: expected 'Email required', got undefined",
  "```",
  "",
  "**GREEN**",
  "```bash",
  "$ npm test",
  "PASS",
  "```",
  "",
  "## Example: Feature",
  "",
  "```bash",
  "$ npm run build",
  "ok",
  "```",
  "more prose here",
  "",
].join("\n");

describe("extractTerminalLines", () => {
  it("pulls verbatim lines only from shell-fenced blocks", () => {
    const lines = extractTerminalLines(EXAMPLE_BODY);
    expect(lines).toContain("$ npm test");
    expect(lines).toContain("FAIL: expected 'Email required', got undefined");
    expect(lines).toContain("PASS");
    expect(lines).not.toContain("test('rejects empty email', () => {});"); // typescript block excluded
  });
});

describe("extractExamples", () => {
  it("captures each ## Example block with sanitized + shell lines", () => {
    const examples = extractExamples(EXAMPLE_BODY);
    expect(examples).toHaveLength(2);
    expect(examples[0].title).toBe("Bug Fix");
    expect(examples[0].lines).toContain("RED");
    expect(examples[0].lines).toContain("$ npm test");
    expect(examples[0].lines).toContain("PASS");
    expect(examples[0].lines).not.toContain("test('rejects empty email', () => {});");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/skill-md.test.ts`
Expected: FAIL — `extractTerminalLines is not exported`.

- [ ] **Step 3: Write minimal implementation**

Append to `lib/skill-md.ts`:

```ts
export interface SkillExample {
  title: string;
  lines: string[];
}

const SHELL_LANGS = /^(bash|sh|shell|console|zsh)$/i;

/** Verbatim lines from shell/console fenced blocks across the whole body. */
export function extractTerminalLines(body: string, max = 8): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(/```([\w-]*)\n([\s\S]*?)```/g)) {
    if (!SHELL_LANGS.test(m[1])) continue;
    for (const raw of m[2].split("\n")) {
      const line = raw.replace(/\s+$/, "");
      if (!line.trim()) continue;
      out.push(truncateTerminal(line));
      if (out.length >= max) return out;
    }
  }
  return out;
}

/** Meaningful lines inside an example: shell sessions verbatim, prose sanitized, other code skipped. */
function exampleLines(content: string, max: number): string[] {
  const out: string[] = [];
  let fence: false | "keep" | "skip" = false;
  for (const raw of content.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const open = line.match(/^```([\w-]*)/);
    if (open) {
      if (fence) {
        fence = false; // closing fence
      } else {
        fence = SHELL_LANGS.test(open[1]) ? "keep" : "skip";
      }
      continue;
    }
    if (fence === "skip") continue;
    if (fence === "keep") {
      if (line.trim()) out.push(truncateTerminal(line));
    } else {
      const clean = sanitizeLine(line);
      if (clean) out.push(truncateTerminal(clean));
    }
    if (out.length >= max) break;
  }
  return out;
}

/** Worked `## Example...` sections, each with up to `maxLines` body lines. */
export function extractExamples(body: string, maxExamples = 3, maxLines = 8): SkillExample[] {
  const out: SkillExample[] = [];
  for (const section of splitSections(body)) {
    if (!/^example\b/i.test(section.heading)) continue;
    const title = sanitizeLine(section.heading).replace(/^example:?\s*/i, "").trim() || "example";
    const lines = exampleLines(section.content, maxLines);
    if (lines.length >= 2) out.push({ title, lines });
    if (out.length >= maxExamples) break;
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/skill-md.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/skill-md.ts tests/skill-md.test.ts
git commit -m "feat(skill-md): extract terminal sessions and worked examples"
```

---

## Task 6: `readSkillDoc` composer

**Files:**
- Modify: `lib/skill-md.ts`
- Test: `tests/skill-md.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/skill-md.test.ts`:

```ts
import { readSkillDoc } from "../lib/skill-md";

const FULL_SKILL = `---
name: grill-me
description: Use when the user wants to stress-test a plan, or mentions 'grill me'.
---

# Grill Me

## Overview

Interview the user relentlessly until shared understanding.

## The Process

1. Ask one question at a time
2. Resolve each branch of the decision tree
3. Provide your recommended answer
`;

describe("readSkillDoc", () => {
  it("returns null for empty input", () => {
    expect(readSkillDoc(null)).toBeNull();
    expect(readSkillDoc("   ")).toBeNull();
  });

  it("returns null when there is no usable body (no steps/terminal/examples)", () => {
    expect(readSkillDoc("---\nname: x\ndescription: Use when y.\n---\n\nJust prose.\n")).toBeNull();
  });

  it("parses frontmatter, triggers, essence and steps", () => {
    const doc = readSkillDoc(FULL_SKILL);
    expect(doc).not.toBeNull();
    expect(doc!.triggers[0]).toBe("grill me");
    expect(doc!.essence).toBe(
      "Interview the user relentlessly until shared understanding.",
    );
    expect(doc!.steps).toContain("Ask one question at a time");
  });

  it("does not throw on malformed frontmatter", () => {
    expect(() => readSkillDoc("---\n: : :\n---\nbody\n")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/skill-md.test.ts`
Expected: FAIL — `readSkillDoc is not exported`.

- [ ] **Step 3: Write minimal implementation**

Append to `lib/skill-md.ts`:

```ts
export interface SkillDoc {
  triggers: string[];
  essence: string | null;
  steps: string[];
  terminalLines: string[];
  examples: SkillExample[];
}

/** Parse frontmatter via gray-matter, tolerating malformed YAML. */
function readFrontmatter(md: string): { description: string | null; body: string } {
  try {
    const { data, content } = matter(md);
    const description = typeof data.description === "string" ? data.description : null;
    return { description, body: content };
  } catch {
    return { description: null, body: md };
  }
}

/** Read a skill's SKILL.md into structured signals, or null when unusable. */
export function readSkillDoc(readme: string | null | undefined): SkillDoc | null {
  if (!readme || !readme.trim()) return null;
  const { description, body } = readFrontmatter(readme);
  const doc: SkillDoc = {
    triggers: extractTriggers(description),
    essence: extractEssence(body),
    steps: extractSteps(body),
    terminalLines: extractTerminalLines(body),
    examples: extractExamples(body),
  };
  const hasBody =
    doc.examples.length > 0 || doc.terminalLines.length > 0 || doc.steps.length > 0;
  return hasBody ? doc : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/skill-md.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/skill-md.ts tests/skill-md.test.ts
git commit -m "feat(skill-md): compose readSkillDoc with usability gate"
```

---

## Task 7: Derived-scenario builders in skill-demo

**Files:**
- Modify: `lib/skill-demo.ts` (add new functions; do not change `superpowersScript` yet)
- Test: `tests/skill-demo.test.ts` (append new describe block; existing tests stay green)

- [ ] **Step 1: Write the failing test**

Append to `tests/skill-demo.test.ts` (after the existing imports, add the new symbols to the import from `../lib/skill-demo`, and add a `readSkillDoc` import):

```ts
import { buildDerivedScenario, synthesizeUserAsk } from "../lib/skill-demo";
import { readSkillDoc } from "../lib/skill-md";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/skill-demo.test.ts`
Expected: FAIL — `buildDerivedScenario is not exported` (existing tests still pass).

- [ ] **Step 3: Write minimal implementation**

In `lib/skill-demo.ts`, add an import for the reader near the top imports:

```ts
import { readSkillDoc, type SkillDoc } from "@/lib/skill-md";
```

Then add these functions (place them above `categoryScript`):

```ts
/** Turn a parsed doc + skill into a believable first-person user request. */
export function synthesizeUserAsk(doc: SkillDoc, skill: SkillStats): string {
  // Quoted/verbatim triggers keep their authored case ('grill me', 'review this PR').
  const trigger = doc.triggers[0];
  if (trigger) return truncateTerminalText(trigger);
  // Taglines are Title Case value props — lowercase them to read like a user line.
  if (skill.tagline?.trim()) return truncateTerminalText(skill.tagline.trim().toLowerCase());
  return `apply ${skill.name} to this task`;
}

function deriveBodyFrames(lines: string[]): DemoFrame[] {
  return lines.map((text, i) => ({
    kind: "response" as const,
    text: `  ${text}`,
    pauseAfterMs: i === lines.length - 1 ? 400 : undefined,
  }));
}

/** Build one scenario (frame-list) from a parsed doc and a chosen body. */
export function buildDerivedScenario(
  skill: SkillStats,
  marketplace: string,
  doc: SkillDoc,
  bodyLines: string[],
): DemoFrame[] {
  const slug = skill.slug;
  const frames: DemoFrame[] = [
    { kind: "prompt", text: `/plugin install ${slug}@${marketplace}` },
    { kind: "response", text: `✓ installed ${skill.name} · /${slug} ready`, pauseAfterMs: 250 },
    { kind: "user", text: synthesizeUserAsk(doc, skill), pauseAfterMs: 500 },
    {
      kind: "thinking",
      text: doc.essence ? `using ${slug} — ${doc.essence}` : `using ${slug}`,
      pauseAfterMs: 600,
    },
    ...deriveBodyFrames(bodyLines),
    { kind: "thinking", text: "handoff ready" },
  ];
  return frames;
}
```

(`truncateTerminalText` already exists in this file; `DemoFrame` and `SkillStats` are already imported.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/skill-demo.test.ts`
Expected: PASS (existing tests still green; `superpowersScript` unchanged).

- [ ] **Step 5: Commit**

```bash
git add lib/skill-demo.ts tests/skill-demo.test.ts
git commit -m "feat(skill-demo): add user-ask synthesis and derived scenario builder"
```

---

## Task 8: `buildDemoScenarios` entry point + scenario rotation

**Files:**
- Modify: `lib/skill-demo.ts` (add `buildDemoScenarios` + `deriveScenarios`; switch superpowers task frame to `user`)
- Test: `tests/skill-demo.test.ts` (rewrite the superpowers/category describe blocks for the new API)

- [ ] **Step 1: Write the failing test**

First, **replace the entire import header** of `tests/skill-demo.test.ts` (every `import` line at the top — the vitest import, the `../lib/skill-demo` import, any `../lib/skill-md` import added in Task 7, and the `../lib/types` import) with this single consolidated block, so no import is left unused after the rewrite (`demoScriptFor` and `type DemoFrame` are no longer used):

```ts
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
```

Then, in the same file, replace the two existing describe blocks `describe("demoScriptFor: superpowers", ...)` and `describe("demoScriptFor: category fallback", ...)` with:

```ts
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
```

Also delete the now-obsolete `describe("DemoFrame defaults", ...)` assertion that restricts kinds to `["prompt", "response", "thinking"]` — replace its body with:

```ts
describe("DemoFrame defaults", () => {
  it("exposes default per-kind typing speeds including user", () => {
    expect(DEFAULT_SPEED_MS.prompt).toBeGreaterThan(0);
    expect(DEFAULT_SPEED_MS.user).toBeGreaterThan(0);
    expect(DEFAULT_SPEED_MS.response).toBeGreaterThan(0);
    expect(DEFAULT_SPEED_MS.thinking).toBeGreaterThan(0);
  });
});
```

(The `sampleTaskFor` describe block stays unchanged.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/skill-demo.test.ts`
Expected: FAIL — `buildDemoScenarios is not exported`.

- [ ] **Step 3: Write minimal implementation**

In `lib/skill-demo.ts`:

(a) Change the superpowers task frame from `prompt` to `user`. In `superpowersScript`, find:

```ts
    { kind: "prompt", text: r.task, pauseAfterMs: 500 },
```

and replace with:

```ts
    { kind: "user", text: r.task, pauseAfterMs: 500 },
```

(b) Add the entry point and rotation logic (place near the top, after `demoScriptFor`, or replace `demoScriptFor` usage — keep `demoScriptFor` for now since other code/tests may import it):

```ts
const MIN_BODY_LINES = 3;

/** Top-level: returns 1+ scenarios (frame-lists) for the preview to cycle. */
export function buildDemoScenarios(
  skill: SkillStats,
  marketplace: string,
  readme: string | null | undefined,
): DemoFrame[][] {
  if (isSuperpowersFamily(skill)) {
    return SUPERPOWERS_ROTATIONS.map((_r, i) =>
      superpowersScript(skill, SUPERPOWERS_MARKETPLACE_ALIAS, i),
    );
  }

  const doc = readSkillDoc(readme);
  if (doc) {
    const derived = deriveScenarios(skill, marketplace, doc);
    if (derived.length) return derived;
  }

  return [categoryScript(skill, marketplace)];
}

/** Build derived scenarios, rotating across examples when there are 2+. */
function deriveScenarios(skill: SkillStats, marketplace: string, doc: SkillDoc): DemoFrame[][] {
  const usableExamples = doc.examples.filter((e) => e.lines.length >= MIN_BODY_LINES);
  if (usableExamples.length >= 2) {
    return usableExamples.map((ex) => buildDerivedScenario(skill, marketplace, doc, ex.lines));
  }
  const body =
    usableExamples[0]?.lines ??
    (doc.terminalLines.length >= MIN_BODY_LINES ? doc.terminalLines : null) ??
    (doc.steps.length >= MIN_BODY_LINES ? doc.steps : null);
  if (!body) return [];
  return [buildDerivedScenario(skill, marketplace, doc, body)];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/skill-demo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/skill-demo.ts tests/skill-demo.test.ts
git commit -m "feat(skill-demo): add buildDemoScenarios with SKILL.md-derived rotation"
```

---

## Task 9: Component becomes a pure scenario animator

**Files:**
- Modify: `components/skill-terminal-preview.tsx`
- Test: `tests/skill-terminal-preview.test.tsx` (rewrite)

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `tests/skill-terminal-preview.test.tsx` with:

```tsx
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DemoFrame } from "../lib/skill-demo-types";
import { SkillTerminalPreview } from "../components/skill-terminal-preview";

const SCENARIOS: DemoFrame[][] = [
  [
    { kind: "prompt", text: "/plugin install grill-me@mattpocock/skills" },
    { kind: "response", text: "✓ installed Grill Me · /grill-me ready" },
    { kind: "user", text: "grill me" },
    { kind: "thinking", text: "using grill-me — interview relentlessly" },
    { kind: "response", text: "  Ask one question at a time" },
  ],
];

describe("SkillTerminalPreview", () => {
  it("statically renders the first scenario (install, user ask, body) for SSR", () => {
    const html = renderToString(
      <SkillTerminalPreview scenarios={SCENARIOS} slug="grill-me" />,
    );
    expect(html).toContain("terminal preview");
    expect(html).toContain("skillz://grill-me");
    expect(html).toContain("/plugin install grill-me@mattpocock/skills");
    expect(html).toContain("grill me");
    expect(html).toContain("Ask one question at a time");
  });

  it("renders the user turn with the user line class", () => {
    const html = renderToString(
      <SkillTerminalPreview scenarios={SCENARIOS} slug="grill-me" />,
    );
    expect(html).toContain("terminal-preview__line--user");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/skill-terminal-preview.test.tsx`
Expected: FAIL — prop type mismatch / `scenarios` not accepted.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `components/skill-terminal-preview.tsx` with:

```tsx
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DEFAULT_SPEED_MS,
  LOOP_PAUSE_MS,
  type DemoFrame,
} from "@/lib/skill-demo-types";

interface Props {
  scenarios: DemoFrame[][];
  slug: string;
}

const NO_OP_SUBSCRIBE = () => () => {};
const SERVER_FALSE = () => false;
const CLIENT_TRUE = () => true;

function useHasHydrated(): boolean {
  return useSyncExternalStore(NO_OP_SUBSCRIBE, CLIENT_TRUE, SERVER_FALSE);
}

function subscribeReducedMotion(cb: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, SERVER_FALSE);
}

export function SkillTerminalPreview({ scenarios, slug }: Props) {
  const animated = useHasHydrated();
  const [loopCount, setLoopCount] = useState(0);
  const handleLoopComplete = useCallback(() => setLoopCount((c) => c + 1), []);

  const safe = scenarios.length > 0 ? scenarios : [[]];
  const frames = safe[loopCount % safe.length];

  return (
    <section className="mt-14">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
        <h2 className="display text-3xl">
          <span className="drip">terminal preview</span>
        </h2>
        <span className="tag-font text-sm text-[var(--color-rust)] uppercase tracking-wide">
          simulated Claude Code run
        </span>
      </div>

      <div className="terminal-preview ink-frame" aria-label={`${slug} terminal preview`}>
        <div className="terminal-preview__chrome">
          <span className="terminal-preview__dot" />
          <span className="terminal-preview__dot" />
          <span className="terminal-preview__dot" />
          <span className="ml-2 truncate">skillz://{slug}</span>
        </div>

        <pre className="terminal-preview__body" aria-live="off">
          {animated ? (
            <AnimatedFrames
              key={loopCount}
              frames={frames}
              onLoopComplete={handleLoopComplete}
            />
          ) : (
            <StaticFrames frames={frames} />
          )}
        </pre>
      </div>
    </section>
  );
}

function StaticFrames({ frames }: { frames: DemoFrame[] }) {
  return (
    <>
      {frames.map((f, i) => (
        <TerminalLine key={`static-${i}`} kind={f.kind} text={f.text} />
      ))}
    </>
  );
}

function TerminalLine({
  kind,
  text,
  cursor = false,
}: {
  kind: DemoFrame["kind"];
  text: string;
  cursor?: boolean;
}) {
  const sigil =
    kind === "prompt" ? "$ " : kind === "user" ? "> " : kind === "thinking" ? "» " : "  ";
  const classes = ["terminal-preview__line"];
  if (kind === "prompt") classes.push("terminal-preview__line--prompt");
  if (kind === "user") classes.push("terminal-preview__line--user");
  if (kind === "thinking") classes.push("terminal-preview__line--thinking");
  return (
    <span className={classes.join(" ")}>
      {sigil}
      {text}
      {cursor && <span className="terminal-preview__cursor" aria-hidden="true" />}
      {"\n"}
    </span>
  );
}

function AnimatedFrames({
  frames,
  onLoopComplete,
}: {
  frames: DemoFrame[];
  onLoopComplete: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLSpanElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion || !inView) return;
    const frame = frames[frameIndex];
    if (!frame) return;
    const isLast = frameIndex === frames.length - 1;
    const fullyTyped = charCount >= frame.text.length;

    if (!fullyTyped) {
      const speed = frame.speedMs ?? DEFAULT_SPEED_MS[frame.kind];
      const id = window.setTimeout(() => setCharCount((c) => c + 1), speed);
      return () => window.clearTimeout(id);
    }

    if (!isLast) {
      const pause = frame.pauseAfterMs ?? 320;
      const id = window.setTimeout(() => {
        setFrameIndex((i) => i + 1);
        setCharCount(0);
      }, pause);
      return () => window.clearTimeout(id);
    }

    const id = window.setTimeout(() => onLoopComplete(), LOOP_PAUSE_MS);
    return () => window.clearTimeout(id);
  }, [frames, frameIndex, charCount, reducedMotion, inView, onLoopComplete]);

  if (reducedMotion) {
    return (
      <span ref={containerRef}>
        <StaticFrames frames={frames} />
      </span>
    );
  }

  const completed = frames.slice(0, frameIndex);
  const live = frames[frameIndex];

  return (
    <span ref={containerRef}>
      {completed.map((f, i) => (
        <TerminalLine key={`done-${i}`} kind={f.kind} text={f.text} />
      ))}
      {live && (
        <TerminalLine
          key={`live-${frameIndex}`}
          kind={live.kind}
          text={live.text.slice(0, charCount)}
          cursor
        />
      )}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/skill-terminal-preview.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/skill-terminal-preview.tsx tests/skill-terminal-preview.test.tsx
git commit -m "feat(preview): animate provided scenarios and render the user turn"
```

---

## Task 10: User-turn styling

**Files:**
- Modify: `app/globals.css:274-281`

- [ ] **Step 1: Add the user line style and tint the prompt**

In `app/globals.css`, find:

```css
.terminal-preview__line--prompt {
  color: #FFFFFF;
}

.terminal-preview__line--thinking {
  color: rgba(212, 255, 117, 0.6);
  font-style: italic;
}
```

and replace with:

```css
.terminal-preview__line--prompt {
  color: rgba(212, 255, 117, 0.92); /* slash-commands read as CLI/system */
}

.terminal-preview__line--user {
  color: #FFFFFF; /* the human turn: brightest, weightiest */
  font-weight: 600;
}

.terminal-preview__line--thinking {
  color: rgba(212, 255, 117, 0.6);
  font-style: italic;
}
```

- [ ] **Step 2: Verify the stylesheet still parses (lint)**

Run: `npm run lint`
Expected: PASS (no eslint errors; CSS is not linted by eslint but this confirms nothing else broke).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style(preview): distinct user-turn color, CLI-tinted prompt"
```

---

## Task 11: Wire the page + full quality gate

**Files:**
- Modify: `app/skill/[slug]/page.tsx:11` (import), `:74-75` (compute), `:167` (render)

- [ ] **Step 1: Import the builder**

In `app/skill/[slug]/page.tsx`, add to the imports (near line 11-12):

```ts
import { buildDemoScenarios } from "@/lib/skill-demo";
```

- [ ] **Step 2: Compute scenarios server-side**

After the existing line that resolves the marketplace (around line 74):

```ts
  const marketplace = resolveMarketplace(skill.slug, skill.source_repo);
```

add:

```ts
  const scenarios = buildDemoScenarios(skill, marketplace, readme);
```

(`readme` is already in scope from the `Promise.all` at lines 66-69.)

- [ ] **Step 3: Update the component usage**

Replace line 167:

```tsx
      <SkillTerminalPreview skill={skill} marketplace={marketplace} />
```

with:

```tsx
      <SkillTerminalPreview scenarios={scenarios} slug={skill.slug} />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors — confirms the old `skill`/`marketplace` props are fully replaced and `buildDemoScenarios` is correctly typed).

- [ ] **Step 5: Run the full suite + lint**

Run: `npm test`
Expected: PASS (all `skill-md`, `skill-demo`, `skill-terminal-preview` tests green).

Run: `npm run lint`
Expected: PASS (0 warnings — `--max-warnings=0`).

- [ ] **Step 6: Commit**

```bash
git add app/skill/[slug]/page.tsx
git commit -m "feat(preview): derive terminal scenarios from SKILL.md on the skill page"
```

---

## Self-Review

**Spec coverage:**
- "Derive at render time from SKILL.md, parse server-side" → Tasks 2-6 (`lib/skill-md.ts`), Task 11 (page computes server-side). ✓
- "SkillDoc fields: triggers/essence/steps/terminalLines/examples" → Tasks 3-6. ✓
- "Scenario shape: install → user ask → activation → body → closing" → Task 7 `buildDerivedScenario`. ✓
- "Rotate when 2+ examples, else single" → Task 8 `deriveScenarios`. ✓
- "≥3 body-line usability gate, else category fallback" → Task 8 `MIN_BODY_LINES`. ✓
- "Keep superpowers curated rotation" → Task 8 maps `SUPERPOWERS_ROTATIONS`. ✓
- "Category fallback preserved" → Task 8 returns `[categoryScript(...)]`. ✓
- "New `user` frame kind + styling" → Task 1 (kind), Task 9 (render), Task 10 (CSS). ✓
- "Component is a pure animator with `scenarios` prop" → Task 9. ✓
- "Sanitize + truncate + exclude graphs/tables/tags" → Task 2 (`sanitizeLine`), Task 5 (shell-only fences, typescript skipped), Task 4 (`BORING_HEADERS`). ✓
- "Keep raw readme + parser out of the client bundle" → Task 1 (`skill-demo-types.ts`); component imports only from `skill-demo-types`. ✓
- "Reduced-motion / hydration / in-view machinery retained" → Task 9 keeps it. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `DemoFrame`/`DemoFrameKind`/`DEFAULT_SPEED_MS`/`LOOP_PAUSE_MS` defined in `skill-demo-types.ts` (Task 1), re-exported by `skill-demo.ts`, imported by the component from `skill-demo-types`. `SkillDoc`/`SkillExample` defined in `skill-md.ts` (Tasks 5-6), imported by `skill-demo.ts` (Task 7). `buildDemoScenarios(skill, marketplace, readme)` signature consistent across Task 8 (def) and Task 11 (call). `buildDerivedScenario(skill, marketplace, doc, bodyLines)` consistent across Tasks 7-8. Component prop `{ scenarios, slug }` consistent across Task 9 (def) and Task 11 (call). ✓

**Note on the graymatter dependency boundary:** `lib/skill-md.ts` imports `gray-matter`; it is only imported by `lib/skill-demo.ts`, which is only imported by the server page (`app/skill/[slug]/page.tsx`) — never by the `"use client"` component. Verified by Task 9 importing exclusively from `lib/skill-demo-types.ts`.
```
