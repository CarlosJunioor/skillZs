import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/motion/button";
import { Input } from "@/components/motion/input";
import { MotionLink } from "@/components/motion/motion-link";
import { SkillLeaderboard } from "@/components/skill-leaderboard";
import { absoluteUrl, siteConfig, buildPageMetadata } from "@/lib/seo";
import { catalogSkillPath, listCatalogSkills, type CatalogSkill } from "@/lib/skills-sh";

export const revalidate = 300;

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: siteConfig.title,
    description: siteConfig.description,
    path: "/",
  }),
  title: { absolute: siteConfig.title },
};

const HOME_FAQS = [
  {
    question: "What is an AI agent skill?",
    answer: "An AI agent skill is a reusable folder of instructions and optional scripts, references, or assets that teaches a compatible agent how to perform a specific workflow.",
  },
  {
    question: "Where can I find agent skills?",
    answer: "Use the skillZs catalog to search skills from the open ecosystem, compare real install rankings, read each SKILL.md manual, inspect source links, and review available security checks.",
  },
  {
    question: "How do I create an agent skill?",
    answer: "Create a kebab-case folder with an uppercase SKILL.md file, add a precise name and description, write a focused workflow with a finish condition, then test both activation and output before publishing.",
  },
];

export default async function HomePage() {
  let skills: CatalogSkill[] = [];
  let total = 0;

  try {
    const page = await listCatalogSkills({ perPage: 10 });
    skills = page.data;
    total = page.pagination.total;
  } catch (error) {
    console.error("homepage catalog fetch failed:", error);
  }

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Most installed agent skills",
    numberOfItems: skills.length,
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
    mainEntity: HOME_FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div className="pt-8">
      <JsonLd data={[itemList, faq]} />

      <header className="py-12 md:py-20 border-b border-[#29313a] mb-10">
        <div className="type-font text-xs uppercase tracking-[0.18em] text-[var(--color-grape)] mb-6">
          ~/open-agent-registry <span className="text-[var(--color-rust)]">/ live</span>
        </div>
        <h1 className="display text-5xl sm:text-7xl md:text-9xl leading-[0.86] mb-7 max-w-6xl">
          agent skills<br /><span className="text-[var(--color-grape)]">hub. indexed.</span>
        </h1>
        <p className="type-font text-sm md:text-base leading-relaxed max-w-2xl text-[var(--color-ink-soft)]">
          skillZs is an open AI agent skills hub with {total.toLocaleString()} reusable workflows for Claude Code, Codex, Cursor, and other agents. Every listing links to its source and SKILL.md manual. Rankings use real ecosystem installs, with no paid placement. Compare, inspect, and install skills without creating an account.
        </p>
        <form action="/browse" className="mt-8 max-w-3xl flex border border-[#303944] bg-[#080a0c] focus-within:border-[var(--color-grape)] focus-within:shadow-[0_0_30px_rgba(85,214,255,0.08)]">
          <span className="type-font text-[var(--color-grape)] px-4 py-4 border-r border-[#303944]" aria-hidden>$</span>
          <label htmlFor="home-skill-search" className="sr-only">Search skills</label>
          <Input
            id="home-skill-search"
            name="q"
            type="search"
            minLength={2}
            placeholder="search react, security, postgres..."
            className="min-w-0 flex-1"
            classNames={{
              field: "h-full rounded-none border-0",
              input: "type-font px-4 py-4 text-sm placeholder:text-[#626b76]",
            }}
          />
          <Button type="submit" size="lg" ripple className="type-font h-auto rounded-none px-5 py-4 text-xs uppercase tracking-[0.12em]">
            find →
          </Button>
        </form>
      </header>

      <section className="mb-12 grid gap-5 md:grid-cols-2" aria-label="Agent skills explained">
        <article className="ink-frame-soft bg-[var(--color-paper-2)] p-6">
          <h2 className="display text-3xl">What are agent skills?</h2>
          <p className="type-font mt-3 text-sm leading-6">
            Agent skills package repeatable instructions, scripts, references, and templates in a portable folder. Compatible agents load the right skill when its description matches the task, giving Claude Code, Codex, Cursor, and other tools a consistent workflow without another long prompt.
          </p>
          <MotionLink href="/browse" className="tag-pill mt-5">browse all skills &rarr;</MotionLink>
        </article>
        <article className="ink-frame-soft bg-[var(--color-paper-2)] p-6">
          <h2 className="display text-3xl">How do you create an agent skill?</h2>
          <p className="type-font mt-3 text-sm leading-6">
            Start with one repeatable job. Add a valid SKILL.md, describe exactly when it should run, write verifiable steps, test positive and negative triggers, review permissions and scripts, then publish the folder with a license and examples.
          </p>
          <MotionLink href="/guides/how-to-create-agent-skills" className="tag-pill mt-5">read the complete guide &rarr;</MotionLink>
        </article>
      </section>

      {skills.length > 0 ? (
        <section aria-labelledby="leaderboard-heading">
          <div className="flex items-end justify-between gap-4 mb-5">
            <h2 id="leaderboard-heading" className="display text-3xl md:text-4xl leading-none">
              <span className="drip">most installed</span>
            </h2>
            <span className="tag-font text-xs text-[var(--color-rust)] uppercase tracking-[0.16em]">top 10 / all time</span>
          </div>
          <SkillLeaderboard skills={skills} />
        </section>
      ) : (
        <div className="ink-frame p-10 text-center bg-[var(--color-paper-2)]">
          <h2 className="display text-4xl mb-3">catalog unavailable</h2>
          <p className="type-font">The upstream skill index could not be reached.</p>
        </div>
      )}

      <section className="mt-14" aria-labelledby="home-faq-heading">
        <h2 id="home-faq-heading" className="display text-3xl md:text-4xl">Agent skills FAQ</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {HOME_FAQS.map((item) => (
            <article key={item.question} className="ink-frame-soft bg-[var(--color-paper-2)] p-5">
              <h3 className="display text-xl leading-tight">{item.question}</h3>
              <p className="type-font mt-3 text-sm leading-6">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

    </div>
  );
}
