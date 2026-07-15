# Matt Pocock's Agent Skills: Research and Product Knowledge Base

Research snapshot: July 15, 2026  
Primary source: [`mattpocock/skills`](https://github.com/mattpocock/skills)  
Scope: public repository structure, skill instructions, documentation, release machinery, and Git history. This is an analysis of the work, not a personal profile.

## Executive finding

Matt Pocock does not treat a skill as a clever prompt. He treats it as a small behavioral system that makes an agent's **process** more predictable.

His collection starts with recurring agent failure modes: misalignment, excessive verbosity, weak feedback loops, and architecture decay. It then supplies small, composable skills that address those failures. User-invoked skills orchestrate a workflow; model-invoked skills hold reusable disciplines. The repository's own reference describes this invocation split explicitly, and the promoted set is designed as flows rather than a bag of unrelated downloads ([repository README](https://github.com/mattpocock/skills#reference), [invocation rules](https://github.com/mattpocock/skills/blob/main/.agents/invocation.md)).

That suggests a sharper position for skillZs:

> **skillZs should become a Skill Observatory and Test Bench: the place to discover what changed, understand how a skill behaves, inspect its source, copy it, and watch a version-pinned proof run.**

A directory answers "what exists?" The observatory should answer the harder questions:

- What problem does this solve?
- When will it activate, and who invokes it?
- What process will it follow?
- How does it know it is done?
- What files, scripts, or other skills does it rely on?
- What changed since the previous version?
- Has anyone demonstrated that it actually works?

## What Matt is building

The repository calls the collection "Skills for Real Engineers" and says the skills are used for real engineering rather than "vibe coding." The stated design goals are small, adaptable, composable, model-agnostic skills grounded in established engineering practice ([README](https://github.com/mattpocock/skills)).

The promoted collection currently contains 22 skills in two broad groups:

- **Engineering workflows:** alignment, planning, issue decomposition, implementation, TDD, debugging, code review, architecture, domain modeling, research, prototyping, and merge-conflict resolution.
- **Productivity workflows:** grilling, handoffs, teaching, and skill writing.

The repo also separates `in-progress`, `deprecated`, `misc`, and `personal` skills from the promoted `engineering` and `productivity` buckets. This folder structure is a lifecycle signal, not merely organization.

The collection is distributed in two ways:

- `npx skills@latest add mattpocock/skills` copies editable skills into a project.
- The Claude Code plugin is a managed, read-only bundle that follows releases.

Those are two different user promises: **fork and adapt** versus **subscribe and stay current** ([installation comparison](https://github.com/mattpocock/skills#install-as-a-claude-code-plugin)). A skill detail page should preserve that distinction instead of reducing both to one install button.

## How Matt creates skills

### 1. Begin with a recurring failure, not a feature list

The README organizes the suite around failures that developers already recognize:

| Failure | Response in the skill system |
| --- | --- |
| The agent misunderstood the request | `grill-me`, `grill-with-docs`, `grilling` |
| The agent wastes words rediscovering project language | `domain-modeling`, `CONTEXT.md`, ADRs |
| The code does not work | `tdd`, `diagnosing-bugs`, feedback loops |
| The codebase is becoming a ball of mud | `codebase-design`, `improve-codebase-architecture` |

This is a better discovery model than categories alone. Users usually arrive with a failure in mind, not a taxonomy.

### 2. Choose the invocation boundary deliberately

Matt distinguishes two kinds of skill:

- **User-invoked:** the human explicitly starts it. These are usually orchestrators and routers. They trade agent context load for human cognitive load.
- **Model-invoked:** the agent can select it when a task matches. These hold reusable disciplines and need rich trigger language.

This is not a cosmetic metadata choice. It determines who controls the workflow, whether other skills can reach it, and how much description remains in the model's context every turn. The `writing-great-skills` reference makes that trade-off the first design decision ([source](https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-great-skills/SKILL.md)).

### 3. Give the skill one memorable conceptual anchor

Matt repeatedly compresses a workflow into a "leading word" or short phrase:

- Debugging is a **tight feedback loop**.
- TDD depends on a testable **seam**, then moves in a vertical **tracer bullet**.
- Architecture aims for a **deep module**.
- `to-questionnaire` targets the knowledge **gap** and says, "Grill the send, not the subject."

These phrases are more than marketing. They give the agent and the user a shared handle for the behavior the skill is meant to preserve.

### 4. Specify observable completion criteria

The strongest skills do not stop at "investigate" or "write tests." They state what evidence must exist before the workflow moves on.

Examples from the repository include:

- a reproduction command has already been run, can show red, is deterministic, fast, and agent-runnable;
- a TDD seam is agreed before tests are written;
- a questionnaire file exists and every requested decision or fact is covered;
- a prototype answers one named design question and remains disposable.

The pattern is: **each important phase ends in evidence, not confidence**. The detailed debugging and TDD skills demonstrate this especially well ([diagnosing-bugs](https://github.com/mattpocock/skills/blob/main/skills/engineering/diagnosing-bugs/SKILL.md), [tdd](https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/SKILL.md)).

### 5. Keep orchestrators thin and disciplines reusable

Some skills are intentionally tiny. `grill-me` delegates to the reusable `grilling` discipline; `implement` composes TDD, verification, review, and commit steps. `ask-matt` is a router that helps a person choose a flow without memorizing the whole catalog ([ask-matt](https://github.com/mattpocock/skills/blob/main/skills/engineering/ask-matt/SKILL.md)).

This avoids duplicating the same loop across many commands. It also makes the dependency graph itself meaningful: the collection is an application architecture for agent behavior.

### 6. Use progressive disclosure

Matt keeps the main `SKILL.md` focused and moves branch-specific detail into linked files when the branches produce materially different work. For example, `prototype` decides whether the unknown is logic/state or UI, then follows `LOGIC.md` or `UI.md` ([prototype](https://github.com/mattpocock/skills/tree/main/skills/engineering/prototype)).

The same separation exists between agent instructions and human documentation. The repo's documentation guide says a public docs page should orient a human rather than duplicate `SKILL.md`; it should surface the leading word, defining constraint, and observable success condition ([writing docs](https://github.com/mattpocock/skills/blob/main/.agents/writing-docs.md)). This is almost exactly the transformation skillZs needs for its current full-text manuals.

### 7. Maintain a domain language around the suite

The root `CONTEXT.md` defines shared terms, relationships, and words to avoid. That reduces ambiguity and keeps skills consistent across sessions ([repository context](https://github.com/mattpocock/skills/blob/main/CONTEXT.md)).

For a creator page, these recurring terms can become a **taste fingerprint**: the small set of concepts that explain how this creator thinks about agent work.

### 8. Prune aggressively

The repository's writing reference warns against no-op prose, duplicated instructions, stale sediment, and unnecessary branching. The latest skill provides a concrete example: `to-questionnaire` was added on July 14 and revised three minutes later to remove no-op justification and template the output structure ([initial commit](https://github.com/mattpocock/skills/commit/bbce2f91d6d83d0b7a731808ac13eca2c2a0023c), [pruning commit](https://github.com/mattpocock/skills/commit/7f68c06dcb1a840950cb28fc634b79da6c65e94d)).

That change is useful product data. A normal directory only shows the current text. skillZs can show the design process: **what changed and why the behavior is now sharper**.

### 9. Package for multiple agent harnesses

Skills now include Codex-facing `agents/openai.yaml` display metadata, while user-invoked skills set `policy.allow_implicit_invocation: false`. Claude-specific invocation metadata remains in `SKILL.md`. The repo documents the cross-harness mapping ([invocation rules](https://github.com/mattpocock/skills/blob/main/.agents/invocation.md), [metadata example](https://github.com/mattpocock/skills/blob/main/skills/in-progress/to-questionnaire/agents/openai.yaml)).

skillZs should therefore parse a **capability profile per harness**, not assume one universal invocation behavior.

### 10. Separate repository state from released state

The latest public release is `v1.1.0`, dated July 8, 2026, while `main` has newer work and its plugin manifest reports `1.2.0` ([v1.1.0 release](https://github.com/mattpocock/skills/releases/tag/v1.1.0), [plugin manifest](https://github.com/mattpocock/skills/blob/main/.claude-plugin/plugin.json)). Releases are automated through Changesets on pushes to `main` ([release workflow](https://github.com/mattpocock/skills/blob/main/.github/workflows/release.yml)).

A trustworthy catalog must label these states separately:

- latest commit on `main`;
- latest promoted skill;
- latest released version;
- installed/copyable snapshot.

## Latest work worth tracking

As of this research snapshot, the newest skill on `main` is **`to-questionnaire`**, and it remains in `in-progress`. It turns a decision the user cannot answer alone into a structured questionnaire for the person who holds the missing knowledge. It interviews the sender only about the recipient and the needed outcome, then writes a concrete Markdown artifact ([skill source](https://github.com/mattpocock/skills/blob/main/skills/in-progress/to-questionnaire/SKILL.md)).

Recent additions and their jobs:

| Added | Skill | Lifecycle | What it does |
| --- | --- | --- | --- |
| Jul 14 | `to-questionnaire` | In progress | Creates an async questionnaire that closes a named knowledge gap. |
| Jul 10 | `setup-ts-deep-modules` | In progress | Adds dependency rules that enforce TypeScript package entry points as deep-module boundaries. |
| Jul 2 | `claude-handoff` | In progress | Starts a named background Claude agent with a compact, redacted handoff. |
| Jul 1 | `research` | Promoted | Delegates primary-source research and saves one cited Markdown artifact. |
| Jun 29 | `prototype` | Promoted | Builds disposable logic or UI code to answer one design question. |
| Jun 17 | `ask-matt` | Promoted | Routes a user to the right skill or multi-skill flow. |
| Jun 17 | `writing-great-skills` | Promoted | Defines the vocabulary and constraints for predictable skill design. |

Dates above come from the Git history at the time of research. A live product should compute them from commits rather than hard-code them ([commit history](https://github.com/mattpocock/skills/commits/main/)).

## How skillZs should track Matt's skills

### Canonical ingestion loop

Use GitHub as the source of truth and treat each repository update as an event.

1. Receive a GitHub `push` webhook for fast updates.
2. Run a scheduled reconciliation to recover missed webhooks.
3. Compare the new `main` SHA with the last ingested SHA.
4. Fetch the recursive tree and identify `skills/**/SKILL.md` plus sibling references, scripts, assets, and `agents/openai.yaml`.
5. Hash each complete skill bundle, not only `SKILL.md`.
6. Classify changes as added, edited, renamed/moved, promoted, deprecated, or deleted.
7. Parse deterministic fields first; run AI summarization only for changed bundles.
8. Link every generated explanation to the exact source SHA used.

This keeps the inexpensive path deterministic. AI work happens only after a hash changes, and its output is cached by content hash.

### Lifecycle mapping

| Repository location or signal | skillZs state |
| --- | --- |
| `skills/engineering/**`, `skills/productivity/**` | Promoted |
| `skills/in-progress/**` | Lab |
| `skills/misc/**`, `skills/personal/**` | Niche/personal |
| `skills/deprecated/**` | Retired |
| Git tag / GitHub release | Released |
| Unreleased commits after latest tag | Ahead of release |

### Minimum data model

```ts
type TrackedSkill = {
  sourceRepo: string;
  sourcePath: string;
  sourceSha: string;
  bundleHash: string;
  name: string;
  description: string;
  lifecycle: "promoted" | "lab" | "niche" | "retired";
  invocation: "user" | "model" | "mixed";
  harnesses: Array<"claude" | "codex" | "agent-skills">;
  firstSeenAt: string;
  lastChangedAt: string;
  lastChangedSha: string;
  releasedIn: string | null;
  relatedSkills: string[];
  artifactPaths: string[];
};
```

Store change records separately so the site can generate creator and skill activity feeds without rewriting the current skill row.

### What the summarizer should produce

Do not ask an LLM for an unstructured paragraph. Generate a versioned **Skill Passport** with a fixed schema:

- **Job:** one sentence describing the outcome.
- **Failure mode:** what is going wrong before this skill is useful.
- **Trigger:** realistic prompts and objects that should activate it.
- **Invocation:** user, model, or both; show harness differences.
- **Core loop:** 3-6 visual stages only when order matters.
- **Leading idea:** the memorable concept or phrase.
- **Stop condition:** observable evidence that it is finished.
- **Output:** file, patch, report, decision, or state transition.
- **Prerequisites:** tools, project files, credentials, or other skills.
- **Relationships:** explicit calls to or mentions of other skills.
- **Source:** repository, path, SHA, release, license, and author.

Every field should carry one of three provenance states: **parsed**, **author-stated**, or **skillZs inference**.

## The skillZs experience to build

### Product thesis: Observatory + Test Bench

The page should follow one coherent journey:

1. **Discover** through problems, creators, flows, and recent changes.
2. **Understand** through the Skill Passport.
3. **Inspect** through source anatomy and a raw/manual tab.
4. **Try** through copy-prompt and installation actions.
5. **Watch** through a version-pinned terminal proof.
6. **Trust** through provenance, lifecycle, audits, and creator credit.

### 1. Creator Channel

Matt's creator page should retain his portrait and credit while removing decorative world-building. It can show:

- verified GitHub identity and repository;
- promoted skills versus lab skills;
- latest release and latest commit;
- an activity timeline: Added, Changed, Promoted, Deprecated;
- his "taste fingerprint": tight loops, seams, tracer bullets, deep modules, explicit completion criteria;
- the main idea-to-ship flow as a connected map.

This turns a static author page into a subscription-worthy channel.

### 2. Failure-Mode Discovery

Add a search mode that begins with "What is going wrong?"

- "The agent misunderstood me"
- "I cannot reproduce the bug"
- "The code works but the architecture is getting worse"
- "I need someone else to answer this decision"
- "I have an idea but do not know what to build"

Map each answer to one skill or a short flow. This follows the way Matt explains the suite and is more useful than tags such as `coding` or `productivity` alone.

### 3. Skill Passport instead of a wall of Markdown

The current catalog page renders the entire parsed body under "What does this agent skill do?" Keep the raw manual available, but lead with visual, structured information:

- a one-line job;
- a before/after statement;
- a horizontal workflow strip;
- a stop-condition card;
- an invocation badge;
- expected artifacts;
- related-skill nodes;
- source and version evidence.

Use tabs such as **Overview**, **Proof run**, **Anatomy**, **Manual**, and **Changes**. This respects Matt's separation between human docs and runtime instructions.

### 4. Terminal Proof, not decorative animation

For the always-visible top 10, create a curated, deterministic terminal proof for the exact ingested version. Store the preview as small JSON frames:

```ts
type ProofFrame = {
  atMs: number;
  actor: "user" | "agent" | "tool" | "artifact";
  text: string;
  evidenceUrl?: string;
};
```

The transcript should show:

1. the user's concrete scenario;
2. the skill being selected;
3. the critical loop or decisions;
4. the artifact or evidence produced;
5. the stop condition being satisfied.

Label previews honestly:

- **Source-derived preview:** generated from instructions; not executed.
- **Curated proof run:** a human-reviewed recorded scenario.
- **Verified run:** executed against a fixture with retained evidence.

That trust ladder prevents a polished animation from being mistaken for proof.

For the rest of the catalog, derive a static transcript from parsed steps and stop conditions. No generated image is required. This keeps storage and generation costs low while reserving higher-quality proof runs for the top 10.

### 5. Copy Lab

One "copy" action is too ambiguous. Offer three explicit modes:

- **Copy test prompt:** a realistic scenario that lets the user observe the skill's signature behavior.
- **Copy install command:** tailored to Claude, Codex, or the open Agent Skills installer.
- **Copy source:** the raw `SKILL.md` or whole bundle, with repository and SHA attribution.

The test prompt should name the expected evidence, not merely say "use this skill." Example:

```text
Use the diagnosing-bugs skill on this failing signup flow. Before proposing a fix,
give me one deterministic reproduction command, reduce the case, list 3-5 falsifiable
hypotheses, instrument the leading hypothesis, and finish with a regression test at
the public seam. Show the evidence produced at each stage.
```

### 6. Anatomy Map

Visualize `SKILL.md` at the center with nearby references, scripts, assets, harness metadata, and related skill calls. This makes progressive disclosure visible and helps users answer "what am I installing?"

### 7. Diff Lens

For every changed skill, show:

- the source diff;
- a short "behavior impact" explanation;
- whether the change affects invocation, steps, stop conditions, dependencies, or only docs;
- old and new terminal proof side by side when behavior changed.

Matt's immediate refinement of `to-questionnaire` is a perfect first showcase.

### 8. Flow Graph

Extract explicit skill references and display common flows, for example:

```text
grill-with-docs -> prototype? -> to-spec -> to-tickets -> implement
                                                     -> tdd -> code-review
```

This is a more faithful representation of the repo than treating every skill as an independent product.

### 9. Watch and follow

Let users follow a creator, repository, skill, or flow. Delivery can begin with RSS and a web activity feed before adding email. Useful event types are:

- new lab skill;
- promoted skill;
- new release;
- invocation behavior changed;
- stop condition changed;
- skill deprecated.

## Mapping to the current skillZs codebase

The site already has several foundations:

- `lib/skills-sh.ts` retrieves the catalog, skill files, install counts, and audits.
- `app/skills/[...id]/page.tsx` parses `SKILL.md`, renders source/install data, audits, and the full manual.
- `lib/skill-md.ts` and `lib/skill-demo.ts` already derive terminal scenarios from examples, steps, and category fallbacks.
- creator attribution and creator pages already exist.
- the loop library already demonstrates copyable prompts and terminal-style previews.

The next move is not to create another disconnected page. Deepen the existing detail route:

1. Extend parsing into the fixed Skill Passport schema.
2. Add source SHA, lifecycle, release, and invocation metadata.
3. Replace the manual-first layout with Overview / Proof run / Anatomy / Manual / Changes.
4. Reuse the existing demo frame system, but add provenance and proof labels.
5. Add Copy Lab actions beside the current install command.
6. Add repository change records and a creator activity feed.

## Recommended build order

### Phase 1: Make one creator exemplary

Use `mattpocock/skills` as the reference implementation.

- ingest all lifecycle buckets and exact SHAs;
- build Matt's Creator Channel;
- generate Skill Passports for the 22 promoted skills and visible Lab entries;
- build one complete flow graph;
- curate proof runs for the top 10 only;
- add source-derived previews for the remainder.

Success condition: a user can explain what a skill does, when it activates, what it produces, and whether it is released without reading raw Markdown.

### Phase 2: Add observability

- webhook plus scheduled reconciliation;
- change records and Diff Lens;
- creator/repository activity feeds;
- RSS follows;
- version-pinned pages and previews.

Success condition: a Matt repo change appears on skillZs with the correct lifecycle and source SHA without manual entry.

### Phase 3: Add trust and comparison

- verified proof-run fixtures;
- cross-harness install and invocation profiles;
- compare versions and compare related skills;
- community reports tied to exact versions;
- security and permission changes highlighted in diffs.

Success condition: users can distinguish source claims, skillZs inferences, synthetic previews, and executed evidence.

## What not to do

- Do not generate an image per skill. It adds cost without explaining behavior.
- Do not hide lifecycle differences behind one "new" badge.
- Do not present a generated terminal transcript as an executed run.
- Do not summarize every skill into generic prose; preserve its leading idea and stop condition.
- Do not overwrite the creator's language without marking skillZs inference.
- Do not poll and re-summarize unchanged files; hash first.
- Do not make install count the only definition of "top." For the terminal top 10, combine adoption with freshness, proof quality, and editorial usefulness.

## Proposed top-10 ranking rule

Use a transparent composite rather than raw installs alone:

```text
score = 0.45 adoption
      + 0.20 recent growth
      + 0.15 proof quality
      + 0.10 source freshness
      + 0.10 editorial usefulness
```

Expose the reason for each rank. Freeze the top 10 for a daily window so the homepage does not reorder on every request, and keep every terminal proof pinned to the ranked skill's source SHA.

## Final recommendation

Build the Matt Pocock page as the first **living creator dossier**, not a repository mirror. Its signature experience should be:

> A user lands on a failure mode, discovers the right skill or flow, understands its process through a Skill Passport, watches a version-pinned terminal proof, copies a realistic test prompt, inspects the source anatomy, and follows future changes from the credited creator.

That experience is useful even when there are one million skills, because most pages can be produced deterministically from source structure and cached summaries. Human curation is concentrated where it creates leverage: the top 10 proof runs, creator narratives, and behavior-changing diffs.
