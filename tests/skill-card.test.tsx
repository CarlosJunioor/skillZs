import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SkillStats } from "../lib/types";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

import { SkillCard } from "../components/skill-card";

function makeSkill(overrides: Partial<SkillStats> = {}): SkillStats {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "pr-review",
    name: "PR Review",
    description: "Reviews pull requests with structured findings.",
    cover_url: null,
    diptych_url: null,
    tagline: null,
    before_text: null,
    after_text: null,
    category: "coding",
    repo_url: "https://github.com/example/pr-review",
    source_repo: "example/pr-review",
    github_stars: 42,
    readme_md: null,
    first_seen: "2026-01-01T00:00:00Z",
    last_seen: "2026-05-01T00:00:00Z",
    vote_count: 10,
    use_count: 25,
    hotness: 100,
    ...overrides,
  };
}

describe("SkillCard", () => {
  it("renders the diptych_url when set", () => {
    const html = renderToString(
      <SkillCard skill={makeSkill({ diptych_url: "https://blob.example/diptych/pr-review.png" })} />,
    );
    expect(html).toContain('src="https://blob.example/diptych/pr-review.png"');
  });

  it("falls back to cover_url when diptych_url is missing", () => {
    const html = renderToString(
      <SkillCard skill={makeSkill({ diptych_url: null, cover_url: "https://blob.example/covers/pr-review.png" })} />,
    );
    expect(html).toContain('src="https://blob.example/covers/pr-review.png"');
  });

  it("renders the text-only fallback panel when no visual exists", () => {
    const html = renderToString(
      <SkillCard skill={makeSkill({ before_text: "manually skim each diff", after_text: "structured review report" })} />,
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("manually skim each diff");
    expect(html).toContain("structured review report");
  });

  it("renders the ?! placeholder when neither visual nor before/after text exists", () => {
    const html = renderToString(<SkillCard skill={makeSkill()} />);
    expect(html).not.toContain("<img");
    expect(html).toContain("?!");
  });

  it("uses the AI tagline as the headline when present, with name as byline", () => {
    const html = renderToString(
      <SkillCard skill={makeSkill({ tagline: "Catch bugs before merge" })} />,
    );
    expect(html).toContain("Catch bugs before merge");
    expect(html).toContain("PR Review");
  });

  it("falls back to the skill name as headline when tagline is blank", () => {
    const html = renderToString(<SkillCard skill={makeSkill({ tagline: "   " })} />);
    expect(html).toContain("PR Review");
  });

  it("renders the install pill with the github CLI command for the slug", () => {
    const html = renderToString(<SkillCard skill={makeSkill({ slug: "pr-review" })} />);
    expect(html).toContain("npx github:CarlosJunioor/skillzs-cli install pr-review");
  });

  it("shows the HOT stamp when hotness is above 50", () => {
    const hot = renderToString(<SkillCard skill={makeSkill({ hotness: 75 })} />);
    expect(hot).toContain("HOT");

    const cold = renderToString(<SkillCard skill={makeSkill({ hotness: 5 })} />);
    expect(cold).not.toContain("HOT");
  });

  it("shows the NEW stamp only when isNew is true", () => {
    const fresh = renderToString(<SkillCard skill={makeSkill()} isNew />);
    expect(fresh).toContain("NEW");

    const stale = renderToString(<SkillCard skill={makeSkill()} />);
    expect(stale).not.toContain(">NEW<");
  });
});
