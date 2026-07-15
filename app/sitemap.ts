import type { MetadataRoute } from "next";
import { absoluteUrl, categoryRoutes } from "@/lib/seo";
import {
  catalogSkillPath,
  getCatalogTotal,
  listCatalogSkillPages,
} from "@/lib/skills-sh";
import { fetchSitemapCharacters } from "@/lib/stats";

export const revalidate = 3600;
const SITEMAP_SIZE = 50_000;
const API_PAGE_SIZE = 500;
const CONTENT_UPDATED = new Date("2026-07-15T00:00:00.000Z");
const FIRST_PARTY_SKILL_PATH = "/skills/carlosjunioor/skillzs/find-agent-skills";

async function catalogTotalOrZero(): Promise<number> {
  try {
    return await getCatalogTotal();
  } catch (error) {
    console.warn("sitemap catalog total unavailable:", error);
    return 0;
  }
}

async function catalogSkillsOrEmpty(startPage: number, pageCount: number) {
  try {
    return await listCatalogSkillPages(startPage, pageCount);
  } catch (error) {
    console.warn("sitemap catalog pages unavailable:", error);
    return [];
  }
}

async function sitemapCharactersOrEmpty() {
  try {
    return await fetchSitemapCharacters();
  } catch (error) {
    console.warn("sitemap characters unavailable:", error);
    return [];
  }
}

export async function generateSitemaps() {
  const total = await catalogTotalOrZero();
  return Array.from(
    { length: Math.max(1, Math.ceil(total / SITEMAP_SIZE)) },
    (_, id) => ({ id }),
  );
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const sitemapId = Number(await id);
  if (!Number.isInteger(sitemapId) || sitemapId < 0) return [];

  const total = await catalogTotalOrZero();
  const start = sitemapId * SITEMAP_SIZE;
  if (start >= total && sitemapId !== 0) return [];

  const itemCount = Math.min(SITEMAP_SIZE, Math.max(0, total - start));
  const skills = itemCount > 0
    ? await catalogSkillsOrEmpty(
      start / API_PAGE_SIZE,
      Math.ceil(itemCount / API_PAGE_SIZE),
    )
    : [];
  const characters = sitemapId === 0 ? await sitemapCharactersOrEmpty() : [];
  const staticRoutes: MetadataRoute.Sitemap = sitemapId === 0 ? [
    {
      url: absoluteUrl("/"),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/browse"),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/policies"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/about"),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/loops"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/guides"),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/research/agent-skills-report-2026"),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/guides/how-to-create-agent-skills"),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/guides/what-are-agent-skills"),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/guides/skill-md-vs-agents-md-vs-claude-md"),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/guides/how-to-publish-agent-skills"),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/guides/best-agent-skills"),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/guides/agent-skills-directories"),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/guides/how-to-install-agent-skills"),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/guides/agent-skills-vs-mcp"),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/guides/agent-skill-security"),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl(FIRST_PARTY_SKILL_PATH),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...categoryRoutes.map((category) => ({
      url: absoluteUrl(category.path),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...characters.map((character) => ({
      url: absoluteUrl(`/character/${character.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ] : [];

  return [
    ...staticRoutes,
    ...skills
      .filter((skill) => !skill.isDuplicate && catalogSkillPath(skill).toLowerCase() !== FIRST_PARTY_SKILL_PATH)
      .map((skill) => ({
        url: absoluteUrl(catalogSkillPath(skill)),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
  ];
}
