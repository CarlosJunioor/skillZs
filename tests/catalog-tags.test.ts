import { describe, expect, it } from "vitest";
import { inferCatalogTags } from "../lib/catalog-tags";

describe("inferCatalogTags", () => {
  it("assigns multiple useful tags from a skill identifier", () => {
    expect(inferCatalogTags({
      name: "react-testing-playwright",
      slug: "react-testing-playwright",
    })).toEqual(["frontend", "testing"]);
  });

  it("uses a neutral fallback when no category is evident", () => {
    expect(inferCatalogTags({
      name: "brainstorming",
      slug: "brainstorming",
    })).toEqual(["workflow"]);
  });
});
