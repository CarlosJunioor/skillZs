import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CharacterHero } from "@/components/character-hero";
import { SkillRow } from "@/components/skill-row";
import { SkillCard } from "@/components/skill-card";
import { fetchCharacterBySlug, fetchSkillsByCharacter } from "@/lib/stats";
import { buildPageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { CharacterActivity } from "@/components/character-activity";
import { ActivitySkeleton } from "@/components/activity-skeleton";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const character = await fetchCharacterBySlug(slug);
  if (!character) {
    return buildPageMetadata({
      title: "Character not found",
      description: "This skillZs character could not be found.",
      path: `/character/${slug}`,
      noIndex: true,
    });
  }
  return buildPageMetadata({
    title: `${character.name} on skillZs`,
    description: character.bio ?? character.role ?? `Skills shipped by ${character.name}.`,
    path: `/character/${character.slug}`,
    ...(character.avatar_url ? { image: character.avatar_url } : {}),
    imageAlt: character.name,
    type: "article",
  });
}

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = await fetchCharacterBySlug(slug);
  if (!character) notFound();

  const skills = await fetchSkillsByCharacter(character.id);

  return (
    <article className="pt-6">
      <CharacterHero character={character} />

      {skills.length > 0 ? (
        <SkillRow title={`shipped by ${character.name.toLowerCase()}`} skills={skills} />
      ) : (
        <section className="mt-10">
          <h2 className="display text-2xl mb-3">
            <span className="drip">no skills yet</span>
          </h2>
          <p className="type-font text-base text-[var(--color-rust)]">
            Nothing in the catalog has been attributed to {character.name} yet. Check back after the
            next ingest run.
          </p>
        </section>
      )}

      {/* Static grid fallback for clients without horizontal scroll affordance. */}
      {skills.length > 0 && (
        <noscript>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mt-10">
            {skills.map((s) => (
              <SkillCard key={s.id} skill={s} size="sm" />
            ))}
          </div>
        </noscript>
      )}

      <Suspense fallback={<ActivitySkeleton />}>
        <CharacterActivity characterId={character.id} />
      </Suspense>
    </article>
  );
}
