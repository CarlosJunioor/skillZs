import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SkillContents } from "../components/skill-contents";

describe("SkillContents", () => {
  it("renders nothing when the sub-skills list is empty", () => {
    const html = renderToString(
      <SkillContents pluginSlug="superpowers" subSkills={[]} />,
    );
    expect(html).toBe("");
  });

  it("renders each sub-skill with its name and description", () => {
    const html = renderToString(
      <SkillContents
        pluginSlug="superpowers"
        subSkills={[
          { name: "brainstorming", description: "Explores user intent..." },
          { name: "writing-plans", description: "When you have a spec..." },
        ]}
      />,
    );
    expect(html).toContain("brainstorming");
    expect(html).toContain("Explores user intent");
    expect(html).toContain("writing-plans");
    expect(html).toContain("When you have a spec");
  });

  it("shows the count and the plugin slug in the header", () => {
    const html = renderToString(
      <SkillContents
        pluginSlug="superpowers"
        subSkills={[
          { name: "a", description: "x" },
          { name: "b", description: "y" },
          { name: "c", description: "z" },
        ]}
      />,
    );
    expect(html).toContain("3 skills ship with superpowers");
  });

  it("singularises the count copy when there is exactly one sub-skill", () => {
    const html = renderToString(
      <SkillContents
        pluginSlug="lonely"
        subSkills={[{ name: "only", description: "alone" }]}
      />,
    );
    expect(html).toContain("1 skill ship");
  });
});
