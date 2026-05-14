import { put } from "@vercel/blob";

/**
 * Upload diptych PNG bytes to Vercel Blob at `diptych/{slug}.png`.
 *
 * Mirrors lib/covers/upload.ts. Public access so <img src> works without auth.
 * Vercel Blob edge-caches automatically; we also set a one-year browser cache.
 */
export async function uploadDiptych(slug: string, bytes: Buffer): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN not set");

  const { url } = await put(`diptych/${slug}.png`, bytes, {
    access: "public",
    contentType: "image/png",
    cacheControlMaxAge: 31_536_000,
    token,
  });
  return url;
}
