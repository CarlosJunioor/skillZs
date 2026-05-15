import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { JsonLd } from "@/components/json-ld";
import { VoteButton } from "@/components/vote-button";
import { SkillRow } from "@/components/skill-row";
import { InstallPill } from "@/components/install-pill";
import { compactNumber, categoryLabel } from "@/lib/format";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  categoryRoute,
  categoryTitle,
  skillDescription,
  skillImage,
  skillJsonLd,
} from "@/lib/seo";
import {
  fetchByCategory,
  fetchReadme,
  fetchSkillBySlug,
} from "@/lib/stats";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const skill = await fetchSkillBySlug(slug);
  if (!skill) {
    return buildPageMetadata({
      title: "Skill not found",
      description: "This skillZs skill could not be found.",
      path: `/skill/${slug}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `${skill.name} Claude skill`,
    description: skillDescription(skill),
    path: `/skill/${skill.slug}`,
    image: skillImage(skill),
    imageAlt: skill.tagline ?? skill.name,
    type: "article",
  });
}

export default async function SkillPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const skill = await fetchSkillBySlug(slug);
  if (!skill) notFound();

  const [readme, related] = await Promise.all([
    fetchReadme(slug),
    skill.category ? fetchByCategory(skill.category, 8) : Promise.resolve([]),
  ]);
  const relatedFiltered = related.filter((s) => s.id !== skill.id);
  const categoryPath = categoryRoute(skill.category);
  const categoryCrumb = categoryTitle(skill.category);

  return (
    <article className="pt-6">
      <JsonLd
        data={[
          skillJsonLd(skill),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: categoryCrumb, path: categoryPath },
            { name: skill.name, path: `/skill/${skill.slug}` },
          ]),
        ]}
      />
      <Link href="/" className="tag-font text-[var(--color-grape)] inline-block mb-4 hover:underline">
        ← back to zine
      </Link>

      {/* Comic page composition */}
      <div className="grid md:grid-cols-[1.05fr_1fr] gap-6">
        {/* Visual panel: AI diptych first, cover image second, glyph fallback */}
        <div className="ink-frame relative h-[340px] md:h-[480px] overflow-hidden grain bg-[var(--color-mauve)]">
          {(() => {
            const visual = skill.diptych_url ?? skill.cover_url;
            if (visual) {
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={visual} alt={skill.tagline ?? skill.name} className="w-full h-full object-cover" />
              );
            }
            return (
              <div className="w-full h-full flex items-center justify-center">
                <span className="display text-7xl text-[var(--color-paper)]">?!</span>
              </div>
            );
          })()}
          <span className="absolute top-4 left-4 stamp text-base">SKILL #{skill.slug.slice(-4).toUpperCase()}</span>
        </div>

        {/* Info panel */}
        <div className="ink-frame p-6 md:p-8 bg-[var(--color-paper)] flex flex-col justify-between min-h-[340px]">
          <div>
            <Link
              href={`/category/${skill.category ?? "other"}`}
              className="bubble text-sm mb-5 inline-block"
            >
              {categoryLabel(skill.category)}
            </Link>
            <h1 className="display text-4xl md:text-6xl leading-[0.92] mb-4 break-words">
              <span className="drip">{skill.name}</span>
            </h1>
            {skill.tagline && (
              <p className="tag-font text-lg md:text-xl text-[var(--color-grape)] mb-3 leading-snug">
                {skill.tagline}
              </p>
            )}
            <p className="type-font text-base leading-relaxed">
              {skill.description}
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <InstallPill slug={skill.slug} skillId={skill.id} />
            <div className="flex flex-wrap gap-2">
              <VoteButton skillId={skill.id} initialCount={skill.vote_count} variant="vote" />
              <VoteButton skillId={skill.id} initialCount={skill.use_count} variant="use" />
            </div>
            <div className="flex flex-wrap items-center gap-3 type-font text-sm pt-2 border-t-2 border-[var(--color-ink)]">
              <a
                href={skill.repo_url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-[var(--color-grape)]"
              >
                ↗ github · ★ {compactNumber(skill.github_stars)}
              </a>
              <span className="text-[var(--color-rust)]">·</span>
              <span className="text-[var(--color-rust)]">
                src: <code>{skill.source_repo}</code>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* README */}
      {readme && (
        <section className="mt-14">
          <h2 className="display text-3xl mb-4">
            <span className="drip">the manual</span>
          </h2>
          <div className="ink-frame p-6 md:p-10 bg-[var(--color-paper)] grain relative">
            <div className="prose-zine relative type-font max-w-none leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      {relatedFiltered.length > 0 && (
        <SkillRow
          title={`more ${categoryLabel(skill.category).toLowerCase()}`}
          skills={relatedFiltered}
          size="sm"
        />
      )}
    </article>
  );
}
