import type { Metadata } from "next";
import { cache } from "react";
import { MotionLink } from "@/components/motion/motion-link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { JsonLd } from "@/components/json-ld";
import { CharacterChip } from "@/components/character-chip";
import { compactNumber } from "@/lib/format";
import { characterForSource } from "@/lib/character/seed";
import { parseSkill } from "@/lib/ingest/parse-skill";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, seoDescription } from "@/lib/seo";
import { getCatalogSkill, getSkillAudits } from "@/lib/skills-sh";

export const revalidate = 300;

const getCachedCatalogSkill = cache((key: string) =>
  getCatalogSkill(JSON.parse(key) as string[]),
);

function pathFor(parts: string[]): string {
  return `/skills/${parts.map(encodeURIComponent).join("/")}`;
}

function installUrl(source: string): string {
  return source.includes("/") ? `https://github.com/${source}` : `https://${source}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string[] }>;
}): Promise<Metadata> {
  const { id } = await params;
  const skill = await getCachedCatalogSkill(JSON.stringify(id));
  if (!skill) {
    return buildPageMetadata({
      title: "Skill not found",
      description: "This agent skill could not be found.",
      path: pathFor(id),
      noIndex: true,
    });
  }
  const raw = skill.files?.find((file) => file.path.toLowerCase().endsWith("skill.md"))?.contents ?? "";
  const parsed = parseSkill(raw);
  const name = parsed?.name ?? skill.slug;
  return buildPageMetadata({
    title: `${name} agent skill`,
    description: seoDescription(parsed?.description ?? `Install ${name} from ${skill.source}.`),
    path: pathFor(id),
    type: "article",
    noIndex: !parsed?.body.trim(),
  });
}

export default async function CatalogSkillPage({
  params,
}: {
  params: Promise<{ id: string[] }>;
}) {
  const { id } = await params;
  const [skill, audits] = await Promise.all([
    getCachedCatalogSkill(JSON.stringify(id)),
    getSkillAudits(id),
  ]);
  if (!skill) notFound();

  const raw = skill.files?.find((file) => file.path.toLowerCase().endsWith("skill.md"))?.contents ?? "";
  const parsed = parseSkill(raw);
  const name = parsed?.name ?? skill.slug;
  const description = parsed?.description ?? `A reusable agent skill published by ${skill.source}.`;
  const sourceUrl = installUrl(skill.source);
  const creator = characterForSource(skill.source);
  const command = `npx skills add ${sourceUrl} --skill ${skill.slug}`;
  const pagePath = pathFor(id);
  const canonicalUrl = absoluteUrl(pagePath);
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name,
    description: seoDescription(description),
    url: canonicalUrl,
    codeRepository: sourceUrl,
    programmingLanguage: "Markdown",
    ...(creator ? {
      author: {
        "@type": "Person",
        name: creator.name,
        url: absoluteUrl(`/character/${creator.slug}`),
      },
    } : {}),
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I install this agent skill?",
        acceptedAnswer: { "@type": "Answer", text: `Run ${command}.` },
      },
      {
        "@type": "Question",
        name: "Is this agent skill safe to install?",
        acceptedAnswer: { "@type": "Answer", text: "Review the displayed partner audits, complete source, permissions, dependencies, and exact revision before installing." },
      },
      {
        "@type": "Question",
        name: "What does this agent skill do?",
        acceptedAnswer: { "@type": "Answer", text: seoDescription(description) },
      },
    ],
  };

  return (
    <article className="pt-8 max-w-5xl mx-auto">
      <JsonLd data={[
        schema,
        faq,
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Agent Skills Directory", path: "/browse" },
          { name, path: pagePath },
        ]),
      ]} />
      <MotionLink href="/browse" className="tag-font mb-5 inline-block text-[var(--color-grape)] hover:underline">
        ← back to all skills
      </MotionLink>

      <header className="ink-frame bg-[var(--color-paper)] p-6 md:p-10 mb-10">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="bubble text-xs">{skill.source}</span>
          <span className="stamp text-xs">{compactNumber(skill.installs)} installs</span>
          {creator && (
            <CharacterChip
              slug={creator.slug}
              name={creator.name}
              avatarUrl={`/characters/${creator.slug}/1.png`}
            />
          )}
        </div>
        <h1 className="display text-4xl sm:text-5xl md:text-7xl leading-[0.92] break-words mb-4">
          <span className="drip">{name}</span>
        </h1>
        <p className="type-font text-base md:text-lg leading-relaxed max-w-3xl">{description}</p>

        <div className="mt-8 command-panel p-4 overflow-x-auto">
          <h2 className="tag-font text-xs mb-2 text-[var(--color-grape)] uppercase tracking-[0.14em]">How do I install this agent skill?</h2>
          <code className="type-font text-sm whitespace-nowrap">{command}</code>
        </div>
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="tag-pill inline-block mt-4">
          view source ↗
        </a>
      </header>

      <section aria-labelledby="security-heading" className="mb-10">
        <h2 id="security-heading" className="display text-3xl mb-4"><span className="drip">Is this agent skill safe to install?</span></h2>
        {audits.length > 0 ? (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {audits.map((audit) => (
              <li key={audit.slug} className="ink-frame-soft bg-[var(--color-paper-2)] p-4">
                <div className="flex justify-between gap-2 mb-2">
                  <span className="display text-sm">{audit.provider}</span>
                  <span className="stamp text-[10px]">{audit.status}</span>
                </div>
                <p className="type-font text-xs leading-relaxed">{audit.summary}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-font text-sm ink-frame-soft p-4">No partner audit is available yet. Read the source before installing.</p>
        )}
      </section>

      {parsed?.body && (
        <section aria-labelledby="manual-heading">
          <h2 id="manual-heading" className="display text-3xl mb-4"><span className="drip">What does this agent skill do?</span></h2>
          <div className="ink-frame p-6 md:p-10 bg-[var(--color-paper)] grain">
            <div className="prose-zine type-font max-w-none leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{ h1: ({ children }) => <h2>{children}</h2> }}
              >
                {parsed.body}
              </ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      <section className="mt-10 ink-frame-soft bg-[var(--color-paper-2)] p-5" aria-labelledby="creator-link-heading">
        <h2 id="creator-link-heading" className="display text-2xl">How can the creator link this skill?</h2>
        <p className="type-font mt-3 text-sm leading-6">
          Add the canonical catalog link to the repository README so users can inspect current installs and available audits. The <MotionLink href="/guides/how-to-publish-agent-skills">publishing guide</MotionLink> covers the complete discovery path.
        </p>
        <pre className="mt-4 overflow-x-auto"><code>{`<a href="${canonicalUrl}">View ${name} on skillZs</a>`}</code></pre>
      </section>
    </article>
  );
}
