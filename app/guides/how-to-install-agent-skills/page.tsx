import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MotionLink } from "@/components/motion/motion-link";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, siteConfig } from "@/lib/seo";

const path = "/guides/how-to-install-agent-skills";
const title = "How to Install Agent Skills in Any AI Tool";
const description =
  "Install Agent Skills safely in Claude Code, Codex, Cursor, Gemini CLI, or VS Code. Learn directories, verification, updates, and removal.";
const published = "2026-07-15";

const steps = [
  { name: "Open the source", text: "Read the complete SKILL.md and inspect every bundled script, reference, asset, dependency, and requested permission before copying or running anything." },
  { name: "Choose the scope", text: "Use a project scope when the skill belongs to one repository or team. Use a personal scope only when you trust it across every project you open." },
  { name: "Use the client directory", text: "Copy the entire skill folder, not only SKILL.md, into a skills directory supported by your AI client." },
  { name: "Reload and discover", text: "Restart the client or reload its skills configuration, then use its skills menu or listing command to confirm discovery." },
  { name: "Test on a reversible task", text: "Run one prompt that should activate the skill and one nearby prompt that should not. Verify the actual result and tool calls." },
  { name: "Pin and maintain", text: "Record the source and revision, review updates before applying them, and remove the folder if behavior or trust changes." },
];

const faqs = [
  { question: "Where do I install an agent skill?", answer: "Install the complete skill folder in a project or personal skills directory recognized by your client. Common project paths include .agents/skills, .claude/skills, and .github/skills, but you must confirm the supported path in your client's current documentation." },
  { question: "Can I install the same skill in Claude Code, Codex, Cursor, and Gemini CLI?", answer: "Often, yes, because they can use the open Agent Skills format. Client-specific frontmatter, tools, installation paths, and permissions may still require small adaptations." },
  { question: "Do I copy only the SKILL.md file?", answer: "No. Copy the whole named folder so referenced scripts, assets, and documentation remain at the relative paths used by SKILL.md." },
  { question: "How do I know an installed skill is working?", answer: "Confirm it appears in the client's skill list, run a positive activation prompt, inspect the reported skill or tool use, and check the output against a concrete acceptance test." },
  { question: "Is an npx install command automatically safe?", answer: "No. A convenient command still downloads third-party content and may execute package code. Inspect the source, package, target files, permissions, and exact revision before approving it." },
];

export const metadata: Metadata = buildPageMetadata({ title, description, path, type: "article" });

export default function InstallAgentSkillsGuide() {
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
  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description,
    totalTime: "PT15M",
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
          { name: "Install agent skills", path },
        ]),
      ]} />

      <nav aria-label="Breadcrumb" className="type-font mb-6 text-xs text-[var(--color-rust)]">
        <ol className="flex flex-wrap gap-2">
          <li><MotionLink href="/" className="hover:text-[var(--color-grape)]">skillZs</MotionLink></li>
          <li aria-hidden>/</li>
          <li><MotionLink href="/guides" className="hover:text-[var(--color-grape)]">guides</MotionLink></li>
          <li aria-hidden>/</li>
          <li aria-current="page">install agent skills</li>
        </ol>
      </nav>

      <header className="border-b border-[#29313a] pb-10">
        <div className="tag-font mb-5 text-xs uppercase tracking-[0.16em] text-[var(--color-grape)]">field guide / safe installation</div>
        <h1 className="display max-w-4xl text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          install agent<br /><span className="text-[var(--color-grape)]">skills safely.</span>
        </h1>
        <p className="type-font mt-8 max-w-3xl text-base leading-7 text-[var(--color-ink-soft)]">
          To install an agent skill, inspect its complete source, copy the whole folder into a project or personal directory supported by your AI client, reload skill discovery, then test activation on a small reversible task. Installation locations vary by client, and a one-command installer does not replace source review or least-privilege permissions.
        </p>
        <p className="type-font mt-4 text-xs text-[var(--color-rust)]">Written and checked by <MotionLink href="/about">{siteConfig.name}</MotionLink>. <time dateTime={published}>Updated July 15, 2026.</time></p>
      </header>

      <div className="prose-zine type-font mt-10 max-w-none leading-relaxed">
        <section id="before-installing">
          <h2>What should you check before installing an agent skill?</h2>
          <p>
            Treat a skill as code plus instructions, not as passive documentation. Read <code>SKILL.md</code>, follow every relative link, inspect scripts and package manifests, and search for commands that read credentials, modify files, make network requests, or weaken approval controls. Verify the maintainer, repository history, license, requested tools, and exact revision you intend to use.
          </p>
          <p>
            If the source is unfamiliar, use the <MotionLink href="/guides/agent-skill-security">agent skill security checklist</MotionLink> before installation. Start in a disposable project with no production credentials. A skill whose stated job is formatting Markdown should not need cloud-admin access, outbound uploads, or unrestricted shell execution.
          </p>
        </section>

        <section id="installation-steps">
          <h2>How do you install an Agent Skills folder?</h2>
          <ol>
            {steps.map((step, index) => (
              <li key={step.name} id={`step-${index + 1}`}><strong>{step.name}.</strong> {step.text}</li>
            ))}
          </ol>
          <pre><code>{`project-root/
└── .agents/
    └── skills/
        └── pull-request-review/
            ├── SKILL.md
            ├── scripts/       # if supplied
            ├── references/    # if supplied
            └── assets/        # if supplied`}</code></pre>
          <p>
            The name in the skill&apos;s frontmatter should match the folder name. Do not flatten supporting files or rename paths without updating their references. For a catalog entry on skillZs, use the displayed install command only after opening its source and audit information on the individual skill page.
          </p>
        </section>

        <section id="client-paths">
          <h2>Which skill directory does each AI client use?</h2>
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Client</th><th>Project scope</th><th>Personal scope</th><th>How to verify</th></tr></thead>
              <tbody>
                <tr><td>Claude Code</td><td><code>.claude/skills/</code></td><td><code>~/.claude/skills/</code></td><td>Ask a matching question or invoke the skill command</td></tr>
                <tr><td>VS Code / Copilot</td><td><code>.github/skills/</code>, <code>.claude/skills/</code>, or <code>.agents/skills/</code></td><td><code>~/.copilot/skills/</code>, <code>~/.claude/skills/</code>, or <code>~/.agents/skills/</code></td><td>Open the Configure Skills menu with <code>/skills</code></td></tr>
                <tr><td>Codex</td><td><code>.agents/skills/</code> from the working directory to repository root</td><td><code>~/.agents/skills/</code></td><td>Run <code>/skills</code> or type <code>$</code> to mention the skill</td></tr>
                <tr><td>Cursor</td><td><code>.cursor/skills/</code> or <code>.agents/skills/</code></td><td><code>~/.cursor/skills/</code> or <code>~/.agents/skills/</code></td><td>Open the slash menu or Cursor Settings &rarr; Rules</td></tr>
                <tr><td>Gemini CLI</td><td><code>.gemini/skills/</code> or <code>.agents/skills/</code></td><td><code>~/.gemini/skills/</code> or <code>~/.agents/skills/</code></td><td>Run <code>/skills</code> for the installed version</td></tr>
                <tr><td>ChatGPT</td><td>Use the workspace Skills interface</td><td>Profile &rarr; Skills</td><td>Check Installed skills and run a matching request</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            These paths are not interchangeable guarantees. Products add support and optional fields over time, so consult the official documentation for the version you run. Keep portable instructions in the standard format and document any client-only tool names or frontmatter.
          </p>
        </section>

        <section id="verify">
          <h2>How do you verify that an installed skill works?</h2>
          <ul>
            <li>Confirm the skill appears in the client&apos;s skills menu or listing command.</li>
            <li>Ask a realistic prompt that closely matches the frontmatter description.</li>
            <li>Check that the client reports loading the expected skill rather than guessing from general knowledge.</li>
            <li>Inspect tool calls, changed files, network requests, and the final artifact.</li>
            <li>Run a nearby negative prompt that should not activate the skill.</li>
            <li>Repeat the same fixture after every update.</li>
          </ul>
          <p>
            Discovery proves only that the folder loaded. Verification proves that its behavior is correct. A useful test has an observable acceptance condition—for example, a review skill must identify a seeded defect and remain silent on a clean fixture.
          </p>
        </section>

        <section id="update-remove">
          <h2>How should you update or remove agent skills?</h2>
          <p>
            Record the upstream URL and commit, compare changes before updating, and rerun the activation and outcome tests. Avoid silently tracking an unpinned branch in sensitive environments. To remove a file-based skill, delete its complete folder from the relevant skills directory, reload the client, and confirm it no longer appears. Revoke credentials or permissions that existed only for that skill.
          </p>
          <p>
            Next, learn <MotionLink href="/guides/how-to-create-agent-skills">how to create your own skill</MotionLink>, understand <MotionLink href="/guides/agent-skills-vs-mcp">Agent Skills versus MCP</MotionLink>, <MotionLink href="/browse">browse the open catalog</MotionLink>, or compare <MotionLink href="/category/coding">coding</MotionLink> and <MotionLink href="/category/agents">agent</MotionLink> skills.
          </p>
        </section>

        <section id="faq">
          <h2>What do people ask about installing agent skills?</h2>
          {faqs.map((item) => <div key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></div>)}
        </section>

        <section id="sources">
          <h2>Which official sources document installation?</h2>
          <p>
            This guide was checked against the <a href="https://agentskills.io/specification" target="_blank" rel="noreferrer">Agent Skills specification</a>, <a href="https://code.claude.com/docs/en/skills" target="_blank" rel="noreferrer">Claude Code skills documentation</a>, <a href="https://developers.openai.com/codex/skills" target="_blank" rel="noreferrer">OpenAI Codex skills documentation</a>, <a href="https://cursor.com/docs/skills" target="_blank" rel="noreferrer">Cursor skills documentation</a>, <a href="https://code.visualstudio.com/docs/agent-customization/agent-skills" target="_blank" rel="noreferrer">VS Code Agent Skills documentation</a>, <a href="https://geminicli.com/docs/cli/creating-skills/" target="_blank" rel="noreferrer">Gemini CLI skills documentation</a>, <a href="https://codelabs.developers.google.com/gemini-cli/how-to-create-agent-skills-for-gemini-cli" target="_blank" rel="noreferrer">Google&apos;s Gemini CLI codelab</a>, and <a href="https://help.openai.com/en/articles/20001066-skills-in-chatgpt" target="_blank" rel="noreferrer">OpenAI&apos;s ChatGPT Skills documentation</a>.
          </p>
        </section>
      </div>
    </article>
  );
}
