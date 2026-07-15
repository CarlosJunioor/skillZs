import type { Metadata, Viewport } from "next";
import { Bowlby_One_SC, DM_Mono } from "next/font/google";
import { JsonLd } from "@/components/json-ld";
import { Marquee } from "@/components/motion/marquee";
import { MotionLink } from "@/components/motion/motion-link";
import { SkillZsLogo } from "@/components/skillzs-logo";
import { organizationJsonLd, siteConfig, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

const fontDisplay = Bowlby_One_SC({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-loaded",
  display: "swap",
});
const fontBody = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-body-loaded",
  display: "swap",
});
export const viewport: Viewport = { themeColor: "#050505", colorScheme: "dark" };

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
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
        width: 1200,
        height: 630,
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
  { href: "/", label: "index" },
  { href: "/browse", label: "browse all" },
  { href: "/guides", label: "guides" },
  { href: "/loops", label: "loops" },
  { href: "/browse?view=trending", label: "trending" },
];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <body>
        <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />
        <header className="sticky top-0 z-50 border-b border-[#29313a] bg-[#050505]/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <MotionLink href="/" className="group flex shrink-0 items-center gap-3">
              <SkillZsLogo size="sm" className="brightness-0 invert" />
              <span className="type-font hidden lg:inline text-[var(--color-grape)] text-xs uppercase tracking-[0.18em]">
                open agent index
              </span>
            </MotionLink>
            <nav className="flex items-center gap-1.5 text-xs overflow-x-auto" aria-label="Primary navigation">
              {NAV.map((n) => (
                <MotionLink key={n.href} href={n.href} className="tag-pill">{n.label}</MotionLink>
              ))}
            </nav>
          </div>

          <div className="border-t border-[#1b2229] bg-[#080a0c] text-[var(--color-ink-soft)] overflow-hidden whitespace-nowrap py-1.5 text-[10px] uppercase tracking-[0.16em]">
            <Marquee speed={35} gap="2rem" fade={false} className="type-font px-4">
              <span>{"\u2605"} LIVE SKILL TAGS {"\u2605"}</span>
              <span>{`>>>`} LIVE SKILLS INDEX {`<<<`}</span>
              <span>* OPEN SOURCE *</span>
              <span>NO LOGIN, NO TRACKING</span>
              <span>{"\u203B"} REAL INSTALL DATA {"\u203B"}</span>
            </Marquee>
          </div>
        </header>

        <main className="max-w-7xl min-h-[70vh] mx-auto px-4 sm:px-6 pb-32">{children}</main>

        <footer className="relative mt-20 border-t border-[#29313a] bg-[#080a0c] overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid md:grid-cols-[1.4fr_1fr_1fr] gap-8 relative">
            <div>
              <SkillZsLogo size="sm" className="brightness-0 invert" />
              <p className="type-font text-sm mt-3 max-w-xs leading-relaxed">
                an image-free agent skill index. synced from the open skills ecosystem and organized for humans.
              </p>
            </div>
            <div>
              <div className="tag-font text-[var(--color-grape)] text-xs uppercase tracking-[0.16em] mb-3">menu</div>
              <ul className="type-font text-sm space-y-1">
                {NAV.map((n) => (
                  <li key={n.href}><MotionLink href={n.href} className="inline-block hover:text-[var(--color-grape)]">&rarr; {n.label}</MotionLink></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="tag-font text-[var(--color-grape)] text-xs uppercase tracking-[0.16em] mb-3">status</div>
              <p className="type-font text-sm"><span className="text-[var(--color-grape)]">●</span> catalog sync active</p>
              <p className="type-font mt-2 text-sm"><MotionLink href="/about" className="hover:text-[var(--color-grape)]">&rarr; about / methodology</MotionLink></p>
              <p className="type-font mt-2 text-sm"><MotionLink href="/policies" className="hover:text-[var(--color-grape)]">&rarr; policies / security</MotionLink></p>
              <p className="type-font text-xs mt-4 text-[var(--color-rust)]">&copy; {new Date().getFullYear()} &middot; open skill index</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
