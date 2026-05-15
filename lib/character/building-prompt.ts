// lib/character/building-prompt.ts
//
// Source of truth: design/character-style-guide.md
// Spec:           design/sub-project-c-town.md
//
// Storefront tile for the town map at /. The composition is a fisheye PEEK
// THROUGH a window/door/grate INTO the character's locked-style interior.
// ~85% of the image stays inside the Style DNA from prompt.ts; the new
// element is just the storefront frame (~15%).
//
// Bumping BUILDING_STYLE_VERSION + resetting building_status to 'pending'
// triggers regen on the next cron run, mirroring AVATAR_STYLE_VERSION.

import { pick } from "./random";
import type { CharacterKind } from "@/lib/types";

export const BUILDING_STYLE_VERSION = "v1-fisheye-peek";

export interface BuildingPromptInput {
  slug: string;
  name: string;
  role?: string | null;
  kind: CharacterKind;
}

const STYLE_DNA = `
Circular fisheye composition, heavy black outer vignette, slightly off-center.
Urban comic illustration with THICK black ink lineart (no thin strokes).
Grunge overlay: visible paper grain, ink scratches, dust speckle.
Muted desaturated palette - never saturated, never washed-out.
Hand-drawn feel, NO slick AI render, NO 3D, NO Pixar softness.
Whites are bone cream #E8DFC9, never pure white. Blacks are #1A1A1A, never pure black.
Palette anchors: olive yellow #C8C346 skin, dusty mauve #9A6E7A walls,
deep purple #5C3D6B graffiti drips, warm brown #7C5C3E floor/props.
`.trim();

const STOREFRONT_FRAMES = [
  "a barred storefront window",
  "the doorway of a run-down shop, door cracked open",
  "a rusted metal grate pulled half-up",
  "a fish-tank-style glass panel set into the wall",
] as const;

const INTERIORS = [
  "a run-down kitchen with cracked tile and a flickering bulb",
  "a peeling-wallpaper bathroom corner with sticky notes",
  "a cluttered bedroom with stacked books and an old boombox",
  "a basement workshop with exposed pipes and graffiti tags",
] as const;

const GLYPHS = ["!", "?", "♥"] as const;

const ZEKE_PROPS = [
  "a laptop covered in stickers on the inner sill",
  "a cardboard box labeled SKILLS resting just inside",
  "a paint-spattered sketchbook propped against the glass",
] as const;

const INFLUENCER_PROPS = [
  "a vintage microphone on the inner sill",
  "a dog-eared paperback resting just inside",
  "a framed polaroid taped to the inside of the glass",
] as const;

function deriveWord(role: string | null | undefined, fallback: string): string {
  const raw = (role ?? fallback).trim();
  if (!raw) return fallback.toUpperCase();
  const first = raw.split(/\s+/)[0] ?? fallback;
  return first.toUpperCase().slice(0, 12);
}

export function buildBuildingPrompt(input: BuildingPromptInput): string {
  const frame = pick(input.slug, 0, STOREFRONT_FRAMES);
  const interior = pick(input.slug, 1, INTERIORS);
  const glyph = pick(input.slug, 7, GLYPHS);
  const prop = pick(
    input.slug,
    13,
    input.kind === "zeke" ? ZEKE_PROPS : INFLUENCER_PROPS,
  );
  const word = deriveWord(input.role, input.name);

  return [
    `Fisheye circular shopfront peek of ${input.name}.`,
    `Viewer is outside the shop, peering through ${frame} INTO the interior beyond.`,
    `The interior is ${interior}, with ${input.name} visible inside the room, mid-action.`,
    `${prop}.`,
    `Drippy purple graffiti tagged on the OUTSIDE wall reading "${word}".`,
    `Speech bubble inside the room with a single "${glyph}" glyph.`,
    "",
    "STYLE DNA (locked):",
    STYLE_DNA,
    "",
    "Heavy black vignette border. Slight isometric 3/4 building angle.",
    "The character inside follows skillZs anatomy: oversized head, jet-black",
    "spiky hair, jagged silhouette, small asymmetric eyes with lots of sclera,",
    "extreme wide grin, dark hoodie with skull motif. Original character - no",
    "celebrity or IP likenesses.",
    "No slick rendering. No pure white or pure black. No rendered-3D look.",
  ].join("\n");
}
