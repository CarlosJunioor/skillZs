export type LoopFrame = {
  iteration: number;
  stage: string;
  line: string;
};

export type AgentLoop = {
  slug: string;
  name: string;
  sigil: string;
  summary: string;
  bestFor: string;
  stages: string[];
  stopWhen: string;
  tags: string[];
  prompt: string;
  frames: LoopFrame[];
};

export const agentLoops: AgentLoop[] = [
  {
    slug: "plan-execute-verify",
    name: "Plan / Execute / Verify",
    sigil: "PV",
    summary: "Turn a goal into a plan, perform one safe step, then verify the result before continuing.",
    bestFor: "Reliable multi-step implementation",
    stages: ["plan", "execute", "verify"],
    stopWhen: "Every acceptance check passes",
    tags: ["coding", "general"],
    prompt: "Work in a plan → execute → verify loop. Plan the smallest next step, execute only that step, verify it against the goal, and repeat until every acceptance check passes. Report the evidence from each verification.",
    frames: [
      { iteration: 1, stage: "PLAN", line: "$ inspect auth flow and select the smallest safe change" },
      { iteration: 1, stage: "EXECUTE", line: "+ add the missing session guard in the shared loader" },
      { iteration: 1, stage: "VERIFY", line: "! 1 redirect test still fails for expired tokens" },
      { iteration: 2, stage: "PLAN", line: "$ trace expired-token callers through the same loader" },
      { iteration: 2, stage: "VERIFY", line: "✓ 18/18 acceptance checks passed · stop" },
    ],
  },
  {
    slug: "test-fix-retest",
    name: "Test / Fix / Retest",
    sigil: "TF",
    summary: "Keep the failure reproducible while applying the smallest fix that makes it disappear.",
    bestFor: "Debugging and regression repair",
    stages: ["test", "fix", "retest"],
    stopWhen: "The regression test and surrounding suite pass",
    tags: ["coding", "debugging"],
    prompt: "Use a test → fix → retest loop. First reproduce the bug with one focused test. Trace the shared root cause, apply the smallest fix there, rerun the focused test, then the surrounding suite. Stop only when both pass.",
    frames: [
      { iteration: 1, stage: "TEST", line: "✗ expected 401, received 500 for an expired session" },
      { iteration: 1, stage: "FIX", line: "+ normalize expired sessions before route handlers" },
      { iteration: 1, stage: "RETEST", line: "✓ focused regression passes" },
      { iteration: 2, stage: "RETEST", line: "✓ auth suite 42/42 · stop" },
    ],
  },
  {
    slug: "research-synthesize-critique",
    name: "Research / Synthesize / Critique",
    sigil: "RC",
    summary: "Gather primary evidence, combine it into an answer, then attack the weak claims.",
    bestFor: "Evidence-backed research",
    stages: ["research", "synthesize", "critique"],
    stopWhen: "Important claims are supported or clearly qualified",
    tags: ["research", "writing"],
    prompt: "Work in a research → synthesize → critique loop. Gather primary sources, synthesize only what they support, challenge every important claim for missing or conflicting evidence, and repeat until claims are cited or explicitly qualified.",
    frames: [
      { iteration: 1, stage: "RESEARCH", line: "+ 6 primary sources · 2 conflicting benchmarks" },
      { iteration: 1, stage: "SYNTHESIZE", line: "> draft conclusion: approach A is consistently faster" },
      { iteration: 1, stage: "CRITIQUE", line: "! claim ignores dataset size and warm-cache bias" },
      { iteration: 2, stage: "SYNTHESIZE", line: "> narrow conclusion and add conditions" },
      { iteration: 2, stage: "CRITIQUE", line: "✓ all material claims supported · stop" },
    ],
  },
  {
    slug: "generate-evaluate-refine",
    name: "Generate / Evaluate / Refine",
    sigil: "GR",
    summary: "Create a candidate, score it against explicit criteria, then improve only what scored poorly.",
    bestFor: "Design, copy, and solution quality",
    stages: ["generate", "evaluate", "refine"],
    stopWhen: "The candidate clears the quality threshold",
    tags: ["creative", "quality"],
    prompt: "Use a generate → evaluate → refine loop. Define the evaluation criteria first, generate one candidate, score it criterion by criterion, refine only the weak areas, and repeat until the candidate clears the agreed threshold.",
    frames: [
      { iteration: 1, stage: "GENERATE", line: "+ landing headline candidate A" },
      { iteration: 1, stage: "EVALUATE", line: "clarity 8 · specificity 4 · voice 6" },
      { iteration: 1, stage: "REFINE", line: "> add audience, outcome, and proof" },
      { iteration: 2, stage: "EVALUATE", line: "clarity 9 · specificity 9 · voice 8 · stop" },
    ],
  },
  {
    slug: "ooda",
    name: "Observe / Orient / Decide / Act",
    sigil: "OO",
    summary: "Continuously update a decision from changing conditions instead of following a stale plan.",
    bestFor: "Dynamic operations and incidents",
    stages: ["observe", "orient", "decide", "act"],
    stopWhen: "The environment reaches a stable target state",
    tags: ["operations", "strategy"],
    prompt: "Run an observe → orient → decide → act loop. Read the current state, interpret what changed, choose one reversible action, execute it, then observe again. Stop when the target state is stable.",
    frames: [
      { iteration: 1, stage: "OBSERVE", line: "latency p95 1.8s · error rate 7.2%" },
      { iteration: 1, stage: "ORIENT", line: "! failures isolated to image workers" },
      { iteration: 1, stage: "DECIDE", line: "> drain unhealthy worker pool" },
      { iteration: 1, stage: "ACT", line: "+ traffic shifted to healthy pool" },
      { iteration: 2, stage: "OBSERVE", line: "✓ p95 240ms · error rate 0.1% · stop" },
    ],
  },
  {
    slug: "review-revise",
    name: "Review / Revise",
    sigil: "RR",
    summary: "Review work against a fixed brief and revise concrete mismatches until none remain.",
    bestFor: "Editing and code review",
    stages: ["review", "revise"],
    stopWhen: "No material mismatch with the brief remains",
    tags: ["review", "writing"],
    prompt: "Use a review → revise loop. Compare the current work to the brief, list only concrete mismatches, revise those items, and review again. Stop when no material mismatch remains.",
    frames: [
      { iteration: 1, stage: "REVIEW", line: "! intro delays the main claim by 180 words" },
      { iteration: 1, stage: "REVISE", line: "- remove setup · move evidence above background" },
      { iteration: 2, stage: "REVIEW", line: "! conclusion repeats instead of deciding" },
      { iteration: 2, stage: "REVISE", line: "+ replace recap with recommendation" },
      { iteration: 3, stage: "REVIEW", line: "✓ brief matched · stop" },
    ],
  },
  {
    slug: "reason-act-observe",
    name: "Reason / Act / Observe",
    sigil: "RA",
    summary: "Choose a tool from the current evidence, use it, and feed the real result into the next decision.",
    bestFor: "Tool-using agents",
    stages: ["reason", "act", "observe"],
    stopWhen: "The requested outcome is verified",
    tags: ["agents", "tools"],
    prompt: "Use a reason → act → observe loop. Reason from the evidence currently available, choose one appropriate tool action, observe its real output, and update the next decision. Never invent tool results. Stop when the requested outcome is verified.",
    frames: [
      { iteration: 1, stage: "REASON", line: "need the shared caller before changing validation" },
      { iteration: 1, stage: "ACT", line: "$ rg \"validateRequest\" app lib" },
      { iteration: 1, stage: "OBSERVE", line: "3 routes share lib/request-security.ts" },
      { iteration: 2, stage: "ACT", line: "$ patch shared validator; run focused tests" },
      { iteration: 2, stage: "OBSERVE", line: "✓ all callers protected · stop" },
    ],
  },
  {
    slug: "retry-backoff",
    name: "Retry / Backoff",
    sigil: "RB",
    summary: "Retry transient failures with increasing delays while preserving a hard attempt limit.",
    bestFor: "Rate limits and flaky services",
    stages: ["attempt", "classify", "wait"],
    stopWhen: "The call succeeds or the retry budget is exhausted",
    tags: ["reliability", "api"],
    prompt: "Use a bounded retry loop with exponential backoff. Attempt the operation, retry only transient failures, respect server retry hints, add jitter, and stop on success, permanent failure, or the maximum attempt count.",
    frames: [
      { iteration: 1, stage: "ATTEMPT", line: "! 429 rate limited · retry-after 2s" },
      { iteration: 1, stage: "WAIT", line: "… backing off 2.3s with jitter" },
      { iteration: 2, stage: "ATTEMPT", line: "! 503 upstream unavailable" },
      { iteration: 2, stage: "WAIT", line: "… backing off 4.1s · 1 attempt remains" },
      { iteration: 3, stage: "ATTEMPT", line: "✓ 200 response · stop" },
    ],
  },
  {
    slug: "human-approval",
    name: "Draft / Approve / Continue",
    sigil: "HA",
    summary: "Pause before consequential actions and continue only after a person approves the exact change.",
    bestFor: "Deploys, spending, and external actions",
    stages: ["draft", "approve", "continue"],
    stopWhen: "The approved action completes or approval is denied",
    tags: ["safety", "human-in-loop"],
    prompt: "Use a draft → approve → continue loop for consequential actions. Prepare the exact action and impact, pause for explicit human approval, execute only the approved scope, then report the result. Never treat silence as approval.",
    frames: [
      { iteration: 1, stage: "DRAFT", line: "> deploy commit 8d31f2 to production · affects web" },
      { iteration: 1, stage: "APPROVE", line: "? waiting for explicit approval" },
      { iteration: 1, stage: "CONTINUE", line: "+ approval received · starting rollout" },
      { iteration: 2, stage: "APPROVE", line: "? promote from 10% to 100%" },
      { iteration: 2, stage: "CONTINUE", line: "✓ rollout approved and healthy · stop" },
    ],
  },
  {
    slug: "delegate-integrate",
    name: "Delegate / Integrate / Check",
    sigil: "DI",
    summary: "Split independent work, integrate the returned evidence, and check the whole result together.",
    bestFor: "Parallel multi-agent work",
    stages: ["delegate", "integrate", "check"],
    stopWhen: "The integrated result passes shared checks",
    tags: ["agents", "parallel"],
    prompt: "Use a delegate → integrate → check loop. Split only independent tasks, give each agent a bounded outcome, integrate their evidence and changes, then run shared checks across the whole result. Repeat only for unresolved integration failures.",
    frames: [
      { iteration: 1, stage: "DELEGATE", line: "+ routes audit · accessibility audit · data audit" },
      { iteration: 1, stage: "INTEGRATE", line: "> 3 reports merged · 1 overlapping navigation change" },
      { iteration: 1, stage: "CHECK", line: "! mobile nav regression after integration" },
      { iteration: 2, stage: "INTEGRATE", line: "+ resolve overlap in shared header" },
      { iteration: 2, stage: "CHECK", line: "✓ full quality gate passes · stop" },
    ],
  },
];
