import type { MetadataRoute } from "next";
import { absoluteUrl, categoryRoutes } from "@/lib/seo";
import {
  catalogSkillPath,
  getCatalogTotal,
  listCatalogSkillPages,
} from "@/lib/skills-sh";

export const revalidate = 3600;
const SITEMAP_SIZE = 50_000;
const API_PAGE_SIZE = 500;

export async function generateSitemaps() {
  const total = await getCatalogTotal();
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

  const total = await getCatalogTotal();
  const start = sitemapId * SITEMAP_SIZE;
  if (start >= total && sitemapId !== 0) return [];

  const itemCount = Math.min(SITEMAP_SIZE, Math.max(0, total - start));
  const skills = await listCatalogSkillPages(
    start / API_PAGE_SIZE,
    Math.ceil(itemCount / API_PAGE_SIZE),
  );
  const staticRoutes: MetadataRoute.Sitemap = sitemapId === 0 ? [
    {
      url: absoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/town"),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/browse"),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    ...categoryRoutes.map((category) => ({
      url: absoluteUrl(category.path),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ] : [];

  return [
    ...staticRoutes,
    ...skills
      .filter((skill) => !skill.isDuplicate)
      .map((skill) => ({
        url: absoluteUrl(catalogSkillPath(skill)),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
  ];
}
