import { NextResponse } from "next/server";
import { runCoverGeneration } from "@/lib/covers/run";
import type { CoverQuality } from "@/lib/covers/generate";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const headerSecret =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return headerSecret === expected;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 100);
  const quality = (url.searchParams.get("quality") ?? "low") as CoverQuality;
  const order = (url.searchParams.get("order") ?? "hotness") as "hotness" | "first_seen";

  try {
    const stats = await runCoverGeneration({ limit, quality, order });
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handle(req);
}
export async function GET(req: Request) {
  return handle(req);
}
