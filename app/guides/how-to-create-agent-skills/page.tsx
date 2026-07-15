import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MotionLink } from "@/components/motion/motion-link";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
  siteConfig,
} from "@/lib/seo";

const path = "/guides/how-to-create-agent-skills";
const title = "How to Create Agent Skills for Claude Code and Codex";
const description =
  "Learn how to create a portable Claude Code and Codex skill with a focused SKILL.md, reliable triggers, progressive disclosure, tests, and safety checks.";
const published = "2026-07-15";

const mattPrinciples = [
  {
    label: "01 / failure",
    title: "Start with what keeps going wrong",
    text: "Misalignment, weak feedback loops, and architecture decay are better starting points than a feature list.",
  },
  {
    label: "02 / invocation",
    title: "Decide who starts the skill",
    text: "User-invoked skills orchestrate deliberate flows. Model-invoked skills hold reusable disciplines the agent can select.",
  },
  {
    label: "03 / leading idea",
    title: "Give the workflow one handle",
    text: "Tight loop, seam, tracer bullet, deep module, or knowledge gap: one memorable idea keeps the behavior coherent.",
  },
  {
    label: "04 / evidence",
    title: "Finish on proof, not confidence",
    text: "A reproduction command ran, a file exists, every question is covered, or a regression test passes. Completion is observable.",
  },
];

const recentMattSkills = [
  ["to-questionnaire", "lab", "Turns missing knowledge into a questionnaire for the person who can answer it."],
  ["setup-ts-deep-modules", "lab", "Enforces TypeScript package entry points as deep-module boundaries."],
  ["research", "promoted", "Delegates primary-source research and saves one cited Markdown artifact."],
  ["prototype", "promoted", "Builds throwaway logic or UI code to answer one design question."],
] as const;

const steps = [
  {
    name: "Choose one repeatable job",
    text: "Define a narrow task with a clear input, output, and finish condition. If the workflow cannot be described in one sentence, split it before writing files.",
  },
  {
    name: "Create the skill folder",
    text: "Use a lowercase kebab-case folder name and put an uppercase SKILL.md file at its root.",
  },
  {
    name: "Write valid frontmatter",
    text: "Add a name that matches the folder and a description that says what the skill does and when an agent should load it.",
  },
  {
    name: "Write the smallest useful workflow",
    text: "State required inputs, ordered actions, the output contract, important edge cases, and a final verification step.",
  },
  {
    name: "Test activation and results",
    text: "Try prompts that should and should not trigger the skill, then run a realistic task and verify the output instead of judging the wording alone.",
  },
  {
    name: "Review and publish",
    text: "Remove secrets, review bundled scripts, add a license when sharing publicly, validate the folder, and publish it from a trustworthy source.",
  },
];

const faqs = [
  {
    question: "What is the minimum required for an agent skill?",
    answer:
      "A skill needs a folder containing an uppercase SKILL.md file. The file begins with YAML frontmatter containing a valid name and description, followed by Markdown instructions.",
  },
  {
    question: "Can one skill work in Claude Code, Codex, and Cursor?",
    answer:
      "Often, yes. The Agent Skills format is portable, but installation paths and optional frontmatter fields vary by client. Keep the core workflow standard and document client-specific requirements explicitly.",
  },
  {
    question: "How long should SKILL.md be?",
    answer:
      "Use the shortest file that fully defines the workflow. The open specification recommends keeping the main instructions under 500 lines and moving detailed references or reusable scripts into supporting folders.",
  },
  {
    question: "How do I make an agent load my skill reliably?",
    answer:
      "Write a specific description that includes the job, relevant objects or file types, and realistic trigger phrases. Test both positive prompts and nearby prompts that should not activate it.",
  },
  {
    question: "Are downloaded agent skills safe?",
    answer:
      "Treat a skill like code. Read SKILL.md, inspect scripts and tool permissions, check the source and license, and never install a skill that asks for secrets or unrelated access without a clear reason.",
  },
  {
    question: "What is a SKILL.md smell?",
    answer:
      "A skill smell is an authoring pattern that can make an Agent Skill less clear or effective, such as vague names, missing validation, rationalization loopholes, oversized instructions, or rigid command sequences that hide the actual objective.",
  },
];

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path,
  type: "article",
});

export default function CreateAgentSkillsGuide() {
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
    dependencies: "A text editor and an Agent Skills-compatible client",
  };
  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description,
    totalTime: "PT30M",
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      url: absoluteUrl(`${path}#step-${index + 1}`),
    })),
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
        howTo,
        faq,
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Create agent skills", path },
        ]),
      ]} />

      <nav aria-label="Breadcrumb" className="type-font mb-6 text-xs text-[var(--color-rust)]">
        <ol className="flex flex-wrap gap-2">
          <li><MotionLink href="/" className="hover:text-[var(--color-grape)]">skillZs</MotionLink></li>
          <li aria-hidden>/</li>
          <li><MotionLink href="/guides" className="hover:text-[var(--color-grape)]">guides</MotionLink></li>
          <li aria-hidden>/</li>
          <li aria-current="page">create an agent skill</li>
        </ol>
      </nav>

      <header className="border-b border-[#29313a] pb-10">
        <div className="tag-font mb-5 text-xs uppercase tracking-[0.16em] text-[var(--color-grape)]">
          field guide / Claude Code + Codex
        </div>
        <h1 className="display max-w-4xl text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          how to create<br /><span className="text-[var(--color-grape)]">agent skills.</span>
        </h1>
        <p className="type-font mt-8 max-w-3xl text-base leading-7 text-[var(--color-ink-soft)]">
          An agent skill is a portable folder that teaches an AI agent one repeatable workflow. Start with a focused job, add a valid <code>SKILL.md</code> with precise activation language and verifiable steps, test it on real prompts, then publish the reviewed folder from a trustworthy source. The complete process usually takes less than an hour.
        </p>
        <p className="type-font mt-4 text-xs text-[var(--color-rust)]">
          Written and checked by <MotionLink href="/about">{siteConfig.name}</MotionLink>. <time dateTime={published}>Updated July 15, 2026.</time>
        </p>
      </header>

      <div className="prose-zine type-font mt-10 max-w-none leading-relaxed">
        <section id="what-is-an-agent-skill">
          <h2>What is an agent skill?</h2>
          <p>
            Agent Skills are an open folder format for reusable instructions, scripts, references, and assets. Compatible agents first read only each skill&apos;s name and description. When a task matches, the agent loads the full instructions and any supporting files it needs. That progressive disclosure makes skills more reusable than repeatedly pasting a long prompt into a chat.
          </p>
          <p>
            A skill is best for procedural knowledge: a code-review checklist, a publishing workflow, a document template, or a repeatable research method. Use a plain prompt for one-off requests. Use MCP when the agent needs a standardized connection to an external tool or data source. A skill can instruct an agent how to use MCP, but the two are not substitutes.
          </p>
        </section>

        <section id="how-to-create">
          <h2>How do you create an agent skill?</h2>
          <ol>
            {steps.map((step, index) => (
              <li key={step.name} id={`step-${index + 1}`}>
                <strong>{step.name}.</strong> {step.text}
              </li>
            ))}
          </ol>
          <p>
            The directory is intentionally small. Do not add scripts, configuration, or references until the workflow needs them.
          </p>
          <pre><code>{`pull-request-review/
├── SKILL.md
├── scripts/       # optional
├── references/    # optional
└── assets/        # optional`}</code></pre>
        </section>

        <section id="claude-codex-guideline">
          <h2>What do Claude Code and Codex agree makes a good skill?</h2>
          <p>
            Anthropic and OpenAI use the same open folder model and converge on the same authoring discipline. Build one reusable workflow, make its trigger easy to retrieve, load detail only when needed, and verify behavior with real tasks.
          </p>
          <div className="my-7 grid gap-px border border-[#29313a] bg-[#29313a] md:grid-cols-2">
            <article className="bg-[var(--color-paper-2)] p-5">
              <div className="tag-font text-[10px] uppercase tracking-[0.16em] text-[var(--color-grape)]">shared contract</div>
              <h3 className="!mb-3 !mt-3">Write once for both agents</h3>
              <ul className="!mb-0 text-sm leading-6">
                <li>Keep the skill focused on one repeatable job.</li>
                <li>Put <code>name</code> and <code>description</code> in frontmatter.</li>
                <li>Describe both what it does and when it should trigger.</li>
                <li>Keep the core workflow concise and imperative.</li>
                <li>Link supporting files directly from <code>SKILL.md</code>.</li>
                <li>Test real prompts, outputs, and failure paths.</li>
              </ul>
            </article>
            <article className="bg-[var(--color-paper-2)] p-5">
              <div className="tag-font text-[10px] uppercase tracking-[0.16em] text-[var(--color-grape)]">portable core, small adapters</div>
              <h3 className="!mb-3 !mt-3">Keep client differences at the edge</h3>
              <p className="text-sm leading-6">
                Claude Code discovers project skills under <code>.claude/skills</code> and invokes them with <code>/skill-name</code>. Codex discovers repository skills under <code>.agents/skills</code>, supports explicit <code>$skill-name</code> invocation, and can use <code>agents/openai.yaml</code> for interface and invocation metadata.
              </p>
              <p className="!mb-0 text-sm leading-6">
                Keep the portable workflow in <code>SKILL.md</code>. Add client-specific metadata only when the client needs it.
              </p>
            </article>
          </div>
          <div className="command-panel my-6 p-5">
            <div className="tag-font mb-3 text-[10px] uppercase tracking-[0.16em] text-[var(--color-grape)]">the practical rule</div>
            <p className="!m-0 text-sm leading-6">
              Use instructions while judgment is useful. Add a script only when the operation must be deterministic, is fragile, or keeps being rewritten. Move deep reference material out of the main file so it loads only when needed.
            </p>
          </div>
          <p>
            Read the <a href="https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices" target="_blank" rel="noreferrer">Anthropic skill-authoring guide</a> and <a href="https://learn.chatgpt.com/docs/build-skills" target="_blank" rel="noreferrer">OpenAI&apos;s Codex skill guide</a> for current client-specific behavior.
          </p>
        </section>

        <section id="skill-md">
          <h2>What belongs in SKILL.md?</h2>
          <p>
            The file has YAML frontmatter followed by Markdown instructions. The open specification requires <code>name</code> and <code>description</code>. The name must match the folder, use lowercase letters, numbers, and hyphens, and stay within 64 characters. The description can use up to 1,024 characters and should explain both what the skill does and when to use it.
          </p>
          <pre><code>{`---
name: pull-request-review
description: Reviews pull requests for correctness, security, and missing tests. Use when asked to review a PR, diff, patch, or proposed code change.
license: MIT
---

# Review the change

1. Read the request and the complete diff.
2. Trace changed behavior through its callers.
3. Report only actionable defects with file and line references.
4. Check security boundaries and missing regression coverage.
5. If no defects remain, say so and list any residual test gaps.`}</code></pre>
          <p>
            Good instructions define the order of work, evidence to inspect, output format, and finish condition. Avoid motivational prose and facts the agent already knows. Put long API documentation in <code>references/</code>, deterministic operations in <code>scripts/</code>, and templates in <code>assets/</code>.
          </p>
        </section>

        <section id="matt-pocock-method" className="scroll-mt-36">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b-2 border-[var(--color-ink)] pb-2">
            <h2 className="!m-0 !border-0 !p-0">How does Matt Pocock create agent skills?</h2>
            <a
              href="https://github.com/mattpocock/skills"
              target="_blank"
              rel="noreferrer"
              className="tag-font text-xs uppercase tracking-[0.12em]"
            >
              inspect mattpocock/skills ↗
            </a>
          </div>
          <p>
            Matt Pocock&apos;s public collection is a useful real-world case study because it treats skills as a behavioral system, not a pile of clever prompts. His stated goal is predictable process: small, composable workflows grounded in engineering practice.
          </p>

          <div className="my-7 grid gap-px border border-[#29313a] bg-[#29313a] sm:grid-cols-2">
            {mattPrinciples.map((principle) => (
              <article key={principle.label} className="bg-[var(--color-paper-2)] p-5">
                <div className="tag-font text-[10px] uppercase tracking-[0.16em] text-[var(--color-grape)]">
                  {principle.label}
                </div>
                <h3 className="!mb-2 !mt-3 text-xl">{principle.title}</h3>
                <p className="!m-0 text-sm leading-6 text-[var(--color-ink-soft)]">{principle.text}</p>
              </article>
            ))}
          </div>

          <h3>Skills form flows, not isolated downloads</h3>
          <p>
            Thin user commands can route into reusable disciplines. A typical idea-to-ship path moves from alignment to a specification, small tickets, implementation, TDD, and code review. Shared skills stay small instead of repeating the same loop in every command.
          </p>
          <div className="command-panel my-6 overflow-x-auto p-5" aria-label="Matt Pocock skill flow example">
            <div className="tag-font mb-3 text-[10px] uppercase tracking-[0.16em] text-[var(--color-grape)]">
              example flow / idea to shipped change
            </div>
            <code className="type-font whitespace-nowrap border-0 bg-transparent p-0 text-sm text-[var(--color-ink)]">
              grill-with-docs → to-spec → to-tickets → implement → tdd → code-review
            </code>
          </div>
          <p>
            His repository also separates human documentation from runtime instructions. A public explanation should orient the reader around the skill&apos;s leading idea, defining constraint, and observable success condition; the complete <code>SKILL.md</code> remains available for inspection.
          </p>
        </section>

        <section id="latest-matt-pocock-skills" className="scroll-mt-36">
          <h2>What are Matt Pocock&apos;s latest agent skills?</h2>
          <p>
            The newest skill in the repository snapshot checked on July 15, 2026 is <code>to-questionnaire</code>. It is still in the <strong>lab</strong> rather than the promoted collection. The skill asks who holds the missing knowledge and what the user needs back, then writes a questionnaire that covers every named decision or fact.
          </p>

          <div className="my-6 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>State</th>
                  <th>Job</th>
                </tr>
              </thead>
              <tbody>
                {recentMattSkills.map(([name, state, job]) => (
                  <tr key={name}>
                    <td><code>{name}</code></td>
                    <td><span className="stamp text-[9px]">{state}</span></td>
                    <td>{job}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ink-frame-soft my-7 grid gap-0 bg-[var(--color-paper-2)] md:grid-cols-3">
            <div className="p-5 md:border-r md:border-[#29313a]">
              <div className="tag-font text-[10px] uppercase tracking-[0.14em] text-[var(--color-grape)]">lab</div>
              <p className="!mb-0 text-sm">New work under <code>skills/in-progress</code>.</p>
            </div>
            <div className="border-t border-[#29313a] p-5 md:border-r md:border-t-0">
              <div className="tag-font text-[10px] uppercase tracking-[0.14em] text-[var(--color-grape)]">promoted</div>
              <p className="!mb-0 text-sm">Daily-use engineering or productivity skills.</p>
            </div>
            <div className="border-t border-[#29313a] p-5 md:border-t-0">
              <div className="tag-font text-[10px] uppercase tracking-[0.14em] text-[var(--color-grape)]">released</div>
              <p className="!mb-0 text-sm">A versioned bundle available from a GitHub release.</p>
            </div>
          </div>

          <p>
            These states are different. A skill can be new on <code>main</code> without being promoted or included in the latest release. Check the <a href="https://github.com/mattpocock/skills/commits/main/" target="_blank" rel="noreferrer">commit history</a>, <a href="https://github.com/mattpocock/skills/releases" target="_blank" rel="noreferrer">releases</a>, and exact source path before claiming something is current. Visit the <MotionLink href="/character/matt-pocock">Matt Pocock creator page</MotionLink> for attributed skills in the skillZs catalog.
          </p>
        </section>

        <section id="triggering">
          <h2>How do you make a skill trigger reliably?</h2>
          <p>
            The description is the retrieval layer. Write it like a precise search result: lead with the capability, name the objects it handles, then include natural phrases that signal when it applies. &quot;Helps with code&quot; is too broad. &quot;Reviews pull requests, diffs, and patches for correctness, security, and missing tests&quot; gives an agent useful matching terms and boundaries.
          </p>
          <p>
            Test at least three positive prompts, two close negative prompts, and one ambiguous prompt. If the skill fails to load, improve the description before making the body longer. If it activates too often, narrow the trigger conditions. Reliable selection matters more than an elaborate workflow the agent never loads.
          </p>
          <p>
            A 2026 study of 138,133 public skills identified routing metadata as the clearest functional bottleneck: skills without routing defects were retrieved more reliably than skills with missing, vague, overlong, or misplaced descriptions. See <a href="https://openreview.net/pdf?id=n0AIlfxDU0" target="_blank" rel="noreferrer">What Keeps Agent Skills from Being Reusable?</a> for the dataset, detector, and limitations.
          </p>
        </section>

        <section id="testing">
          <h2>How should you test an agent skill?</h2>
          <ul>
            <li><strong>Validate the format:</strong> run <code>skills-ref validate ./pull-request-review</code>.</li>
            <li><strong>Test activation:</strong> confirm relevant prompts load it and unrelated prompts do not.</li>
            <li><strong>Test the outcome:</strong> run a realistic task and check the produced artifact, not just the agent&apos;s explanation.</li>
            <li><strong>Test failure paths:</strong> remove a required input or tool and confirm the skill stops with a useful message.</li>
            <li><strong>Test portability:</strong> when claiming cross-client support, run the same fixture in every named client.</li>
            <li><strong>Review safety:</strong> inspect commands, network calls, permissions, secrets, and destructive operations.</li>
          </ul>
          <p>
            Keep one small fixture that can be rerun after every change. Version the folder in Git so users can inspect history, pin revisions, and report problems against a specific release.
          </p>
        </section>

        <section id="skill-smells">
          <h2>Which SKILL.md smells should you avoid?</h2>
          <p>
            A July 2026 empirical study analyzed 238 real-world skills and found that more than 99% contained at least one authoring smell, with 10.5 smells per skill on average. The most common, a rationalization loophole, appeared in 94% of the sample. Treat these findings as review prompts rather than a universal quality score.
          </p>
          <ul>
            <li><strong>Rationalization loopholes:</strong> remove vague exceptions that let the agent skip a required check; state measurable conditions instead.</li>
            <li><strong>No validation step:</strong> finish with an observable check against the promised output, not a claim that the task is complete.</li>
            <li><strong>Rigid command sequences:</strong> explain the objective and constraints; move deterministic, environment-specific operations into a reviewed script.</li>
            <li><strong>Unclear names or descriptions:</strong> name the job plainly and include realistic activation language in frontmatter.</li>
            <li><strong>Oversized instructions:</strong> keep the core procedure focused and move deep background into references; the study&apos;s static detector flags files above 5,000 words.</li>
          </ul>
          <p>
            Read <a href="https://arxiv.org/abs/2607.01456" target="_blank" rel="noreferrer">From Anatomy to Smells: An Empirical Study of SKILL.md in Agent Skills</a> for the study design, full taxonomy, and limitations.
          </p>
        </section>

        <section id="publishing">
          <h2>How do you publish and help people discover a skill?</h2>
          <p>
            Publish the skill in a public repository with a clear license, maintainer identity, examples, compatibility notes, and a changelog when behavior changes. Make the repository&apos;s human-facing README answer the job the skill solves, supported clients, installation command, required permissions, and how it was tested. Never put a second README inside the skill folder when the client expects all agent instructions in <code>SKILL.md</code>.
          </p>
          <p>
            Use the same descriptive name in the folder, repository title, page title, and link text. Earn references by shipping useful examples, contributing to client documentation and community lists, and maintaining the skill after publication. A copied directory with hundreds of thin listings is easy to index; original tests, transparent audits, and genuinely useful guides are much harder to replace.
          </p>
          <p>
            Follow the <MotionLink href="/guides/how-to-publish-agent-skills">complete Agent Skill publishing guide</MotionLink> to test the public install path and understand how skills.sh discovery works.
          </p>
          <p>
            Ready to compare patterns? <MotionLink href="/browse">Browse the complete agent skill catalog</MotionLink>, study the <MotionLink href="/category/agents">agent category</MotionLink>, or adapt a stop condition from the <MotionLink href="/loops">agent loop library</MotionLink>. You can also explore <MotionLink href="/category/coding">coding</MotionLink>, <MotionLink href="/category/research">research</MotionLink>, <MotionLink href="/category/creative">creative</MotionLink>, and <MotionLink href="/category/utils">productivity</MotionLink> skills.
          </p>
          <p>
            Continue with the <MotionLink href="/guides/how-to-install-agent-skills">safe installation guide</MotionLink>, compare <MotionLink href="/guides/agent-skills-vs-mcp">Agent Skills and MCP</MotionLink>, or use the <MotionLink href="/guides/agent-skill-security">security review checklist</MotionLink> before adopting third-party workflows.
          </p>
        </section>

        <section id="faq">
          <h2>What do people ask about agent skills?</h2>
          {faqs.map((item) => (
            <div key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </div>
          ))}
        </section>

        <section id="sources">
          <h2>Which official sources define the format?</h2>
          <p>
            The cross-client guideline follows <a href="https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices" target="_blank" rel="noreferrer">Anthropic&apos;s Skill authoring best practices</a> and <a href="https://learn.chatgpt.com/docs/build-skills" target="_blank" rel="noreferrer">OpenAI&apos;s Build skills guide for Codex</a>.
          </p>
          <p>
            This guide was checked against the <a href="https://agentskills.io/specification" target="_blank" rel="noreferrer">Agent Skills specification</a>, <a href="https://code.claude.com/docs/en/skills" target="_blank" rel="noreferrer">Claude Code skills documentation</a>, <a href="https://support.claude.com/en/articles/12512198-how-to-create-custom-skills" target="_blank" rel="noreferrer">Anthropic&apos;s custom skill guide</a>, <a href="https://help.openai.com/en/articles/20001066-skills-in-chatgpt" target="_blank" rel="noreferrer">OpenAI&apos;s Skills documentation</a>, and the 2026 <a href="https://arxiv.org/abs/2607.01456" target="_blank" rel="noreferrer">empirical SKILL.md authoring study</a>. Client behavior changes, so verify installation paths and optional fields in the documentation for the product you use.
          </p>
          <p>
            The Matt Pocock case study was checked against the <a href="https://github.com/mattpocock/skills" target="_blank" rel="noreferrer">mattpocock/skills repository</a>, its <a href="https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-great-skills/SKILL.md" target="_blank" rel="noreferrer">skill-writing reference</a>, and the source for <a href="https://github.com/mattpocock/skills/blob/main/skills/in-progress/to-questionnaire/SKILL.md" target="_blank" rel="noreferrer">to-questionnaire</a>.
          </p>
        </section>
      </div>
    </article>
  );
}
