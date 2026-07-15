import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

describe("proxy", () => {
  it("permanently redirects the www host to the canonical host", () => {
    const response = proxy(new NextRequest("https://www.skillzs.dev/guides?topic=security"));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://skillzs.dev/guides?topic=security",
    );
  });
});
