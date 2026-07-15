import { notFound, permanentRedirect } from "next/navigation";
import { SEED_REPOS } from "@/lib/ingest/sources";
import { catalogSkillPath, getCatalogSkill } from "@/lib/skills-sh";

export const revalidate = 3600;

export default async function LegacySkillPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  for (const source of SEED_REPOS) {
    const prefix = `${source.owner}-${source.repo}-`;
    if (!slug.startsWith(prefix)) continue;

    const id = [source.owner, source.repo, slug.slice(prefix.length)];
    const skill = await getCatalogSkill(id);
    if (skill) permanentRedirect(catalogSkillPath(skill));
  }

  notFound();
}
