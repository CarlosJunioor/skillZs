/**
 * Minimal GitHub REST API client for the ingestion pipeline.
 * Uses GITHUB_TOKEN if set (raises rate limit from 60 to 5000/hr).
 */

const API = "https://api.github.com";
export const MAX_SKILL_FILE_BYTES = 256_000;
export const MAX_SKILL_FILES_PER_REPO = 1_000;
/** Hard ceiling per outbound request so one hung upstream cannot consume the
 * whole cron budget (Vercel maxDuration is 300s; undici has no overall deadline). */
export const FETCH_TIMEOUT_MS = 15_000;

function authHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "skillZs-ingest/0.1",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`GitHub ${path} -> ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface RepoMeta {
  default_branch: string;
  stargazers_count: number;
  description: string | null;
  html_url: string;
  owner: { login: string };
  name: string;
}

export async function getRepoMeta(owner: string, repo: string): Promise<RepoMeta> {
  return gh<RepoMeta>(`/repos/${owner}/${repo}`);
}

interface TreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
}

interface TreeResponse {
  tree: TreeEntry[];
  truncated: boolean;
}

export async function listSkillFiles(
  owner: string,
  repo: string,
  branch: string,
  pathPrefix?: string,
): Promise<string[]> {
  const tree = await gh<TreeResponse>(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  if (tree.truncated) {
    throw new Error(`GitHub tree for ${owner}/${repo}@${branch} was truncated`);
  }
  const matches = tree.tree
    .filter((e) => e.type === "blob")
    .filter((e) => /(^|\/)SKILL\.md$/i.test(e.path))
    .filter((e) => !pathPrefix || e.path.startsWith(pathPrefix))
    .filter((e) => typeof e.size !== "number" || e.size <= MAX_SKILL_FILE_BYTES);

  if (matches.length > MAX_SKILL_FILES_PER_REPO) {
    throw new Error(
      `${owner}/${repo} has ${matches.length} skill files; cap is ${MAX_SKILL_FILES_PER_REPO}`,
    );
  }

  return matches.map((e) => e.path);
}

export async function fetchRaw(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "skillZs-ingest/0.1" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`raw ${url} -> ${res.status}`);
  const declaredSize = Number(res.headers.get("content-length") ?? "0");
  if (declaredSize > MAX_SKILL_FILE_BYTES) {
    throw new Error(`raw ${url} exceeded ${MAX_SKILL_FILE_BYTES} bytes`);
  }
  const text = await res.text();
  if (Buffer.byteLength(text, "utf8") > MAX_SKILL_FILE_BYTES) {
    throw new Error(`raw ${url} exceeded ${MAX_SKILL_FILE_BYTES} bytes`);
  }
  return text;
}

export function ogImageUrl(owner: string, repo: string): string {
  return `https://opengraph.githubassets.com/1/${owner}/${repo}`;
}

export function repoFolderOf(filePath: string): string {
  // "skills/tdd/SKILL.md" -> "tdd"; "SKILL.md" -> ""
  const parts = filePath.split("/");
  parts.pop();
  return parts[parts.length - 1] ?? "";
}
