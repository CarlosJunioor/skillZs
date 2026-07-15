import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MotionLink } from "@/components/motion/motion-link";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

const path = "/guides";
const title = "Agent Skills Hub: Guides and Tutorials";
const description =
  "Learn how to create, install, compare, test, and secure AI agent skills with practical guides grounded in the open Agent Skills standard.";

const guides = [
  {
    href: "/research/agent-skills-report-2026",
    title: "Agent Skills Ecosystem Report 2026",
    summary: "Analyze live catalog size, install concentration, leading sources, methodology, and creator lessons.",
    label: "research / live",
  },
  {
    href: "/guides/best-agent-skills",
    title: "Best Agent Skills ranked live",
    summary: "Compare the most-installed workflows with a transparent ranking method and practical selection criteria.",
    label: "rankings / live",
  },
  {
    href: "/guides/how-to-create-agent-skills",
    title: "How to create an agent skill",
    summary: "Write a valid SKILL.md, improve activation, test real outcomes, and publish a portable skill.",
    label: "build / 30 min",
  },
  {
    href: "/guides/how-to-publish-agent-skills",
    title: "How to publish an Agent Skill",
    summary: "Publish from GitHub, verify the public install path, become eligible for ecosystem discovery, and build trust.",
    label: "publish / 20 min",
  },
  {
    href: "/guides/how-to-install-agent-skills",
    title: "How to install agent skills",
    summary: "Choose the correct project or personal directory, inspect the source, install, and verify activation.",
    label: "install / 15 min",
  },
  {
    href: "/guides/agent-skills-vs-mcp",
    title: "Agent Skills vs MCP",
    summary: "Understand the boundary between portable workflows and standardized connections to external systems.",
    label: "compare / 8 min",
  },
  {
    href: "/guides/agent-skill-security",
    title: "Agent skill security checklist",
    summary: "Review instructions, scripts, dependencies, permissions, network access, and update risk before use.",
    label: "secure / 12 min",
  },
] as const;

const faqs = [
  {
    question: "Where should a beginner start with agent skills?",
    answer: "Start with the creation guide to understand the format, then install one small skill and test it on a reversible task. Read the security checklist before granting tools or credentials.",
  },
  {
    question: "Are these guides specific to one AI tool?",
    answer: "No. They teach the open Agent Skills format and call out client-specific behavior where it matters. Installation locations and optional fields can vary across Claude Code, Codex, Gemini CLI, and VS Code.",
  },
];

export const metadata: Metadata = buildPageMetadata({ title, description, path });

export default function GuidesPage() {
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": absoluteUrl(`${path}#collection`),
    name: title,
    description,
    url: absoluteUrl(path),
    isPartOf: { "@id": absoluteUrl("/#website") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: guides.length,
      itemListElement: guides.map((guide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: guide.title,
        description: guide.summary,
        url: absoluteUrl(guide.href),
      })),
    },
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
    <div className="mx-auto max-w-6xl pt-8">
      <JsonLd data={[
        collection,
        faq,
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Guides", path },
        ]),
      ]} />

      <nav aria-label="Breadcrumb" className="type-font mb-6 text-xs text-[var(--color-rust)]">
        <ol className="flex flex-wrap gap-2">
          <li><MotionLink href="/" className="hover:text-[var(--color-grape)]">skillZs</MotionLink></li>
          <li aria-hidden>/</li>
          <li aria-current="page">guides</li>
        </ol>
      </nav>

      <header className="border-b border-[#29313a] pb-10">
        <div className="tag-font mb-5 text-xs uppercase tracking-[0.16em] text-[var(--color-grape)]">
          practical field manuals / open Agent Skills format
        </div>
        <h1 className="display max-w-5xl text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          agent skills<br /><span className="text-[var(--color-grape)]">guides.</span>
        </h1>
        <p className="type-font mt-8 max-w-3xl text-base leading-7 text-[var(--color-ink-soft)]">
          Learn agent skills from first principles: create a valid portable workflow, install it in the right scope, decide when MCP is the better tool, and review third-party instructions safely. Each guide gives a direct answer, a practical checklist, working examples, and links to the primary standards or product documentation.
        </p>
      </header>

      <section className="mt-10 grid gap-5 md:grid-cols-2" aria-label="Agent skills guides">
        {guides.map((guide, index) => (
          <article key={guide.href} className="ink-frame-soft bg-[var(--color-paper-2)] p-6">
            <div className="tag-font text-xs uppercase tracking-[0.14em] text-[var(--color-rust)]">
              {String(index + 1).padStart(2, "0")} / {guide.label}
            </div>
            <h2 className="display mt-4 text-3xl leading-none">{guide.title}</h2>
            <p className="type-font mt-4 text-sm leading-6 text-[var(--color-ink-soft)]">{guide.summary}</p>
            <MotionLink href={guide.href} className="tag-pill mt-6">read guide &rarr;</MotionLink>
          </article>
        ))}
      </section>

      <div className="prose-zine type-font mt-12 max-w-none leading-relaxed">
        <section>
          <h2>What can you learn about agent skills?</h2>
          <p>
            These guides cover the complete lifecycle: discovery, format and trigger design, installation, compatibility, security review, testing, and publishing. Start with the <MotionLink href="/guides/best-agent-skills">live Agent Skills rankings</MotionLink>, use the <MotionLink href="/guides/how-to-create-agent-skills">SKILL.md creation guide</MotionLink> when building a workflow, follow the <MotionLink href="/guides/how-to-publish-agent-skills">publishing guide</MotionLink> when it is ready to share, and read the <MotionLink href="/guides/agent-skill-security">security checklist</MotionLink> before a skill can run tools or scripts.
          </p>
        </section>
        <section>
          <h2>Where should you find skills to practice with?</h2>
          <p>
            <MotionLink href="/browse">Browse the full catalog</MotionLink>, compare the <MotionLink href="/category/agents">agent</MotionLink>, <MotionLink href="/category/coding">coding</MotionLink>, and <MotionLink href="/category/research">research</MotionLink> categories, or turn a pattern from the <MotionLink href="/loops">agent loop library</MotionLink> into your first focused skill. A useful first project is narrow, reversible, and easy to verify.
          </p>
        </section>
        <section id="faq">
          <h2>What do beginners ask about agent skills?</h2>
          {faqs.map((item) => (
            <div key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
