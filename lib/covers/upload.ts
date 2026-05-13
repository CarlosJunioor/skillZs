import { put } from "@vercel/blob";

/**
 * Upload PNG bytes to Vercel Blob and return the public URL.
 *
 * Vercel Blob is edge-cached automatically; the returned URL works as <img src>
 * with no extra config. Path is `covers/{slug}.png`.
 *
 * Set BLOB_READ_WRITE_TOKEN in .env.local (Vercel project > Storage > Blob).
 */
export async function uploadCover(slug: string, bytes: Buffer): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN not set");

  const { url } = await put(`covers/${slug}.png`, bytes, {
    access: "public",
    contentType: "image/png",
    cacheControlMaxAge: 31_536_000,
    token,
  });
  return url;
}
