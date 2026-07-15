import type { CatalogSkill } from "./skills-sh";

const TAG_RULES: Array<[string, RegExp]> = [
  ["frontend", /\b(react|next|vue|svelte|frontend|css|tailwind|web)\b/],
  ["testing", /\b(test|testing|debug|qa|playwright|vitest|jest)\b/],
  ["git", /\b(git|github|pull request|code review|commit)\b/],
  ["data", /\b(database|postgres|sql|supabase|data|spreadsheet)\b/],
  ["devops", /\b(deploy|devops|docker|kubernetes|vercel|ci cd|cloud)\b/],
  ["docs", /\b(document|docs|pdf|readme|presentation|slides)\b/],
  ["security", /\b(security|auth|audit|vulnerability|threat)\b/],
  ["design", /\b(design|ui|ux|image|visual|animation)\b/],
  ["growth", /\b(seo|marketing|content|copy|email|sales|launch)\b/],
  ["research", /\b(research|search|analysis|investigate)\b/],
  ["agents", /\b(agent|prompt|mcp|skill|llm|ai)\b/],
];

export function inferCatalogTags(
  skill: Pick<CatalogSkill, "name" | "slug">,
): string[] {
  const text = `${skill.name} ${skill.slug}`
    .toLowerCase()
    .replace(/[-_/]+/g, " ");
  const tags = TAG_RULES.filter(([, pattern]) => pattern.test(text))
    .map(([tag]) => tag)
    .slice(0, 3);
  return tags.length > 0 ? tags : ["workflow"];
}
