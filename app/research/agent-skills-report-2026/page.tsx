import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MotionLink } from "@/components/motion/motion-link";
import { summarizeAgentSkills } from "@/lib/agent-skills-report";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, siteConfig } from "@/lib/seo";
import { listCatalogSkills } from "@/lib/skills-sh";

export const revalidate = 3600;

const path = "/research/agent-skills-report-2026";
const title = "Agent Skills Ecosystem Report 2026";
const description =
  "Explore live Agent Skills ecosystem statistics: catalog size, installs, source concentration, methodology, adoption limits, and creator lessons.";
const published = "2026-07-15";

export const metadata: Metadata = buildPageMetadata({ title, description, path, type: "article" });

const number = new Intl.NumberFormat("en-US");
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

export default async function AgentSkillsReportPage() {
  let report = summarizeAgentSkills([], 0);

  try {
    const catalog = await listCatalogSkills({ view: "all-time", perPage: 500 });
    report = summarizeAgentSkills(catalog.data, catalog.pagination.total);
  } catch (error) {
    console.error("agent skills report fetch failed:", error);
  }

  const faqs = [
    {
      question: "How many Agent Skills are in the ecosystem?",
      answer: report.ecosystemTotal > 0
        ? `The live skills.sh API currently reports ${number.format(report.ecosystemTotal)} catalog entries. The total can include duplicates and changes as repositories are discovered.`
        : "The live ecosystem count is temporarily unavailable. This page refreshes the upstream data every hour.",
    },
    {
      question: "Does an install count measure Agent Skill quality?",
      answer: "No. It measures adoption reported through anonymous skills CLI telemetry. It does not prove correctness, security, compatibility, maintenance, or task fit.",
    },
    {
      question: "Can I cite this Agent Skills report?",
      answer: "Yes. Cite skillZs, the page URL, the access date, and the stated top-500 all-time sample. Link to the methodology so readers can understand the source and limits.",
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
  const dataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: title,
    description,
    url: absoluteUrl(path),
    dateModified: published,
    creator: { "@id": absoluteUrl("/#organization") },
    measurementTechnique: "Top 500 all-time skills.sh API entries, excluding entries flagged as duplicates",
    variableMeasured: ["catalog entries", "install counts", "unique sources", "top-ten install share"],
    isBasedOn: "https://skills.sh/docs/api",
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
        dataset,
        faq,
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Agent Skills Report 2026", path },
        ]),
      ]} />

      <nav aria-label="Breadcrumb" className="type-font mb-6 text-xs text-[var(--color-rust)]">
        <ol className="flex flex-wrap gap-2">
          <li><MotionLink href="/" className="hover:text-[var(--color-grape)]">skillZs</MotionLink></li>
          <li aria-hidden>/</li>
          <li><MotionLink href="/guides" className="hover:text-[var(--color-grape)]">guides</MotionLink></li>
          <li aria-hidden>/</li>
          <li aria-current="page">Agent Skills report 2026</li>
        </ol>
      </nav>

      <header className="border-b border-[#29313a] pb-10">
        <div className="tag-font mb-5 text-xs uppercase tracking-[0.16em] text-[var(--color-grape)]">live research / top-500 all-time sample</div>
        <h1 className="display max-w-5xl text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          agent skills.<br /><span className="text-[var(--color-grape)]">ecosystem report.</span>
        </h1>
        <p className="type-font mt-8 max-w-3xl text-base leading-7 text-[var(--color-ink-soft)]">
          The 2026 Agent Skills ecosystem is large, concentrated, and still easy to misread. This live report analyzes the first 500 all-time skills.sh results, removes entries flagged as duplicates, and separates measurable adoption from quality claims. Use it to understand the market, choose safer skills, or publish work that earns trust instead of chasing installs alone.
        </p>
        <p className="type-font mt-4 text-xs text-[var(--color-rust)]">Analyzed by <MotionLink href="/about">{siteConfig.name}</MotionLink>. <time dateTime={published}>Method published July 15, 2026.</time> Data refreshes hourly.</p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Agent Skills ecosystem statistics">
        {[
          ["catalog entries", number.format(report.ecosystemTotal)],
          ["non-duplicate sample", number.format(report.sampleSize)],
          ["sample installs", number.format(report.sampleInstalls)],
          ["unique sources", number.format(report.uniqueSources)],
        ].map(([label, value]) => (
          <div key={label} className="ink-frame-soft bg-[var(--color-paper-2)] p-5">
            <div className="display text-4xl text-[var(--color-grape)]">{value}</div>
            <div className="tag-font mt-2 text-xs uppercase tracking-[0.12em] text-[var(--color-rust)]">{label}</div>
          </div>
        ))}
      </section>

      <div className="prose-zine type-font mt-10 max-w-none leading-relaxed">
        <section id="findings">
          <h2>What does the 2026 Agent Skills data show?</h2>
          {report.sampleSize > 0 ? (
            <p>
              The API reports <strong>{number.format(report.ecosystemTotal)} catalog entries</strong>. In the first {number.format(report.sampleSize)} non-duplicate all-time results, skills have accumulated <strong>{number.format(report.sampleInstalls)} installs</strong>. The median entry in this high-adoption sample has {number.format(report.medianInstalls)} installs, while the top ten account for {percent.format(report.topTenShare)} of sampled installs. Those figures describe the ranked sample, not the entire long tail.
            </p>
          ) : (
            <p>The live data is temporarily unavailable. The methodology and interpretation guidance remain available below, and the page will retry on its next hourly refresh.</p>
          )}
          <p>
            Adoption is not evenly distributed across maintainers. The sample contains {number.format(report.uniqueSources)} unique repositories, and multi-skill repositories can accumulate installs across several entries. That makes repository reputation, distribution, and documentation important, but it does not turn popularity into a security review.
          </p>
        </section>

        <section id="sources">
          <h2>Which repositories lead the sampled Agent Skills ecosystem?</h2>
          <ol>
            {report.topSources.map((source) => (
              <li key={source.source}>
                <strong>{source.source}</strong>: {number.format(source.installs)} sampled installs across {number.format(source.skills)} {source.skills === 1 ? "skill" : "skills"}.
              </li>
            ))}
          </ol>
          <p>Repository totals are calculated only from the current top-500 all-time response after duplicate flags are removed. They are a reproducible snapshot, not a claim about every skill a maintainer has ever published.</p>
        </section>

        <section id="methodology">
          <h2>How is the Agent Skills report calculated?</h2>
          <ol>
            <li>Request the first 500 entries from the official all-time skills.sh API view.</li>
            <li>Remove entries whose upstream record is explicitly flagged as a duplicate.</li>
            <li>Sum installs, count unique source repositories, calculate the median, and measure the top-ten share.</li>
            <li>Group sampled installs by exact source repository and publish the ten largest totals.</li>
            <li>Refresh the server-rendered analysis once per hour while preserving the published method and caveats.</li>
          </ol>
          <p>
            The upstream <a href="https://skills.sh/docs" target="_blank" rel="noreferrer">skills.sh documentation</a> says leaderboard installs come from anonymous CLI telemetry. The <a href="https://skills.sh/docs/cli" target="_blank" rel="noreferrer">CLI reference</a> explains what is collected and how users can opt out. Opt-outs, non-CLI installs, duplicates, changing rankings, and a capped sample all limit what these numbers can prove.
          </p>
        </section>

        <section id="lessons">
          <h2>What should Agent Skill creators learn from the report?</h2>
          <p>
            Publish one inspectable source, solve a narrow job, test the public installation path, document permissions and compatibility, and maintain the repository after launch. Distribution matters, but durable recommendations come from usefulness and trust. Follow the <MotionLink href="/guides/how-to-create-agent-skills">creation guide</MotionLink>, <MotionLink href="/guides/how-to-publish-agent-skills">publishing guide</MotionLink>, and <MotionLink href="/guides/agent-skill-security">security checklist</MotionLink> before asking others to install.
          </p>
          <p>
            Readers choosing a workflow should compare the <MotionLink href="/guides/best-agent-skills">live top-20 rankings</MotionLink>, search the full <MotionLink href="/browse">Agent Skills Directory</MotionLink>, and inspect the exact source revision. Treat installs as one signal among task fit, maintenance, permissions, tests, and available audits.
          </p>
        </section>

        <section id="faq">
          <h2>What do people ask about Agent Skills statistics?</h2>
          {faqs.map((item) => <div key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></div>)}
        </section>
      </div>
    </article>
  );
}
