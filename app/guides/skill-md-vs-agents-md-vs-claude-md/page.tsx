import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MotionLink } from "@/components/motion/motion-link";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

const path = "/guides/skill-md-vs-agents-md-vs-claude-md";
const title = "SKILL.md vs AGENTS.md vs CLAUDE.md";
const description =
  "Compare SKILL.md, AGENTS.md, and CLAUDE.md by purpose, scope, loading behavior, portability, and examples so every instruction lives in the right file.";
const published = "2026-07-15";

const faqs = [
  {
    question: "Should a workflow go in AGENTS.md or SKILL.md?",
    answer:
      "Put repository-wide expectations that should guide most work in AGENTS.md. Put a focused, reusable procedure in its own SKILL.md so a compatible agent can discover and load it only for matching tasks.",
  },
  {
    question: "Should a Claude Code workflow go in CLAUDE.md or SKILL.md?",
    answer:
      "Keep concise facts, commands, conventions, and always-applicable rules in CLAUDE.md. Move multi-step procedures and task-specific reference material into a skill. Claude Code's documentation explicitly recommends this split.",
  },
  {
    question: "Is AGENT.md the same as AGENTS.md?",
    answer:
      "No. The cross-agent repository instruction file is AGENTS.md, plural. Some products use other similarly named files; for example, VS Code custom agents use files ending in .agent.md to define selectable agent personas with tools and instructions.",
  },
  {
    question: "Is the Agent Skills file named SKILL.md or SKILLS.md?",
    answer:
      "The open Agent Skills specification requires one uppercase SKILL.md file, singular, at the root of each skill folder. SKILLS.md is not the standard filename.",
  },
];

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path,
  type: "article",
});

export default function SkillMdVsInstructionFilesGuide() {
  const article = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": absoluteUrl(`${path}#article`),
    headline: title,
    description,
    url: absoluteUrl(path),
    datePublished: published,
    dateModified: published,
    author: { "@id": absoluteUrl("/#organization") },
    publisher: { "@id": absoluteUrl("/#organization") },
    mainEntityOfPage: absoluteUrl(path),
    proficiencyLevel: "Beginner",
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <article className="mx-auto max-w-5xl pt-8">
      <JsonLd data={[
        article,
        faq,
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "SKILL.md vs AGENTS.md vs CLAUDE.md", path },
        ]),
      ]} />

      <nav aria-label="Breadcrumb" className="type-font mb-6 text-xs text-[var(--color-rust)]">
        <ol className="flex flex-wrap gap-2">
          <li><MotionLink href="/" className="hover:text-[var(--color-grape)]">skillZs</MotionLink></li>
          <li aria-hidden>/</li>
          <li><MotionLink href="/guides" className="hover:text-[var(--color-grape)]">guides</MotionLink></li>
          <li aria-hidden>/</li>
          <li aria-current="page">instruction files compared</li>
        </ol>
      </nav>

      <header className="border-b border-[#29313a] pb-10">
        <div className="tag-font mb-5 text-xs uppercase tracking-[0.16em] text-[var(--color-grape)]">
          comparison / agent instruction files
        </div>
        <h1 className="display max-w-5xl text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          SKILL.md vs<br /><span className="text-[var(--color-grape)]">AGENTS.md.</span>
        </h1>
        <p className="type-font mt-8 max-w-3xl text-base leading-7 text-[var(--color-ink-soft)]">
          Use <code>AGENTS.md</code> for repository guidance that should shape most coding work, <code>CLAUDE.md</code> for persistent Claude Code context, and <code>SKILL.md</code> for a focused workflow loaded only when relevant. They can coexist: the instruction files orient the agent, while skills provide deeper procedures without putting every manual into every task.
        </p>
      </header>

      <div className="prose-zine type-font mt-10 max-w-none leading-relaxed">
        <section>
          <h2>What is the difference between SKILL.md, AGENTS.md, and CLAUDE.md?</h2>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>File</th><th>Best for</th><th>Typical loading</th><th>Portability</th></tr>
              </thead>
              <tbody>
                <tr><td><strong>SKILL.md</strong></td><td>One reusable procedure with optional scripts, references, and assets</td><td>Metadata at discovery; full workflow when invoked or matched</td><td>Open Agent Skills format across compatible clients</td></tr>
                <tr><td><strong>AGENTS.md</strong></td><td>Repository setup, commands, conventions, and standing expectations</td><td>Read before work; nested files can refine local guidance</td><td>Open repository-instruction format across many coding agents</td></tr>
                <tr><td><strong>CLAUDE.md</strong></td><td>Persistent project, user, or organization context for Claude Code</td><td>Loaded into Claude Code sessions within its documented scope</td><td>Claude-specific, although some other clients support it for compatibility</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            The practical test is frequency. If an instruction should influence nearly every task in a repository, it belongs in the repository guidance layer. If it describes how to perform one class of task, make it a skill. Start with <MotionLink href="/guides/what-are-agent-skills">what Agent Skills are</MotionLink> if the format is new to you.
          </p>
        </section>

        <section>
          <h2>When should you use SKILL.md?</h2>
          <p>
            Use <code>SKILL.md</code> for a repeatable job with a recognizable trigger and an observable result: code review, incident triage, release preparation, spreadsheet analysis, or a research brief. The portable specification requires YAML frontmatter with a matching name and a description that says what the skill does and when to use it.
          </p>
          <pre><code>{`review-api-change/
├── SKILL.md
├── references/
│   └── compatibility-policy.md
└── scripts/
    └── check-schema.ts`}</code></pre>
          <p>
            The agent initially sees lightweight routing metadata. It loads the full procedure and supporting files when the task calls for them. That progressive loading makes skills a better home for detailed workflows than an instruction file included with unrelated work. Use the <MotionLink href="/guides/how-to-create-agent-skills">Agent Skill creation guide</MotionLink> for a valid example and trigger tests.
          </p>
        </section>

        <section>
          <h2>When should you use AGENTS.md?</h2>
          <p>
            Use <code>AGENTS.md</code> as a repository&apos;s operating manual for coding agents. Good content includes the project layout, setup and test commands, code conventions, security constraints, pull-request expectations, and non-obvious facts an agent needs before changing the codebase. It is plain Markdown with no required frontmatter.
          </p>
          <pre><code>{`# AGENTS.md

## Build and test
- Install with npm ci.
- Run npm test after TypeScript changes.

## Repository rules
- Keep public API changes backward compatible.
- Never commit generated credentials.`}</code></pre>
          <p>
            The <a href="https://agents.md/" target="_blank" rel="noreferrer">AGENTS.md open format</a> describes it as a README for agents. Client behavior still matters: <a href="https://developers.openai.com/codex/guides/agents-md" target="_blank" rel="noreferrer">Codex</a> builds a global-to-local instruction chain, while <a href="https://code.visualstudio.com/docs/agent-customization/custom-instructions" target="_blank" rel="noreferrer">VS Code</a> supports root and optionally nested files. Verify the client before relying on precedence or overrides.
          </p>
        </section>

        <section>
          <h2>When should you use CLAUDE.md?</h2>
          <p>
            Use <code>CLAUDE.md</code> for concise context Claude Code should carry across sessions: build commands, architecture, terminology, coding standards, and rules that usually apply. Claude Code supports managed, user, project, and local scopes and can organize path-specific guidance under <code>.claude/rules/</code>.
          </p>
          <p>
            Anthropic&apos;s <a href="https://code.claude.com/docs/en/memory" target="_blank" rel="noreferrer">Claude Code memory documentation</a> says multi-step procedures or guidance relevant to only one part of a codebase should move to a skill or path-scoped rule. Its <a href="https://code.claude.com/docs/en/skills" target="_blank" rel="noreferrer">skills documentation</a> adds the key reason: unlike <code>CLAUDE.md</code>, a skill body loads only when used.
          </p>
        </section>

        <section>
          <h2>Can AGENTS.md and CLAUDE.md share the same instructions?</h2>
          <p>
            Yes, but avoid maintaining two drifting copies. Claude Code does not natively treat <code>AGENTS.md</code> as its project memory file; its official documentation recommends importing an existing <code>AGENTS.md</code> from <code>CLAUDE.md</code>, then adding only Claude-specific guidance below the import.
          </p>
          <pre><code>{`@AGENTS.md

## Claude Code
- Use plan mode for changes under src/billing/.`}</code></pre>
          <p>
            This keeps shared repository rules in one source while preserving client-specific additions. Cross-client behavior changes, so test what each agent actually loads instead of assuming all tools interpret every filename.
          </p>
        </section>

        <section>
          <h2>Where should common instructions go?</h2>
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Instruction</th><th>Best home</th><th>Why</th></tr></thead>
              <tbody>
                <tr><td>Install, build, lint, and test commands</td><td><code>AGENTS.md</code> or <code>CLAUDE.md</code></td><td>Needed across many repository tasks</td></tr>
                <tr><td>Architecture and naming conventions</td><td><code>AGENTS.md</code> or <code>CLAUDE.md</code></td><td>Standing project context</td></tr>
                <tr><td>Step-by-step release workflow</td><td><code>SKILL.md</code></td><td>Task-specific procedure with a finish condition</td></tr>
                <tr><td>Detailed API or policy reference</td><td>Skill <code>references/</code></td><td>Loaded only when that workflow needs it</td></tr>
                <tr><td>Deterministic validation command</td><td>Skill <code>scripts/</code> or repository script</td><td>Executable behavior stays inspectable and testable</td></tr>
                <tr><td>Hard security enforcement</td><td>Permissions, sandbox, hooks, or CI</td><td>Prompt instructions are guidance, not an enforcement boundary</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Do not duplicate a procedure across all three files. Keep the durable fact or rule in the persistent layer, link to one canonical skill for the workflow, and enforce non-negotiable controls in code or platform settings. The <MotionLink href="/guides/agent-skill-security">Agent Skill security checklist</MotionLink> explains the trust boundary.
          </p>
        </section>

        <section>
          <h2>How do you verify which file an agent loaded?</h2>
          <ul>
            <li><strong>Codex:</strong> ask it to summarize active instructions from the target directory and inspect documented session logs when needed.</li>
            <li><strong>Claude Code:</strong> use <code>/memory</code> to see loaded <code>CLAUDE.md</code>, local, and rules files; test a skill with both matching and non-matching prompts.</li>
            <li><strong>VS Code:</strong> use the chat customization diagnostics view to inspect instruction sources and errors.</li>
            <li><strong>Any client:</strong> test from the actual working directory because scope and nested-file behavior depend on location.</li>
          </ul>
          <p>
            For skills, verify both routing and output: confirm the description activates on relevant requests, stays silent on nearby unrelated requests, and produces the promised artifact. The <MotionLink href="/guides/how-to-install-agent-skills">installation guide</MotionLink> covers activation checks, updates, and removal.
          </p>
        </section>

        <section id="faq">
          <h2>What do developers ask about agent instruction files?</h2>
          {faqs.map((item) => (
            <div key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </div>
          ))}
        </section>

        <section id="sources">
          <h2>Which primary sources define these files?</h2>
          <p>
            This comparison was checked against the <a href="https://agentskills.io/specification" target="_blank" rel="noreferrer">Agent Skills specification</a>, the <a href="https://agents.md/" target="_blank" rel="noreferrer">AGENTS.md open format</a>, and current instruction and skills documentation from <a href="https://developers.openai.com/codex/guides/agents-md" target="_blank" rel="noreferrer">OpenAI Codex</a>, <a href="https://code.claude.com/docs/en/memory" target="_blank" rel="noreferrer">Claude Code</a>, and <a href="https://code.visualstudio.com/docs/agent-customization/custom-instructions" target="_blank" rel="noreferrer">VS Code</a>. File discovery and precedence vary by client and version.
          </p>
          <p>
            Continue with the <MotionLink href="/guides/agent-skills-vs-mcp">Agent Skills versus MCP comparison</MotionLink>, <MotionLink href="/guides/agent-skills-directories">directory guide</MotionLink>, or <MotionLink href="/browse">browse real Agent Skills</MotionLink> and inspect their source manuals.
          </p>
        </section>
      </div>
    </article>
  );
}
