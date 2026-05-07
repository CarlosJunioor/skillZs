import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest/run";

export const runtime = "nodejs";
export const maxDuration = 300; // up to 5 min on Vercel Pro; trim on Hobby.
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
  try {
    const stats = await runIngest();
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return handle(req);
}

// Vercel cron sends GET; accept both.
export async function GET(req: Request) {
  return handle(req);
}
