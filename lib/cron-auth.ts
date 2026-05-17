import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

export interface CronAuthOptions {
  /**
   * Also accept a match against CRON_SECRET when a route-specific secret is
   * configured. Use ONLY for routes scheduled by Vercel cron (which auto-injects
   * `Authorization: Bearer $CRON_SECRET`) — admin/manual-only routes should
   * leave this off so the route-specific secret stays isolated.
   */
  allowCronSecretFallback?: boolean;
}

export function isAuthorizedCronRequest(
  req: Request,
  primarySecretEnv?: string,
  options: CronAuthOptions = {},
): boolean {
  const candidate = bearerToken(req.headers.get("authorization")) ?? req.headers.get("x-cron-secret");
  if (!candidate) return false;

  const primary = primarySecretEnv ? process.env[primarySecretEnv] : undefined;
  const cronSecret = process.env.CRON_SECRET;

  if (primarySecretEnv) {
    if (primary && safeEqual(candidate, primary)) return true;
    if (options.allowCronSecretFallback && cronSecret && safeEqual(candidate, cronSecret)) return true;
    return false;
  }

  if (cronSecret && safeEqual(candidate, cronSecret)) return true;

  return false;
}

function bearerToken(value: string | null): string | null {
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}
