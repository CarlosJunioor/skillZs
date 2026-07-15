import type { CatalogSkill } from "@/lib/skills-sh";

export function summarizeAgentSkills(skills: CatalogSkill[], ecosystemTotal: number) {
  const sample = skills
    .filter((skill) => !skill.isDuplicate)
    .sort((a, b) => b.installs - a.installs);
  const sampleInstalls = sample.reduce((total, skill) => total + skill.installs, 0);
  const middle = Math.floor(sample.length / 2);
  const medianInstalls = sample.length === 0
    ? 0
    : sample.length % 2 === 0
      ? Math.round((sample[middle - 1].installs + sample[middle].installs) / 2)
      : sample[middle].installs;
  const sources = new Map<string, { skills: number; installs: number }>();

  for (const skill of sample) {
    const current = sources.get(skill.source) ?? { skills: 0, installs: 0 };
    sources.set(skill.source, {
      skills: current.skills + 1,
      installs: current.installs + skill.installs,
    });
  }

  return {
    ecosystemTotal,
    sampleSize: sample.length,
    sampleInstalls,
    medianInstalls,
    topTenShare: sampleInstalls === 0
      ? 0
      : sample.slice(0, 10).reduce((total, skill) => total + skill.installs, 0) / sampleInstalls,
    uniqueSources: sources.size,
    topSources: [...sources.entries()]
      .map(([source, totals]) => ({ source, ...totals }))
      .sort((a, b) => b.installs - a.installs)
      .slice(0, 10),
  };
}
