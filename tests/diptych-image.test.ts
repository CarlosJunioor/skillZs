import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateCover: vi.fn(),
}));

vi.mock("../lib/covers/generate", () => ({
  generateCover: mocks.generateCover,
}));

import { generateDiptychImage } from "../lib/diptych/image";

describe("generateDiptychImage", () => {
  it("delegates to generateCover with 1536x1024 and the built prompt", async () => {
    const bytes = Buffer.from("png");
    mocks.generateCover.mockResolvedValue({ bytes, estimatedCostUsd: 0.04 });

    const result = await generateDiptychImage({
      name: "Cleans Code",
      before_text: "messy code",
      after_text: "clean code",
      category: "coding",
    });

    expect(result.bytes).toBe(bytes);
    expect(result.estimatedCostUsd).toBe(0.04);
    expect(result.prompt).toContain("Cleans Code");

    expect(mocks.generateCover).toHaveBeenCalledTimes(1);
    const arg = mocks.generateCover.mock.calls[0][0];
    expect(arg.size).toBe("1536x1024");
    expect(arg.quality).toBe("low");
    expect(arg.prompt).toContain("messy code");
    expect(arg.prompt).toContain("clean code");
  });

  it("forwards explicit quality choices", async () => {
    mocks.generateCover.mockResolvedValue({ bytes: Buffer.from("png"), estimatedCostUsd: 0.19 });

    await generateDiptychImage(
      {
        name: "Big Skill",
        before_text: "before",
        after_text: "after",
        category: null,
      },
      "high",
    );

    expect(mocks.generateCover.mock.calls.at(-1)![0].quality).toBe("high");
  });
});
