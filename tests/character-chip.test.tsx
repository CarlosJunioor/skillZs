import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

import { CharacterChip } from "../components/character-chip";

describe("CharacterChip", () => {
  it("renders an avatar img when avatarUrl is set", () => {
    const html = renderToString(
      <CharacterChip slug="matt-pocock" name="Matt Pocock" avatarUrl="https://blob.test/avatars/matt-pocock.png" />,
    );
    expect(html).toContain('src="https://blob.test/avatars/matt-pocock.png"');
    expect(html).toContain("Matt Pocock");
  });

  it("renders a mauve placeholder when avatarUrl is null", () => {
    const html = renderToString(
      <CharacterChip slug="zeke" name="Zeke" avatarUrl={null} />,
    );
    expect(html).not.toContain("<img");
    // Placeholder span uses the mauve token.
    expect(html).toContain("bg-[var(--color-mauve)]");
  });

  it("links to /character/<slug>", () => {
    const html = renderToString(
      <CharacterChip slug="theo-browne" name="Theo Browne" avatarUrl={null} />,
    );
    expect(html).toContain('href="/character/theo-browne"');
  });

  it("falls back gracefully when avatarUrl is undefined", () => {
    const html = renderToString(
      <CharacterChip slug="ghost" name="Ghost" />,
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("Ghost");
  });
});
