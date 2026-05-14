export const MAX_JSON_BODY_BYTES = 4_096;

export type MutationRequestError = "invalid content type" | "request body too large" | "cross-site request";
export type JsonBodyError = "bad json" | "request body too large";

export type JsonBodyResult<T> =
  | { ok: true; body: T }
  | { ok: false; error: JsonBodyError };

export function validateJsonMutationRequest(req: Request): MutationRequestError | null {
  const contentType = req.headers.get("content-type") ?? "";
  if (!isJsonContentType(contentType)) return "invalid content type";

  const contentLength = req.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_JSON_BODY_BYTES) {
    return "request body too large";
  }

  if (isCrossSiteBrowserRequest(req)) return "cross-site request";

  return null;
}

export async function readJsonBodyWithLimit<T>(req: Request): Promise<JsonBodyResult<T>> {
  if (!req.body) return { ok: false, error: "bad json" };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      received += value.byteLength;
      if (received > MAX_JSON_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, error: "request body too large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, error: "bad json" };
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(body)) as T };
  } catch {
    return { ok: false, error: "bad json" };
  }
}

function isJsonContentType(value: string): boolean {
  return value
    .split(";")[0]
    ?.trim()
    .toLowerCase() === "application/json";
}

function isCrossSiteBrowserRequest(req: Request): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
  if (secFetchSite && !["same-origin", "same-site", "none"].includes(secFetchSite)) {
    return true;
  }

  const origin = req.headers.get("origin");
  if (!origin) return false;

  const host = firstHeaderValue(req.headers.get("host"));
  if (!host) return true;

  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}
