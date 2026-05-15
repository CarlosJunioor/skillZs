// components/building-tile.tsx
import Link from "next/link";
import type { TownTile } from "@/lib/town/layout";

interface Props {
  tile: TownTile;
}

/**
 * Single town tile. Links to /?building=slug (drawer-open URL). Renders the
 * building image when available, falls back to avatar-in-wip-frame when the
 * building cron hasn't run yet, falls back to the ?! placeholder when even
 * the avatar is missing.
 */
export function BuildingTile({ tile }: Props) {
  const c = tile.character;
  return (
    <Link
      href={`/?building=${c.slug}`}
      aria-label={`Open ${c.name}'s storefront`}
      className="ink-frame group relative overflow-hidden block aspect-square bg-[var(--color-mauve)]"
    >
      {c.building_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.building_url}
          alt={`${c.name}'s storefront`}
          className="w-full h-full object-cover"
        />
      ) : c.avatar_url ? (
        <div className="relative w-full h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.avatar_url}
            alt=""
            className="w-full h-full object-cover opacity-80"
          />
          <span className="absolute top-2 right-2 tag-font text-xs bg-[var(--color-ink)] text-[var(--color-paper)] px-2 py-0.5">
            wip
          </span>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="display text-5xl text-[var(--color-paper)]">?!</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-ink)]/85 px-3 py-2">
        <h2 className="display text-lg text-[var(--color-paper)] leading-tight">
          <span className="drip">{c.name}</span>
        </h2>
      </div>
    </Link>
  );
}
