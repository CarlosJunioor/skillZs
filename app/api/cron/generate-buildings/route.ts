// app/api/cron/generate-buildings/route.ts
import { NextResponse } from "next/server";
import { runBuildingGeneration } from "@/lib/character/run-buildings";
import type { CoverQuality } from "@/lib/covers/generate";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const QUALITIES = new Set<CoverQuality>(["low", "medium", "high"]);

function parsePositiveInt(value: string | null, fallback: number, max: number): number | null {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return null;
  return Math.min(parsed, max);
}

async function handle(req: Request) {
  // allowCronSecretFallback: scheduled by Vercel cron (vercel.json), which
  // auto-injects Authorization: Bearer $CRON_SECRET. DIPTYCH_CRON_SECRET still
  // works for manual triggers.
  if (!isAuthorizedCronRequest(req, "DIPTYCH_CRON_SECRET", { allowCronSecretFallback: true })) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 25, 100);
  const quality = url.searchParams.get("quality") ?? "low";

  if (limit === null) {
    return NextResponse.json({ ok: false, error: "invalid limit" }, { status: 400 });
  }
  if (!QUALITIES.has(quality as CoverQuality)) {
    return NextResponse.json({ ok: false, error: "invalid quality" }, { status: 400 });
  }

  try {
    const stats = await runBuildingGeneration({
      limit,
      quality: quality as CoverQuality,
    });
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
