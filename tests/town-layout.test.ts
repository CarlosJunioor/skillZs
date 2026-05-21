import { beforeEach, describe, expect, it, vi } from "vitest";

interface JsonEntry {
  slug: string;
  building: string;
  hotspot: { x: number; y: number; w: number; h: number };
}

const mocks = vi.hoisted(() => ({
  fetchCharactersForTown: vi.fn(),
  json: [] as Array<{
    slug: string;
    building: string;
    hotspot: { x: number; y: number; w: number; h: number };
  }>,
}));

vi.mock("../design/town-layout.json", () => ({
  default: mocks.json,
}));

vi.mock("../lib/stats", () => ({
  fetchCharactersForTown: mocks.fetchCharactersForTown,
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
}));

import { loadTownLayout } from "../lib/town/layout";

function character(slug: string) {
  return {
    id: `id-${slug}`,
    slug,
    kind: "influencer" as const,
    name: slug.replace(/-/g, " "),
    role: null,
    bio: null,
    gh_handle: null,
    x_handle: null,
    site_url: null,
    avatar_url: null,
    building_url: null,
  };
}

function entry(slug: string, over: Partial<JsonEntry> = {}): JsonEntry {
  return {
    slug,
    building: `${slug.toUpperCase()} HQ`,
    hotspot: { x: 0, y: 0, w: 0.1, h: 0.1 },
    ...over,
  };
}

describe("loadTownLayout", () => {
  beforeEach(() => {
    mocks.fetchCharactersForTown.mockReset();
    mocks.json.length = 0;
  });

  it("merges layout entries with matching character rows", async () => {
    mocks.json.push(
      entry("zeke"),
      entry("matt-pocock", { hotspot: { x: 0.4, y: 0.2, w: 0.1, h: 0.1 } }),
    );
    mocks.fetchCharactersForTown.mockResolvedValue([
      character("zeke"),
      character("matt-pocock"),
    ]);
    const tiles = await loadTownLayout();
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toMatchObject({
      slug: "zeke",
      building: "ZEKE HQ",
      hotspot: { x: 0, y: 0, w: 0.1, h: 0.1 },
    });
    expect(tiles[0].character.slug).toBe("zeke");
    expect(Array.isArray(tiles[0].artUrls)).toBe(true);
  });

  it("throws when a JSON slug has no matching DB row", async () => {
    mocks.json.push(entry("ghost"));
    mocks.fetchCharactersForTown.mockResolvedValue([]);
    await expect(loadTownLayout()).rejects.toThrow(/ghost/);
  });

  it("throws when a DB row has no matching JSON entry", async () => {
    mocks.json.push(entry("zeke"));
    mocks.fetchCharactersForTown.mockResolvedValue([
      character("zeke"),
      character("orphan"),
    ]);
    await expect(loadTownLayout()).rejects.toThrow(/orphan/);
  });

  it("throws on duplicate slugs in JSON", async () => {
    mocks.json.push(entry("zeke"), entry("zeke"));
    mocks.fetchCharactersForTown.mockResolvedValue([character("zeke")]);
    await expect(loadTownLayout()).rejects.toThrow(/duplicate.*zeke/i);
  });

  it("throws when a hotspot extends past the map bounds", async () => {
    mocks.json.push(entry("zeke", { hotspot: { x: 0.9, y: 0, w: 0.2, h: 0.1 } }));
    mocks.fetchCharactersForTown.mockResolvedValue([character("zeke")]);
    await expect(loadTownLayout()).rejects.toThrow(/hotspot.*zeke.*out of bounds/i);
  });

  it("throws when a hotspot uses a negative coordinate", async () => {
    mocks.json.push(entry("zeke", { hotspot: { x: -0.1, y: 0, w: 0.1, h: 0.1 } }));
    mocks.fetchCharactersForTown.mockResolvedValue([character("zeke")]);
    await expect(loadTownLayout()).rejects.toThrow(/out of bounds/i);
  });

  it("allows overlapping hotspots — the illustrated map is hand-drawn isometric", async () => {
    mocks.json.push(
      entry("zeke", { hotspot: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } }),
      entry("matt-pocock", { hotspot: { x: 0.15, y: 0.15, w: 0.2, h: 0.2 } }),
    );
    mocks.fetchCharactersForTown.mockResolvedValue([
      character("zeke"),
      character("matt-pocock"),
    ]);
    await expect(loadTownLayout()).resolves.toHaveLength(2);
  });
});
