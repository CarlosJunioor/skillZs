import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Character } from "../lib/types";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

import { BuildingDrawer } from "../components/building-drawer";

function character(over: Partial<Character> = {}): Character {
  return {
    id: "id-zeke",
    slug: "zeke",
    kind: "zeke",
    name: "Zeke",
    role: "In-house builder",
    bio: "Lives in Aquarius. Ships the catalog you are reading.",
    gh_handle: "CarlosJunioor",
    x_handle: null,
    site_url: null,
    avatar_url: "https://blob.test/avatars/zeke.png",
    building_url: null,
    ...over,
  };
}

describe("BuildingDrawer", () => {
  it("renders character name, role, and bio", () => {
    const html = renderToString(<BuildingDrawer character={character()} />);
    expect(html).toContain("Zeke");
    expect(html).toContain("In-house builder");
    expect(html).toContain("Lives in Aquarius");
  });

  it("includes a deep-dive link to /character/[slug]", () => {
    const html = renderToString(<BuildingDrawer character={character()} />);
    expect(html).toContain('href="/character/zeke"');
  });

  it("includes a close link back to /", () => {
    const html = renderToString(<BuildingDrawer character={character()} />);
    expect(html).toMatch(/<a[^>]+href="\/"[^>]*>/);
  });

  it("does NOT render a skills-count chip (zero would read 'broken' at launch)", () => {
    const html = renderToString(<BuildingDrawer character={character()} />);
    expect(html.toLowerCase()).not.toMatch(/\d+\s*skills?\s*shipped/);
  });

  it("renders avatar when available", () => {
    const html = renderToString(<BuildingDrawer character={character()} />);
    expect(html).toContain('src="https://blob.test/avatars/zeke.png"');
  });

  it("renders ?! placeholder when avatar is null", () => {
    const html = renderToString(<BuildingDrawer character={character({ avatar_url: null })} />);
    expect(html).not.toContain("<img");
    expect(html).toContain("?!");
  });

  it("renders social chips when handles are present", () => {
    const html = renderToString(
      <BuildingDrawer
        character={character({ gh_handle: "ghuser", x_handle: "xuser", site_url: "https://example.test" })}
      />,
    );
    expect(html).toContain('href="https://github.com/ghuser"');
    expect(html).toContain('href="https://x.com/xuser"');
    expect(html).toContain('href="https://example.test"');
  });
});
