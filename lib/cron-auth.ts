import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

export function isAuthorizedCronRequest(req: Request, primarySecretEnv?: string): boolean {
  const candidate = bearerToken(req.headers.get("authorization")) ?? req.headers.get("x-cron-secret");
  const expected = primarySecretEnv && process.env[primarySecretEnv]
    ? process.env[primarySecretEnv]
    : process.env.CRON_SECRET;

  if (!candidate || !expected) return false;
  return safeEqual(candidate, expected);
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
