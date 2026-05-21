import { describe, expect, it } from "vitest";
import { getPluginConfig, resolveMarketplace } from "../lib/plugin-config";

describe("plugin-config", () => {
  it("returns a config for superpowers with the claude-plugins-official marketplace", () => {
    const cfg = getPluginConfig("superpowers");
    expect(cfg).not.toBeNull();
    expect(cfg?.marketplace).toBe("claude-plugins-official");
    expect(cfg?.subSkills.length).toBeGreaterThan(0);
    expect(cfg?.subSkills.every((s) => s.name && s.description)).toBe(true);
  });

  it("returns null when no override is configured", () => {
    expect(getPluginConfig("unknown-skill")).toBeNull();
  });

  it("resolveMarketplace prefers the configured override over source_repo", () => {
    expect(resolveMarketplace("superpowers", "obra/superpowers")).toBe(
      "claude-plugins-official",
    );
  });

  it("resolveMarketplace falls back to source_repo when no override exists", () => {
    expect(resolveMarketplace("unknown-skill", "example/unknown")).toBe(
      "example/unknown",
    );
  });
});
