import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MotionLink } from "@/components/motion/motion-link";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, siteConfig } from "@/lib/seo";

const path = "/guides/agent-skills-directories";
const title = "Agent Skills Directories Compared (2026)";
const description =
  "Compare skillZs, skills.sh, SkillsMP, and Agent-Skills.md by discovery, ranking, source review, security signals, installation, and submission.";
const reviewed = "2026-07-15";

const faqs = [
  {
    question: "Which Agent Skills directory should I use?",
    answer: "Use the directory whose evidence matches your decision. skillZs and skills.sh emphasize install activity, SkillsMP provides broad GitHub discovery, and Agent-Skills.md accepts direct repository submissions. Always inspect the canonical source before installing.",
  },
  {
    question: "Which directory has the safest Agent Skills?",
    answer: "No directory can make every listed skill safe. Check the complete SKILL.md, scripts, dependencies, permissions, source history, and exact revision. Treat install counts, stars, and directory inclusion as discovery signals rather than security certification.",
  },
  {
    question: "How can I list my own Agent Skill?",
    answer: "Publish a valid SKILL.md in a public GitHub repository. skills.sh can discover it through skills CLI installs, SkillsMP documents daily GitHub synchronization using relevant repository topics, and Agent-Skills.md accepts a direct GitHub folder URL.",
  },
  {
    question: "Are Agent Skills directories the same as package registries?",
    answer: "Not necessarily. Most directories index files hosted in source repositories and provide discovery or install guidance. Verify the source, license, revision, and installation behavior instead of assuming package-registry guarantees.",
  },
] as const;

export const metadata: Metadata = buildPageMetadata({ title, description, path, type: "article" });

export default function AgentSkillsDirectoriesGuide() {
  const article = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": absoluteUrl(`${path}#article`),
    headline: title,
    description,
    url: absoluteUrl(path),
    datePublished: reviewed,
    dateModified: reviewed,
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
          { name: "Agent Skills Directories", path },
        ]),
      ]} />

      <nav aria-label="Breadcrumb" className="type-font mb-6 text-xs text-[var(--color-rust)]">
        <ol className="flex flex-wrap gap-2">
          <li><MotionLink href="/" className="hover:text-[var(--color-grape)]">skillZs</MotionLink></li>
          <li aria-hidden>/</li>
          <li><MotionLink href="/guides" className="hover:text-[var(--color-grape)]">guides</MotionLink></li>
          <li aria-hidden>/</li>
          <li aria-current="page">Agent Skills directories</li>
        </ol>
      </nav>

      <header className="border-b border-[#29313a] pb-10">
        <div className="tag-font mb-5 text-xs uppercase tracking-[0.16em] text-[var(--color-grape)]">field guide / directory comparison</div>
        <h1 className="display max-w-5xl text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          agent skills<br /><span className="text-[var(--color-grape)]">directories.</span>
        </h1>
        <p className="type-font mt-8 max-w-3xl text-base leading-7 text-[var(--color-ink-soft)]">
          Agent Skills directories solve different discovery problems. skillZs and skills.sh surface install activity, SkillsMP searches a broad GitHub-derived catalog, and Agent-Skills.md accepts direct repository submissions. The best directory is the one that exposes enough source evidence for your decision; no listing, star count, or install total replaces reviewing the actual skill.
        </p>
        <p className="type-font mt-4 text-xs text-[var(--color-rust)]">Written and checked by <MotionLink href="/about">{siteConfig.name}</MotionLink>. <time dateTime={reviewed}>Reviewed July 15, 2026.</time></p>
      </header>

      <div className="prose-zine type-font mt-10 max-w-none leading-relaxed">
        <section id="comparison">
          <h2>How do the main Agent Skills directories compare?</h2>
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Directory</th><th>Best for</th><th>Discovery and ranking</th><th>Evidence to inspect</th></tr></thead>
              <tbody>
                <tr><td><strong>skillZs</strong></td><td>Cross-client discovery plus practical guides</td><td>Live skills.sh API views for all-time installs, trending, and hot activity</td><td>Full manual, canonical source, install command, duplicate status, and available partner audits</td></tr>
                <tr><td><strong>skills.sh</strong></td><td>CLI installation and adoption-ranked discovery</td><td>Anonymous skills CLI installation telemetry powers its leaderboard</td><td>Source repository, skill files, install count, topics, and available security audits</td></tr>
                <tr><td><strong>SkillsMP</strong></td><td>Broad GitHub search by keyword, creator, category, or occupation</td><td>Daily GitHub indexing; stars and recency are visible discovery signals</td><td>SKILL.md, repository, creator, update date, stars, forks, and compatibility information</td></tr>
                <tr><td><strong>Agent-Skills.md</strong></td><td>Direct URL submission and consistent skill previews</td><td>Parses valid GitHub skill folders submitted through its public form</td><td>Rendered SKILL.md, repository, author, file tree, download, and install commands</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            These catalogs overlap but are not interchangeable. A broad index may maximize recall while an adoption-ranked view helps identify established workflows. Use the <MotionLink href="/browse">skillZs Agent Skills directory</MotionLink> for live comparison, then open the source repository before deciding.
          </p>
        </section>

        <section id="choose">
          <h2>Which Agent Skills directory should you choose?</h2>
          <ul>
            <li><strong>Choose skillZs</strong> when you want source-aware discovery, live install views, security context, and guides in one place.</li>
            <li><strong>Choose skills.sh</strong> when the skills CLI and its installation leaderboard are your primary workflow.</li>
            <li><strong>Choose SkillsMP</strong> when you need broad GitHub coverage or want to search by creator, repository, category, or occupation.</li>
            <li><strong>Choose Agent-Skills.md</strong> when you want a repository parsed through a direct public submission path.</li>
          </ul>
          <p>
            Do not force a single winner. Search more than one directory when the task is niche, compare no more than a few credible candidates, and follow the <MotionLink href="/guides/how-to-install-agent-skills">safe installation guide</MotionLink> before copying files or running commands.
          </p>
        </section>

        <section id="ranking">
          <h2>What do directory rankings actually prove?</h2>
          <p>
            Install counts show adoption, stars show repository attention, recency shows maintenance activity, and audits show the result of one defined check. None proves that a skill fits your task, remains safe after an update, or works in your client. The <MotionLink href="/guides/best-agent-skills">live rankings guide</MotionLink> explains how skillZs uses install data without treating popularity as endorsement.
          </p>
          <p>
            Prefer transparent inputs over unexplained scores. Check the publisher, complete instructions, bundled scripts, dependencies, permissions, network behavior, tested clients, revision, and license. Use the <MotionLink href="/guides/agent-skill-security">Agent Skill security checklist</MotionLink> for a repeatable review.
          </p>
        </section>

        <section id="publish">
          <h2>How do creators get listed in each directory?</h2>
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Directory</th><th>Documented path</th></tr></thead>
              <tbody>
                <tr><td>skillZs</td><td>Publish to the skills.sh ecosystem; eligible non-duplicate API records are mirrored automatically.</td></tr>
                <tr><td>skills.sh</td><td>Host the skill on GitHub and earn installations through <code>npx skills add owner/repo</code>; anonymous telemetry can add it to the leaderboard.</td></tr>
                <tr><td>SkillsMP</td><td>Use a public GitHub repository with valid frontmatter and the documented <code>claude-skills</code> or <code>claude-code-skill</code> topic, then wait for daily synchronization.</td></tr>
                <tr><td>Agent-Skills.md</td><td>Paste the GitHub repository or skill-folder URL into its public submission form.</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Start with the <MotionLink href="/guides/how-to-create-agent-skills">creation guide</MotionLink>, verify the public source, and use the <MotionLink href="/guides/how-to-publish-agent-skills">publishing guide</MotionLink> to document compatibility, permissions, installation, and trust signals. Distribution should follow a useful tested workflow, not replace one.
          </p>
        </section>

        <section id="verify">
          <h2>How should you verify a directory result?</h2>
          <ol>
            <li>Confirm the listing links to a canonical public source.</li>
            <li>Read the full <code>SKILL.md</code> and every referenced executable file.</li>
            <li>Check the exact tools, credentials, network access, and write permissions required.</li>
            <li>Separate adoption signals from audits and audits from guarantees.</li>
            <li>Install in a disposable project and test one reversible task.</li>
            <li>Record the revision and re-review meaningful updates.</li>
          </ol>
          <p>
            The <MotionLink href="/research/agent-skills-report-2026">Agent Skills Ecosystem Report</MotionLink> documents why source concentration and install data need careful interpretation. skillZs also publishes its <MotionLink href="/about">ranking methodology</MotionLink> and <MotionLink href="/policies">catalog policies</MotionLink> so those limits remain inspectable.
          </p>
        </section>

        <section id="faq">
          <h2>What do people ask about Agent Skills directories?</h2>
          {faqs.map((item) => <div key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></div>)}
        </section>

        <section id="sources">
          <h2>Which sources support this directory comparison?</h2>
          <p>
            This guide was checked against the official <a href="https://www.skills.sh/docs/faq" target="_blank" rel="noreferrer">skills.sh FAQ</a> and <a href="https://www.skills.sh/docs/cli" target="_blank" rel="noreferrer">CLI reference</a>, the <a href="https://skillsmp.com/docs/faq" target="_blank" rel="noreferrer">SkillsMP FAQ</a>, the <a href="https://agent-skills.md/" target="_blank" rel="noreferrer">Agent-Skills.md directory and submission documentation</a>, and the public <MotionLink href="/about">skillZs methodology</MotionLink>. Features and indexing policies can change, so follow each primary source for current submission rules.
          </p>
        </section>
      </div>
    </article>
  );
}
