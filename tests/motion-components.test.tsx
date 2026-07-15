import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...rest }, children),
}));

import { AnimatedNumber } from "../components/motion/animated-number";
import { Marquee } from "../components/motion/marquee";
import { RouteTabs } from "../components/motion/route-tabs";

describe("BeUI motion adapters", () => {
  it("keeps the real animated number in server HTML for SEO", () => {
    const html = renderToString(<AnimatedNumber value={12_345} />);
    expect(html).toContain("12,345");
  });

  it("duplicates marquee content while hiding the duplicate from assistive tech", () => {
    const html = renderToString(<Marquee><span>live skills</span></Marquee>);
    expect(html.match(/live skills/g)).toHaveLength(2);
    expect(html).toContain('aria-hidden="true"');
  });

  it("keeps ranking tabs as crawlable URLs with page state", () => {
    const html = renderToString(
      <RouteTabs
        tabs={[
          { href: "/browse", label: "most installed", active: true },
          { href: "/browse?view=hot", label: "hot now", active: false },
        ]}
      />,
    );
    expect(html).toContain('href="/browse?view=hot"');
    expect(html).toContain('aria-current="page"');
  });
});
