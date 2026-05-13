import { createHash } from "node:crypto";
import { isIP } from "node:net";

const TRUSTED_PLATFORM_IP_HEADER = "x-vercel-forwarded-for";

export function hashIp(ip: string, salt: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${ip}|${salt}|${day}`).digest("hex");
}

export function getClientIp(headers: Headers): string {
  return normalizeIp(headers.get(TRUSTED_PLATFORM_IP_HEADER)) ?? "0.0.0.0";
}

function normalizeIp(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/^\[|\]$/g, "");
  return isIP(trimmed) ? trimmed : null;
}
