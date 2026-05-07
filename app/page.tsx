import { HeroCarousel } from "@/components/hero-carousel";
import { Manifesto } from "@/components/manifesto";
import { SkillRow } from "@/components/skill-row";
import { SortTabs } from "@/components/sort-tabs";
import {
  fetchByCategory,
  fetchHero,
  fetchNew,
  fetchTrending,
  type SortKey,
} from "@/lib/stats";

export const revalidate = 300;

const SORT_TITLE: Record<SortKey, string> = {
  hot:   "what's hot",
  new:   "fresh drops",
  votes: "most voted",
  uses:  "most used",
  stars: "most starred",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; covered?: string }>;
}) {
  const sp = await searchParams;
  const valid = ["hot", "new", "votes", "uses", "stars"] as const;
  const sort: SortKey = (valid as readonly string[]).includes(sp.sort ?? "")
    ? (sp.sort as SortKey)
    : "hot";
  const coveredOnly = sp.covered === "1";

  let hero = [] as Awaited<ReturnType<typeof fetchHero>>;
  let trending = [] as Awaited<ReturnType<typeof fetchTrending>>;
  let fresh = [] as Awaited<ReturnType<typeof fetchNew>>;
  let coding = [] as Awaited<ReturnType<typeof fetchByCategory>>;
  let creative = [] as Awaited<ReturnType<typeof fetchByCategory>>;
  let agents = [] as Awaited<ReturnType<typeof fetchByCategory>>;
  let utils = [] as Awaited<ReturnType<typeof fetchByCategory>>;

  try {
    [hero, trending, fresh, coding, creative, agents, utils] = await Promise.all([
      fetchHero(5, coveredOnly),
      fetchTrending(24, sort, coveredOnly),
      fetchNew(12, coveredOnly),
      fetchByCategory("coding", 12, coveredOnly),
      fetchByCategory("creative", 12, coveredOnly),
      fetchByCategory("agent", 12, coveredOnly),
      fetchByCategory("utils", 12, coveredOnly),
    ]);
  } catch (e) {
    console.error("home fetch failed:", e);
  }

  const hasData = hero.length > 0 || trending.length > 0;

  return (
    <div className="pt-2">
      <HeroCarousel skills={hero} />

      {!hasData && (
        <div className="ink-frame mt-10 p-10 text-center bg-[var(--color-paper-2)]">
          <h2 className="display text-4xl mb-3">empty zine</h2>
          <p className="type-font mb-4">no skills yet. trigger ingest:</p>
          <code className="type-font bg-[var(--color-ink)] text-[var(--color-paper)] px-4 py-2 inline-block">
            POST /api/cron/ingest
          </code>
        </div>
      )}

      <Manifesto />

      <SortTabs />

      <SkillRow title={SORT_TITLE[sort]} skills={trending} size="md" />

      {sort !== "new" && (
        <SkillRow title="fresh drops" skills={fresh} />
      )}
      <SkillRow title="coding" skills={coding} />
      <SkillRow title="creative" skills={creative} watermark />
      <SkillRow title="agents" skills={agents} />
      <SkillRow title="utils" skills={utils} />
    </div>
  );
}
