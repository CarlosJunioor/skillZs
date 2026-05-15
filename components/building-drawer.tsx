// components/building-drawer.tsx
import Link from "next/link";
import type { Character } from "@/lib/types";

interface Props {
  character: Character;
}

/**
 * Slide-in panel for the town map. Server-rendered; open state is driven by
 * the ?building=slug search param on /. Content mirrors CharacterHero
 * (identity content only — no skills row; that lives on /character/[slug]).
 */
export function BuildingDrawer({ character: c }: Props) {
  return (
    <aside className="fixed inset-x-0 bottom-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[420px] z-40 bg-[var(--color-paper)] border-t-[3px] lg:border-l-[3px] lg:border-t-0 border-[var(--color-ink)] p-6 overflow-y-auto">
      <div className="flex items-start justify-between mb-4">
        <span className="bubble text-xs">
          {c.kind === "zeke" ? "in-house" : "influencer"}
        </span>
        <Link href="/" aria-label="close" className="display text-2xl leading-none">
          ×
        </Link>
      </div>

      <div className="ink-frame relative w-full aspect-square overflow-hidden grain bg-[var(--color-mauve)] mb-5">
        {c.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="display text-6xl text-[var(--color-paper)]">?!</span>
          </div>
        )}
      </div>

      <h2 className="display text-4xl leading-[0.92] mb-2 break-words">
        <span className="drip">{c.name}</span>
      </h2>

      {c.role && (
        <p className="tag-font text-lg text-[var(--color-grape)] mb-3 leading-snug">
          {c.role}
        </p>
      )}

      {c.bio && (
        <p className="type-font text-base leading-relaxed mb-5">{c.bio}</p>
      )}

      <div className="flex flex-wrap gap-3 type-font text-sm pt-3 mb-5 border-t-2 border-[var(--color-ink)]">
        {c.gh_handle && (
          <a
            href={`https://github.com/${c.gh_handle}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--color-grape)]"
          >
            ↗ github
          </a>
        )}
        {c.x_handle && (
          <a
            href={`https://x.com/${c.x_handle}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--color-grape)]"
          >
            ↗ x
          </a>
        )}
        {c.site_url && (
          <a
            href={c.site_url}
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--color-grape)]"
          >
            ↗ site
          </a>
        )}
      </div>

      <Link
        href={`/character/${c.slug}`}
        className="block w-full ink-frame-soft bg-[var(--color-ink)] text-[var(--color-paper)] text-center py-3 display"
      >
        deep dive →
      </Link>
    </aside>
  );
}
