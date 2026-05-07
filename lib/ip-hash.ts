import { createHash } from "node:crypto";
import { isIP } from "node:net";

export function hashIp(ip: string, salt: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${ip}|${salt}|${day}`).digest("hex");
}

export function getClientIp(headers: Headers): string {
  const forwarded = parseForwardedFor(headers.get("x-forwarded-for"));
  if (forwarded) return forwarded;

  const realIp = normalizeIp(headers.get("x-real-ip"));
  if (realIp) return realIp;

  return "0.0.0.0";
}

function parseForwardedFor(value: string | null): string | null {
  if (!value) return null;

  const ips = value
    .split(",")
    .map((part) => normalizeIp(part))
    .filter((part): part is string => Boolean(part));

  return ips.at(-1) ?? null;
}

function normalizeIp(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/^\[|\]$/g, "");
  return isIP(trimmed) ? trimmed : null;
}
