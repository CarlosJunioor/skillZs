// components/town-map.tsx
import Link from "next/link";
import { CharacterHotspot } from "./character-hotspot";
import type { TownTile } from "@/lib/town/layout";

interface Props {
  tiles: TownTile[];
}

/** Native pixel size of public/town/aquarius-map.png. Drives the aspect ratio
 *  of the responsive map container so hotspots stay aligned at every width. */
const MAP_W = 1448;
const MAP_H = 1086;
const MAP_SRC = "/town/aquarius-map.png";

/**
 * Town map at /. The Aquarius district illustration is the background; each
 * character lives at a hotspot defined by 0..1 fractions in
 * design/town-layout.json. Hotspots fade in a popover with the character's
 * name, role, and user-drawn art panels on hover/focus.
 *
 * Mobile fallback: the illustration is detailed enough that hotspots become
 * un-tappable below ~lg widths. We render the map full-bleed for context and
 * surface a parallel storefront list underneath so navigation still works on
 * phones.
 */
export function TownMap({ tiles }: Props) {
  return (
    <div className="mt-6 space-y-6">
      <div
        className="relative w-full ink-frame bg-[var(--color-ink)]"
        style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MAP_SRC}
          alt="Aquarius district map — a hand-drawn isometric town of seven storefronts"
          className="absolute inset-0 w-full h-full object-cover select-none"
          draggable={false}
        />

        {/* hotspots only become usable at lg+; smaller screens lean on the list */}
        <div className="absolute inset-0 hidden lg:block">
          {tiles.map((t) => (
            <div
              key={t.slug}
              className="absolute"
              style={{
                left: `${t.hotspot.x * 100}%`,
                top: `${t.hotspot.y * 100}%`,
                width: `${t.hotspot.w * 100}%`,
                height: `${t.hotspot.h * 100}%`,
              }}
            >
              <CharacterHotspot tile={t} />
            </div>
          ))}
        </div>
      </div>

      {/* compact list for mobile + accessibility — keyboard users still get a
          straightforward way through the town without precision pointer aim. */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:hidden">
        {tiles.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/?building=${t.character.slug}`}
              aria-label={`Open ${t.character.name} — ${t.building}`}
              className="ink-frame block p-3 bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-mauve)] transition-colors"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="display text-lg leading-none">
                  <span className="drip">{t.character.name}</span>
                </span>
                <span className="tag-font text-[10px] uppercase tracking-wide text-[var(--color-rust)]">
                  {t.building}
                </span>
              </div>
              {t.character.role && (
                <p className="type-font text-xs text-[var(--color-ink)]/80 mt-1">
                  {t.character.role}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
