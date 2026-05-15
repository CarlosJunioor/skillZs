import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SkillCard } from "@/components/skill-card";
import { fetchBrowse, type SortKey } from "@/lib/stats";
import { compactNumber } from "@/lib/format";
import { buildPageMetadata, collectionJsonLd } from "@/lib/seo";

export const revalidate = 120;

const BROWSE_TITLE = "Browse Claude skills";
const BROWSE_DESCRIPTION =
  "Browse the full skillZs catalog of Claude skills by category, freshness, votes, usage, and GitHub stars.";

export const metadata: Metadata = buildPageMetadata({
  title: BROWSE_TITLE,
  description: BROWSE_DESCRIPTION,
  path: "/browse",
});

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "hot", label: "hot" },
  { key: "new", label: "fresh" },
  { key: "votes", label: "most voted" },
  { key: "uses", label: "most used" },
  { key: "stars", label: "most starred" },
];

const CATS: Array<{ key: string; label: string }> = [
  { key: "all", label: "all" },
  { key: "coding", label: "coding" },
  { key: "creative", label: "creative" },
  { key: "agent", label: "agents" },
  { key: "utils", label: "utils" },
  { key: "research", label: "research" },
  { key: "other", label: "misc" },
];

const PAGE = 60;
const MAX_PAGE = 100;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; cat?: string; page?: string; covered?: string }>;
}) {
  const sp = await searchParams;
  const sort = (SORTS.find((s) => s.key === sp.sort)?.key ?? "hot") as SortKey;
  const cat = CATS.find((c) => c.key === sp.cat)?.key ?? "all";
  const coveredOnly = sp.covered === "1";
  const requestedPage = Number(sp.page ?? "1");
  const page = Number.isInteger(requestedPage)
    ? Math.min(MAX_PAGE, Math.max(1, requestedPage))
    : 1;
  const offset = (page - 1) * PAGE;

  const { skills, total } = await fetchBrowse({
    sort,
    category: cat === "all" ? null : cat,
    limit: PAGE,
    offset,
    coveredOnly,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE));
  const buildHref = (overrides: { sort?: string; cat?: string; page?: number; covered?: boolean }) => {
    const params = new URLSearchParams();
    const s = overrides.sort ?? sort;
    const c = overrides.cat ?? cat;
    const p = overrides.page ?? page;
    const cov = overrides.covered ?? coveredOnly;
    if (s !== "hot") params.set("sort", s);
    if (c !== "all") params.set("cat", c);
    if (p !== 1) params.set("page", String(p));
    if (cov) params.set("covered", "1");
    const qs = params.toString();
    return `/browse${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="pt-8">
      <JsonLd
        data={collectionJsonLd({
          path: "/browse",
          name: BROWSE_TITLE,
          description: BROWSE_DESCRIPTION,
          skills,
        })}
      />
      <header className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <h1 className="display text-5xl md:text-7xl leading-none">
          <span className="drip">browse</span>
        </h1>
        <span className="tag-font text-[var(--color-grape)] text-2xl rotate-[-2deg]">
          {compactNumber(total)} skills tagged
        </span>
      </header>

      <div className="ink-frame-soft bg-[var(--color-paper-2)] p-4 mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag-font text-[var(--color-grape)] mr-2">sort:</span>
          {SORTS.map((s) => (
            <Link key={s.key} href={buildHref({ sort: s.key, page: 1 })} scroll={false}
              className="tag-pill" data-active={s.key === sort || undefined}>
              {s.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag-font text-[var(--color-grape)] mr-2">vibe:</span>
          {CATS.map((c) => (
            <Link key={c.key} href={buildHref({ cat: c.key, page: 1 })} scroll={false}
              className="tag-pill" data-active={c.key === cat || undefined}>
              {c.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t-2 border-dashed border-[var(--color-ink-soft)]">
          <span className="tag-font text-[var(--color-grape)] mr-2">filter:</span>
          <Link href={buildHref({ covered: !coveredOnly, page: 1 })} scroll={false}
            className="tag-pill" data-active={coveredOnly || undefined}>
            {coveredOnly ? "\u2713 tagged covers only" : "tagged covers only"}
          </Link>
        </div>
      </div>

      {skills.length === 0 ? (
        <div className="ink-frame p-16 text-center bg-[var(--color-paper-2)]">
          <p className="display text-3xl mb-2">nothing tagged</p>
          <p className="type-font">try another filter combo</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {skills.map((s) => (
            <SkillCard key={s.id} skill={s} size="sm" />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-3 flex-wrap">
          {page > 1 && (
            <Link href={buildHref({ page: page - 1 })} className="tag-pill">&larr; prev</Link>
          )}
          <span className="type-font text-sm text-[var(--color-rust)]">
            page {page} / {totalPages} - showing {offset + 1}-{Math.min(offset + PAGE, total)} of {compactNumber(total)}
          </span>
          {page < totalPages && (
            <Link href={buildHref({ page: page + 1 })} className="tag-pill">next &rarr;</Link>
          )}
        </div>
      )}
    </div>
  );
}
