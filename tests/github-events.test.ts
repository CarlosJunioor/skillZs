import { describe, it, expect } from "vitest";
import { normalizeEvent, type RawGitHubEvent } from "@/lib/character/github-events";

const CHAR_ID = "00000000-0000-0000-0000-000000000001";

function rawRelease(overrides: Partial<RawGitHubEvent> = {}): RawGitHubEvent {
  return {
    id: "evt-rel-1",
    type: "ReleaseEvent",
    actor: { id: 1, login: "ghuser" },
    repo: { id: 99, name: "ghuser/awesome" },
    payload: {
      action: "published",
      release: {
        tag_name: "v1.2.0",
        html_url: "https://github.com/ghuser/awesome/releases/tag/v1.2.0",
      },
    },
    created_at: "2026-05-15T10:00:00Z",
    ...overrides,
  };
}

function rawPush(overrides: Partial<RawGitHubEvent> = {}): RawGitHubEvent {
  return {
    id: "evt-push-1",
    type: "PushEvent",
    actor: { id: 1, login: "ghuser" },
    repo: { id: 99, name: "ghuser/awesome" },
    payload: {
      ref: "refs/heads/main",
      before: "aaaa111",
      head: "bbbb222",
      commits: [{ sha: "c1" }, { sha: "c2" }, { sha: "c3" }],
    },
    created_at: "2026-05-15T09:00:00Z",
    ...overrides,
  };
}

describe("normalizeEvent", () => {
  it("maps ReleaseEvent to row", () => {
    const row = normalizeEvent(rawRelease(), CHAR_ID);
    expect(row).toEqual({
      character_id: CHAR_ID,
      github_event_id: "evt-rel-1",
      event_type: "ReleaseEvent",
      repo_full_name: "ghuser/awesome",
      ref: null,
      title: "Released v1.2.0",
      url: "https://github.com/ghuser/awesome/releases/tag/v1.2.0",
      occurred_at: "2026-05-15T10:00:00Z",
      payload: rawRelease().payload,
    });
  });

  it("maps PushEvent to refs/heads/main to row with plural commits", () => {
    const row = normalizeEvent(rawPush(), CHAR_ID);
    expect(row).not.toBeNull();
    expect(row!.event_type).toBe("PushEvent");
    expect(row!.ref).toBe("refs/heads/main");
    expect(row!.title).toBe("Pushed 3 commits to ghuser/awesome");
    expect(row!.url).toBe(
      "https://github.com/ghuser/awesome/compare/aaaa111...bbbb222",
    );
  });

  it("maps PushEvent with 1 commit using singular form", () => {
    const row = normalizeEvent(
      rawPush({ payload: { ref: "refs/heads/main", before: "a", head: "b", commits: [{ sha: "c" }] } }),
      CHAR_ID,
    );
    expect(row!.title).toBe("Pushed 1 commit to ghuser/awesome");
  });

  it("maps PushEvent to refs/heads/master", () => {
    const row = normalizeEvent(
      rawPush({ payload: { ref: "refs/heads/master", before: "a", head: "b", commits: [{}] } }),
      CHAR_ID,
    );
    expect(row).not.toBeNull();
    expect(row!.ref).toBe("refs/heads/master");
  });

  it("returns null for PushEvent to feature branch", () => {
    const row = normalizeEvent(
      rawPush({ payload: { ref: "refs/heads/feature-x", before: "a", head: "b", commits: [{}] } }),
      CHAR_ID,
    );
    expect(row).toBeNull();
  });

  it("returns null for PushEvent missing ref", () => {
    const row = normalizeEvent(
      rawPush({ payload: { before: "a", head: "b", commits: [{}] } }),
      CHAR_ID,
    );
    expect(row).toBeNull();
  });

  it("returns null for WatchEvent", () => {
    const row = normalizeEvent(
      { ...rawPush(), id: "evt-w", type: "WatchEvent", payload: {} },
      CHAR_ID,
    );
    expect(row).toBeNull();
  });

  it("returns null for IssuesEvent", () => {
    const row = normalizeEvent(
      { ...rawPush(), id: "evt-i", type: "IssuesEvent", payload: {} },
      CHAR_ID,
    );
    expect(row).toBeNull();
  });
});
