"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const TABS = [
  { key: "hot",   label: "hot" },
  { key: "new",   label: "fresh" },
  { key: "votes", label: "most voted" },
  { key: "uses",  label: "most used" },
  { key: "stars", label: "most starred" },
] as const;

export function SortTabs() {
  const params = useSearchParams();
  const activeSort = params.get("sort") ?? "hot";
  const coveredOnly = params.get("covered") === "1";

  function buildHref(overrides: { sort?: string; covered?: boolean }) {
    const sp = new URLSearchParams();
    const s = overrides.sort ?? activeSort;
    const cov = overrides.covered ?? coveredOnly;
    if (s !== "hot") sp.set("sort", s);
    if (cov) sp.set("covered", "1");
    const qs = sp.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <div className="mt-12 mb-2 px-1">
      <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
        <h3 className="tag-font text-2xl text-[var(--color-grape)] rotate-[-1.5deg]">
          ✦ pick your poison
        </h3>
        <Link
          href={buildHref({ covered: !coveredOnly })}
          scroll={false}
          className="tag-pill"
          data-active={coveredOnly || undefined}
          style={coveredOnly ? { background: "var(--color-olive)", color: "var(--color-ink)" } : undefined}
        >
          {coveredOnly ? "✓ tagged only" : "filter: tagged covers"}
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={buildHref({ sort: t.key })}
            scroll={false}
            className="tag-pill text-base"
            data-active={t.key === activeSort || undefined}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
