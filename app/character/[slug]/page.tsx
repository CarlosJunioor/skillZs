import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { MotionLink } from "@/components/motion/motion-link";
import { CharacterHero } from "@/components/character-hero";
import { SkillRow } from "@/components/skill-row";
import { SkillCard } from "@/components/skill-card";
import { fetchCharacterBySlug, fetchSkillsByCharacter } from "@/lib/stats";
import { resolveCharacterHero } from "@/lib/character/art";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";
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
      description: "This skillZs creator could not be found.",
      path: `/character/${slug}`,
      noIndex: true,
    });
  }
  const hero = resolveCharacterHero(character);
  return buildPageMetadata({
    title: `${character.name} on skillZs`,
    description: character.bio ?? character.role ?? `Skills shipped by ${character.name}.`,
    path: `/character/${character.slug}`,
    ...(hero ? { image: hero } : {}),
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
  const path = `/character/${character.slug}`;
  const hero = resolveCharacterHero(character);
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": absoluteUrl(`${path}#person`),
    name: character.name,
    url: absoluteUrl(path),
    ...(character.role ? { jobTitle: character.role } : {}),
    ...(character.bio ? { description: character.bio } : {}),
    ...(hero ? { image: absoluteUrl(hero) } : {}),
    sameAs: [
      character.gh_handle ? `https://github.com/${character.gh_handle}` : null,
      character.x_handle ? `https://x.com/${character.x_handle}` : null,
      character.site_url,
    ].filter(Boolean),
    knowsAbout: ["AI agent skills", "software development"],
  };

  return (
    <article className="pt-6">
      <Suspense fallback={null}>
        <JsonLd data={[
          person,
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: character.name, path },
          ]),
        ]} />
      </Suspense>
      <nav aria-label="Breadcrumb" className="type-font mb-5 text-xs text-[var(--color-rust)]">
        <MotionLink href="/" className="hover:text-[var(--color-grape)]">skillZs</MotionLink>
        <span aria-hidden> / </span>
        <span aria-current="page">creators / {character.name}</span>
      </nav>
      <CharacterHero character={character} heroUrl={hero} />

      <section className="grid gap-4 md:grid-cols-2" aria-label={`About ${character.name}`}>
        <article className="ink-frame-soft bg-[var(--color-paper-2)] p-5">
          <h2 className="display text-2xl">Who is {character.name}?</h2>
          <p className="type-font mt-3 text-sm leading-6">
            {character.bio ?? character.role ?? `${character.name} is a creator represented in the skillZs agent skill catalog.`}
          </p>
        </article>
        <article className="ink-frame-soft bg-[var(--color-paper-2)] p-5">
          <h2 className="display text-2xl">Which agent skills did {character.name} create?</h2>
          <p className="type-font mt-3 text-sm leading-6">
            skillZs currently attributes {skills.length} {skills.length === 1 ? "skill" : "skills"} to {character.name}. Attribution follows the catalog source and can change as repositories are updated. <MotionLink href="/browse">Browse the full agent skill catalog</MotionLink>.
          </p>
        </article>
      </section>

      {character.slug === "matt-pocock" && (
        <section className="mt-12" aria-labelledby="matt-playbook-heading">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-[var(--color-ink)] pb-3">
            <div>
              <div className="tag-font mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--color-grape)]">
                creator playbook / observed from mattpocock/skills
              </div>
              <h2 id="matt-playbook-heading" className="display text-3xl md:text-5xl">
                how Matt builds agent skills
              </h2>
            </div>
            <a href="https://github.com/mattpocock/skills" target="_blank" rel="noreferrer" className="tag-pill">
              inspect the source ↗
            </a>
          </div>

          <div className="grid gap-px border border-[#29313a] bg-[#29313a] md:grid-cols-4">
            {[
              ["failure first", "Begin with a recurring agent failure, not a feature list."],
              ["one leading idea", "Give the workflow a memorable handle such as a tight loop, seam, or tracer bullet."],
              ["compose flows", "Keep orchestrators thin and delegate reusable disciplines to focused skills."],
              ["finish on evidence", "End phases with observable proof: a file, command, test, or resolved decision."],
            ].map(([title, text]) => (
              <article key={title} className="bg-[var(--color-paper-2)] p-5">
                <h3 className="display text-xl text-[var(--color-grape)]">{title}</h3>
                <p className="type-font mt-3 text-sm leading-6 text-[var(--color-ink-soft)]">{text}</p>
              </article>
            ))}
          </div>

          <div className="command-panel mt-6 overflow-x-auto p-5">
            <div className="tag-font mb-3 text-[10px] uppercase tracking-[0.16em] text-[var(--color-grape)]">
              common idea-to-ship flow
            </div>
            <code className="type-font whitespace-nowrap text-sm">
              grill-with-docs → to-spec → to-tickets → implement → tdd → code-review
            </code>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 ink-frame-soft bg-[var(--color-paper-2)] p-5">
            <p className="type-font max-w-3xl text-sm leading-6">
              Latest observed work: <code>to-questionnaire</code> is currently a lab skill. It turns missing knowledge into a questionnaire for the person who can resolve it. Lab, promoted, and released are separate lifecycle states.
            </p>
            <MotionLink href="/guides/how-to-create-agent-skills#matt-pocock-method" className="tag-pill shrink-0">
              read the full guideline →
            </MotionLink>
          </div>
        </section>
      )}

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
