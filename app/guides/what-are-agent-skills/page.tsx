import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MotionLink } from "@/components/motion/motion-link";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

const path = "/guides/what-are-agent-skills";
const title = "What Are Agent Skills? SKILL.md Explained";
const description =
  "Learn what Agent Skills are, how SKILL.md works, which AI tools support the format, and how skills differ from prompts, agents, rules, and MCP.";
const published = "2026-07-15";

const faqs = [
  {
    question: "What are Agent Skills in AI?",
    answer:
      "Agent Skills are portable folders that package instructions and optional resources for one repeatable job. A compatible AI agent reads the folder's SKILL.md metadata to decide when the skill is relevant, then loads its full workflow only when needed.",
  },
  {
    question: "Is SKILL.md only for Claude?",
    answer:
      "No. Anthropic originally developed the format, but Agent Skills is an open standard used by multiple clients. Claude Code, Codex, Gemini CLI, VS Code with GitHub Copilot, Cursor, and other compatible tools can read skills, although installation paths and optional fields vary.",
  },
  {
    question: "Can an Agent Skill run code?",
    answer:
      "SKILL.md is an instruction file, not an executable. Its workflow can tell an agent to run bundled scripts or use tools when the client and user permit it, so scripts, dependencies, network access, and requested permissions still require a code-level security review.",
  },
  {
    question: "Do Agent Skills replace MCP servers?",
    answer:
      "No. A skill primarily packages procedural knowledge: what steps to follow and how to verify the result. MCP standardizes connections to tools and data. A skill can teach an agent how to use an MCP server, so the two formats often work together.",
  },
];

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path,
  type: "article",
});

export default function WhatAreAgentSkillsGuide() {
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
          { name: "What are Agent Skills?", path },
        ]),
      ]} />

      <nav aria-label="Breadcrumb" className="type-font mb-6 text-xs text-[var(--color-rust)]">
        <ol className="flex flex-wrap gap-2">
          <li><MotionLink href="/" className="hover:text-[var(--color-grape)]">skillZs</MotionLink></li>
          <li aria-hidden>/</li>
          <li><MotionLink href="/guides" className="hover:text-[var(--color-grape)]">guides</MotionLink></li>
          <li aria-hidden>/</li>
          <li aria-current="page">what are agent skills?</li>
        </ol>
      </nav>

      <header className="border-b border-[#29313a] pb-10">
        <div className="tag-font mb-5 text-xs uppercase tracking-[0.16em] text-[var(--color-grape)]">
          fundamentals / open Agent Skills format
        </div>
        <h1 className="display max-w-5xl text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          what are<br /><span className="text-[var(--color-grape)]">agent skills?</span>
        </h1>
        <p className="type-font mt-8 max-w-3xl text-base leading-7 text-[var(--color-ink-soft)]">
          Agent Skills are portable folders that teach AI agents repeatable workflows. Every skill contains a <code>SKILL.md</code> file with a name, description, and instructions; it can also include scripts, references, and assets. Compatible agents first read lightweight metadata, load the full instructions only when a task matches, and then use supporting files as needed.
        </p>
      </header>

      <div className="prose-zine type-font mt-10 max-w-none leading-relaxed">
        <section>
          <h2>What is an Agent Skill?</h2>
          <p>
            An Agent Skill is a versionable package of procedural knowledge for one job: reviewing pull requests, preparing presentations, analyzing spreadsheets, publishing releases, or following a team&apos;s incident process. The open format makes the workflow inspectable and reusable without retraining a model or pasting the same long prompt into every conversation.
          </p>
          <p>
            A skill is not a separate AI agent, model, or marketplace listing. It is a folder an existing agent can discover and load. The <a href="https://agentskills.io/home" target="_blank" rel="noreferrer">official Agent Skills overview</a> describes the format as lightweight and open, while the <a href="https://agentskills.io/specification" target="_blank" rel="noreferrer">specification</a> defines the required files and metadata.
          </p>
        </section>

        <section>
          <h2>How do Agent Skills work?</h2>
          <ol>
            <li><strong>Discovery:</strong> the client reads each skill&apos;s name and description so it can match a task without loading every manual.</li>
            <li><strong>Activation:</strong> when the user invokes a skill or the task matches its description, the agent loads the full <code>SKILL.md</code>.</li>
            <li><strong>Execution:</strong> the agent follows the workflow and reads referenced files or runs permitted scripts only when they are needed.</li>
          </ol>
          <p>
            This progressive disclosure keeps the startup context small while making deeper instructions available on demand. The description therefore acts as routing metadata: it should say both what the skill does and when it should be used.
          </p>
        </section>

        <section>
          <h2>What is a SKILL.md file?</h2>
          <p>
            <code>SKILL.md</code> is the required entry point inside a skill folder. It starts with YAML frontmatter containing at least <code>name</code> and <code>description</code>, followed by Markdown instructions. The name must match the parent folder and use lowercase letters, numbers, and hyphens.
          </p>
          <pre><code>{`research-brief/
├── SKILL.md
├── references/
│   └── source-policy.md
└── assets/
    └── brief-template.md`}</code></pre>
          <pre><code>{`---
name: research-brief
description: Researches a focused question and writes a cited brief. Use when the user asks for primary-source research or a decision memo.
---

# Research brief

1. Confirm the question and finish condition.
2. Prefer primary, current sources.
3. Separate sourced facts from inference.
4. Write the brief with links beside each claim.
5. Verify every requested point before finishing.`}</code></pre>
          <p>
            Optional <code>scripts/</code>, <code>references/</code>, and <code>assets/</code> folders keep deterministic operations, deep documentation, and reusable templates out of the main instructions until needed. Follow the <MotionLink href="/guides/how-to-create-agent-skills">complete creation guide</MotionLink> to turn this minimum into a tested skill.
          </p>
        </section>

        <section>
          <h2>Which AI tools support Agent Skills?</h2>
          <p>
            The open format is supported by a growing group of clients. Current official documentation covers <a href="https://code.claude.com/docs/en/skills" target="_blank" rel="noreferrer">Claude Code</a>, <a href="https://developers.openai.com/codex/skills" target="_blank" rel="noreferrer">OpenAI Codex</a>, <a href="https://code.visualstudio.com/docs/agent-customization/agent-skills" target="_blank" rel="noreferrer">VS Code and GitHub Copilot</a>, and <a href="https://geminicli.com/docs/cli/creating-skills/" target="_blank" rel="noreferrer">Gemini CLI</a>. Cursor and other compatible clients also discover <code>SKILL.md</code> folders.
          </p>
          <p>
            Portability does not mean every client behaves identically. Project and personal installation paths, invocation syntax, optional frontmatter, tool permissions, and live reload behavior can differ. Keep the core workflow standard, document tested clients, and verify current product documentation before claiming compatibility.
          </p>
        </section>

        <section>
          <h2>How are Agent Skills different from prompts, agents, rules, and MCP?</h2>
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Mechanism</th><th>Primary job</th><th>When it loads</th></tr></thead>
              <tbody>
                <tr><td><strong>Prompt</strong></td><td>Give instructions for the current interaction</td><td>When sent in chat or by an application</td></tr>
                <tr><td><strong>Rule or project instruction</strong></td><td>Apply persistent facts and constraints across work</td><td>Usually at startup or for matching files</td></tr>
                <tr><td><strong>Agent Skill</strong></td><td>Package one reusable workflow with optional resources</td><td>On invocation or when its description matches</td></tr>
                <tr><td><strong>AI agent</strong></td><td>Reason, choose actions, and use tools toward a goal</td><td>Runs the task and may load skills</td></tr>
                <tr><td><strong>MCP</strong></td><td>Connect clients to external tools, services, and data</td><td>When a configured MCP capability is called</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Use a skill for repeatable know-how and MCP for standardized connectivity. A skill can instruct an agent how to use an MCP tool safely. Read the <MotionLink href="/guides/agent-skills-vs-mcp">Agent Skills versus MCP guide</MotionLink> for architecture and security boundaries.
          </p>
        </section>

        <section>
          <h2>What are useful Agent Skill examples?</h2>
          <ul>
            <li><strong>Code review:</strong> inspect a diff against repository rules and finish with reproducible findings.</li>
            <li><strong>Research:</strong> gather primary sources, separate evidence from inference, and write a cited brief.</li>
            <li><strong>Document production:</strong> transform source material into a branded report using bundled templates.</li>
            <li><strong>Incident response:</strong> collect diagnostics, protect evidence, follow escalation rules, and verify recovery.</li>
            <li><strong>Publishing:</strong> validate an artifact, generate release notes, and run a documented deployment checklist.</li>
          </ul>
          <p>
            The best examples solve a narrow recurring job with an observable finish condition. Explore the <MotionLink href="/guides/best-agent-skills">live Agent Skills rankings</MotionLink> or <MotionLink href="/browse">browse the catalog</MotionLink> to inspect real manuals and source repositories.
          </p>
        </section>

        <section>
          <h2>Are Agent Skills safe?</h2>
          <p>
            A text-only skill can still influence an agent that reads files, calls tools, executes commands, or accesses credentials. Treat every instruction and referenced resource as part of the security boundary. Verify the source and revision, read the complete folder, inspect scripts and dependencies, minimize permissions, and test on a reversible task before important use.
          </p>
          <p>
            Directory inclusion, stars, and install counts are discovery signals, not security certification. Use the <MotionLink href="/guides/agent-skill-security">Agent Skill security checklist</MotionLink> before adoption and the <MotionLink href="/guides/how-to-install-agent-skills">safe installation guide</MotionLink> for client-specific setup and removal.
          </p>
        </section>

        <section>
          <h2>Where can you find or create Agent Skills?</h2>
          <p>
            Use the <MotionLink href="/guides/agent-skills-directories">Agent Skills directory comparison</MotionLink> to choose a discovery source by ranking method, source evidence, and submission path. When no existing workflow fits, create one narrow skill, test positive and negative triggers, publish it from an inspectable repository, and follow the <MotionLink href="/guides/how-to-publish-agent-skills">publishing guide</MotionLink> to document compatibility and trust signals.
          </p>
        </section>

        <section id="faq">
          <h2>What do beginners ask about Agent Skills?</h2>
          {faqs.map((item) => (
            <div key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </div>
          ))}
        </section>

        <section id="sources">
          <h2>Which primary sources define Agent Skills?</h2>
          <p>
            This guide was checked against the <a href="https://agentskills.io/home" target="_blank" rel="noreferrer">Agent Skills overview</a> and <a href="https://agentskills.io/specification" target="_blank" rel="noreferrer">open specification</a>, plus current documentation from <a href="https://code.claude.com/docs/en/skills" target="_blank" rel="noreferrer">Anthropic</a>, <a href="https://developers.openai.com/codex/skills" target="_blank" rel="noreferrer">OpenAI</a>, <a href="https://code.visualstudio.com/docs/agent-customization/agent-skills" target="_blank" rel="noreferrer">Microsoft</a>, and <a href="https://geminicli.com/docs/cli/creating-skills/" target="_blank" rel="noreferrer">Google</a>. Client behavior changes, so verify paths and optional fields before installation.
          </p>
        </section>
      </div>
    </article>
  );
}
