import { categoryLabel } from "@/lib/format";
import { readSkillDoc, type SkillDoc } from "@/lib/skill-md";
import type { SkillStats } from "@/lib/types";

import {
  DEFAULT_SPEED_MS,
  LOOP_PAUSE_MS,
  type DemoFrame,
  type DemoFrameKind,
} from "./skill-demo-types";

export { DEFAULT_SPEED_MS, LOOP_PAUSE_MS, type DemoFrame, type DemoFrameKind };

type SlugScript = (skill: SkillStats, marketplace: string, loopIndex: number) => DemoFrame[];

const SUPERPOWERS_REPO = "obra/superpowers";
const SUPERPOWERS_PLUGIN_SLUG = "superpowers";
const SUPERPOWERS_PLUGIN_NAME = "Superpowers";
const SUPERPOWERS_MARKETPLACE_ALIAS = "claude-plugins-official";

function isSuperpowersFamily(skill: SkillStats): boolean {
  return skill.source_repo === SUPERPOWERS_REPO || skill.slug === SUPERPOWERS_PLUGIN_SLUG;
}

export function demoScriptFor(
  skill: SkillStats,
  marketplace: string,
  loopIndex: number = 0,
): DemoFrame[] {
  if (isSuperpowersFamily(skill)) {
    return superpowersScript(skill, SUPERPOWERS_MARKETPLACE_ALIAS, loopIndex);
  }
  const hand = SLUG_SCRIPTS[skill.slug];
  if (hand) return hand(skill, marketplace, loopIndex);
  return categoryScript(skill, marketplace);
}

const SUPERPOWERS_ROTATIONS = [
  {
    task: "help me design a rate limiter for our API",
    thinking: "using brainstorming to explore intent...",
    lines: [
      "before code: 4 questions worth answering",
      "  1. global or per-key? (token bucket vs sliding window)",
      "  2. burst tolerance? (smooth vs spiky traffic)",
      "  3. failure mode? (fail-open or fail-closed on storage down)",
    ],
    handoff: "handoff to writing-plans once intent locks in",
  },
  {
    task: "debug this race condition in the signup flow",
    thinking: "using diagnose to reproduce the failure...",
    lines: [
      "repro: 200ms email-check + concurrent insert = duplicate row",
      "hypothesis: missing unique constraint on lower(email)",
      "fix: add index + retry on 23505, then assert idempotency",
    ],
    handoff: "regression test next",
  },
  {
    task: "write tests for the payment webhook handler",
    thinking: "using tdd to lock in red-green-refactor...",
    lines: [
      "red: webhook.spec.ts rejects unsigned payloads (fail)",
      "green: verify Stripe-Signature with timing-safe compare",
      "refactor: extract verifySignature() + table-test 6 cases",
    ],
    handoff: "ready to ship behind feature flag",
  },
  {
    task: "plan the migration from postgres to redis for sessions",
    thinking: "using writing-plans to break it into slices...",
    lines: [
      "slice 1: dual-write sessions to redis, read still pg",
      "slice 2: shadow-read from redis, log mismatches",
      "slice 3: cut read-path over, drop pg writes after 7d",
    ],
    handoff: "each slice ships independently",
  },
] as const;

function superpowersScript(_skill: SkillStats, marketplace: string, loopIndex: number): DemoFrame[] {
  const r = SUPERPOWERS_ROTATIONS[((loopIndex % SUPERPOWERS_ROTATIONS.length) + SUPERPOWERS_ROTATIONS.length) % SUPERPOWERS_ROTATIONS.length];
  const lineFrames: DemoFrame[] = r.lines.map((text, i) => ({
    kind: "response",
    text,
    pauseAfterMs: i === r.lines.length - 1 ? 400 : undefined,
  }));
  return [
    { kind: "prompt", text: `/plugin install ${SUPERPOWERS_PLUGIN_SLUG}@${marketplace}` },
    { kind: "response", text: `installed ${SUPERPOWERS_PLUGIN_NAME} from ${marketplace}`, pauseAfterMs: 200 },
    { kind: "response", text: "registered 14 subskills", pauseAfterMs: 600 },
    { kind: "prompt", text: r.task, pauseAfterMs: 500 },
    { kind: "thinking", text: r.thinking, pauseAfterMs: 700 },
    ...lineFrames,
    { kind: "thinking", text: r.handoff },
  ];
}

const SLUG_SCRIPTS: Record<string, SlugScript> = {};

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

function categoryScript(skill: SkillStats, marketplace: string): DemoFrame[] {
  const invoke = `/${skill.slug}`;
  const task = sampleTaskFor(skill);
  const head: DemoFrame[] = [
    { kind: "prompt", text: `/plugin install ${skill.slug}@${marketplace}` },
    { kind: "response", text: `installed ${skill.name} from ${marketplace}`, pauseAfterMs: 180 },
    { kind: "response", text: `registered trigger ${invoke}`, pauseAfterMs: 600 },
    { kind: "prompt", text: `${invoke} "${task}"`, pauseAfterMs: 400 },
    {
      kind: "thinking",
      text: `auto-selected ${categoryLabel(skill.category).toLowerCase()} workflow`,
      pauseAfterMs: 350,
    },
  ];
  return [...head, ...categoryBody(skill), { kind: "response", text: "handoff ready" }];
}

function categoryBody(skill: SkillStats): DemoFrame[] {
  const headline = skill.tagline?.trim() || skill.description;
  const intent: DemoFrame = {
    kind: "response",
    text: `intent: ${truncateTerminalText(headline)}`,
    pauseAfterMs: 250,
  };
  const source: DemoFrame = {
    kind: "response",
    text: `source: ${skill.source_repo}`,
  };
  return [intent, source, ...beforeAfterOrOutput(skill), ...categoryFlavor(skill.category)];
}

function beforeAfterOrOutput(skill: SkillStats): DemoFrame[] {
  if (skill.before_text?.trim() || skill.after_text?.trim()) {
    return [
      {
        kind: "response",
        text: `before: ${truncateTerminalText(skill.before_text ?? "unstructured request")}`,
      },
      {
        kind: "response",
        text: `after: ${truncateTerminalText(skill.after_text ?? "structured output")}`,
        pauseAfterMs: 300,
      },
    ];
  }
  return [
    {
      kind: "response",
      text: `output: ${categoryOutputFor(skill.category)}`,
      pauseAfterMs: 300,
    },
  ];
}

function categoryFlavor(category: SkillStats["category"]): DemoFrame[] {
  switch (category) {
    case "coding":
      return [
        { kind: "response", text: "  scanning diff: 3 files, 142 lines" },
        { kind: "response", text: "  findings: 2 issues (1 high, 1 nit)" },
        { kind: "response", text: "  proposed patch: tests/route.spec.ts +new" },
      ];
    case "creative":
      return [
        { kind: "response", text: "  generated 3 directions" },
        { kind: "response", text: "  picked: punchier verb-led headline" },
        { kind: "response", text: "  polished copy: 47 -> 31 chars" },
      ];
    case "agent":
      return [
        { kind: "response", text: "  delegated step 1 -> search subagent" },
        { kind: "response", text: "  delegated step 2 -> planner subagent" },
        { kind: "response", text: "  next action: await search results" },
      ];
    case "utils":
      return [
        { kind: "response", text: "  normalized input: stripped 12 stale tokens" },
        { kind: "response", text: "  ready commands: 3 reusable shell snippets" },
      ];
    case "research":
      return [
        { kind: "response", text: "  fetched 8 sources, kept 4 with primary signal" },
        { kind: "response", text: "  summary: 2 paragraphs + 5 cites" },
        { kind: "response", text: "  open questions: 1 (worth a follow-up)" },
      ];
    default:
      return [{ kind: "response", text: "  applied the skill to the request" }];
  }
}

export function sampleTaskFor(skill: SkillStats): string {
  switch (skill.category) {
    case "coding":
      return "review this change and propose the next patch";
    case "creative":
      return "turn this rough idea into a usable concept";
    case "agent":
      return "coordinate the next steps for this workflow";
    case "utils":
      return "clean this input and make it actionable";
    case "research":
      return "find the signal and cite the useful parts";
    default:
      return `apply ${skill.name} to this task`;
  }
}

function categoryOutputFor(category: SkillStats["category"]): string {
  switch (category) {
    case "coding":
      return "findings, patch plan, and test targets";
    case "creative":
      return "directions, variants, and polished copy";
    case "agent":
      return "delegated steps, state, and next action";
    case "utils":
      return "normalized data and reusable commands";
    case "research":
      return "summary, sources, and unresolved questions";
    default:
      return "focused instructions and a clear result";
  }
}

function truncateTerminalText(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 96 ? `${clean.slice(0, 93).trimEnd()}...` : clean;
}
