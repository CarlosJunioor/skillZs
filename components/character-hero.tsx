import Link from "next/link";
import type { Character } from "@/lib/types";

interface Props {
  character: Character;
}

/**
 * Top hero band for /character/[slug]: avatar (left), name + role + bio
 * (center), social chips (right). Mirrors the comic-page composition used
 * on /skill/[slug] so the surface feels native.
 */
export function CharacterHero({ character }: Props) {
  return (
    <section className="grid md:grid-cols-[260px_1fr] gap-6 mb-12">
      <div className="ink-frame relative w-full aspect-square overflow-hidden grain bg-[var(--color-mauve)]">
        {character.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.avatar_url}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="display text-6xl text-[var(--color-paper)]">?!</span>
          </div>
        )}
      </div>

      <div className="ink-frame p-6 md:p-8 bg-[var(--color-paper)] flex flex-col justify-between min-h-[260px]">
        <div>
          <span className="bubble text-xs mb-4 inline-block">
            {character.kind === "zeke" ? "in-house" : "influencer"}
          </span>
          <h1 className="display text-4xl md:text-6xl leading-[0.92] mb-3 break-words">
            <span className="drip">{character.name}</span>
          </h1>
          {character.role && (
            <p className="tag-font text-lg md:text-xl text-[var(--color-grape)] mb-3 leading-snug">
              {character.role}
            </p>
          )}
          {character.bio && (
            <p className="type-font text-base leading-relaxed">{character.bio}</p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3 type-font text-sm pt-3 border-t-2 border-[var(--color-ink)]">
          {character.gh_handle && (
            <a
              href={`https://github.com/${character.gh_handle}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--color-grape)]"
            >
              ↗ github: @{character.gh_handle}
            </a>
          )}
          {character.x_handle && (
            <a
              href={`https://x.com/${character.x_handle}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--color-grape)]"
            >
              ↗ x: @{character.x_handle}
            </a>
          )}
          {character.site_url && (
            <a
              href={character.site_url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--color-grape)]"
            >
              ↗ site
            </a>
          )}
          <Link href="/" className="text-[var(--color-rust)] hover:text-[var(--color-grape)] ml-auto">
            ← back to zine
          </Link>
        </div>
      </div>
    </section>
  );
}
