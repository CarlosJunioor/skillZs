import type { MetadataRoute } from "next";
import { absoluteUrl, categoryRoutes } from "@/lib/seo";
import { fetchSitemapSkills, fetchSitemapCharacters } from "@/lib/stats";

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
      url: absoluteUrl("/zine"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
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
    const [skills, characters] = await Promise.all([
      fetchSitemapSkills(),
      fetchSitemapCharacters(),
    ]);
    return [
      ...staticRoutes,
      ...characters.map((c) => ({
        url: absoluteUrl(`/character/${c.slug}`),
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.75,
      })),
      ...skills.map((skill) => ({
        url: absoluteUrl(`/skill/${skill.slug}`),
        lastModified: new Date(skill.last_seen || skill.first_seen || now),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch (error) {
    console.error("sitemap fetch failed:", error);
    return staticRoutes;
  }
}
