import { SEED_REPOS, type SeedRepo } from "./sources";
import {
  fetchRaw,
  getRepoMeta,
  listSkillFiles,
  ogImageUrl,
  repoFolderOf,
} from "./github";
import { parseSkill, slugify } from "./parse-skill";
import { categorize } from "./categorize";
import { supabaseService } from "../supabase/server";
import { contentHash } from "../diptych/hash";

export interface IngestStats {
  reposScanned: number;
  filesFound: number;
  skillsUpserted: number;
  skipped: number;
  errors: string[];
}

export async function runIngest(seeds: SeedRepo[] = SEED_REPOS): Promise<IngestStats> {
  const stats: IngestStats = {
    reposScanned: 0,
    filesFound: 0,
    skillsUpserted: 0,
    skipped: 0,
    errors: [],
  };
  const sb = supabaseService();
  const now = new Date().toISOString();

  for (const seed of seeds) {
    try {
      const meta = await getRepoMeta(seed.owner, seed.repo);
      stats.reposScanned++;
      const files = await listSkillFiles(
        seed.owner,
        seed.repo,
        meta.default_branch,
        seed.pathPrefix,
      );
      stats.filesFound += files.length;

      for (const path of files) {
        try {
          const raw = await fetchRaw(seed.owner, seed.repo, meta.default_branch, path);
          const parsed = parseSkill(raw);
          if (!parsed) {
            stats.skipped++;
            continue;
          }
          const folder = repoFolderOf(path) || slugify(parsed.name);
          const slug = `${seed.owner}-${seed.repo}-${slugify(folder || parsed.name)}`;
          const category = categorize(parsed.name, parsed.description);
          const repoUrl = `https://github.com/${seed.owner}/${seed.repo}/tree/${meta.default_branch}/${path
            .split("/")
            .slice(0, -1)
            .join("/")}`;

          const newHash = contentHash(parsed.body);
          // If upstream SKILL.md content changed for a row whose diptych was
          // already 'done', requeue it. The covers cron and diptych cron drain
          // 'pending' rows separately, so this only resets the diptych side.
          const { data: prior } = await sb
            .from("skills")
            .select("content_hash, diptych_status")
            .eq("slug", slug)
            .maybeSingle();
          const priorHash = (prior as { content_hash?: string | null } | null)?.content_hash ?? null;
          const priorDiptychStatus =
            (prior as { diptych_status?: string | null } | null)?.diptych_status ?? null;
          const shouldRequeueDiptych =
            priorHash !== null &&
            priorHash !== newHash &&
            priorDiptychStatus === "done";

          const { error } = await sb.from("skills").upsert(
            {
              slug,
              name: parsed.name,
              description: parsed.description,
              source_repo: `${seed.owner}/${seed.repo}`,
              source_path: path,
              repo_url: repoUrl,
              category,
              cover_url: ogImageUrl(seed.owner, seed.repo),
              github_stars: meta.stargazers_count,
              readme_md: parsed.body,
              content_hash: newHash,
              ...(shouldRequeueDiptych ? { diptych_status: "pending" } : {}),
              last_seen: now,
            },
            { onConflict: "slug" },
          );
          if (error) {
            stats.errors.push(`${slug}: ${error.message}`);
          } else {
            stats.skillsUpserted++;
          }
        } catch (e) {
          stats.errors.push(`${seed.owner}/${seed.repo}:${path} -> ${(e as Error).message}`);
        }
      }
    } catch (e) {
      stats.errors.push(`${seed.owner}/${seed.repo} -> ${(e as Error).message}`);
    }
  }

  const { error: rpcErr } = await sb.rpc("refresh_skill_stats");
  if (rpcErr) stats.errors.push(`refresh_skill_stats: ${rpcErr.message}`);

  return stats;
}
