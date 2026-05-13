import { describe, it, expect } from "vitest";
import { categorize } from "../lib/ingest/categorize";

describe("categorize", () => {
  it("classifies coding skills via debug/test/refactor keywords", () => {
    expect(categorize("tdd", "Use when red-green-refactor")).toBe("coding");
    expect(categorize("debug session", "Stack trace analysis with TDD")).toBe("coding");
  });

  it("classifies creative skills via design/ui keywords", () => {
    expect(categorize("color picker", "design system color palette")).toBe("creative");
    expect(categorize("frontend kit", "Tailwind UI components")).toBe("creative");
  });

  it("classifies agent skills via orchestration keywords", () => {
    expect(categorize("orchestrator", "Multi-agent planner")).toBe("agent");
  });

  it("classifies research skills", () => {
    expect(categorize("deep-search", "Use to investigate literature")).toBe("research");
  });

  it("classifies utils skills", () => {
    expect(categorize("formatter", "CLI tool to format files in a workflow")).toBe("utils");
  });

  it("returns null when nothing matches", () => {
    expect(categorize("zenith", "abstract conceptual prose")).toBeNull();
  });
});
