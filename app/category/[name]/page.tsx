import { notFound } from "next/navigation";
import Link from "next/link";
import { SkillCard } from "@/components/skill-card";
import { categoryLabel } from "@/lib/format";
import { fetchByCategory } from "@/lib/stats";

const VALID = new Set(["coding", "creative", "agent", "utils", "research", "other"]);

export const revalidate = 300;

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const slug = name === "agents" ? "agent" : name;
  if (!VALID.has(slug)) notFound();

  const skills = await fetchByCategory(slug, 60);

  return (
    <div className="pt-8">
      <Link href="/" className="tag-font text-[var(--color-grape)] inline-block mb-4 hover:underline">
        ← back to zine
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
