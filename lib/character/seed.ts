import type { CharacterKind } from "@/lib/types";

export interface SeedCharacter {
  slug: string;
  kind: CharacterKind;
  name: string;
  role: string;
  bio: string;
  gh_handle?: string | null;
  x_handle?: string | null;
  site_url?: string | null;
}

/**
 * Launch roster. 1 Zeke + 6 influencers.
 *
 * Bios are hand-written: short, distinctive, first-impression matters. Auto-gen
 * would have produced uniform mush. ~30 min of writing saved.
 *
 * Adding a new influencer: append a row, re-run POST /api/admin/characters/seed.
 * Upserts on `slug`, so it is safe to re-run.
 */
export const SEED_CHARACTERS: readonly SeedCharacter[] = [
  {
    slug: "zeke",
    kind: "zeke",
    name: "Zeke",
    role: "In-house builder of skillZs",
    bio: "Lives in Aquarius. Ships the catalog you are reading. Talks like a caveman.",
    gh_handle: "CarlosJunioor",
  },
  {
    slug: "matt-pocock",
    kind: "influencer",
    name: "Matt Pocock",
    role: "TypeScript explainer-in-chief",
    bio: "Author of Total TypeScript. Turns scary generics into a one-minute video.",
    gh_handle: "mattpocockuk",
    x_handle: "mpocock1",
    site_url: "https://www.totaltypescript.com",
  },
  {
    slug: "theo-browne",
    kind: "influencer",
    name: "Theo Browne",
    role: "T3 stack ringleader",
    bio: "Runs Ping.gg and the create-t3-app stack. Loud, opinionated, almost always right.",
    gh_handle: "t3dotgg",
    x_handle: "theo",
    site_url: "https://t3.gg",
  },
  {
    slug: "geoffrey-huntley",
    kind: "influencer",
    name: "Geoffrey Huntley",
    role: "Agentic coding lore-keeper",
    bio: "Writes the deep-dive posts everyone quotes about agent loops, Cursor rules, and Claude harnesses.",
    gh_handle: "ghuntley",
    x_handle: "GeoffreyHuntley",
    site_url: "https://ghuntley.com",
  },
  {
    slug: "cole-medin",
    kind: "influencer",
    name: "Cole Medin",
    role: "Local-first AI tinkerer",
    bio: "Builds AI agent stacks on YouTube. Patient, methodical, ships the demo repo every time.",
    gh_handle: "coleam00",
    x_handle: "ColeMedin",
  },
  {
    slug: "mitchell-hashimoto",
    kind: "influencer",
    name: "Mitchell Hashimoto",
    role: "Tooling pragmatist",
    bio: "Co-founded HashiCorp. Now ships Ghostty and posts low-level Zig + agent experiments.",
    gh_handle: "mitchellh",
    x_handle: "mitchellh",
    site_url: "https://mitchellh.com",
  },
  {
    slug: "gergely-orosz",
    kind: "influencer",
    name: "Gergely Orosz",
    role: "Pragmatic Engineer",
    bio: "Writes The Pragmatic Engineer. Best inside view of how big tech actually ships.",
    gh_handle: "gergelyorosz",
    x_handle: "GergelyOrosz",
    site_url: "https://www.pragmaticengineer.com",
  },
] as const;
