import type { MetadataRoute } from "next";
import { absoluteUrl, categoryRoutes } from "@/lib/seo";
import { fetchSitemapSkills } from "@/lib/stats";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/browse"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    ...categoryRoutes.map((category) => ({
      url: absoluteUrl(category.path),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  try {
    const skills = await fetchSitemapSkills();
    return [
      ...staticRoutes,
      ...skills.map((skill) => ({
        url: absoluteUrl(`/skill/${skill.slug}`),
        lastModified: new Date(skill.last_seen || skill.first_seen || now),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch (error) {
    console.error("sitemap skill fetch failed:", error);
    return staticRoutes;
  }
}
