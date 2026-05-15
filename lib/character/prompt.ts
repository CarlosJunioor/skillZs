/**
 * Avatar prompt builder for characters.
 *
 * Source of truth: design/character-style-guide.md
 *
 * The Style DNA + Character Anatomy are locked tokens. We change only the
 * variation axes (CHARACTER, POSE/EXPRESSION, SETTING, WORD, GLYPH, PROP).
 * Bumping AVATAR_STYLE_VERSION + resetting avatar_status to 'pending'
 * triggers regen on the next cron run.
 */

import { pick } from "./random";

export const AVATAR_STYLE_VERSION = "v1-fisheye-character";

export interface AvatarPromptInput {
  slug: string;
  name: string;
  /** "TypeScript explainer-in-chief", "In-house builder of skillZs", ... */
  role?: string | null;
  /** "zeke" or "influencer" — drives the prop pick. */
  kind: "zeke" | "influencer";
}

const STYLE_DNA = `
Circular fisheye portrait, heavy black outer vignette, slightly off-center.
Urban comic illustration with THICK black ink lineart (no thin strokes).
Grunge overlay: visible paper grain, ink scratches, dust speckle.
Muted desaturated palette - never saturated, never pastel.
Close-up character foreground inside a warped interior background.
Hand-drawn feel, NO glossy AI render, NO 3D, NO Pixar softness.
Whites are bone cream #E8DFC9, never pure white. Blacks are #1A1A1A, never pure black.
Palette anchors: olive yellow #C8C346 skin, dusty mauve #9A6E7A walls,
deep purple #5C3D6B graffiti drips, warm brown #7C5C3E floor/props.
`.trim();

const CHARACTER_ANATOMY = `
Oversized head vs body (fisheye exaggeration).
Jet-black spiky hair, jagged silhouette.
Small asymmetric eyes, tiny black pupils, lots of sclera.
Extreme wide grin, full teeth grid + gum line visible.
Bandage / scar / dirt detail on cheek.
Dark hoodie with small skull motif on chest, drawstrings visible.
Optional: hoop earring, piercing, plaster.
Original character - no celebrity or IP likenesses.
`.trim();

const SETTINGS = [
  "a run-down kitchen with cracked tile and a flickering bulb",
  "a peeling-wallpaper bathroom corner with sticky notes",
  "a cluttered bedroom with stacked books and an old boombox",
  "a basement workshop with exposed pipes and graffiti tags",
] as const;

const GLYPHS = ["!", "?", "♥"] as const;

const ZEKE_PROPS = [
  "a laptop covered in stickers",
  "a cardboard box labeled SKILLS",
  "a paint-spattered sketchbook",
];

const INFLUENCER_PROPS = [
  "a vintage microphone",
  "a dog-eared paperback",
  "a framed polaroid on the wall",
];

function deriveWord(role: string | null | undefined, fallback: string): string {
  const raw = (role ?? fallback).trim();
  if (!raw) return fallback.toUpperCase();
  const first = raw.split(/\s+/)[0] ?? fallback;
  return first.toUpperCase().slice(0, 12);
}

function derivePose(role: string | null | undefined): string {
  const raw = (role ?? "").toLowerCase();
  if (!raw) return "leaning slightly forward, smirking";
  if (raw.includes("explain")) return "mid-sentence, pointing at the viewer";
  if (raw.includes("builder") || raw.includes("ringleader")) return "elbows out, holding the prop up like a trophy";
  if (raw.includes("tinker") || raw.includes("pragmat")) return "head tilted, half-grin, prop in one hand";
  if (raw.includes("lore") || raw.includes("engineer")) return "deep in thought, eyebrows up, prop on the desk";
  return "leaning slightly forward, smirking";
}

export function buildAvatarPrompt(input: AvatarPromptInput): string {
  const character = input.name;
  const pose = derivePose(input.role);
  const setting = pick(input.slug, 0, SETTINGS);
  const word = deriveWord(input.role, input.name);
  const glyph = pick(input.slug, 7, GLYPHS);
  const prop = pick(
    input.slug,
    13,
    input.kind === "zeke" ? ZEKE_PROPS : INFLUENCER_PROPS,
  );

  return [
    `Fisheye circular portrait of ${character}, ${pose}.`,
    `Setting: ${setting}.`,
    `${prop} in the foreground.`,
    `Drippy purple graffiti on the wall reading "${word}".`,
    `Speech bubble with a single "${glyph}" glyph.`,
    "",
    "STYLE DNA (locked):",
    STYLE_DNA,
    "",
    "CHARACTER ANATOMY:",
    CHARACTER_ANATOMY,
    "",
    "Heavy black vignette border. No glossy rendering. No pure white or pure black.",
  ].join("\n");
}
