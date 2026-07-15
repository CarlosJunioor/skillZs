import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCatalogTotal: vi.fn<() => Promise<number>>(),
}));

vi.mock("@/lib/skills-sh", () => ({ getCatalogTotal: mocks.getCatalogTotal }));

import robots, { AI_CRAWLERS } from "../app/robots";

describe("robots metadata", () => {
  it("allows current search and answer-engine crawlers while blocking APIs", async () => {
    mocks.getCatalogTotal.mockResolvedValue(1);

    const result = await robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];

    expect(rules[0]).toMatchObject({ userAgent: "*", allow: "/", disallow: ["/api/"] });
    expect(rules[1]).toMatchObject({
      userAgent: [...AI_CRAWLERS],
      allow: "/",
      disallow: ["/api/"],
    });
    expect(AI_CRAWLERS).toEqual(expect.arrayContaining([
      "OAI-SearchBot",
      "Claude-SearchBot",
      "PerplexityBot",
      "Applebot-Extended",
      "Google-Extended",
    ]));
  });
});
