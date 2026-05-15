// lib/character/upload.ts
import { put } from "@vercel/blob";

const ONE_YEAR_SECONDS = 31_536_000;

function requireBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN not set");
  return token;
}

/**
 * Upload character avatar PNG bytes to Vercel Blob at `avatars/{slug}.png`.
 * Public access so <img src> works without auth.
 */
export async function uploadCharacterAvatar(slug: string, bytes: Buffer): Promise<string> {
  const { url } = await put(`avatars/${slug}.png`, bytes, {
    access: "public",
    contentType: "image/png",
    cacheControlMaxAge: ONE_YEAR_SECONDS,
    token: requireBlobToken(),
  });
  return url;
}

/**
 * Upload character storefront tile PNG bytes to Vercel Blob at
 * `buildings/{slug}.png`. Mirrors uploadCharacterAvatar.
 */
export async function uploadCharacterBuilding(slug: string, bytes: Buffer): Promise<string> {
  const { url } = await put(`buildings/${slug}.png`, bytes, {
    access: "public",
    contentType: "image/png",
    cacheControlMaxAge: ONE_YEAR_SECONDS,
    token: requireBlobToken(),
  });
  return url;
}
