import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Bowlby_One_SC, Permanent_Marker, DM_Mono, Special_Elite } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { JsonLd } from "@/components/json-ld";
import { SkillZsLogo } from "@/components/skillzs-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { organizationJsonLd, siteConfig, websiteJsonLd } from "@/lib/seo";
import { THEME_BOOTSTRAP } from "@/lib/theme-bootstrap";
import "./globals.css";

const fontDisplay = Bowlby_One_SC({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-loaded",
  display: "swap",
});
const fontTag = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-tag-loaded",
  display: "swap",
});
const fontBody = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-body-loaded",
  display: "swap",
});
const fontType = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-type-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  category: "technology",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "dWy3nmJsn7PCukQ9tyS7PS9TA6rkkj7kFa2oeI2Qpxw",
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: "/",
    siteName: siteConfig.name,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: siteConfig.ogImage,
        alt: `${siteConfig.name} Claude skills catalog`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  manifest: "/manifest.webmanifest",
};

const NAV = [
  { href: "/zine", label: "homepage" },
  { href: "/browse", label: "browse all" },
  { href: "/category/coding", label: "coding" },
  { href: "/category/creative", label: "creative" },
  { href: "/category/agents", label: "agents" },
  { href: "/category/utils", label: "utils" },
];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning className={`${fontDisplay.variable} ${fontTag.variable} ${fontBody.variable} ${fontType.variable}`}>
      <head>
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }}
        />
      </head>
      <body>
        <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />
        <header className="relative border-b-[3px] border-[var(--color-ink)] bg-[var(--color-paper-2)]">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-end justify-between gap-4">
            <Link href="/" className="group flex items-end gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/fisheye.png"
                alt=""
                aria-hidden
                className="hidden sm:block w-[64px] h-[64px] rounded-full border-[2.5px] border-[var(--color-ink)] shadow-[3px_3px_0_var(--shadow-color)] rotate-[-6deg] mb-1 transition-transform group-hover:rotate-[6deg]"
              />
              <SkillZsLogo size="md" animate />
              <span className="tag-font hidden lg:inline text-[var(--color-grape)] text-lg rotate-[-3deg] mb-2">
                {"\u2726"} underground catalog
              </span>
            </Link>
            <nav className="flex flex-wrap items-center gap-1.5 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="tag-pill">{n.label}</Link>
              ))}
              <ThemeToggle />
            </nav>
          </div>

          <div className="border-t-[3px] border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)] overflow-hidden whitespace-nowrap py-1.5 text-sm">
            <div className="marquee inline-flex gap-8 px-4 type-font">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="inline-flex items-center gap-8">
                  <span>{"\u2605"} HAND-TAGGED {"\u2605"}</span>
                  <span>{`>>>`} 991 SKILLS LIVE {`<<<`}</span>
                  <span>* OPEN SOURCE *</span>
                  <span>NO LOGIN, NO TRACKING</span>
                  <span>{"\u203B"} FRESH DROPS WEEKLY {"\u203B"}</span>
                </span>
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 pb-32">{children}</main>

        <footer className="relative mt-20 border-t-[3px] border-[var(--color-ink)] bg-[var(--color-paper-2)] overflow-hidden">
          <div className="hidden md:block absolute -right-8 -top-10 pointer-events-none opacity-95">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/fisheye.png"
              alt=""
              aria-hidden
              style={{ height: 360, width: 360, transform: "rotate(-4deg)" }}
              className="select-none"
            />
          </div>
          <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-[1.4fr_1fr_1fr] gap-8 relative">
            <div>
              <SkillZsLogo size="sm" />
              <p className="type-font text-sm mt-3 max-w-xs leading-relaxed">
                a homepage for Claude skills. ingested every Sunday. shoutout obra/superpowers and the rest.
              </p>
            </div>
            <div>
              <div className="tag-font text-[var(--color-grape)] text-lg mb-2">menu</div>
              <ul className="type-font text-sm space-y-1">
                {NAV.map((n) => (
                  <li key={n.href}><Link href={n.href} className="hover:text-[var(--color-grape)]">&rarr; {n.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="tag-font text-[var(--color-grape)] text-lg mb-2">contact</div>
              <p className="type-font text-sm">no email. just slap a skill on github.</p>
              <p className="type-font text-xs mt-4 text-[var(--color-rust)]">&copy; {new Date().getFullYear()} &middot; built with vibes &middot; no rights reserved</p>
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
