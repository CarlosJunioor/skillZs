import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

vi.mock("@/components/motion/motion-link", () => ({
  MotionLink: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

vi.mock("@/components/json-ld", () => ({
  JsonLd: () => null,
}));

import PoliciesPage, { metadata } from "../app/policies/page";

describe("policies page", () => {
  it("publishes the catalog, methodology, and security commitments", () => {
    const html = renderToString(<PoliciesPage />);

    expect(metadata.alternates?.canonical).toBe("/policies");
    expect(html).toContain("Catalog policy");
    expect(html).toContain("Methodology");
    expect(html).toContain("Security policy");
    expect(html).toContain("API-enumerable leaderboard");
    expect(html).toContain("does not mean approved, safe, or endorsed");
    expect(html).toContain("same documented public API contract");
    expect(html).toContain("<code>/api/v1/</code> endpoints");
    expect(html).toContain("search can query the wider corpus");
    expect(html).toContain("does not currently provide a bulk export");
    expect(html).toContain("https://www.skills.sh/docs/api");
    expect(html).toContain("does not yet offer a public issue tracker or contact form");
    expect(html).toContain("does not yet have a dedicated private vulnerability-reporting channel");
    expect(html).toContain("https://github.com/CarlosJunioor");
  });
});
