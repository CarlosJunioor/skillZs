import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MotionLink } from "@/components/motion/motion-link";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

const path = "/about";
const title = "About skillZs: Agent Skills Hub Methodology";
const description =
  "Learn how skillZs sources Agent Skills, ranks catalog listings, publishes guides, presents security audits, and handles corrections.";

const faqs = [
  { question: "Does skillZs accept paid ranking placement?", answer: "No. Catalog order uses upstream ecosystem install data and selected time views, not payment. Sponsored placement is not mixed into the ranking." },
  { question: "Does skillZs guarantee that listed skills are safe?", answer: "No. Available partner audit summaries are displayed when supplied by the upstream service, and their absence is disclosed. Users should inspect the exact source and permissions before installation." },
  { question: "Where does the agent skill catalog come from?", answer: "The primary catalog mirrors the live skills.sh ecosystem through its API. Each listing preserves its source identity and links users to the source repository or domain." },
  { question: "How can I report an error?", answer: "Open an issue in the public skillZs GitHub repository with the affected URL, source evidence, and requested correction. Security reports should avoid posting active secrets or exploit details publicly." },
];

export const metadata: Metadata = buildPageMetadata({ title, description, path });

export default function AboutPage() {
  const about = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": absoluteUrl(`${path}#about`),
    name: title,
    description,
    url: absoluteUrl(path),
    isPartOf: { "@id": absoluteUrl("/#website") },
    about: { "@id": absoluteUrl("/#organization") },
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
        about,
        faq,
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About skillZs", path },
        ]),
      ]} />

      <nav aria-label="Breadcrumb" className="type-font mb-6 text-xs text-[var(--color-rust)]">
        <ol className="flex flex-wrap gap-2">
          <li><MotionLink href="/" className="hover:text-[var(--color-grape)]">skillZs</MotionLink></li>
          <li aria-hidden>/</li>
          <li aria-current="page">about and methodology</li>
        </ol>
      </nav>

      <header className="border-b border-[#29313a] pb-10">
        <div className="tag-font mb-5 text-xs uppercase tracking-[0.16em] text-[var(--color-grape)]">open source / visible methods / corrections welcome</div>
        <h1 className="display max-w-5xl text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          about<br /><span className="text-[var(--color-grape)]">skillZs.</span>
        </h1>
        <p className="type-font mt-8 max-w-3xl text-base leading-7 text-[var(--color-ink-soft)]">
          skillZs is an open-source Agent Skills discovery and learning hub. It mirrors live ecosystem listings, ranks them with upstream install data rather than paid placement, links to original sources, publishes practical guides checked against primary documentation, and clearly separates available partner audit summaries from guarantees of safety.
        </p>
      </header>

      <div className="prose-zine type-font mt-10 max-w-none leading-relaxed">
        <section id="purpose">
          <h2>What is skillZs built to do?</h2>
          <p>
            The project makes reusable AI agent skills easier to find, inspect, understand, and install. The <MotionLink href="/browse">catalog</MotionLink> serves discovery, the <MotionLink href="/guides">guide hub</MotionLink> teaches creation and adoption, and the <MotionLink href="/loops">loop library</MotionLink> provides reusable workflow patterns with explicit finish conditions. Public pages require no account.
          </p>
        </section>

        <section id="catalog">
          <h2>Where does the agent skill catalog data come from?</h2>
          <p>
            The primary catalog reads the authenticated <a href="https://skills.sh" target="_blank" rel="noreferrer">skills.sh</a> ecosystem API. skillZs displays the upstream source, slug, install count, manual files, and available audit responses. Links on detail pages point back to the named source repository or domain so users can inspect provenance rather than relying on a copied description.
          </p>
          <p>
            Lightweight topic tags are inferred from listing names and descriptions to improve browsing. They are navigation aids, not publisher certifications. Duplicate records identified by the upstream data are excluded from the public sitemap.
          </p>
        </section>

        <section id="rankings">
          <h2>How are agent skills ranked?</h2>
          <p>
            The default leaderboard sorts the live catalog by all-time ecosystem installs. Trending and hot views use the corresponding upstream views. skillZs does not sell positions or insert paid results into these lists. Install counts describe ecosystem activity; they do not prove quality, compatibility, security, or suitability for a particular environment.
          </p>
        </section>

        <section id="security">
          <h2>How does skillZs handle security information?</h2>
          <p>
            When the upstream service provides partner audit results, skillZs displays the provider, status, summary, and audit time. When no result exists, the page says so. An audit is evidence about a particular revision and method, not a safety guarantee. Every user should read the complete source, constrain permissions, and test in a reversible environment using the <MotionLink href="/guides/agent-skill-security">security checklist</MotionLink>.
          </p>
        </section>

        <section id="guides">
          <h2>How are skillZs guides researched and updated?</h2>
          <p>
            Guides start with the open <a href="https://agentskills.io/specification" target="_blank" rel="noreferrer">Agent Skills specification</a> and current primary documentation from the relevant product or security organization. Each guide gives a direct answer, names client-specific differences, links its sources, and shows an update date. The content adds practical decision rules, examples, tests, and limitations instead of reproducing vendor documentation.
          </p>
          <p>
            Begin with <MotionLink href="/guides/how-to-create-agent-skills">creating a skill</MotionLink>, then read <MotionLink href="/guides/how-to-install-agent-skills">safe installation</MotionLink> and the <MotionLink href="/guides/agent-skills-vs-mcp">Agent Skills versus MCP comparison</MotionLink>.
          </p>
        </section>

        <section id="ownership">
          <h2>Who publishes skillZs and how can you request a correction?</h2>
          <p>
            The application code and change history are public in the <a href="https://github.com/CarlosJunioor/skillZs" target="_blank" rel="noreferrer">skillZs GitHub repository</a>. To request a factual correction or report a broken listing, <a href="https://github.com/CarlosJunioor/skillZs/issues" target="_blank" rel="noreferrer">open an issue</a> with the affected URL and primary-source evidence.
          </p>
        </section>

        <section id="faq">
          <h2>What do people ask about skillZs?</h2>
          {faqs.map((item) => <div key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></div>)}
        </section>
      </div>
    </article>
  );
}
