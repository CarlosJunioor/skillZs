import "server-only";

const EVENTS_API = "https://api.github.com";
/** Per-request ceiling so one hung GitHub response can't consume the cron budget. */
const FETCH_TIMEOUT_MS = 15_000;

function headers(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "skillZs-activity/0.1",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface RawGitHubEvent {
  id: string;
  type: string;
  actor: { id: number; login: string };
  repo: { id: number; name: string }; // "owner/repo"
  payload: {
    ref?: string;
    before?: string;
    head?: string;
    commits?: Array<unknown>;
    release?: { tag_name: string; html_url: string };
    action?: string;
    [k: string]: unknown;
  };
  created_at: string;
}

export interface NormalizedActivity {
  character_id: string;
  github_event_id: string;
  event_type: "PushEvent" | "ReleaseEvent";
  repo_full_name: string;
  ref: string | null;
  title: string;
  url: string;
  occurred_at: string;
  payload: unknown;
}

const DEFAULT_BRANCHES = new Set(["refs/heads/main", "refs/heads/master"]);

/**
 * Fetch the most recent public events for a GitHub user.
 * Returns [] on 404 (deleted/renamed handle). Throws on other non-2xx.
 */
export async function fetchPublicEvents(handle: string): Promise<RawGitHubEvent[]> {
  const res = await fetch(
    `${EVENTS_API}/users/${encodeURIComponent(handle)}/events/public?per_page=30`,
    { headers: headers(), signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
  );
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`GitHub events for ${handle} -> ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as RawGitHubEvent[];
}

/**
 * Map a raw GH event to an insert row, or null if it should be filtered out.
 * Only ReleaseEvent and PushEvent-to-default-branch survive.
 */
export function normalizeEvent(
  raw: RawGitHubEvent,
  characterId: string,
): NormalizedActivity | null {
  if (raw.type === "ReleaseEvent") {
    const release = raw.payload.release;
    if (!release?.tag_name || !release?.html_url) return null;
    return {
      character_id: characterId,
      github_event_id: raw.id,
      event_type: "ReleaseEvent",
      repo_full_name: raw.repo.name,
      ref: null,
      title: `Released ${release.tag_name}`,
      url: release.html_url,
      occurred_at: raw.created_at,
      payload: raw.payload,
    };
  }

  if (raw.type === "PushEvent") {
    const ref = raw.payload.ref;
    if (!ref || !DEFAULT_BRANCHES.has(ref)) return null;
    const commitCount = raw.payload.commits?.length ?? 0;
    if (commitCount === 0) return null;
    const before = raw.payload.before ?? "";
    const head = raw.payload.head ?? "";
    if (!before || !head) return null;
    const noun = commitCount === 1 ? "commit" : "commits";
    return {
      character_id: characterId,
      github_event_id: raw.id,
      event_type: "PushEvent",
      repo_full_name: raw.repo.name,
      ref,
      title: `Pushed ${commitCount} ${noun} to ${raw.repo.name}`,
      url: `https://github.com/${raw.repo.name}/compare/${before}...${head}`,
      occurred_at: raw.created_at,
      payload: raw.payload,
    };
  }

  return null;
}
