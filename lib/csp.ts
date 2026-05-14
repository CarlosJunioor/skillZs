const IMG_SOURCES = [
  "'self'",
  "data:",
  "blob:",
  "https://opengraph.githubassets.com",
  "https://raw.githubusercontent.com",
  "https://github.com",
  "https://avatars.githubusercontent.com",
  "https://*.public.blob.vercel-storage.com",
];

export function contentSecurityPolicy(nonce: string): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : []),
  ];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "connect-src 'self'",
    `img-src ${IMG_SOURCES.join(" ")}`,
  ].join("; ");
}
