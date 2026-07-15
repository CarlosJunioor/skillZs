import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MotionLink } from "@/components/motion/motion-link";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, siteConfig } from "@/lib/seo";

const path = "/guides/how-to-publish-agent-skills";
const title = "How to Publish Agent Skills and Get Discovered";
const description =
  "Publish an Agent Skill from GitHub, verify installation with the skills CLI, become eligible for skills.sh discovery, and build lasting trust.";
const published = "2026-07-15";

const steps = [
  { name: "Finish and validate the skill", text: "Use a folder with a valid uppercase SKILL.md, focused instructions, tested triggers, and every referenced script or resource." },
  { name: "Create a public Git repository", text: "Commit the complete skill folder to a stable repository whose owner and history users can inspect." },
  { name: "Document trust and compatibility", text: "Add a repository README, license, install command, supported clients, requirements, permissions, examples, tests, and security notes." },
  { name: "Test the public install path", text: "Install from the repository with npx skills add owner/repo in a clean disposable project and verify the copied files and behavior." },
  { name: "Share the canonical repository", text: "Link one stable source URL from documentation, examples, community posts, and relevant project pages instead of uploading conflicting copies." },
  { name: "Maintain the published revision", text: "Review issues, document behavior changes, compare dependencies, keep examples working, and treat every update as a new security review." },
] as const;

const faqs = [
  { question: "How do I submit an Agent Skill to skills.sh?", answer: "There is no separate submission form or publish command. Put the skill in a public Git repository, share it, and verify that people can install it with the skills CLI. Anonymous install telemetry can make it appear in the skills.sh ecosystem automatically." },
  { question: "How does a published skill appear on skillZs?", answer: "skillZs mirrors the live skills.sh ecosystem. Once the upstream API indexes a non-duplicate skill, skillZs can surface its source, manual, install count, and available audit information automatically." },
  { question: "Can one repository contain several Agent Skills?", answer: "Yes. Keep each skill in its own named folder with its own SKILL.md, document the available skills, and test selecting a specific skill during installation." },
  { question: "What makes people trust a published Agent Skill?", answer: "A clear maintainer, stable source, license, narrow permissions, readable scripts, realistic examples, outcome tests, compatibility notes, security disclosures, and a maintained change history all reduce uncertainty." },
  { question: "Do install counts prove that a skill is safe or high quality?", answer: "No. Install counts measure adoption. Users must still review the exact source, revision, permissions, dependencies, and behavior for their environment." },
] as const;

export const metadata: Metadata = buildPageMetadata({ title, description, path, type: "article" });

export default function PublishAgentSkillsGuide() {
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
          { name: "Publish Agent Skills", path },
        ]),
      ]} />

      <nav aria-label="Breadcrumb" className="type-font mb-6 text-xs text-[var(--color-rust)]">
        <ol className="flex flex-wrap gap-2">
          <li><MotionLink href="/" className="hover:text-[var(--color-grape)]">skillZs</MotionLink></li>
          <li aria-hidden>/</li>
          <li><MotionLink href="/guides" className="hover:text-[var(--color-grape)]">guides</MotionLink></li>
          <li aria-hidden>/</li>
          <li aria-current="page">publish Agent Skills</li>
        </ol>
      </nav>

      <header className="border-b border-[#29313a] pb-10">
        <div className="tag-font mb-5 text-xs uppercase tracking-[0.16em] text-[var(--color-grape)]">creator field guide / repository to discovery</div>
        <h1 className="display max-w-5xl text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          publish agent skills.<br /><span className="text-[var(--color-grape)]">get discovered.</span>
        </h1>
        <p className="type-font mt-8 max-w-3xl text-base leading-7 text-[var(--color-ink-soft)]">
          To publish an Agent Skill, put its complete validated folder in a public Git repository, document the job, license, compatibility, permissions, examples, and install command, then verify the public source with <code>npx skills add owner/repo</code>. skills.sh has no separate submission form; successful installations provide anonymous ranking telemetry and can make the skill discoverable automatically.
        </p>
        <p className="type-font mt-4 text-xs text-[var(--color-rust)]">Written and checked by <MotionLink href="/about">{siteConfig.name}</MotionLink>. <time dateTime={published}>Updated July 15, 2026.</time></p>
      </header>

      <div className="prose-zine type-font mt-10 max-w-none leading-relaxed">
        <section id="publish-flow">
          <h2>How do you publish an Agent Skill?</h2>
          <ol>
            {steps.map((step, index) => (
              <li key={step.name} id={`step-${index + 1}`}><strong>{step.name}.</strong> {step.text}</li>
            ))}
          </ol>
          <pre><code>{`my-agent-skills/
|-- README.md
|-- LICENSE
\-- skills/
    \-- pull-request-review/
        |-- SKILL.md
        |-- scripts/       # optional
        |-- references/    # optional
        \-- assets/        # optional`}</code></pre>
          <p>
            Start with the <MotionLink href="/guides/how-to-create-agent-skills">Agent Skill creation guide</MotionLink> if the folder is not finished. The publisher-facing README belongs at the repository level; <code>SKILL.md</code> remains the agent-facing source of truth inside each skill folder.
          </p>
        </section>

        <section id="skills-sh">
          <h2>How does a skill become discoverable on skills.sh?</h2>
          <p>
            The official publishing flow has no registry upload or approval form. A user installs directly from the public repository, and the skills CLI sends anonymous telemetry containing the skill identity, files, and timestamp unless telemetry is disabled. Aggregated installs power the public leaderboard. A valid repository can therefore become discoverable through real installation activity.
          </p>
          <pre><code>{`npx skills add owner/repository

# When the repository contains several skills:
npx skills add owner/repository --skill pull-request-review`}</code></pre>
          <p>
            skillZs reads that live ecosystem through its API. It does not accept payment for placement or maintain a separate upload queue. See the <MotionLink href="/about">catalog methodology</MotionLink> and <MotionLink href="/guides/best-agent-skills">live install rankings</MotionLink> for how discovery data is presented.
          </p>
        </section>

        <section id="repository">
          <h2>What should a public Agent Skill repository include?</h2>
          <ul>
            <li>A concise README naming each skill, the job it solves, supported clients, and exact installation examples.</li>
            <li>A license that clearly permits the intended reuse and distribution.</li>
            <li>Compatibility requirements such as runtimes, binaries, MCP servers, APIs, network access, or operating-system limits.</li>
            <li>Permission and security notes for scripts, credentials, write access, destructive actions, and outbound services.</li>
            <li>Positive and negative trigger examples plus one repeatable outcome test.</li>
            <li>A maintainer identity, issue channel, version history, and responsible security-reporting path.</li>
          </ul>
        </section>

        <section id="trust">
          <h2>How do you help people trust and recommend your skill?</h2>
          <p>
            Make every claim inspectable. Link the canonical source instead of republishing unexplained copies, keep scripts readable, request only necessary permissions, document tested clients, and show what success looks like. Add the official skills.sh install-count badge to the repository README after the skill is indexed, but never present installs as a security certification.
          </p>
          <p>
            Before sharing, run the <MotionLink href="/guides/agent-skill-security">security review checklist</MotionLink> and repeat the <MotionLink href="/guides/how-to-install-agent-skills">installation process</MotionLink> from a clean project. Users can then find the published result through the <MotionLink href="/browse">Agent Skills Directory</MotionLink> or relevant <MotionLink href="/category/agents">agent</MotionLink> and <MotionLink href="/category/coding">coding</MotionLink> collections.
          </p>
        </section>

        <section id="faq">
          <h2>What do creators ask about publishing Agent Skills?</h2>
          {faqs.map((item) => <div key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></div>)}
        </section>

        <section id="sources">
          <h2>Which official sources explain Agent Skill publishing?</h2>
          <p>
            This guide was checked against the <a href="https://vercel.com/kb/guide/agent-skills-creating-installing-and-sharing-reusable-agent-context" target="_blank" rel="noreferrer">Vercel Agent Skills publishing guide</a>, <a href="https://skills.sh/docs" target="_blank" rel="noreferrer">skills.sh documentation</a>, <a href="https://skills.sh/docs/cli" target="_blank" rel="noreferrer">skills CLI reference</a>, and the <a href="https://agentskills.io/specification" target="_blank" rel="noreferrer">Agent Skills specification</a>.
          </p>
        </section>
      </div>
    </article>
  );
}
