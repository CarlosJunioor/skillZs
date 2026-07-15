"use client";

import { Drawer } from "@/components/motion/drawer";
import { MotionLink } from "@/components/motion/motion-link";
import type { Character } from "@/lib/types";

interface Props {
  character: Character;
  /** Best hero image for the character. Falls back to character.avatar_url
   *  when omitted so existing callers keep working. */
  heroUrl?: string | null;
}

/**
 * Slide-in panel for the town map. Open state is driven by the
 * ?building=slug search param on /town. Content mirrors CharacterHero
 * (identity content only — no skills row; that lives on /character/[slug]).
 */
export function BuildingDrawer({ character: c, heroUrl }: Props) {
  const hero = heroUrl ?? c.avatar_url;
  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) window.location.assign("/town");
      }}
      ariaLabel={`${c.name} character profile`}
      className="p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <span className="bubble text-xs">
          {c.kind === "zeke" ? "in-house" : "influencer"}
        </span>
        <MotionLink
          href="/town"
          aria-label="close"
          className="display inline-flex h-8 w-8 items-center justify-center text-2xl leading-none"
        >
          ×
        </MotionLink>
      </div>

      <div className="ink-frame relative w-full aspect-square overflow-hidden grain bg-[var(--color-mauve)] mb-5">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt={c.name} className="w-full h-full object-cover" />
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

      <MotionLink
        href={`/character/${c.slug}`}
        className="block w-full ink-frame-soft bg-[var(--color-ink)] text-[var(--color-paper)] text-center py-3 display"
      >
        deep dive →
      </MotionLink>
    </Drawer>
  );
}
