import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/motion/button";
import { Input } from "@/components/motion/input";
import { MotionLink } from "@/components/motion/motion-link";
import { SkillLeaderboard } from "@/components/skill-leaderboard";
import { absoluteUrl, siteConfig, buildPageMetadata } from "@/lib/seo";
import { catalogSkillPath, listCatalogSkills, type CatalogSkill } from "@/lib/skills-sh";

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: siteConfig.title,
  description: siteConfig.description,
  path: "/",
});

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

  return (
    <div className="pt-8">
      <JsonLd data={itemList} />

      <header className="py-12 md:py-20 border-b border-[#29313a] mb-10">
        <div className="type-font text-xs uppercase tracking-[0.18em] text-[var(--color-grape)] mb-6">
          ~/open-agent-registry <span className="text-[var(--color-rust)]">/ live</span>
        </div>
        <h1 className="display text-5xl sm:text-7xl md:text-9xl leading-[0.86] mb-7 max-w-6xl">
          skills.<br /><span className="text-[var(--color-grape)]">indexed.</span>
        </h1>
        <p className="type-font text-sm md:text-base leading-relaxed max-w-2xl text-[var(--color-ink-soft)]">
          Search {total.toLocaleString()} reusable workflows for Claude Code, Codex, Cursor, and other agents. Ranked by real installs. No paid placement.
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

      <aside className="ink-frame-soft mt-14 p-6 md:p-8 bg-[var(--color-paper-2)] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="tag-font text-[var(--color-grape)] text-xs uppercase tracking-[0.16em] mb-2">Aquarius / experimental district</div>
          <h2 className="display text-2xl md:text-3xl">meet the people behind the skills.</h2>
        </div>
        <MotionLink href="/town" className="tag-pill shrink-0 px-5 py-3 text-sm">enter town →</MotionLink>
      </aside>
    </div>
  );
}
