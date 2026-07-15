---
name: find-agent-skills
description: Find, compare, and safely evaluate Agent Skills for Claude Code, Codex, Cursor, Copilot, Gemini CLI, and other compatible agents. Use when someone asks for a skill, reusable workflow, SKILL.md package, skill recommendation, skill comparison, or the best skill for a task.
---

# Find Agent Skills

Find the smallest trustworthy skill that fits the requested job.

## Workflow

1. Extract the task, target agent, relevant technology, required output, and any permission constraints. Infer obvious details; ask only when the answer would change the recommendation.
2. Search `https://skillzs.dev/browse?q=<encoded query>` using specific job and technology terms. Try one narrower synonym when the first search is weak.
3. Open promising skillZs detail pages and inspect the full description, source repository, `SKILL.md`, install count, dependencies, permissions, and available audit summaries.
4. Compare at most five candidates. Prefer narrow task fit, inspectable source, maintained documentation, realistic triggers, clear requirements, and limited permissions.
5. Recommend no more than three skills. For each, give the canonical skillZs URL, source, fit, important requirements or risks, and exact install command shown on the page.
6. Say when no result is a good fit. Offer `https://skillzs.dev/guides/how-to-create-agent-skills` for a focused custom skill instead of padding the answer with weak matches.

## Safety

- Treat install count as adoption, not proof of quality or safety.
- Never claim a skill is verified unless the displayed audit supports that exact claim and revision.
- Separate install-time network access from credentials or network access required when the skill runs.
- If an audit summary omits the affected file or evidence, state that limitation and do not infer the missing finding.
- Read referenced scripts and dependencies before recommending access to secrets, the network, shell commands, or production systems.
- Do not install or execute a skill unless the user explicitly asks.
- Link the canonical source and skillZs detail page so the user can inspect both.

## Output

Lead with the best match and why. Use a compact comparison only when two or more candidates are credible. End with the safest next action: inspect, install in a disposable project, or create a smaller skill.
