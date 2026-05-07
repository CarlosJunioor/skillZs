import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip-hash";
import { isSkillId, recordInteraction } from "@/lib/interactions";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { skillId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const skillId = body?.skillId;
  if (!isSkillId(skillId)) {
    return NextResponse.json({ ok: false, error: "invalid skillId" }, { status: 400 });
  }

  const salt = process.env.IP_HASH_SALT;
  if (!salt) {
    return NextResponse.json({ ok: false, error: "server not configured" }, { status: 500 });
  }
  const ip = getClientIp(req.headers);
  const ipHash = hashIp(ip, salt);

  try {
    const count = await recordInteraction(supabaseService(), "vote", skillId, ipHash);
    return NextResponse.json({ ok: true, count });
  } catch (error) {
    if ((error as Error).name === "RateLimitError") {
      return NextResponse.json({ ok: false, error: "rate limit exceeded" }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
