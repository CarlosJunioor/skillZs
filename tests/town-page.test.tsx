import React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Character } from "../lib/types";
import type { TownTile } from "../lib/town/layout";

const mocks = vi.hoisted(() => ({
  loadTownLayout: vi.fn<() => Promise<TownTile[]>>(),
  fetchCharacterBySlug: vi.fn<(slug: string) => Promise<Character | null>>(),
  redirect: vi.fn((_path: string) => { throw new Error("NEXT_REDIRECT"); }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("../lib/town/layout", () => ({
  loadTownLayout: mocks.loadTownLayout,
}));

vi.mock("../lib/stats", () => ({
  fetchCharacterBySlug: mocks.fetchCharacterBySlug,
}));

import TownPage, { generateMetadata } from "../app/page";

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

function tile(slug: string, x = 0, y = 0): TownTile {
  return { slug, x, y, w: 1, h: 1, character: character(slug) };
}

describe("TownPage", () => {
  beforeEach(() => {
    mocks.loadTownLayout.mockReset();
    mocks.fetchCharacterBySlug.mockReset();
    mocks.redirect.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the town map without a drawer when searchParams.building is absent", async () => {
    mocks.loadTownLayout.mockResolvedValue([tile("zeke"), tile("matt-pocock", 1)]);
    const element = await TownPage({ searchParams: Promise.resolve({}) });
    const html = renderToString(element);
    expect(html).toContain('href="/?building=zeke"');
  });

  it("renders the drawer in a Suspense boundary when searchParams.building is set", async () => {
    mocks.loadTownLayout.mockResolvedValue([tile("zeke")]);
    mocks.fetchCharacterBySlug.mockResolvedValue(
      character("zeke", { name: "Zeke", role: "In-house builder" }),
    );
    const element = await TownPage({ searchParams: Promise.resolve({ building: "zeke" }) });
    const html = renderToString(element);
    // The drawer renders inside Suspense - either content streams in, or skeleton shows.
    // Since fetchCharacterBySlug resolves immediately in the test, content should appear.
    expect(html).toContain("Zeke");
    expect(html).toContain('href="/character/zeke"');
  });

  it("redirects to / when ?building=unknown-slug", async () => {
    mocks.loadTownLayout.mockResolvedValue([tile("zeke")]);
    mocks.fetchCharacterBySlug.mockResolvedValue(null);
    await expect(
      TownPage({ searchParams: Promise.resolve({ building: "ghost" }) }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });
});

describe("TownPage generateMetadata", () => {
  beforeEach(() => {
    mocks.fetchCharacterBySlug.mockReset();
  });

  it("uses '/' as canonical when no drawer is open", async () => {
    const meta = await generateMetadata({ searchParams: Promise.resolve({}) });
    expect(meta.alternates?.canonical).toBe("/");
  });

  it("canonicalises ?building=slug to /character/[slug]", async () => {
    mocks.fetchCharacterBySlug.mockResolvedValue(character("zeke"));
    const meta = await generateMetadata({
      searchParams: Promise.resolve({ building: "zeke" }),
    });
    expect(meta.alternates?.canonical).toBe("/character/zeke");
  });

  it("falls back to '/' canonical when the slug is unknown", async () => {
    mocks.fetchCharacterBySlug.mockResolvedValue(null);
    const meta = await generateMetadata({
      searchParams: Promise.resolve({ building: "ghost" }),
    });
    expect(meta.alternates?.canonical).toBe("/");
  });
});
