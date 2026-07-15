import { describe, expect, it } from "vitest";
import { isSkillId, recordInteraction } from "../lib/interactions";

const SKILL_ID = "123e4567-e89b-42d3-a456-426614174000";

describe("isSkillId", () => {
  it("accepts UUIDs and rejects arbitrary strings", () => {
    expect(isSkillId(SKILL_ID)).toBe(true);
    expect(isSkillId("not-a-uuid")).toBe(false);
    expect(isSkillId("../../etc/passwd")).toBe(false);
  });
});

describe("recordInteraction", () => {
  it("rate-limits before writing", async () => {
    const calls: string[] = [];
    const sb = {
      rpc(name: string) {
        calls.push(`rpc:${name}`);
        return Promise.resolve({ data: false, error: null });
      },
      from(name: string) {
        calls.push(`from:${name}`);
        throw new Error("should not write when rate-limited");
      },
    };

    await expect(recordInteraction(sb as never, "vote", SKILL_ID, "hash")).rejects.toMatchObject({
      name: "RateLimitError",
    });
    expect(calls).toEqual(["rpc:try_consume_interaction"]);
  });

  it("writes to the expected table and returns live count", async () => {
    const writes: unknown[] = [];
    const filters: unknown[] = [];
    const sb = {
      rpc(name: string) {
        expect(name).toBe("try_consume_interaction");
        return Promise.resolve({ data: true, error: null });
      },
      from(name: string) {
        expect(name).toBe("usage_clicks");
        return {
          upsert(row: unknown, opts: unknown) {
            writes.push({ row, opts });
            return Promise.resolve({ error: null });
          },
          select(columns: string, opts: unknown) {
            expect(columns).toBe("*");
            expect(opts).toEqual({ count: "exact", head: true });
            return {
              eq(column: string, value: string) {
                filters.push({ column, value });
                return Promise.resolve({ count: 7, error: null });
              },
            };
          },
        };
      },
    };

    const count = await recordInteraction(sb as never, "use", SKILL_ID, "hash");

    expect(count).toBe(7);
    expect(writes).toEqual([
      {
        row: { skill_id: SKILL_ID, ip_hash: "hash" },
        opts: { onConflict: "skill_id,ip_hash", ignoreDuplicates: true },
      },
    ]);
    expect(filters).toEqual([{ column: "skill_id", value: SKILL_ID }]);
  });

  it("maps a foreign-key violation (unknown skill) to a typed NotFoundError", async () => {
    const sb = {
      rpc(name: string) {
        expect(name).toBe("try_consume_interaction");
        return Promise.resolve({ data: true, error: null });
      },
      from() {
        return {
          upsert() {
            return Promise.resolve({
              error: { code: "23503", message: "violates foreign key constraint" },
            });
          },
        };
      },
    };

    await expect(recordInteraction(sb as never, "use", SKILL_ID, "hash")).rejects.toMatchObject({
      name: "NotFoundError",
    });
  });

  it("rethrows non-FK upsert errors unchanged", async () => {
    const dbErr = { code: "08006", message: "connection failure" };
    const sb = {
      rpc() {
        return Promise.resolve({ data: true, error: null });
      },
      from() {
        return {
          upsert() {
            return Promise.resolve({ error: dbErr });
          },
        };
      },
    };

    await expect(recordInteraction(sb as never, "vote", SKILL_ID, "hash")).rejects.toBe(dbErr);
  });
});
