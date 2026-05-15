import { afterEach, describe, expect, it, vi } from "vitest";
import { generateDiptychText, isDiptychText } from "../lib/diptych/text";

const VALID = {
  tagline: "Reviews your PR for bugs",
  before_text: "Scary diff full of unreviewed edge cases",
  after_text: "Annotated review with the three real issues",
};

function chatResponse(payload: unknown, usage = { prompt_tokens: 500, completion_tokens: 100 }) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: typeof payload === "string" ? payload : JSON.stringify(payload) } }],
      usage,
    }),
  );
}

describe("isDiptychText", () => {
  it("accepts a well-formed payload", () => {
    expect(isDiptychText(VALID)).toBe(true);
  });

  it("rejects payloads missing required keys or with wrong types", () => {
    expect(isDiptychText(null)).toBe(false);
    expect(isDiptychText("not an object")).toBe(false);
    expect(isDiptychText({ tagline: "ok" })).toBe(false);
    expect(isDiptychText({ ...VALID, tagline: 42 })).toBe(false);
  });

  it("rejects payloads outside length bounds", () => {
    expect(isDiptychText({ ...VALID, tagline: "short" })).toBe(false); // < 8
    expect(isDiptychText({ ...VALID, tagline: "x".repeat(81) })).toBe(false); // > 80
    expect(isDiptychText({ ...VALID, before_text: "no!" })).toBe(false); // < 4
    expect(isDiptychText({ ...VALID, after_text: "y".repeat(61) })).toBe(false); // > 60
  });
});

describe("generateDiptychText", () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    vi.unstubAllGlobals();
  });

  it("requires an OpenAI API key before issuing a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateDiptychText({ name: "X", description: "Y", body: "Z" }),
    ).rejects.toThrow("OPENAI_API_KEY not set");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts JSON-mode chat completion and returns validated text + token cost", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(chatResponse(VALID));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateDiptychText({
      name: "PR Review",
      description: "Use when reviewing pull requests",
      body: "# PR Review\nThis is the body.",
    });

    expect(result.text).toEqual(VALID);
    expect(result.estimatedCostUsd).toBeCloseTo(
      (500 * 0.15) / 1_000_000 + (100 * 0.6) / 1_000_000,
      8,
    );
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    const payload = JSON.parse(init.body as string);
    expect(payload.model).toBe("gpt-4o-mini");
    expect(payload.response_format).toEqual({ type: "json_object" });
    expect(payload.messages[1].content).toContain("PR Review");
  });

  it("surfaces provider errors with status code and prefix", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })),
    );

    await expect(
      generateDiptychText({ name: "X", description: "Y", body: "Z" }),
    ).rejects.toThrow("OpenAI chat 429: rate limited");
  });

  it("throws when OpenAI returns empty content", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }))),
    );

    await expect(
      generateDiptychText({ name: "X", description: "Y", body: "Z" }),
    ).rejects.toThrow("OpenAI returned no content");
  });

  it("throws when OpenAI returns content that is not JSON", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(chatResponse("not json at all")));

    await expect(
      generateDiptychText({ name: "X", description: "Y", body: "Z" }),
    ).rejects.toThrow(/non-JSON content/);
  });

  it("throws when OpenAI returns JSON that fails schema validation", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(chatResponse({ tagline: "too short" })));

    await expect(
      generateDiptychText({ name: "X", description: "Y", body: "Z" }),
    ).rejects.toThrow("failed diptych schema validation");
  });

  it("treats missing usage tokens as zero cost", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(chatResponse(VALID, {})));

    const result = await generateDiptychText({ name: "X", description: "Y", body: "Z" });
    expect(result.estimatedCostUsd).toBe(0);
  });
});
