import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchCharactersForTown: vi.fn(),
  json: [] as Array<{ slug: string; x: number; y: number; w: number; h: number }>,
}));

vi.mock("../design/town-layout.json", () => ({
  default: mocks.json,
}));

vi.mock("../lib/stats", () => ({
  fetchCharactersForTown: mocks.fetchCharactersForTown,
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

describe("loadTownLayout", () => {
  beforeEach(() => {
    mocks.fetchCharactersForTown.mockReset();
    mocks.json.length = 0;
  });

  it("merges layout entries with matching character rows", async () => {
    mocks.json.push(
      { slug: "zeke", x: 0, y: 0, w: 1, h: 1 },
      { slug: "matt-pocock", x: 1, y: 0, w: 1, h: 1 },
    );
    mocks.fetchCharactersForTown.mockResolvedValue([
      character("zeke"),
      character("matt-pocock"),
    ]);
    const tiles = await loadTownLayout();
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toMatchObject({ slug: "zeke", x: 0, y: 0, w: 1, h: 1 });
    expect(tiles[0].character.slug).toBe("zeke");
  });

  it("throws when a JSON slug has no matching DB row", async () => {
    mocks.json.push({ slug: "ghost", x: 0, y: 0, w: 1, h: 1 });
    mocks.fetchCharactersForTown.mockResolvedValue([]);
    await expect(loadTownLayout()).rejects.toThrow(/ghost/);
  });

  it("throws when a DB row has no matching JSON entry", async () => {
    mocks.json.push({ slug: "zeke", x: 0, y: 0, w: 1, h: 1 });
    mocks.fetchCharactersForTown.mockResolvedValue([
      character("zeke"),
      character("orphan"),
    ]);
    await expect(loadTownLayout()).rejects.toThrow(/orphan/);
  });

  it("throws on duplicate slugs in JSON", async () => {
    mocks.json.push(
      { slug: "zeke", x: 0, y: 0, w: 1, h: 1 },
      { slug: "zeke", x: 1, y: 0, w: 1, h: 1 },
    );
    mocks.fetchCharactersForTown.mockResolvedValue([character("zeke")]);
    await expect(loadTownLayout()).rejects.toThrow(/duplicate.*zeke/i);
  });

  it("throws on overlapping cells in JSON", async () => {
    mocks.json.push(
      { slug: "zeke", x: 0, y: 0, w: 2, h: 2 },
      { slug: "matt-pocock", x: 1, y: 1, w: 1, h: 1 },
    );
    mocks.fetchCharactersForTown.mockResolvedValue([
      character("zeke"),
      character("matt-pocock"),
    ]);
    await expect(loadTownLayout()).rejects.toThrow(/overlap/i);
  });
});
