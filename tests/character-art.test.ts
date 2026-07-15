import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Character } from "../lib/types";

const mocks = vi.hoisted(() => ({ existsSync: vi.fn<(path: string) => boolean>() }));

vi.mock("node:fs", () => ({ existsSync: mocks.existsSync }));

import { loadCharacterArt, resolveCharacterHero } from "../lib/character/art";

function creator(avatarUrl: string | null): Character {
  return {
    id: "creator-1",
    slug: "matt-pocock",
    kind: "influencer",
    name: "Matt Pocock",
    role: "TypeScript educator",
    bio: null,
    gh_handle: "mattpocockuk",
    x_handle: null,
    site_url: null,
    avatar_url: avatarUrl,
  };
}

describe("creator artwork", () => {
  beforeEach(() => mocks.existsSync.mockReset());

  it("loads only creator panels that exist", () => {
    mocks.existsSync.mockImplementation((path) => /[\\/]characters[\\/]matt-pocock[\\/](1|3)\.png$/.test(path));

    expect(loadCharacterArt("matt-pocock")).toEqual([
      "/characters/matt-pocock/1.png",
      "/characters/matt-pocock/3.png",
    ]);
    expect(mocks.existsSync).toHaveBeenCalledTimes(4);
  });

  it("prefers shipped creator art, then the stored avatar, then the placeholder", () => {
    mocks.existsSync.mockReturnValueOnce(true).mockReturnValue(false);
    expect(resolveCharacterHero(creator("https://blob.test/avatar.png"))).toBe("/characters/matt-pocock/1.png");

    mocks.existsSync.mockReturnValue(false);
    expect(resolveCharacterHero(creator("https://blob.test/avatar.png"))).toBe("https://blob.test/avatar.png");
    expect(resolveCharacterHero(creator(null))).toBeNull();
  });
});
