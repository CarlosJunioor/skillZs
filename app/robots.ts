import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/seo";
import { getCatalogTotal } from "@/lib/skills-sh";

export const revalidate = 3600;
const SITEMAP_SIZE = 50_000;

export const AI_CRAWLERS = [
  "OAI-SearchBot",
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "Claude-Web",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot",
  "Applebot-Extended",
  "Google-Extended",
] as const;

export default async function robots(): Promise<MetadataRoute.Robots> {
  let sitemapCount = 1;
  try {
    sitemapCount = Math.max(1, Math.ceil((await getCatalogTotal()) / SITEMAP_SIZE));
  } catch (error) {
    console.warn("catalog count unavailable for robots.txt:", error);
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: [...AI_CRAWLERS],
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: Array.from({ length: sitemapCount }, (_, id) =>
      absoluteUrl(`/sitemap/${id}.xml`),
    ),
    host: siteConfig.url,
  };
}
