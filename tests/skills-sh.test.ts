import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(async () => "test-token"),
}));

vi.mock("@vercel/oidc", () => ({
  getVercelOidcToken: mocks.getToken,
}));

import {
  catalogSkillPath,
  getCatalogTotal,
  getSkillAudits,
  listCatalogSkillPages,
  listCatalogSkills,
  searchCatalogSkills,
} from "../lib/skills-sh";

describe("skills.sh client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads a bounded leaderboard with OIDC authentication", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [], pagination: { page: 0, perPage: 500, total: 0, hasMore: false } })),
    );

    await listCatalogSkills({ view: "hot", page: -2, perPage: 999 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://skills.sh/api/v1/skills?view=hot&page=0&per_page=500",
      { headers: { Authorization: "Bearer test-token" } },
    );
  });

  it("skips invalid short searches and encodes stable skill paths", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(searchCatalogSkills("x")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(catalogSkillPath({ id: "vercel-labs/skills/find skills" })).toBe(
      "/skills/vercel-labs/skills/find%20skills",
    );
  });

  it("keeps an optional security-audit outage from taking down a skill page", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("down", { status: 500 }));
    await expect(getSkillAudits(["owner", "repo", "skill"])).resolves.toEqual([]);
  });

  it("loads only the requested catalog pages for sitemap shards", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      const page = Number(new URL(url).searchParams.get("page") ?? 0);
      return new Response(JSON.stringify({
        data: [{ id: `owner/repo/skill-${page}` }],
        pagination: { page, perPage: 500, total: 1_000, hasMore: page < 1 },
      }));
    });

    await expect(getCatalogTotal()).resolves.toBe(1_000);
    await expect(listCatalogSkillPages(3, 2)).resolves.toEqual([
      { id: "owner/repo/skill-3" },
      { id: "owner/repo/skill-4" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
