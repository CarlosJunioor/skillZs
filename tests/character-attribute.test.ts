import { describe, expect, it } from "vitest";
import {
  attributeSkillToCharacter,
  normaliseHandle,
} from "../lib/character/attribute";
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = { id: string; gh_handle: string | null; x_handle: string | null };

function fakeClient(rows: Row[], opts: { error?: { message: string } } = {}): SupabaseClient {
  const lastFilter = { value: undefined as string | undefined };
  const sb = {
    from(table: string) {
      if (table !== "characters") throw new Error(`unexpected table ${table}`);
      const builder = {
        select() { return builder; },
        or(expr: string) { lastFilter.value = expr; return builder; },
        limit() {
          if (opts.error) return Promise.resolve({ data: null, error: opts.error });
          return Promise.resolve({ data: rows, error: null });
        },
      };
      return builder;
    },
    _lastFilter: lastFilter,
  } as unknown as SupabaseClient;
  return sb;
}

describe("normaliseHandle", () => {
  it("returns empty for null/blank/whitespace", () => {
    expect(normaliseHandle(null)).toBe("");
    expect(normaliseHandle(undefined)).toBe("");
    expect(normaliseHandle("")).toBe("");
    expect(normaliseHandle("   ")).toBe("");
  });

  it("strips a leading @", () => {
    expect(normaliseHandle("@mpocock1")).toBe("mpocock1");
    expect(normaliseHandle("@@@nested")).toBe("nested");
  });

  it("lowercases", () => {
    expect(normaliseHandle("MPocock1")).toBe("mpocock1");
  });

  it("strips github/twitter/x url prefixes", () => {
    expect(normaliseHandle("https://github.com/mattpocockuk")).toBe("mattpocockuk");
    expect(normaliseHandle("https://www.github.com/mattpocockuk")).toBe("mattpocockuk");
    expect(normaliseHandle("https://twitter.com/theo")).toBe("theo");
    expect(normaliseHandle("https://x.com/theo")).toBe("theo");
  });

  it("strips trailing slashes", () => {
    expect(normaliseHandle("https://github.com/mitchellh/")).toBe("mitchellh");
  });

  it("rejects values containing whitespace", () => {
    expect(normaliseHandle("matt pocock")).toBe("");
  });
});

describe("attributeSkillToCharacter", () => {
  it("returns null when frontmatter has no author", async () => {
    const sb = fakeClient([]);
    const out = await attributeSkillToCharacter(sb, {});
    expect(out).toEqual({ character_id: null, match_reason: null });
  });

  it("matches via gh_handle (case-insensitive)", async () => {
    const sb = fakeClient([{ id: "c-1", gh_handle: "MattPocockUk", x_handle: "mpocock1" }]);
    const out = await attributeSkillToCharacter(sb, { author: "@MATTPOCOCKUK" });
    expect(out).toEqual({ character_id: "c-1", match_reason: "gh_handle" });
  });

  it("matches via x_handle when gh_handle differs", async () => {
    const sb = fakeClient([{ id: "c-2", gh_handle: "tdotgg", x_handle: "theo" }]);
    const out = await attributeSkillToCharacter(sb, { author: "https://x.com/theo" });
    expect(out).toEqual({ character_id: "c-2", match_reason: "x_handle" });
  });

  it("falls back to meta.author_handle when author missing", async () => {
    const sb = fakeClient([{ id: "c-3", gh_handle: "ghuntley", x_handle: null }]);
    const out = await attributeSkillToCharacter(sb, { author_handle: "ghuntley" });
    expect(out.character_id).toBe("c-3");
    expect(out.match_reason).toBe("gh_handle");
  });

  it("returns null when no row matches", async () => {
    const sb = fakeClient([]);
    const out = await attributeSkillToCharacter(sb, { author: "noone" });
    expect(out).toEqual({ character_id: null, match_reason: null });
  });

  it("returns null on supabase error (degrades gracefully)", async () => {
    const sb = fakeClient([], { error: { message: "boom" } });
    const out = await attributeSkillToCharacter(sb, { author: "boom" });
    expect(out).toEqual({ character_id: null, match_reason: null });
  });

  it("ignores non-string author values", async () => {
    const sb = fakeClient([{ id: "c-x", gh_handle: "anyone", x_handle: null }]);
    const out = await attributeSkillToCharacter(sb, { author: 42 as unknown as string });
    expect(out).toEqual({ character_id: null, match_reason: null });
  });
});
