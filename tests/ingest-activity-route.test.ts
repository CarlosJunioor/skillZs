import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  ingestActivityForCharacter: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/character/ingest-activity", () => ({
  ingestActivityForCharacter: mocks.ingestActivityForCharacter,
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseService: () => ({ from: mocks.from }),
}));

import { GET, POST } from "@/app/api/cron/ingest-activity/route";

const CHARS = [
  { id: "id-1", slug: "alpha", gh_handle: "alpha" },
  { id: "id-2", slug: "beta", gh_handle: "beta" },
  { id: "id-3", slug: "gamma", gh_handle: null },
];

function reqWith(token?: string): Request {
  return new Request("https://example.test/api/cron/ingest-activity", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

beforeEach(() => {
  mocks.ingestActivityForCharacter.mockReset();
  mocks.from.mockReset();
  // Mock the select chain: supabase.from('characters').select(...).not(...) -> Promise
  mocks.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      not: vi.fn().mockResolvedValue({ data: CHARS, error: null }),
    }),
  });
  process.env.DIPTYCH_CRON_SECRET = "diptych-test-secret";
  process.env.CRON_SECRET = "cron-test-secret";
});

describe("/api/cron/ingest-activity auth", () => {
  it("401 with no auth", async () => {
    const res = await POST(reqWith());
    expect(res.status).toBe(401);
    expect(mocks.ingestActivityForCharacter).not.toHaveBeenCalled();
  });

  it("401 with wrong bearer", async () => {
    const res = await POST(reqWith("nope"));
    expect(res.status).toBe(401);
  });

  it("200 with DIPTYCH_CRON_SECRET", async () => {
    mocks.ingestActivityForCharacter.mockResolvedValue({ inserted: 0, skipped: 0, errored: 0 });
    const res = await POST(reqWith("diptych-test-secret"));
    expect(res.status).toBe(200);
  });

  it("200 with CRON_SECRET fallback (Vercel cron)", async () => {
    mocks.ingestActivityForCharacter.mockResolvedValue({ inserted: 0, skipped: 0, errored: 0 });
    const res = await GET(reqWith("cron-test-secret"));
    expect(res.status).toBe(200);
  });
});

describe("/api/cron/ingest-activity iteration", () => {
  it("calls ingest for each character and returns aggregate", async () => {
    mocks.ingestActivityForCharacter
      .mockResolvedValueOnce({ inserted: 2, skipped: 0, errored: 0 })
      .mockResolvedValueOnce({ inserted: 1, skipped: 0, errored: 0 })
      .mockResolvedValueOnce({ inserted: 0, skipped: 1, errored: 0 });

    const res = await POST(reqWith("diptych-test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.totals).toEqual({ inserted: 3, skipped: 1, errored: 0, characters: 3 });
    expect(mocks.ingestActivityForCharacter).toHaveBeenCalledTimes(3);
  });

  it("returns 200 with errored count even when one character throws", async () => {
    mocks.ingestActivityForCharacter
      .mockResolvedValueOnce({ inserted: 1, skipped: 0, errored: 0 })
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ inserted: 0, skipped: 1, errored: 0 });

    const res = await POST(reqWith("diptych-test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totals.errored).toBe(1);
  });
});
