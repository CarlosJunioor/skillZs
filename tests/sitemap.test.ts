import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCatalogTotal: vi.fn<() => Promise<number>>(),
  listCatalogSkillPages: vi.fn(),
  fetchSitemapCharacters: vi.fn(),
}));

vi.mock("@/lib/skills-sh", () => ({
  catalogSkillPath: ({ id }: { id: string }) => `/skills/${id}`,
  getCatalogTotal: mocks.getCatalogTotal,
  listCatalogSkillPages: mocks.listCatalogSkillPages,
}));

vi.mock("@/lib/stats", () => ({
  fetchSitemapCharacters: mocks.fetchSitemapCharacters,
}));

import sitemap, { generateSitemaps } from "../app/sitemap";

describe("catalog sitemap", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getCatalogTotal.mockReset();
    mocks.listCatalogSkillPages.mockReset();
    mocks.fetchSitemapCharacters.mockReset();
    mocks.fetchSitemapCharacters.mockResolvedValue([{ slug: "matt-pocock" }]);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("keeps a static sitemap shard when OIDC is unavailable in CI", async () => {
    mocks.getCatalogTotal.mockRejectedValue(new Error("missing OIDC token"));

    await expect(generateSitemaps()).resolves.toEqual([{ id: 0 }]);
    const entries = await sitemap({ id: Promise.resolve("0") });

    expect(entries.map((entry) => entry.url)).toEqual(expect.arrayContaining([
      expect.stringMatching(/\/$/),
      expect.stringMatching(/\/browse$/),
      expect.stringMatching(/\/policies$/),
      expect.stringMatching(/\/about$/),
      expect.stringMatching(/\/loops$/),
      expect.stringMatching(/\/guides$/),
      expect.stringMatching(/\/research\/agent-skills-report-2026$/),
      expect.stringMatching(/\/guides\/best-agent-skills$/),
      expect.stringMatching(/\/guides\/agent-skills-directories$/),
      expect.stringMatching(/\/guides\/what-are-agent-skills$/),
      expect.stringMatching(/\/guides\/skill-md-vs-agents-md-vs-claude-md$/),
      expect.stringMatching(/\/guides\/how-to-create-agent-skills$/),
      expect.stringMatching(/\/guides\/how-to-publish-agent-skills$/),
      expect.stringMatching(/\/guides\/how-to-install-agent-skills$/),
      expect.stringMatching(/\/guides\/agent-skills-vs-mcp$/),
      expect.stringMatching(/\/guides\/agent-skill-security$/),
      expect.stringMatching(/\/skills\/carlosjunioor\/skillzs\/find-agent-skills$/),
      expect.stringMatching(/\/character\/matt-pocock$/),
    ]));
    expect(entries.some((entry) => entry.url.endsWith("/town"))).toBe(false);
    expect(mocks.listCatalogSkillPages).not.toHaveBeenCalled();
  });

  it("lists the first-party skill once when the upstream feed catches up", async () => {
    mocks.getCatalogTotal.mockResolvedValue(1);
    mocks.listCatalogSkillPages.mockResolvedValue([{
      id: "CarlosJunioor/skillZs/find-agent-skills",
      isDuplicate: false,
    }]);

    const entries = await sitemap({ id: Promise.resolve("0") });
    const urls = entries.map((entry) => entry.url.toLowerCase());

    expect(urls.filter((url) => url.endsWith("/skills/carlosjunioor/skillzs/find-agent-skills"))).toHaveLength(1);
  });
});
