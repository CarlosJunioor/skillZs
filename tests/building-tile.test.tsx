import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Character } from "../lib/types";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

import { BuildingTile } from "../components/building-tile";
import type { TownTile } from "../lib/town/layout";

function character(over: Partial<Character> = {}): Character {
  return {
    id: "id-zeke",
    slug: "zeke",
    kind: "zeke",
    name: "Zeke",
    role: "In-house builder",
    bio: null,
    gh_handle: null,
    x_handle: null,
    site_url: null,
    avatar_url: "https://blob.test/avatars/zeke.png",
    building_url: null,
    ...over,
  };
}

function tile(over: Partial<TownTile> = {}): TownTile {
  return {
    slug: "zeke",
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    character: character(),
    ...over,
  };
}

describe("BuildingTile", () => {
  it("renders the building image when building_url is set", () => {
    const html = renderToString(
      <BuildingTile tile={tile({ character: character({ building_url: "https://blob.test/buildings/zeke.png" }) })} />,
    );
    expect(html).toContain('src="https://blob.test/buildings/zeke.png"');
  });

  it("falls back to the avatar inside a wip placeholder when building_url is null", () => {
    const html = renderToString(<BuildingTile tile={tile()} />);
    expect(html).toContain('src="https://blob.test/avatars/zeke.png"');
    expect(html).toContain("wip");
  });

  it("renders the ?! placeholder when neither building nor avatar is available", () => {
    const html = renderToString(
      <BuildingTile tile={tile({ character: character({ avatar_url: null }) })} />,
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("?!");
  });

  it("wraps the tile in a link to /?building=slug", () => {
    const html = renderToString(<BuildingTile tile={tile()} />);
    expect(html).toContain('href="/?building=zeke"');
  });

  it("provides aria-label on the link", () => {
    const html = renderToString(<BuildingTile tile={tile()} />);
    expect(html).toContain(`aria-label="Open Zeke&#x27;s storefront"`);
  });

  it("renders the character name as visible heading text", () => {
    const html = renderToString(<BuildingTile tile={tile()} />);
    expect(html).toMatch(/<h2[^>]*>[^<]*Zeke|<h2[^>]*>.*Zeke.*<\/h2>/);
  });
});
