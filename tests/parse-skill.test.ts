import { describe, it, expect } from "vitest";
import {
  MAX_SKILL_BODY_CHARS,
  MAX_SKILL_DESCRIPTION_CHARS,
  MAX_SKILL_NAME_CHARS,
  parseSkill,
  slugify,
} from "../lib/ingest/parse-skill";

const VALID = `---
name: tdd
description: Use when implementing a feature with red-green-refactor.
---

# TDD body
Some text.
`;

describe("parseSkill", () => {
  it("parses frontmatter into name + description + body", () => {
    const out = parseSkill(VALID);
    expect(out).not.toBeNull();
    expect(out!.name).toBe("tdd");
    expect(out!.description).toMatch(/red-green-refactor/i);
    expect(out!.body).toContain("# TDD body");
  });

  it("returns null when frontmatter is missing required fields", () => {
    const noName = `---\ndescription: only description\n---\nbody`;
    const noDesc = `---\nname: only-name\n---\nbody`;
    expect(parseSkill(noName)).toBeNull();
    expect(parseSkill(noDesc)).toBeNull();
  });

  it("returns null on empty input", () => {
    expect(parseSkill("")).toBeNull();
  });

  it("returns null when frontmatter is malformed YAML", () => {
    const bad = `---\nname: ok\ndescription: [unclosed\n---\nbody`;
    expect(parseSkill(bad)).toBeNull();
  });

  it("returns null when fields exceed ingestion caps", () => {
    expect(parseSkill(`---\nname: ${"a".repeat(MAX_SKILL_NAME_CHARS + 1)}\ndescription: ok\n---\nbody`)).toBeNull();
    expect(parseSkill(`---\nname: ok\ndescription: ${"a".repeat(MAX_SKILL_DESCRIPTION_CHARS + 1)}\n---\nbody`)).toBeNull();
    expect(parseSkill(`---\nname: ok\ndescription: ok\n---\n${"a".repeat(MAX_SKILL_BODY_CHARS + 1)}`)).toBeNull();
  });
});

describe("slugify", () => {
  it("lowercases and replaces non-alphanumeric with hyphens", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
    expect(slugify("FooBar  baz_qux")).toBe("foobar-baz-qux");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  hello  ")).toBe("hello");
    expect(slugify("---weird---")).toBe("weird");
  });

  it("caps at 80 chars", () => {
    const longInput = "a".repeat(200);
    expect(slugify(longInput).length).toBe(80);
  });
});
