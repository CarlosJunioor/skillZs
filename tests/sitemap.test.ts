import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCatalogTotal: vi.fn<() => Promise<number>>(),
  listCatalogSkillPages: vi.fn(),
}));

vi.mock("@/lib/skills-sh", () => ({
  catalogSkillPath: ({ id }: { id: string }) => `/skills/${id}`,
  getCatalogTotal: mocks.getCatalogTotal,
  listCatalogSkillPages: mocks.listCatalogSkillPages,
}));

import sitemap, { generateSitemaps } from "../app/sitemap";

describe("catalog sitemap", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getCatalogTotal.mockReset();
    mocks.listCatalogSkillPages.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("keeps a static sitemap shard when OIDC is unavailable in CI", async () => {
    mocks.getCatalogTotal.mockRejectedValue(new Error("missing OIDC token"));

    await expect(generateSitemaps()).resolves.toEqual([{ id: 0 }]);
    const entries = await sitemap({ id: Promise.resolve("0") });

    expect(entries.map((entry) => entry.url)).toEqual(expect.arrayContaining([
      expect.stringMatching(/\/$/),
      expect.stringMatching(/\/browse$/),
    ]));
    expect(mocks.listCatalogSkillPages).not.toHaveBeenCalled();
  });
});
