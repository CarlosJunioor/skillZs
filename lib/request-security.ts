const MAX_JSON_BODY_BYTES = 4_096;

export type MutationRequestError = "invalid content type" | "request body too large" | "cross-site request";

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
