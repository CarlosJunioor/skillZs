// components/town-map.tsx
import { BuildingTile } from "./building-tile";
import type { TownTile } from "@/lib/town/layout";

interface Props {
  tiles: TownTile[];
}

/**
 * Town map at /. Flat CSS Grid; (x, y, w, h) drives placement. On mobile we
 * collapse to a vertical stack via Tailwind responsive utility classes.
 */
export function TownMap({ tiles }: Props) {
  const cols = Math.max(...tiles.map((t) => t.x + t.w), 1);

  return (
    <div className="mt-6">
      <div
        className="hidden lg:grid gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {tiles.map((t) => (
          <div
            key={t.slug}
            style={{
              gridColumn: `${t.x + 1} / span ${t.w}`,
              gridRow: `${t.y + 1} / span ${t.h}`,
            }}
          >
            <BuildingTile tile={t} />
          </div>
        ))}
      </div>

      <div className="grid lg:hidden gap-3 grid-cols-1">
        {tiles.map((t) => (
          <BuildingTile key={t.slug} tile={t} />
        ))}
      </div>
    </div>
  );
}
