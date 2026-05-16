import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/character/github-events", async () => {
  const actual = await vi.importActual<typeof import("@/lib/character/github-events")>(
    "@/lib/character/github-events",
  );
  return { ...actual, fetchPublicEvents: vi.fn() };
});

const upsertMock = vi.fn();
const fromMock = vi.fn(() => ({ upsert: upsertMock }));
vi.mock("@/lib/supabase/server", () => ({
  supabaseService: () => ({ from: fromMock }),
}));

import { fetchPublicEvents } from "@/lib/character/github-events";
import { ingestActivityForCharacter } from "@/lib/character/ingest-activity";

const CHAR = {
  id: "00000000-0000-0000-0000-000000000001",
  slug: "ghuser",
  gh_handle: "ghuser",
};

beforeEach(() => {
  upsertMock.mockReset();
  fromMock.mockClear();
  vi.mocked(fetchPublicEvents).mockReset();
});

describe("ingestActivityForCharacter", () => {
  it("returns early with skipped=1 when gh_handle is null", async () => {
    const result = await ingestActivityForCharacter({ ...CHAR, gh_handle: null });
    expect(result).toEqual({ inserted: 0, skipped: 1, errored: 0 });
    expect(fetchPublicEvents).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("normalizes and inserts qualifying events from the last 14 days", async () => {
    const nowIso = new Date().toISOString();
    vi.mocked(fetchPublicEvents).mockResolvedValue([
      {
        id: "e1",
        type: "ReleaseEvent",
        actor: { id: 1, login: "ghuser" },
        repo: { id: 9, name: "ghuser/x" },
        payload: { release: { tag_name: "v1", html_url: "https://github.com/ghuser/x/releases/tag/v1" } },
        created_at: nowIso,
      },
      {
        id: "e2",
        type: "WatchEvent",
        actor: { id: 1, login: "ghuser" },
        repo: { id: 9, name: "ghuser/x" },
        payload: {},
        created_at: nowIso,
      },
    ]);
    upsertMock.mockResolvedValue({ data: null, error: null });

    const result = await ingestActivityForCharacter(CHAR);

    expect(fromMock).toHaveBeenCalledWith("character_activities");
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.any(Array),
      { onConflict: "github_event_id", ignoreDuplicates: true },
    );
    const rows = upsertMock.mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ github_event_id: "e1", event_type: "ReleaseEvent" });
    expect(result).toEqual({ inserted: 1, skipped: 0, errored: 0 });
  });

  it("drops events older than 14 days before insert", async () => {
    const oldIso = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    vi.mocked(fetchPublicEvents).mockResolvedValue([
      {
        id: "e-old",
        type: "ReleaseEvent",
        actor: { id: 1, login: "ghuser" },
        repo: { id: 9, name: "ghuser/x" },
        payload: { release: { tag_name: "v1", html_url: "https://github.com/x" } },
        created_at: oldIso,
      },
    ]);
    upsertMock.mockResolvedValue({ data: null, error: null });

    const result = await ingestActivityForCharacter(CHAR);

    expect(upsertMock).not.toHaveBeenCalled();
    expect(result).toEqual({ inserted: 0, skipped: 0, errored: 0 });
  });

  it("does not throw when GitHub fetch rejects (errored=1)", async () => {
    vi.mocked(fetchPublicEvents).mockRejectedValue(new Error("boom"));
    const result = await ingestActivityForCharacter(CHAR);
    expect(result).toEqual({ inserted: 0, skipped: 0, errored: 1 });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returns inserted=0 when fetch returns []", async () => {
    vi.mocked(fetchPublicEvents).mockResolvedValue([]);
    const result = await ingestActivityForCharacter(CHAR);
    expect(upsertMock).not.toHaveBeenCalled();
    expect(result).toEqual({ inserted: 0, skipped: 0, errored: 0 });
  });
});
