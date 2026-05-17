// app/page.tsx — Aquarius town map (sub-project C).
// The old zine homepage now lives at /zine.
import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TownMap } from "@/components/town-map";
import { BuildingDrawer } from "@/components/building-drawer";
import { DrawerSkeleton } from "@/components/drawer-skeleton";
import { JsonLd } from "@/components/json-ld";
import { loadTownLayout } from "@/lib/town/layout";
import { resolveCharacterHero } from "@/lib/character/art";
import { fetchCharacterBySlug } from "@/lib/stats";
import { absoluteUrl, buildPageMetadata, siteConfig } from "@/lib/seo";

export const revalidate = 120;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ building?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  if (sp.building) {
    const character = await fetchCharacterBySlug(sp.building);
    if (character) {
      const hero = resolveCharacterHero(character);
      return buildPageMetadata({
        title: `${character.name} on skillZs`,
        description: character.bio ?? character.role ?? `Skills shipped by ${character.name}.`,
        path: `/character/${character.slug}`,
        ...(hero ? { image: hero } : {}),
        imageAlt: character.name,
        type: "article",
      });
    }
  }
  return buildPageMetadata({
    title: `${siteConfig.title} — town`,
    description: "Aquarius town map. Click a building to meet the character behind the skills.",
    path: "/",
  });
}

interface PageProps {
  searchParams: Promise<{ building?: string }>;
}

export default async function TownPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tiles = await loadTownLayout();

  // Eagerly resolve the drawer character so redirect() fires before rendering,
  // and so renderToString in tests can see the resolved data synchronously.
  let drawerCharacter: Awaited<ReturnType<typeof fetchCharacterBySlug>> = null;
  if (sp.building) {
    drawerCharacter = await fetchCharacterBySlug(sp.building);
    if (!drawerCharacter) {
      redirect("/");
    }
  }

  const townItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": absoluteUrl("/#town"),
    name: "skillZs Aquarius town",
    numberOfItems: tiles.length,
    itemListElement: tiles.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/character/${t.character.slug}`),
      name: t.character.name,
    })),
  };

  return (
    <div className="pt-2">
      {/* JsonLd is an async RSC (reads nonce from headers); wrapped in Suspense so
          renderToString in Vitest (which cannot await async RSCs) sees the fallback
          instead of throwing "component suspended". In production/streaming SSR the
          script tag is flushed as soon as headers() resolves. */}
      <Suspense fallback={null}>
        <JsonLd data={townItemList} />
      </Suspense>
      <h1 className="display text-5xl md:text-7xl leading-none mb-3">
        <span className="drip">Aquarius</span>
      </h1>
      <p className="type-font text-base text-[var(--color-rust)] mb-6">
        a town of seven storefronts. tap any building to meet the character.
      </p>

      <TownMap tiles={tiles} />

      {drawerCharacter && (
        <Suspense fallback={<DrawerSkeleton />}>
          <BuildingDrawer
            character={drawerCharacter}
            heroUrl={resolveCharacterHero(drawerCharacter)}
          />
        </Suspense>
      )}
    </div>
  );
}
