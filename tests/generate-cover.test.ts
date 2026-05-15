import { afterEach, describe, expect, it, vi } from "vitest";
import { generateCover } from "../lib/covers/generate";

describe("generateCover", () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    vi.unstubAllGlobals();
  });

  it("requires an OpenAI API key before making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateCover({ prompt: "make a cover" })).rejects.toThrow("OPENAI_API_KEY not set");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the default image request and decodes returned PNG bytes", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const png = Buffer.from("png-bytes");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ b64_json: png.toString("base64") }],
    })));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateCover({ prompt: "make a cover" });

    expect(result.bytes.equals(png)).toBe(true);
    expect(result.estimatedCostUsd).toBe(0.04);
    expect(fetchMock).toHaveBeenCalledWith("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-key",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: "make a cover",
        size: "1536x1024",
        quality: "low",
        n: 1,
      }),
    });
  });

  it("uses requested size and quality when provided", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ b64_json: Buffer.from("image").toString("base64") }],
    })));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateCover({
      prompt: "hero cover",
      quality: "high",
      size: "1024x1536",
    });

    const request = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(request).toMatchObject({
      prompt: "hero cover",
      quality: "high",
      size: "1024x1536",
    });
    expect(result.estimatedCostUsd).toBe(0.19);
  });

  it("includes provider error details for failed generations", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("quota exceeded", { status: 429 })));

    await expect(generateCover({ prompt: "make a cover" })).rejects.toThrow(
      "OpenAI image gen 429: quota exceeded",
    );
  });

  it("rejects successful responses that contain no image payload", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{}] }))));

    await expect(generateCover({ prompt: "make a cover" })).rejects.toThrow(
      "OpenAI returned no image data",
    );
  });
});
