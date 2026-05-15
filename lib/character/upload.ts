import { put } from "@vercel/blob";

/**
 * Upload character avatar PNG bytes to Vercel Blob at `avatars/{slug}.png`.
 * Mirrors lib/diptych/upload.ts. Public access so <img src> works without auth.
 */
export async function uploadCharacterAvatar(slug: string, bytes: Buffer): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN not set");

  const { url } = await put(`avatars/${slug}.png`, bytes, {
    access: "public",
    contentType: "image/png",
    cacheControlMaxAge: 31_536_000,
    token,
  });
  return url;
}
