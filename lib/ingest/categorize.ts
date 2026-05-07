import type { Category } from "../types";

const RULES: Array<{ category: Exclude<Category, null>; patterns: RegExp[] }> = [
  {
    category: "coding",
    patterns: [
      /\b(debug|debugging|tdd|test|testing|lint|refactor|review|migrat|typescript|python|rust|go\b|java|database|sql)\b/i,
    ],
  },
  {
    category: "creative",
    patterns: [
      /\b(design|ui|ux|color|theme|frontend|tailwind|figma|css|landing|copy|writing|brainstorm)\b/i,
    ],
  },
  {
    category: "agent",
    patterns: [
      /\b(agent|orchestrat|multi[- ]agent|autonomous|swarm|subagent|router|planner)\b/i,
    ],
  },
  {
    category: "research",
    patterns: [
      /\b(research|search|deep[- ]?research|literature|summari[sz]e|investigate|exa|perplexity)\b/i,
    ],
  },
  {
    category: "utils",
    patterns: [
      /\b(util|helper|format|convert|cli|tool|workflow|automation|pipeline|hook)\b/i,
    ],
  },
];

export function categorize(name: string, description: string): Category {
  const text = `${name} ${description}`;
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.category;
  }
  return null;
}
