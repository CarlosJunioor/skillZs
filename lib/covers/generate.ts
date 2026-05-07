/**
 * OpenAI gpt-image-1 client. Returns raw PNG bytes ready to upload to storage.
 *
 * Pricing (as of 2026):
 *   - low quality:  ~$0.040 / image
 *   - medium:       ~$0.100 / image
 *   - high quality: ~$0.190 / image
 *
 * Default = "low" for the bulk first pass; bump to "high" for hero candidates.
 */

export type CoverQuality = "low" | "medium" | "high";

export interface GenerateOptions {
  prompt: string;
  /** "low" | "medium" | "high". Default "low". */
  quality?: CoverQuality;
  /** "1024x1024" | "1536x1024" | "1024x1536". Default 1536x1024 (~16:9). */
  size?: "1024x1024" | "1536x1024" | "1024x1536";
}

export interface GenerateResult {
  /** PNG bytes */
  bytes: Buffer;
  /** approximate USD cost the API charged for this generation */
  estimatedCostUsd: number;
}

const PRICE: Record<CoverQuality, number> = {
  low: 0.04,
  medium: 0.1,
  high: 0.19,
};

export async function generateCover(opts: GenerateOptions): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const quality = opts.quality ?? "low";
  const size = opts.size ?? "1536x1024";

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: opts.prompt,
      size,
      quality,
      n: 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI image gen ${res.status}: ${text.slice(0, 500)}`);
  }

  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image data");

  return {
    bytes: Buffer.from(b64, "base64"),
    estimatedCostUsd: PRICE[quality],
  };
}
