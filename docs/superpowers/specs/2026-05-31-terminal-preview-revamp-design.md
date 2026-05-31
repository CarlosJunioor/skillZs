# Terminal Preview Revamp — Design

**Date:** 2026-05-31
**Status:** Approved (pending spec review)
**Scope:** The per-skill terminal preview on `/skill/[slug]`. The influencer "shop"
page is explicitly a separate, later project.

## Problem

The terminal preview is meant to answer one question for a visitor: *what does this
skill actually do?* Today it only answers that for the **superpowers** family, which
has a hand-authored 4-scenario rotation. Every other skill falls back to
`categoryScript()` — generic, category-templated filler that is identical across
hundreds of skills and teaches nothing skill-specific:

```
» auto-selected coding workflow
  intent: Catch bugs before merge
  scanning diff: 3 files, 142 lines
  findings: 2 issues (1 high, 1 nit)
```

A visitor reading that still does not know what the skill does. We want every skill's
preview to feel like the superpowers one: a believable Claude Code session built from
the skill's **own real words**.

## Chosen approach

Derive the preview transcript **at render time from the skill's SKILL.md**
(`readme_md`), which the skill page already fetches for "the manual" section. No new
database column, no cron, no AI generation. Parsing happens **server-side**; the client
component just animates the result.

Rejected alternatives (recorded for context):
- *AI-generate offline + store in DB* — highest fidelity and scales, but adds a column,
  a cron, and a prompt. Deferred; the render-time deriver is enough and ships now.
- *Client-side parse* — would ship the raw readme into the JS bundle (it currently does
  not — react-markdown renders it server-side) and push markdown heuristics to the
  client. Rejected in favour of server-side parsing.

## Result (target output)

For `test-driven-development`, derived from its real SKILL.md:

```
●●●  skillz://test-driven-development
──────────────────────────────────────────────
$ /plugin install test-driven-development@obra/superpowers
✓ installed Test-Driven Development · /test-driven-development ready

> implement retry logic before writing the code
» using test-driven-development — write the test first, watch it fail
  RED · write one failing test
  $ npm test path/to/test.test.ts
  FAIL: expected 'success', got undefined
  GREEN · minimal code to pass
  $ npm test
  PASS
  REFACTOR · remove duplication, keep it green
» no production code without a failing test first
```

Every line is lifted or synthesized from the skill's SKILL.md: the `>` ask from the
frontmatter trigger, the `$ npm test … FAIL … PASS` is a verbatim bash session from the
doc, the steps are real section headers, the closing line is the skill's "Iron Law."

## Architecture (4 units)

### 1. `lib/skill-md.ts` (new — pure, dependency-free)

`readSkillDoc(readme: string | null): SkillDoc | null`

Parses raw SKILL.md by line scanning + small regexes (no markdown library; we only need
a few high-signal structures, and react-markdown already handles full rendering
elsewhere). Returns `null` when the input is empty/unparseable.

```ts
interface SkillDoc {
  triggers: string[];        // from frontmatter `description`: "Use when…", quoted 'phrases'
  essence: string | null;    // Overview one-liner / **Core principle**
  steps: string[];           // first numbered list, else ##/### method headers
  terminalLines: string[];   // verbatim lines from ```bash / ```sh / ```console blocks
  examples: SkillExample[];  // worked `## Example` blocks (0+)
}

interface SkillExample {
  title: string;             // e.g. "Bug Fix"
  lines: string[];           // sanitized body lines (prefers embedded terminal sessions)
}
```

Extraction rules:
- **Frontmatter** is read for `name`/`description`, then stripped from the body.
- **Excluded blocks:** ` ```dot `, ` ```mermaid `, markdown tables, and pseudo-tags like
  `<Good>`/`<Bad>`/`<example>` (the fences/tags are dropped; useful inner lines may be
  kept only inside an Example block).
- **Sanitize every kept line:** strip `**bold**`, leading `#`, inline backticks, link
  syntax `[t](u)` → `t`; collapse whitespace; truncate to ~64 chars (terminal width).
- **terminalLines:** only from bash/sh/console/shell-fenced blocks; keep `$ …` commands
  and their immediately-following output lines.

### 2. `lib/skill-demo.ts` (rewrite core)

`buildDemoScenarios(skill, marketplace, readme): DemoFrame[][]`

Returns an array of scenarios (frame-lists). The client cycles
`scenarios[loopCount % scenarios.length]`.

Branching:
1. **superpowers family** → existing curated 4-rotation, unchanged.
2. **`readSkillDoc(readme)` is usable** → build derived scenario(s):
   - If the doc yields **2+ examples**, emit one scenario per example (rotation).
   - Otherwise emit a single derived scenario (the client replays it).
   - Scenario shape:
     1. `prompt`  — `/plugin install <slug>@<marketplace>`
     2. `response`— `✓ installed <name> · /<slug> ready`
     3. `user`    — synthesized real ask from `triggers`
     4. `thinking`— `using <slug> — <essence>`
     5. body — prefer `example.lines`, then `steps` (the skill's method), then
        `terminalLines` (a stray fenced block is often unrelated to the skill)
     6. `thinking` — short closing (essence/iron-law line, or generic)
3. **else** → existing `categoryScript()` fallback.

Usability gate: a derived scenario must contain **≥3 body lines** after sanitization;
otherwise fall through to `categoryScript()` so we never render a thin/garbled preview.

Trigger → user-ask synthesis (in priority order):
1. A quoted phrase in the description (`'grill me'`) → use verbatim.
2. First `Use when (the user )?wants to X` / `Use when X` clause → imperative form.
3. `skill.tagline`, else a generic `apply <name> to this task`.

### 3. `components/skill-terminal-preview.tsx` (pure animator)

- **New prop contract:** `scenarios: DemoFrame[][]` plus `slug` (chrome label) and
  `skillName`. Component no longer calls `demoScriptFor` itself.
- Cycles scenarios by `loopCount`. Keeps the existing machinery: hydration guard,
  `prefers-reduced-motion` (renders static), IntersectionObserver pause-when-offscreen,
  per-kind typing speed, blinking cursor.
- **New `user` frame kind.** Frame kinds become
  `"prompt" | "user" | "response" | "thinking"`:
  - `prompt` `$ ` — slash-commands (install, `/slug`)
  - `user` `> ` — the human's natural-language ask (distinct colour, e.g. paper-white)
  - `thinking` `» ` — skill activation / closing (italic, dimmed)
  - `response` (indent) — output lines
- `DEFAULT_SPEED_MS` and `DemoFrameKind` extend to include `user`.

### 4. `app/skill/[slug]/page.tsx`

Compute `const scenarios = buildDemoScenarios(skill, marketplace, readme)` (readme is
already fetched in the existing `Promise.all`) and pass `scenarios`, `slug`, and
`skill.name` to `<SkillTerminalPreview/>`.

## Data flow

```
page (server: fetch skill + readme)
  → buildDemoScenarios(skill, marketplace, readme)   // pure, server-side
  → DemoFrame[][]  (small payload)
  → <SkillTerminalPreview scenarios slug skillName/>  // client: animate + loop
```

## Error handling & fallbacks

| Condition | Behaviour |
|-----------|-----------|
| `readme` is null/empty | `categoryScript()` fallback |
| Parser yields < 3 usable body lines | `categoryScript()` fallback |
| Non-terminal blocks (dot/mermaid/tables/tags) | dropped during parse |
| Any extracted line | sanitized (markdown stripped) + truncated to ~64 chars |
| `prefers-reduced-motion` | static render of the first scenario (existing behaviour) |

## Testing (TDD, matches existing vitest suite)

- **`tests/skill-md.test.ts`** (new): feed SKILL.md fixtures shaped like
  `test-driven-development` / `systematic-debugging` → assert `triggers`, `essence`,
  `steps`, `terminalLines`, and ≥1 `examples`; assert dot-graphs, tables, frontmatter,
  and `<Good>`/`<Bad>` tags are excluded; assert truncation + markdown sanitization.
- **`tests/skill-demo.test.ts`** (rewrite): a readme-bearing skill produces a derived
  scenario (install → `user` ask → activation → real body); 2+ examples produce 2+
  scenarios; superpowers rotation preserved byte-for-byte; null/thin readme falls back
  to `categoryScript()`.
- **`tests/skill-terminal-preview.test.tsx`** (rewrite): render with a `scenarios` prop;
  assert the install line, the `user` ask line, and a derived body line are present;
  assert reduced-motion static render.

## Scope guardrails (YAGNI)

- No DB column, no cron, no AI generation.
- Superpowers curated path untouched.
- Influencer "shop" page is **out of scope** (separate future project).
- Rotation only when the readme actually yields 2+ examples; no synthetic multi-scenario
  generation.
```
