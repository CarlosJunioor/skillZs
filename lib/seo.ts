import type { Metadata } from "next";
import { categoryLabel } from "./format";
import type { SkillStats } from "./types";

const DEFAULT_SITE_URL = "https://skillzs.vercel.app";
const DEFAULT_OG_IMAGE = "/fisheye.png";
const DESCRIPTION_MAX = 160;

export const siteConfig = {
  name: "skillZs",
  title: "skillZs - Claude skills catalog",
  description:
    "Discover, compare, and install hand-tagged Claude skills from public GitHub repos, ranked by votes, usage, stars, and freshness.",
  url: siteUrl(),
  ogImage: DEFAULT_OG_IMAGE,
  keywords: [
    "Claude skills",
    "Claude Code skills",
    "AI agent skills",
    "skill catalog",
    "developer tools",
    "GitHub skills",
  ],
};

export const categoryRoutes = [
  { slug: "coding", path: "/category/coding", label: "Coding" },
  { slug: "creative", path: "/category/creative", label: "Creative" },
  { slug: "agent", path: "/category/agents", label: "Agents" },
  { slug: "utils", path: "/category/utils", label: "Utils" },
  { slug: "research", path: "/category/research", label: "Research" },
  { slug: "other", path: "/category/other", label: "Other" },
] as const;

export type CategorySlug = (typeof categoryRoutes)[number]["slug"];

export function siteUrl(): string {
  return normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL ||
      DEFAULT_SITE_URL,
  );
}

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalizedPath}`;
}

export function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_SITE_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

export function seoDescription(value: string, fallback = siteConfig.description): string {
  const collapsed = value.replace(/\s+/g, " ").trim() || fallback;
  if (collapsed.length <= DESCRIPTION_MAX) return collapsed;
  return `${collapsed.slice(0, DESCRIPTION_MAX - 3).trimEnd()}...`;
}

export function categoryRoute(slug: string | null | undefined): string {
  return categoryRoutes.find((category) => category.slug === (slug ?? "other"))?.path ?? "/category/other";
}

export function categoryTitle(slug: string | null | undefined): string {
  const label = categoryRoutes.find((category) => category.slug === (slug ?? "other"))?.label ?? categoryLabel(slug);
  return `${label} Claude skills`;
}

export function categoryDescription(slug: string | null | undefined): string {
  const label = categoryRoutes.find((category) => category.slug === (slug ?? "other"))?.label.toLowerCase() ?? categoryLabel(slug).toLowerCase();
  return seoDescription(
    `Browse ${label} Claude skills for agents, automation, workflows, prompts, coding, research, and creative projects.`,
  );
}

export function skillDescription(skill: Pick<SkillStats, "name" | "description" | "tagline">): string {
  const tagline = skill.tagline?.trim();
  const description = skill.description?.trim();
  const text = tagline && description ? `${tagline}. ${description}` : tagline || description || skill.name;
  return seoDescription(text);
}

export function skillImage(skill: Pick<SkillStats, "diptych_url" | "cover_url">): string {
  return skill.diptych_url || skill.cover_url || siteConfig.ogImage;
}

export function buildPageMetadata({
  title,
  description,
  path,
  image = siteConfig.ogImage,
  imageAlt = siteConfig.name,
  type = "website",
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}): Metadata {
  const cleanDescription = seoDescription(description);
  return {
    title,
    description: cleanDescription,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description: cleanDescription,
      url: path,
      siteName: siteConfig.name,
      type,
      images: [
        {
          url: image,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: cleanDescription,
      images: [image],
    },
    robots: noIndex
      ? {
          index: false,
          follow: true,
        }
      : undefined,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: siteConfig.name,
    url: absoluteUrl("/"),
    description: siteConfig.description,
    inLanguage: "en",
    publisher: {
      "@id": absoluteUrl("/#organization"),
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: siteConfig.name,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon.png"),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function collectionJsonLd({
  path,
  name,
  description,
  skills,
}: {
  path: string;
  name: string;
  description: string;
  skills: Array<Pick<SkillStats, "name" | "slug" | "description">>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": absoluteUrl(`${path}#collection`),
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: {
      "@id": absoluteUrl("/#website"),
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: skills.length,
      itemListElement: skills.map((skill, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/skill/${skill.slug}`),
        name: skill.name,
        description: seoDescription(skill.description),
      })),
    },
  };
}

export function skillJsonLd(skill: SkillStats) {
  const image = skillImage(skill);
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    "@id": absoluteUrl(`/skill/${skill.slug}#source`),
    name: skill.name,
    description: skillDescription(skill),
    url: absoluteUrl(`/skill/${skill.slug}`),
    codeRepository: skill.repo_url,
    image: absoluteUrl(image),
    dateCreated: skill.first_seen,
    dateModified: skill.last_seen,
    keywords: [
      "Claude skill",
      categoryLabel(skill.category),
      skill.source_repo,
    ].filter(Boolean),
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: skill.vote_count,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/UseAction",
        userInteractionCount: skill.use_count,
      },
    ],
    isPartOf: {
      "@id": absoluteUrl("/#website"),
    },
  };
}

export function jsonLdScriptProps(data: unknown) {
  return {
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(data).replace(/</g, "\\u003c"),
    },
  };
}
