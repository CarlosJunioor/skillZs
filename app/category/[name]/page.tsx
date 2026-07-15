import type { Metadata } from "next";
import { MotionLink } from "@/components/motion/motion-link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { SkillLeaderboard } from "@/components/skill-leaderboard";
import { categoryLabel } from "@/lib/format";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
  categoryDescription,
  categoryRoute,
  categoryTitle,
} from "@/lib/seo";
import { catalogSkillPath, searchCatalogSkills } from "@/lib/skills-sh";

const CATEGORY_QUERIES: Record<string, string> = {
  coding: "software development coding",
  creative: "creative design writing",
  agent: "AI agents prompts MCP",
  utils: "productivity utilities workflow",
  research: "research analysis search",
  other: "general workflow automation",
};

export const revalidate = 300;

function normalizeCategoryParam(name: string): string | null {
  const slug = name === "agents" ? "agent" : name;
  return slug in CATEGORY_QUERIES ? slug : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const slug = normalizeCategoryParam(name);
  if (!slug) {
    return buildPageMetadata({
      title: "Category not found",
      description: "This skillZs category could not be found.",
      path: `/category/${name}`,
      noIndex: true,
    });
  }
  return buildPageMetadata({
    title: categoryTitle(slug),
    description: categoryDescription(slug),
    path: categoryRoute(slug),
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const slug = normalizeCategoryParam(name);
  if (!slug) notFound();

  const skills = await searchCatalogSkills(CATEGORY_QUERIES[slug], 200);
  const title = categoryTitle(slug);
  const description = categoryDescription(slug);
  const path = categoryRoute(slug);
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: absoluteUrl(path),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: skills.length,
      itemListElement: skills.map((skill, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: skill.name,
        url: absoluteUrl(catalogSkillPath(skill)),
      })),
    },
  };

  return (
    <div className="pt-8">
      <JsonLd data={[
        collection,
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: title, path },
        ]),
      ]} />
      <MotionLink href="/browse" className="tag-font mb-4 inline-block text-[var(--color-grape)] hover:underline">
        ← browse all skills
      </MotionLink>
      <h1 className="display text-6xl md:text-8xl leading-none mb-3">
        <span className="drip">{categoryLabel(slug).toLowerCase()}</span>
      </h1>
      <p className="type-font max-w-3xl mb-8">{description}</p>
      {skills.length > 0 ? (
        <SkillLeaderboard skills={skills} />
      ) : (
        <div className="ink-frame p-12 text-center bg-[var(--color-paper-2)]">
          <p className="display text-2xl">nothing here yet</p>
        </div>
      )}
    </div>
  );
}
