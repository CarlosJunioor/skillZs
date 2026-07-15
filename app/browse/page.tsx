import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/motion/button";
import { Input } from "@/components/motion/input";
import { MotionLink } from "@/components/motion/motion-link";
import { RouteTabs } from "@/components/motion/route-tabs";
import { SkillLeaderboard } from "@/components/skill-leaderboard";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";
import {
  catalogSkillPath,
  listCatalogSkills,
  searchCatalogSkills,
  type CatalogSkill,
  type CatalogView,
} from "@/lib/skills-sh";

export const revalidate = 60;

const browseDescription = "Browse the Agent Skills directory for Claude Code, Codex, Cursor, and other AI tools. Search SKILL.md workflows ranked by live installs.";

const BROWSE_FAQS = [
  {
    question: "What are the most popular AI agent skills?",
    answer: "The default directory view ranks Agent Skills by all-time ecosystem installs. Trending shows recent momentum and hot shows current activity. These rankings are discovery signals, not endorsements.",
  },
  {
    question: "How do you choose the right agent skill?",
    answer: "Match the skill description to one concrete job, read the complete SKILL.md, verify tools and permissions, then test the workflow on a small reversible task before using it on important work.",
  },
] as const;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string; q?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const isVariant = Boolean(sp.q || sp.view || (sp.page && sp.page !== "1"));
  return buildPageMetadata({
    title: "Agent Skills Directory: Browse All Skills",
    description: browseDescription,
    path: "/browse",
    noIndex: isVariant,
  });
}

const VIEWS: Array<{ key: CatalogView; label: string }> = [
  { key: "all-time", label: "most installed" },
  { key: "trending", label: "trending" },
  { key: "hot", label: "hot now" },
];
const PER_PAGE = 100;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const view = VIEWS.find((item) => item.key === sp.view)?.key ?? "all-time";
  const requestedPage = Number(sp.page ?? "1");
  const page = Number.isInteger(requestedPage) ? Math.max(1, requestedPage) : 1;
  const rawQuery = (sp.q ?? "").trim().slice(0, 100);
  const query = rawQuery.length >= 2 ? rawQuery : "";
  let skills: CatalogSkill[] = [];
  let total = 0;
  let hasMore = false;
  let loadError = false;

  try {
    if (query.length >= 2) {
      skills = await searchCatalogSkills(query, 200);
      total = skills.length;
    } else {
      const result = await listCatalogSkills({ view, page: page - 1, perPage: PER_PAGE });
      skills = result.data;
      total = result.pagination.total;
      hasMore = result.pagination.hasMore;
    }
  } catch (error) {
    console.error("browse catalog fetch failed:", error);
    loadError = true;
  }

  const hrefFor = (next: { view?: CatalogView; page?: number }) => {
    const params = new URLSearchParams();
    const nextView = next.view ?? view;
    const nextPage = next.page ?? page;
    if (nextView !== "all-time") params.set("view", nextView);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return `/browse${qs ? `?${qs}` : ""}`;
  };
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Agent Skills Directory",
    description: browseDescription,
    url: absoluteUrl("/browse"),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: skills.length,
      itemListElement: skills.map((skill, index) => ({
        "@type": "ListItem",
        position: (page - 1) * PER_PAGE + index + 1,
        name: skill.name,
        url: absoluteUrl(catalogSkillPath(skill)),
      })),
    },
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: BROWSE_FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div className="pt-8">
      <JsonLd data={[
        collection,
        faq,
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Agent Skills Directory", path: "/browse" },
        ]),
      ]} />
      <header className="mb-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <h1 className="display text-5xl md:text-7xl leading-none"><span className="drip">agent skills directory</span></h1>
          <span className="tag-font text-[var(--color-grape)] text-xl rotate-[-2deg]">
            {query ? `${total} matches` : `${total.toLocaleString()} indexed`}
          </span>
        </div>
        <p className="type-font mt-5 max-w-3xl text-sm leading-6 text-[var(--color-ink-soft)]">
          The skillZs Agent Skills Directory indexes reusable SKILL.md workflows for Claude Code, Codex, Cursor, and other compatible AI tools. Search by job or technology, compare live install rankings, inspect the original source and manual, then review permissions before installing.
        </p>
      </header>

      <div className="ink-frame-soft bg-[var(--color-paper-2)] p-4 mb-8 space-y-4">
        <form action="/browse" className="flex flex-wrap items-center gap-2">
          <label htmlFor="skill-search" className="tag-font text-[var(--color-grape)] mr-2">search:</label>
          <Input
            id="skill-search"
            name="q"
            type="search"
            defaultValue={query}
            minLength={2}
            placeholder="react native, code review, postgres..."
            className="min-w-[210px] flex-1"
            classNames={{
              field: "h-10 rounded-none bg-[var(--color-paper)]",
              input: "type-font px-3 text-sm",
            }}
          />
          <Button type="submit" size="md" ripple className="tag-font rounded-none uppercase tracking-[0.06em]">search</Button>
          {query && <MotionLink href="/browse" className="tag-pill">clear</MotionLink>}
        </form>
        {!query && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t-2 border-dashed border-[var(--color-ink-soft)]">
            <span className="tag-font text-[var(--color-grape)] mr-2">rank:</span>
            <RouteTabs
              tabs={VIEWS.map((item) => ({
                href: hrefFor({ view: item.key, page: 1 }),
                label: item.label,
                active: view === item.key,
              }))}
            />
          </div>
        )}
      </div>

      {loadError ? (
        <div className="ink-frame p-10 text-center"><p className="display text-2xl">catalog unavailable</p></div>
      ) : skills.length > 0 ? (
        <SkillLeaderboard skills={skills} startRank={query ? 1 : (page - 1) * PER_PAGE + 1} />
      ) : (
        <div className="ink-frame p-10 text-center"><p className="display text-2xl">nothing found</p></div>
      )}

      <section className="mt-12 grid gap-5 md:grid-cols-2" aria-label="About the agent skill catalog">
        <article className="ink-frame-soft bg-[var(--color-paper-2)] p-6">
          <h2 className="display text-2xl">{BROWSE_FAQS[0].question}</h2>
          <p className="type-font mt-3 text-sm leading-6">
            {BROWSE_FAQS[0].answer} See the methodology and current leaders in the <MotionLink href="/guides/best-agent-skills">best Agent Skills ranking guide</MotionLink>.
          </p>
        </article>
        <article className="ink-frame-soft bg-[var(--color-paper-2)] p-6">
          <h2 className="display text-2xl">{BROWSE_FAQS[1].question}</h2>
          <p className="type-font mt-3 text-sm leading-6">
            {BROWSE_FAQS[1].answer} To build your own workflow, use the <MotionLink href="/guides/how-to-create-agent-skills">agent skill creation guide</MotionLink>.
          </p>
        </article>
      </section>

      {!query && (page > 1 || hasMore) && (
        <nav aria-label="Catalog pages" className="mt-10 flex items-center justify-center gap-3">
          {page > 1 && <MotionLink href={hrefFor({ page: page - 1 })} className="tag-pill">← previous</MotionLink>}
          <span className="type-font text-sm">page {page}</span>
          {hasMore && <MotionLink href={hrefFor({ page: page + 1 })} className="tag-pill">next →</MotionLink>}
        </nav>
      )}
    </div>
  );
}
