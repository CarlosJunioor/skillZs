import type { TownTile } from "@/lib/town/layout";
export function BuildingTile({ tile }: { tile: TownTile }) {
  return <div data-stub-tile={tile.slug} />;
}
