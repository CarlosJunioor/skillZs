import { describe, expect, it } from "vitest";
import config from "../next.config";

describe("security headers", () => {
  it("sets browser hardening headers on all routes", async () => {
    const headers = await config.headers?.();
    const allRoutes = headers?.find((entry) => entry.source === "/(.*)");
    const values = new Map(allRoutes?.headers.map((h) => [h.key, h.value]));

    expect(values.get("Strict-Transport-Security")).toBe("max-age=31536000; includeSubDomains");
    expect(values.get("X-Content-Type-Options")).toBe("nosniff");
    expect(values.get("X-Frame-Options")).toBe("DENY");
    expect(values.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(values.get("Permissions-Policy")).toContain("camera=()");
    expect(values.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
  });
});
