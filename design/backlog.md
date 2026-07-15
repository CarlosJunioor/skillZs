# Product backlog

## BL-001 — Loop Library

**Status:** Backlog  
**Goal:** Create a visual hub where users can discover reusable agent loops, understand each cycle quickly, and preview how it behaves before trying it.

### Core experience

- Add a `/loops` library with searchable, filterable loop cards.
- Give every loop a simple rounded loop icon. Use a lightweight SVG/CSS ring with a clear direction marker and a small per-loop symbol or color accent; do not generate images or build a bespoke complex animation for every entry.
- Each card should explain the loop in one sentence and show its stages, intended use, compatible tools, and stop condition.
- Add a terminal-style preview that plays a short, deterministic example of the loop progressing through its stages and beginning the next iteration.
- Let users pause, replay, and step through the preview. Respect `prefers-reduced-motion` and provide a non-animated transcript.
- Link each card to a dedicated loop page with a copyable starter prompt and the skills that use or implement that loop.

### Suggested loop record

Each loop should have: name, slug, concise summary, ordered stages, example input, terminal preview frames, output, stop condition, tags, compatible agents/tools, and related skills.

### Terminal preview rules

- Use recorded text frames rather than running an agent or model during page view.
- Make the current iteration and current stage obvious (for example, `ITERATION 02 · VERIFY`).
- Show the state changing between stages, not decorative terminal noise.
- Keep previews short enough to understand in roughly 10–15 seconds.
- End by showing either the stop condition or the transition into the next iteration.

### Acceptance criteria

- `/loops` presents a useful browse/search hub on desktop and mobile.
- Every loop has a recognizable rounded loop icon without an image-generation dependency.
- Every loop card or detail page includes a terminal-style behavioral preview.
- Previews can be paused and replayed and remain understandable with motion disabled.
- Each loop clearly states what starts it, what repeats, what changes each iteration, and what stops it.
- Users can copy a starter prompt and navigate to related skills.
- Loop pages have unique titles, descriptions, canonical URLs, and structured internal links so they can be indexed independently.

### Initial content target

Launch with 10 curated loops rather than an empty large catalog. Candidate patterns: plan–execute–verify, test–fix–retest, research–synthesize–critique, generate–evaluate–refine, observe–orient–decide–act, review–revise, tool-use/reasoning, retry with backoff, human approval, and multi-agent delegation.

### Out of scope for the first release

- Live agent execution inside previews.
- Generated artwork or one-off animated assets per loop.
- User-authored loops, ratings, or marketplace submissions.
- Automatically extracting loops from every skill before the first 10 have been validated manually.
