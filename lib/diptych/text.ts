/**
 * Text generation for diptych: { tagline, before_text, after_text }.
 *
 * Uses the OpenAI chat completions API (model = gpt-4o-mini) in JSON mode.
 * Matches the raw-fetch pattern used by lib/covers/generate.ts so we don't
 * introduce a new SDK.
 *
 * Cost (Jan 2026):
 *   gpt-4o-mini input  $0.15 / 1M tokens
 *   gpt-4o-mini output $0.60 / 1M tokens
 *   typical SKILL.md ~ 500 in + 100 out -> ~$0.00015 per call
 */

import { buildTextPrompt, type DiptychTextInput } from "./prompt";

export interface DiptychText {
  tagline: string;
  before_text: string;
  after_text: string;
}

export interface DiptychTextResult {
  text: DiptychText;
  estimatedCostUsd: number;
}

const MODEL = "gpt-4o-mini";
const INPUT_PRICE_PER_M = 0.15;
const OUTPUT_PRICE_PER_M = 0.60;

const TAG_MIN = 8;
const TAG_MAX = 80;
const PANEL_MIN = 4;
const PANEL_MAX = 60;

export function isDiptychText(value: unknown): value is DiptychText {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.tagline === "string" &&
    o.tagline.length >= TAG_MIN && o.tagline.length <= TAG_MAX &&
    typeof o.before_text === "string" &&
    o.before_text.length >= PANEL_MIN && o.before_text.length <= PANEL_MAX &&
    typeof o.after_text === "string" &&
    o.after_text.length >= PANEL_MIN && o.after_text.length <= PANEL_MAX
  );
}

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export async function generateDiptychText(input: DiptychTextInput): Promise<DiptychTextResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const prompt = buildTextPrompt(input);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "You only output JSON. Never explain. Never wrap in code fences." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 200,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI chat ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as ChatResponse;
  const content = json.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("OpenAI returned no content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error(`OpenAI returned non-JSON content: ${(err as Error).message}`);
  }
  if (!isDiptychText(parsed)) {
    throw new Error("OpenAI returned JSON that failed diptych schema validation");
  }

  const inputTokens = json.usage?.prompt_tokens ?? 0;
  const outputTokens = json.usage?.completion_tokens ?? 0;
  const estimatedCostUsd =
    (inputTokens * INPUT_PRICE_PER_M) / 1_000_000 +
    (outputTokens * OUTPUT_PRICE_PER_M) / 1_000_000;

  return { text: parsed, estimatedCostUsd };
}
