import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MotionLink } from "@/components/motion/motion-link";
import { SkillLeaderboard } from "@/components/skill-leaderboard";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, siteConfig } from "@/lib/seo";
import { catalogSkillPath, listCatalogSkills, type CatalogSkill } from "@/lib/skills-sh";

export const revalidate = 300;

const path = "/guides/best-agent-skills";
const title = "Best Agent Skills: Live Install Rankings";
const description =
  "See the best Agent Skills ranked by live ecosystem installs. Compare popular SKILL.md workflows, sources, use cases, safety, and selection criteria.";
const published = "2026-07-15";

export const metadata: Metadata = buildPageMetadata({ title, description, path, type: "article" });

export default async function BestAgentSkillsGuide() {
  let skills: CatalogSkill[] = [];

  try {
    const result = await listCatalogSkills({ view: "all-time", perPage: 20 });
    skills = result.data.filter((skill) => !skill.isDuplicate);
  } catch (error) {
    console.error("best agent skills fetch failed:", error);
  }

  const leader = skills[0];
  const faqs = [
    {
      question: "What is the most-installed Agent Skill right now?",
      answer: leader
        ? `${leader.name} is currently first in the live all-time directory with ${leader.installs.toLocaleString("en-US")} ecosystem installs. Rankings can change as the upstream catalog updates.`
        : "The live catalog is temporarily unavailable. Reload the page later to see the current all-time install leader.",
    },
    {
      question: "Does the most-installed skill mean it is the best skill?",
      answer: "No. Install count measures adoption, not correctness, security, compatibility, maintenance, or fit for your task. Read the source and test the exact revision before use.",
    },
    {
      question: "How often do these Agent Skill rankings update?",
      answer: "The page refreshes its live all-time ranking data every five minutes. Individual search engines decide independently when to recrawl and refresh their indexed copy.",
    },
    {
      question: "Are the top Agent Skills free to install?",
      answer: "The directory links to public sources and install instructions, but each publisher controls its license, dependencies, services, and usage terms. Verify those terms before installation.",
    },
  ];
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
  };
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Most-installed Agent Skills",
    numberOfItems: skills.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: skills.map((skill, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: skill.name,
      url: absoluteUrl(catalogSkillPath(skill)),
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
        itemList,
        faq,
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Best Agent Skills", path },
        ]),
      ]} />

      <nav aria-label="Breadcrumb" className="type-font mb-6 text-xs text-[var(--color-rust)]">
        <ol className="flex flex-wrap gap-2">
          <li><MotionLink href="/" className="hover:text-[var(--color-grape)]">skillZs</MotionLink></li>
          <li aria-hidden>/</li>
          <li><MotionLink href="/guides" className="hover:text-[var(--color-grape)]">guides</MotionLink></li>
          <li aria-hidden>/</li>
          <li aria-current="page">best Agent Skills</li>
        </ol>
      </nav>

      <header className="border-b border-[#29313a] pb-10">
        <div className="tag-font mb-5 text-xs uppercase tracking-[0.16em] text-[var(--color-grape)]">live field guide / all-time install data</div>
        <h1 className="display max-w-5xl text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          best agent skills.<br /><span className="text-[var(--color-grape)]">ranked live.</span>
        </h1>
        <p className="type-font mt-8 max-w-3xl text-base leading-7 text-[var(--color-ink-soft)]">
          The best Agent Skill is the one that safely solves your specific job. This live ranking starts with measurable ecosystem adoption—current all-time installs—then explains how to evaluate source quality, permissions, maintenance, and task fit before choosing. Rankings refresh every five minutes and never include paid placement.
        </p>
        <p className="type-font mt-4 text-xs text-[var(--color-rust)]">Written and checked by <MotionLink href="/about">{siteConfig.name}</MotionLink>. <time dateTime={published}>Updated July 15, 2026.</time></p>
      </header>

      <div className="prose-zine type-font mt-10 max-w-none leading-relaxed">
        <section id="ranking">
          <h2>What are the best Agent Skills right now?</h2>
          <p>
            These are the twenty most-installed non-duplicate entries returned by the live all-time catalog. Install count is useful evidence of adoption, but not a quality score. Open each listing to read its complete <code>SKILL.md</code>, source, install command, and available partner audit summaries.
          </p>
        </section>
      </div>

      {skills.length > 0 ? (
        <div className="mt-6"><SkillLeaderboard skills={skills} /></div>
      ) : (
        <div className="ink-frame mt-6 p-8 text-center"><p className="display text-2xl">live ranking temporarily unavailable</p></div>
      )}

      <div className="prose-zine type-font mt-12 max-w-none leading-relaxed">
        <section id="method">
          <h2>How does skillZs rank the best Agent Skills?</h2>
          <p>
            The list uses the all-time install order supplied by the live <a href="https://skills.sh" target="_blank" rel="noreferrer">skills.sh ecosystem</a>, removes entries flagged as duplicates, and displays the first twenty results without editorial boosts. No publisher can buy a position. The complete policy is documented in the <MotionLink href="/about">skillZs ranking methodology</MotionLink>.
          </p>
          <p>
            This answers &quot;most adopted,&quot; not &quot;best for every person.&quot; Use <MotionLink href="/browse?view=trending">trending rankings</MotionLink> for recent momentum, <MotionLink href="/browse?view=hot">hot rankings</MotionLink> for current activity, or the full <MotionLink href="/browse">Agent Skills Directory</MotionLink> to search a specific workflow.
          </p>
        </section>

        <section id="choose">
          <h2>Which Agent Skill should you install first?</h2>
          <p>
            Start with a narrow, reversible job you already understand: formatting a document, checking a pull request, generating a test plan, or applying a known framework convention. A focused skill is easier to verify than an autonomous bundle that changes many systems. Prefer a maintained source with clear triggers, examples, requirements, a license, and a small permission footprint.
          </p>
          <p>
            Compare the <MotionLink href="/category/coding">coding</MotionLink>, <MotionLink href="/category/agents">agent</MotionLink>, and <MotionLink href="/category/research">research</MotionLink> collections if you know the job category but not the skill name.
          </p>
        </section>

        <section id="evaluate">
          <h2>How should you evaluate a top-ranked Agent Skill?</h2>
          <ol>
            <li><strong>Match the job:</strong> the description should name the capability and realistic trigger conditions.</li>
            <li><strong>Read the source:</strong> inspect <code>SKILL.md</code>, referenced files, scripts, dependencies, and revision history.</li>
            <li><strong>Constrain access:</strong> grant only the files, tools, credentials, and network destinations the stated job requires.</li>
            <li><strong>Test the result:</strong> run a positive trigger, a negative trigger, and one small fixture with an observable acceptance condition.</li>
            <li><strong>Review updates:</strong> pin or record the reviewed revision and compare changes before upgrading.</li>
          </ol>
          <p>
            Follow the <MotionLink href="/guides/how-to-install-agent-skills">safe installation guide</MotionLink> and <MotionLink href="/guides/agent-skill-security">security checklist</MotionLink> before adoption. If no existing workflow fits, use the <MotionLink href="/guides/how-to-create-agent-skills">creation guide</MotionLink> to build a smaller skill yourself.
          </p>
        </section>

        <section id="faq">
          <h2>What do developers ask about the best Agent Skills?</h2>
          {faqs.map((item) => <div key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></div>)}
        </section>
      </div>
    </article>
  );
}
