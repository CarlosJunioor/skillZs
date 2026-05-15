/**
 * Image generation for diptych. Thin wrapper around lib/covers/generate.ts so
 * we don't duplicate the OpenAI raw-fetch logic. The diptych uses the wider
 * 1536x1024 size (3:2) which OpenAI gpt-image-1 supports natively.
 */

import { generateCover, type CoverQuality } from "../covers/generate";
import { buildImagePrompt, type DiptychImageInput } from "./prompt";

export interface DiptychImageResult {
  bytes: Buffer;
  prompt: string;
  estimatedCostUsd: number;
}

export async function generateDiptychImage(
  input: DiptychImageInput,
  quality: CoverQuality = "low",
): Promise<DiptychImageResult> {
  const prompt = buildImagePrompt(input);
  const { bytes, estimatedCostUsd } = await generateCover({
    prompt,
    quality,
    size: "1536x1024",
  });
  return { bytes, prompt, estimatedCostUsd };
}
