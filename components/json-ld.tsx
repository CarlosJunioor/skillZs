import { headers } from "next/headers";
import { jsonLdScriptProps } from "@/lib/seo";

export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <script
      nonce={nonce}
      type="application/ld+json"
      suppressHydrationWarning
      {...jsonLdScriptProps(data)}
    />
  );
}
