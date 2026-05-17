import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SkillCard } from "@/components/skill-card";
import { categoryLabel } from "@/lib/format";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  categoryDescription,
  categoryRoute,
  categoryTitle,
  collectionJsonLd,
} from "@/lib/seo";
import { fetchByCategory } from "@/lib/stats";

const VALID = new Set(["coding", "creative", "agent", "utils", "research", "other"]);

export const revalidate = 300;

function normalizeCategoryParam(name: string): string | null {
  const slug = name === "agents" ? "agent" : name;
  return VALID.has(slug) ? slug : null;
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

  const skills = await fetchByCategory(slug, 60);
  const title = categoryTitle(slug);
  const description = categoryDescription(slug);
  const path = categoryRoute(slug);

  return (
    <div className="pt-8">
      <JsonLd
        data={[
          collectionJsonLd({
            path,
            name: title,
            description,
            skills,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: title, path },
          ]),
        ]}
      />
      <Link href="/" className="tag-font text-[var(--color-grape)] inline-block mb-4 hover:underline">
        ← back to homepage
      </Link>
      <h1 className="display text-6xl md:text-8xl leading-none mb-8">
        <span className="drip">{categoryLabel(slug).toLowerCase()}</span>
      </h1>
      {skills.length === 0 ? (
        <div className="ink-frame p-12 text-center bg-[var(--color-paper-2)]">
          <p className="display text-2xl">nothing here yet</p>
          <p className="type-font mt-2">ingest more skills.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {skills.map((s) => (
            <SkillCard key={s.id} skill={s} size="md" />
          ))}
        </div>
      )}
    </div>
  );
}
