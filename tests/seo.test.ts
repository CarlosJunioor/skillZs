import { describe, expect, it } from "vitest";
import type { SkillStats } from "../lib/types";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
  categoryRoute,
  categoryTitle,
  collectionJsonLd,
  jsonLdScriptProps,
  normalizeSiteUrl,
  seoDescription,
  siteConfig,
  skillDescription,
  skillImage,
  skillJsonLd,
} from "../lib/seo";

const skill: SkillStats = {
  id: "skill-1",
  slug: "demo-skill",
  name: "Demo Skill",
  description: "Turns a rough prompt into a tested implementation plan.",
  cover_url: "/cover.png",
  diptych_url: null,
  tagline: "Plan before coding",
  before_text: null,
  after_text: null,
  category: "agent",
  repo_url: "https://github.com/example/demo-skill",
  source_repo: "example/demo-skill",
  github_stars: 42,
  vote_count: 7,
  use_count: 3,
  hotness: 12,
  first_seen: "2026-01-01T00:00:00.000Z",
  last_seen: "2026-02-01T00:00:00.000Z",
};

describe("seo helpers", () => {
  it("normalizes canonical origins", () => {
    expect(normalizeSiteUrl("example.com/")).toBe("https://example.com");
    expect(normalizeSiteUrl("https://example.com/app/")).toBe("https://example.com/app");
    expect(normalizeSiteUrl("localhost:3000/")).toBe("http://localhost:3000");
    expect(normalizeSiteUrl("   ")).toBe("https://skillzs.dev");
  });

  it("builds absolute URLs from the configured site origin", () => {
    expect(absoluteUrl("browse")).toBe(`${siteConfig.url}/browse`);
    expect(absoluteUrl("https://cdn.example.com/image.png")).toBe("https://cdn.example.com/image.png");
  });

  it("cleans and caps descriptions", () => {
    expect(seoDescription("  one\n\n two\tthree  ")).toBe("one two three");
    expect(seoDescription("x".repeat(220))).toHaveLength(160);
    expect(seoDescription("   ", "fallback")).toBe("fallback");
  });

  it("maps category metadata to canonical category routes", () => {
    expect(categoryRoute("agent")).toBe("/category/agents");
    expect(categoryRoute(null)).toBe("/category/other");
    expect(categoryTitle("agent")).toBe("Agents AI agent skills");
  });

  it("builds page metadata with canonical, social, and robots fields", () => {
    const metadata = buildPageMetadata({
      title: "Demo",
      description: "Demo page",
      path: "/demo",
      image: "/demo.png",
      noIndex: true,
    });

    expect(metadata.title).toBe("Demo");
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(70);
    expect(metadata.alternates?.canonical).toBe("/demo");
    expect(metadata.twitter?.images).toEqual(["/demo.png"]);
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("keeps generated titles within the root template limit", () => {
    const metadata = buildPageMetadata({
      title: "x".repeat(100),
      description: "A complete description that is already long enough for a useful search result snippet.",
      path: "/long-title",
    });

    expect(String(metadata.title)).toHaveLength(50);
  });

  it("expands short indexable titles for search results", () => {
    const metadata = buildPageMetadata({
      title: "xdrop agent skill",
      description: "Install and inspect the xdrop agent skill, including its source, instructions, and compatibility details.",
      path: "/skills/example/xdrop",
    });
    const renderedTitle = `${metadata.title} | skillZs`;

    expect(renderedTitle.length).toBeGreaterThanOrEqual(30);
    expect(renderedTitle.length).toBeLessThanOrEqual(60);
  });

  it("derives skill descriptions and images from the best available fields", () => {
    expect(skillDescription(skill)).toBe(
      "Plan before coding. Turns a rough prompt into a tested implementation plan.",
    );
    expect(skillImage(skill)).toBe("/cover.png");
    expect(skillImage({ diptych_url: "https://cdn.example.com/diptych.png", cover_url: "/cover.png" })).toBe(
      "https://cdn.example.com/diptych.png",
    );
  });

  it("creates collection and breadcrumb JSON-LD", () => {
    const collection = collectionJsonLd({
      path: "/browse",
      name: "Browse Claude skills",
      description: "Browse all skills.",
      skills: [skill],
    });
    const breadcrumbs = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Browse", path: "/browse" },
    ]);

    expect(collection["@type"]).toBe("CollectionPage");
    expect(collection.mainEntity.itemListElement[0]).toMatchObject({
      position: 1,
      name: "Demo Skill",
      url: `${siteConfig.url}/skill/demo-skill`,
    });
    expect(breadcrumbs.itemListElement).toHaveLength(2);
    expect(breadcrumbs.itemListElement[1].item).toBe(`${siteConfig.url}/browse`);
  });

  it("creates SoftwareSourceCode JSON-LD for skill pages", () => {
    const jsonLd = skillJsonLd(skill);

    expect(jsonLd["@type"]).toBe("SoftwareSourceCode");
    expect(jsonLd.codeRepository).toBe("https://github.com/example/demo-skill");
    expect(jsonLd.image).toBe(`${siteConfig.url}/cover.png`);
    expect(jsonLd.interactionStatistic).toHaveLength(2);
  });

  it("escapes JSON-LD payloads before injecting them into a script", () => {
    const props = jsonLdScriptProps({ name: "<script>alert(1)</script>" });

    expect(props.dangerouslySetInnerHTML.__html).toContain("\\u003cscript>");
    expect(props.dangerouslySetInnerHTML.__html).not.toContain("<script>");
  });
});
