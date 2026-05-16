import { renderToString } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ActivityRow } from "@/lib/types";

vi.mock("@/lib/stats", () => ({
  fetchActivityForCharacter: vi.fn(),
}));

import { fetchActivityForCharacter } from "@/lib/stats";
import { CharacterActivity } from "@/components/character-activity";

function row(over: Partial<ActivityRow> = {}): ActivityRow {
  return {
    id: "r1",
    character_id: "char-1",
    event_type: "ReleaseEvent",
    repo_full_name: "ghuser/x",
    ref: null,
    title: "Released v1.0",
    url: "https://github.com/ghuser/x/releases/tag/v1.0",
    occurred_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    ...over,
  };
}

beforeEach(() => {
  vi.mocked(fetchActivityForCharacter).mockReset();
});

describe("<CharacterActivity/>", () => {
  it("renders empty state when no rows", async () => {
    vi.mocked(fetchActivityForCharacter).mockResolvedValue([]);
    const el = await CharacterActivity({ characterId: "char-1" });
    const html = renderToString(el);
    expect(html).toMatch(/quiet week\./i);
  });

  it("renders heading and items in order", async () => {
    vi.mocked(fetchActivityForCharacter).mockResolvedValue([
      row({ id: "a", title: "Released v2.0" }),
      row({ id: "b", title: "Pushed 1 commit to ghuser/x", event_type: "PushEvent" }),
    ]);
    const el = await CharacterActivity({ characterId: "char-1" });
    const html = renderToString(el);
    // heading level 2 with "this week"
    expect(html).toMatch(/<h2[^>]*>.*this week.*<\/h2>/i);
    // both list items present in order
    const v2Idx = html.indexOf("Released v2.0");
    const pushIdx = html.indexOf("Pushed 1 commit");
    expect(v2Idx).toBeGreaterThan(-1);
    expect(pushIdx).toBeGreaterThan(-1);
    expect(v2Idx).toBeLessThan(pushIdx);
    // exactly 2 <li> elements
    const liMatches = html.match(/<li /g);
    expect(liMatches).toHaveLength(2);
  });

  it("renders outbound links with target=_blank rel=noreferrer", async () => {
    vi.mocked(fetchActivityForCharacter).mockResolvedValue([row()]);
    const el = await CharacterActivity({ characterId: "char-1" });
    const html = renderToString(el);
    expect(html).toContain("Released v1.0");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
    expect(html).toContain('href="https://github.com/ghuser/x/releases/tag/v1.0"');
  });
});
