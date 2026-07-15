import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Character } from "../lib/types";
import type { TownTile } from "../lib/town/layout";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

vi.mock("../components/character-hotspot", () => ({
  CharacterHotspot: ({ tile }: { tile: TownTile }) =>
    React.createElement(
      "a",
      {
        href: `/town?building=${tile.slug}`,
        "aria-label": `Open ${tile.character.name} — ${tile.building}`,
      },
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

function tile(slug: string, hotspot = { x: 0, y: 0, w: 0.1, h: 0.1 }): TownTile {
  return {
    slug,
    building: `${slug.toUpperCase()} HQ`,
    hotspot,
    character: character(slug),
    artUrls: [],
  };
}

describe("TownMap", () => {
  it("renders the Aquarius district map background image", () => {
    const html = renderToString(<TownMap tiles={[tile("zeke")]} />);
    expect(html).toContain('src="/town/aquarius-map.png"');
    expect(html).toMatch(/aspect-ratio:\s*1448\s*\/\s*1086/);
  });

  it("renders a hotspot link per tile inside the desktop hotspot layer", () => {
    const html = renderToString(
      <TownMap tiles={[tile("zeke"), tile("matt-pocock", { x: 0.43, y: 0.18, w: 0.12, h: 0.2 })]} />,
    );
    expect(html).toContain('href="/town?building=zeke"');
    expect(html).toContain('href="/town?building=matt-pocock"');
  });

  it("positions hotspots using percentage-of-map fractions", () => {
    const html = renderToString(
      <TownMap tiles={[tile("matt-pocock", { x: 0.43, y: 0.18, w: 0.12, h: 0.2 })]} />,
    );
    expect(html).toMatch(/left:\s*43%/);
    expect(html).toMatch(/top:\s*18%/);
    expect(html).toMatch(/width:\s*12%/);
    expect(html).toMatch(/height:\s*20%/);
  });

  it("renders a parallel mobile list with one link per tile", () => {
    const html = renderToString(
      <TownMap tiles={[tile("zeke"), tile("matt-pocock", { x: 0.43, y: 0.18, w: 0.12, h: 0.2 })]} />,
    );
    // both the desktop hotspot mock and the mobile list link should reference the slug
    const zekeMatches = html.match(/href="\/town\?building=zeke"/g) ?? [];
    expect(zekeMatches.length).toBeGreaterThanOrEqual(2);
  });
});
