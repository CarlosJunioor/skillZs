import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Character } from "../lib/types";
import type { TownTile } from "../lib/town/layout";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

import { CharacterHotspot } from "../components/character-hotspot";

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
    building: "CLAUDE-CODE SHOP",
    hotspot: { x: 0, y: 0, w: 0.1, h: 0.1 },
    character: character(),
    artUrls: [],
    ...over,
  };
}

describe("CharacterHotspot", () => {
  it("wraps the hotspot in a link to /town?building=slug", () => {
    const html = renderToString(<CharacterHotspot tile={tile()} />);
    expect(html).toContain('href="/town?building=zeke"');
  });

  it("exposes an accessible label naming the character and building", () => {
    const html = renderToString(<CharacterHotspot tile={tile()} />);
    expect(html).toContain('aria-label="Open Zeke — CLAUDE-CODE SHOP"');
  });

  it("renders concept art panels when artUrls is non-empty", () => {
    const html = renderToString(
      <CharacterHotspot
        tile={tile({
          artUrls: ["/characters/zeke/1.png", "/characters/zeke/2.png"],
        })}
      />,
    );
    expect(html).toContain('src="/characters/zeke/1.png"');
    expect(html).toContain('src="/characters/zeke/2.png"');
  });

  it("falls back to the avatar when artUrls is empty", () => {
    const html = renderToString(<CharacterHotspot tile={tile()} />);
    expect(html).toContain('src="https://blob.test/avatars/zeke.png"');
  });

  it("renders the ?! placeholder when no art and no avatar", () => {
    const html = renderToString(
      <CharacterHotspot tile={tile({ character: character({ avatar_url: null }) })} />,
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("?!");
  });

  it("shows the building name and character role in the popover", () => {
    const html = renderToString(<CharacterHotspot tile={tile()} />);
    expect(html).toContain("CLAUDE-CODE SHOP");
    expect(html).toContain("In-house builder");
    expect(html).toMatch(/Zeke/);
  });
});
