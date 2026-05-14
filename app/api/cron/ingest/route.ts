import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest/run";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 300; // up to 5 min on Vercel Pro; trim on Hobby.
export const dynamic = "force-dynamic";

async function handle(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
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
