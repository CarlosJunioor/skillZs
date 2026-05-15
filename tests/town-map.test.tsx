import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Character } from "../lib/types";
import type { TownTile } from "../lib/town/layout";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

vi.mock("../components/building-tile", () => ({
  BuildingTile: ({ tile }: { tile: TownTile }) =>
    React.createElement(
      "a",
      { href: `/?building=${tile.slug}`, "aria-label": `Open ${tile.character.name}'s storefront` },
      tile.slug,
    ),
}));

import { TownMap } from "../components/town-map";

function character(slug: string, over: Partial<Character> = {}): Character {
  return {
    id: `id-${slug}`,
    slug,
    kind: "influencer",
    name: slug,
    role: null,
    bio: null,
    gh_handle: null,
    x_handle: null,
    site_url: null,
    avatar_url: null,
    building_url: null,
    ...over,
  };
}

function tile(slug: string, x: number, y: number, w = 1, h = 1): TownTile {
  return { slug, x, y, w, h, character: character(slug) };
}

describe("TownMap", () => {
  it("renders one link per tile", () => {
    const html = renderToString(
      <TownMap tiles={[tile("zeke", 0, 0), tile("matt-pocock", 1, 0)]} />,
    );
    expect(html).toContain('href="/?building=zeke"');
    expect(html).toContain('href="/?building=matt-pocock"');
  });

  it("places tiles via grid-column and grid-row using x, y, w, h", () => {
    const html = renderToString(
      <TownMap tiles={[tile("zeke", 0, 0, 2, 2), tile("matt-pocock", 2, 0)]} />,
    );
    // CSS Grid syntax: column-start / span N. React inlines styles as a string.
    expect(html).toMatch(/grid-column:\s*1\s*\/\s*span 2/);
    expect(html).toMatch(/grid-row:\s*1\s*\/\s*span 2/);
    expect(html).toMatch(/grid-column:\s*3\s*\/\s*span 1/);
  });

  it("includes an accessible label per tile", () => {
    const html = renderToString(<TownMap tiles={[tile("zeke", 0, 0)]} />);
    expect(html).toContain('aria-label="Open zeke');
  });
});
