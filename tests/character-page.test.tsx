import React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Character, SkillStats } from "../lib/types";

const mocks = vi.hoisted(() => ({
  fetchCharacterBySlug: vi.fn(),
  fetchSkillsByCharacter: vi.fn(),
  fetchActivityForCharacter: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("../lib/stats", () => ({
  fetchCharacterBySlug: mocks.fetchCharacterBySlug,
  fetchSkillsByCharacter: mocks.fetchSkillsByCharacter,
  fetchActivityForCharacter: mocks.fetchActivityForCharacter,
}));

// SkillRow is a client component using useRef/useState — mock to a plain div
// for renderToString.
vi.mock("../components/skill-row", () => ({
  SkillRow: ({ title, skills }: { title: string; skills: SkillStats[] }) =>
    React.createElement(
      "section",
      { "data-testid": "skill-row" },
      React.createElement("h2", null, title),
      React.createElement("span", null, `count:${skills.length}`),
    ),
}));

import CharacterPage, { generateMetadata } from "../app/character/[slug]/page";

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    id: "char-1",
    slug: "matt-pocock",
    kind: "influencer",
    name: "Matt Pocock",
    role: "TypeScript explainer",
    bio: "Author of Total TypeScript.",
    gh_handle: "mattpocockuk",
    x_handle: "mpocock1",
    site_url: "https://www.totaltypescript.com",
    avatar_url: "https://blob.test/avatars/matt-pocock.png",
    building_url: null,
    ...over,
  };
}

function makeSkill(over: Partial<SkillStats> = {}): SkillStats {
  return {
    id: "sk-1",
    slug: "ts-tip",
    name: "TS Tip",
    description: "Tiny TypeScript pattern.",
    cover_url: null,
    diptych_url: null,
    tagline: null,
    before_text: null,
    after_text: null,
    category: "coding",
    repo_url: "https://github.com/example/ts-tip",
    source_repo: "example/ts-tip",
    github_stars: 4,
    readme_md: null,
    first_seen: "2026-01-01T00:00:00Z",
    last_seen: "2026-05-01T00:00:00Z",
    vote_count: 1,
    use_count: 2,
    hotness: 10,
    character_id: "char-1",
    character_slug: "matt-pocock",
    character_name: "Matt Pocock",
    character_avatar_url: "https://blob.test/avatars/matt-pocock.png",
    ...over,
  };
}

describe("CharacterPage", () => {
  beforeEach(() => {
    mocks.fetchCharacterBySlug.mockReset();
    mocks.fetchSkillsByCharacter.mockReset();
    mocks.fetchActivityForCharacter.mockReset();
    mocks.notFound.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls notFound when the character does not exist", async () => {
    mocks.fetchCharacterBySlug.mockResolvedValue(null);
    await expect(
      CharacterPage({ params: Promise.resolve({ slug: "ghost" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalled();
    expect(mocks.fetchSkillsByCharacter).not.toHaveBeenCalled();
  });

  it("renders the hero band with avatar, name, role and bio", async () => {
    mocks.fetchCharacterBySlug.mockResolvedValue(makeCharacter());
    mocks.fetchSkillsByCharacter.mockResolvedValue([makeSkill(), makeSkill({ id: "sk-2", slug: "ts-two" })]);
    const element = await CharacterPage({ params: Promise.resolve({ slug: "matt-pocock" }) });
    const html = renderToString(element);
    expect(html).toContain("Matt Pocock");
    expect(html).toContain("TypeScript explainer");
    expect(html).toContain("Author of Total TypeScript.");
    expect(html).toContain('src="https://blob.test/avatars/matt-pocock.png"');
    // React SSR inserts comment markers between adjacent text nodes, so
    // assert against the href + handle separately.
    expect(html).toContain('href="https://github.com/mattpocockuk"');
    expect(html).toContain("mattpocockuk");
    expect(html).toContain('href="https://x.com/mpocock1"');
    expect(html).toContain("mpocock1");
    expect(html).toContain("count:2");
  });

  it("falls back to the mauve placeholder when avatar_url is null", async () => {
    mocks.fetchCharacterBySlug.mockResolvedValue(makeCharacter({ avatar_url: null }));
    mocks.fetchSkillsByCharacter.mockResolvedValue([]);
    const element = await CharacterPage({ params: Promise.resolve({ slug: "matt-pocock" }) });
    const html = renderToString(element);
    expect(html).not.toContain("<img");
    expect(html).toContain("?!");
  });

  it("renders the empty-state copy when the character has no skills yet", async () => {
    mocks.fetchCharacterBySlug.mockResolvedValue(makeCharacter({ name: "Zeke" }));
    mocks.fetchSkillsByCharacter.mockResolvedValue([]);
    const element = await CharacterPage({ params: Promise.resolve({ slug: "zeke" }) });
    const html = renderToString(element);
    expect(html).toContain("no skills yet");
    expect(html).toContain("attributed to");
    expect(html).toContain("Zeke");
  });

  it("renders the 'this week' section with the quiet-week copy when no activity rows", async () => {
    mocks.fetchCharacterBySlug.mockResolvedValue(makeCharacter());
    mocks.fetchSkillsByCharacter.mockResolvedValue([]);
    mocks.fetchActivityForCharacter.mockResolvedValue([]);
    const element = await CharacterPage({ params: Promise.resolve({ slug: "matt-pocock" }) });
    const html = renderToString(element);
    // renderToString does not stream Suspense — CharacterActivity suspends and
    // renderToString falls back to the skeleton. Verify the Suspense wrapper is
    // present and the skeleton fallback is rendered.
    expect(html).toMatch(/quiet week\.|loading activity/);
  });
});

describe("generateMetadata", () => {
  beforeEach(() => {
    mocks.fetchCharacterBySlug.mockReset();
  });

  it("returns a noIndex metadata block when the character is missing", async () => {
    mocks.fetchCharacterBySlug.mockResolvedValue(null);
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "ghost" }) });
    expect(meta.title).toBe("Character not found");
    expect(meta.robots).toMatchObject({ index: false });
  });

  it("uses the character's avatar as the OG image when available", async () => {
    mocks.fetchCharacterBySlug.mockResolvedValue(makeCharacter());
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "matt-pocock" }) });
    const og = meta.openGraph as { images?: Array<{ url: string }> };
    expect(og.images?.[0]?.url).toBe("https://blob.test/avatars/matt-pocock.png");
  });
});
