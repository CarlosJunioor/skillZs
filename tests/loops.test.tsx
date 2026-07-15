import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoopLibrary } from "../components/loop-library";
import { agentLoops } from "../lib/loops";

describe("loop library", () => {
  it("ships ten complete, uniquely addressable loop specimens", () => {
    expect(agentLoops).toHaveLength(10);
    expect(new Set(agentLoops.map((loop) => loop.slug))).toHaveLength(10);
    for (const loop of agentLoops) {
      expect(loop.stages.length).toBeGreaterThanOrEqual(2);
      expect(loop.frames.length).toBeGreaterThanOrEqual(loop.stages.length);
      expect(loop.stopWhen).toBeTruthy();
      expect(loop.prompt).toBeTruthy();
    }
  });

  it("renders the loop anatomy, terminal previews, and prompt controls in server HTML", () => {
    const html = renderToString(<LoopLibrary loops={agentLoops} />);

    expect(html).toContain("Plan / Execute / Verify");
    expect(html).toContain("iteration");
    expect(html).toContain("01");
    expect(html).toContain("stop when:");
    expect(html.match(/copy prompt/g)).toHaveLength(10);
  });
});
