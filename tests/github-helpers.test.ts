import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRaw, MAX_SKILL_FILE_BYTES, ogImageUrl, repoFolderOf } from "../lib/ingest/github";

describe("repoFolderOf", () => {
  it("returns parent folder name", () => {
    expect(repoFolderOf("skills/tdd/SKILL.md")).toBe("tdd");
    expect(repoFolderOf("a/b/c/d/SKILL.md")).toBe("d");
  });

  it("returns empty string for top-level SKILL.md", () => {
    expect(repoFolderOf("SKILL.md")).toBe("");
  });
});

describe("ogImageUrl", () => {
  it("builds a github opengraph URL", () => {
    expect(ogImageUrl("obra", "superpowers")).toBe(
      "https://opengraph.githubassets.com/1/obra/superpowers",
    );
  });
});

describe("fetchRaw", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects raw files over the byte cap", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("too large", {
        status: 200,
        headers: { "content-length": String(MAX_SKILL_FILE_BYTES + 1) },
      }),
    ));

    await expect(fetchRaw("owner", "repo", "main", "SKILL.md")).rejects.toThrow(/exceeded/);
  });
});
