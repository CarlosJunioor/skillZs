import { describe, expect, it } from "vitest";
import { summarizeAgentSkills } from "@/lib/agent-skills-report";
import type { CatalogSkill } from "@/lib/skills-sh";

function skill(name: string, source: string, installs: number, isDuplicate = false): CatalogSkill {
  return {
    id: `${source}/${name}`,
    slug: name,
    name,
    source,
    installs,
    sourceType: "github",
    installUrl: null,
    url: `https://example.com/${name}`,
    isDuplicate,
  };
}

describe("summarizeAgentSkills", () => {
  it("excludes duplicates and calculates adoption concentration", () => {
    const report = summarizeAgentSkills([
      skill("alpha", "one/repo", 100),
      skill("beta", "one/repo", 50),
      skill("gamma", "two/repo", 25),
      skill("copy", "three/repo", 500, true),
    ], 1_000);

    expect(report).toMatchObject({
      ecosystemTotal: 1_000,
      sampleSize: 3,
      sampleInstalls: 175,
      medianInstalls: 50,
      uniqueSources: 2,
      topTenShare: 1,
    });
    expect(report.topSources[0]).toEqual({ source: "one/repo", skills: 2, installs: 150 });
  });
});
