// components/character-hotspot.tsx
import Link from "next/link";
import type { TownTile } from "@/lib/town/layout";

interface Props {
  tile: TownTile;
}

/**
 * One clickable building on the Aquarius map. Absolutely positioned by its
 * parent TownMap using the hotspot fractions. On hover/focus, fades in a
 * popover with the character name, role, and any user-drawn art panels
 * found under public/characters/<slug>/N.png.
 *
 * The hotspot itself stays visually transparent so the underlying map art
 * shows through; only the hover ring and the popover are rendered chrome.
 */
export function CharacterHotspot({ tile }: Props) {
  const c = tile.character;
  const hasArt = tile.artUrls.length > 0;
  // Flip the popover below the hotspot when the building sits in the upper
  // half of the map — otherwise the card escapes the viewport on hover.
  const popoverBelow = tile.hotspot.y < 0.5;
  const popoverPos = popoverBelow ? "top-full mt-2" : "bottom-full mb-2";

  return (
    <Link
      href={`/?building=${c.slug}`}
      aria-label={`Open ${c.name} — ${tile.building}`}
      className="group absolute inset-0 block focus:outline-none"
    >
      {/* persistent footprint outline so the player can see hotspots at rest.
          Soft border + paper tint at idle; sharpens + glows on hover/focus. */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-sm border-2 border-dashed border-[var(--color-paper)]/40 bg-[var(--color-paper)]/[0.06] transition-all duration-150 group-hover:border-solid group-hover:border-[var(--color-paper)] group-hover:bg-[var(--color-paper)]/15 group-hover:shadow-[0_0_0_3px_rgba(255,255,255,0.25)] group-focus-visible:border-solid group-focus-visible:border-[var(--color-paper)] group-focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.4)]"
      />

      {/* always-visible pin marker — top-right corner of the hotspot. The
          pulsing halo draws the eye to scannable points across the map. */}
      <span
        aria-hidden
        className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center"
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-paper)] opacity-50" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--color-paper)] ring-2 ring-[var(--color-ink)] transition-transform duration-150 group-hover:scale-125" />
      </span>

      {/* popover: parked above the hotspot, centered. pointer-events-none so it
          never eats clicks meant for adjacent hotspots. */}
      <div
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${popoverPos} w-[min(22rem,80vw)] z-30 opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0`}
      >
        <div className="ink-frame bg-[var(--color-paper)] text-[var(--color-ink)] p-3 shadow-lg">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h3 className="display text-xl leading-none">
              <span className="drip">{c.name}</span>
            </h3>
            <span className="tag-font text-[10px] uppercase tracking-wide text-[var(--color-rust)]">
              {tile.building}
            </span>
          </div>

          {c.role && (
            <p className="type-font text-xs text-[var(--color-ink)]/80 mb-2">{c.role}</p>
          )}

          {hasArt ? (
            <div className="grid grid-cols-2 gap-2">
              {tile.artUrls.slice(0, 2).map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt={`${c.name} concept panel ${i + 1}`}
                  className="ink-frame aspect-square w-full object-cover bg-[var(--color-mauve)]"
                />
              ))}
            </div>
          ) : c.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.avatar_url}
              alt={`${c.name} avatar`}
              className="ink-frame w-full aspect-[4/3] object-cover bg-[var(--color-mauve)]"
            />
          ) : (
            <div className="ink-frame w-full aspect-[4/3] flex items-center justify-center bg-[var(--color-mauve)]">
              <span className="display text-3xl text-[var(--color-paper)]">?!</span>
            </div>
          )}

          <p className="tag-font text-[10px] uppercase tracking-wide text-[var(--color-rust)] mt-2 text-right">
            tap to enter →
          </p>
        </div>
      </div>
    </Link>
  );
}
