import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DemoFrame } from "../lib/skill-demo-types";
import { SkillTerminalPreview } from "../components/skill-terminal-preview";

const SCENARIOS: DemoFrame[][] = [
  [
    { kind: "prompt", text: "/plugin install grill-me@mattpocock/skills" },
    { kind: "response", text: "✓ installed Grill Me · /grill-me ready" },
    { kind: "user", text: "grill me" },
    { kind: "thinking", text: "using grill-me — interview relentlessly" },
    { kind: "response", text: "  Ask one question at a time" },
  ],
];

describe("SkillTerminalPreview", () => {
  it("statically renders the first scenario (install, user ask, body) for SSR", () => {
    const html = renderToString(
      <SkillTerminalPreview scenarios={SCENARIOS} slug="grill-me" />,
    );
    expect(html).toContain("terminal preview");
    expect(html).toContain("skillz://grill-me");
    expect(html).toContain("/plugin install grill-me@mattpocock/skills");
    expect(html).toContain("grill me");
    expect(html).toContain("Ask one question at a time");
  });

  it("renders the user turn with the user line class", () => {
    const html = renderToString(
      <SkillTerminalPreview scenarios={SCENARIOS} slug="grill-me" />,
    );
    expect(html).toContain("terminal-preview__line--user");
  });
});
