import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SkillZsLogo } from "../components/skillzs-logo";

describe("SkillZsLogo", () => {
  it("renders the static wordmark at the requested size", () => {
    const html = renderToString(<SkillZsLogo size="sm" />);

    expect(html).toContain('src="/skillzs-wordmark.png"');
    expect(html).toContain('alt="skillZs"');
    expect(html).toContain('width="780"');
    expect(html).toContain('height="329"');
    expect(html).toContain("height:56px");
    expect(html).toContain("width:133px");
  });

  it("renders the animated wordmark layers with matched dimensions", () => {
    const html = renderToString(<SkillZsLogo size="md" animate />);

    expect(html).toContain('class="skillzs-logo"');
    expect(html).toContain("--skillzs-logo-height:88px");
    expect(html).toContain("--skillzs-logo-width:209px");
    expect(html).toContain('class="skillzs-logo__image"');
    expect(html).toContain("skillzs-logo__ghost--grape");
    expect(html).toContain("skillzs-logo__slice--low");
  });
});
