/**
 * Cover-image style spec for skillZs.
 *
 * Style guide source of truth: design/character-style-guide.md
 *
 * Each skill becomes one fisheye circular comic portrait of a unique character
 * doing the skill's action, with the skill name spray-painted as graffiti
 * behind them. Bumping STYLE_VERSION + resetting cover_status to 'pending'
 * triggers regen on next cron run.
 */

export const STYLE_VERSION = "v2-fisheye";

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

const CHARACTER_DNA = `
Oversized head vs body (fisheye exaggeration).
Jet-black spiky hair, jagged silhouette.
Small asymmetric eyes, tiny black pupils, lots of sclera.
Extreme wide grin, full teeth grid + gum line visible.
Bandage / scar / dirt detail on cheek.
Dark hoodie with small skull motif on chest, drawstrings visible.
Optional: hoop earring, piercing, plaster.
Original character - no celebrity / IP likenesses.
`.trim();

const SETTINGS_BY_CATEGORY: Record<string, string[]> = {
  coding: [
    "run-down basement room with cracked CRT monitors and a peeling poster",
    "cluttered bedroom desk piled with cables, mugs and a glowing keyboard",
    "graffitied bathroom mirror with sticky notes taped around it",
  ],
  creative: [
    "messy artist bedroom with paint-splattered floor and an old boombox",
    "cracked-tile kitchen counter covered in markers, sketchbooks, half-eaten cereal",
    "dim hallway with peeling wallpaper and a polaroid wall",
  ],
  agent: [
    "dingy kitchen with three open laptops on the table and a flickering bulb",
    "stairwell landing covered in tags and a row of taped-up phones",
    "basement command-room with mismatched monitors and tangled wires",
  ],
  utils: [
    "cracked-tile bathroom with sticker-covered mirror",
    "garage corner with a workbench and rusty toolbox",
    "laundry room with a broken washing machine used as a desk",
  ],
  research: [
    "bedroom corner buried in stacked books and printed papers",
    "kitchen table covered in spread-out notes, pins, red string",
    "basement archive with manila folders and a single hanging bulb",
  ],
  other: [
    "run-down domestic interior with peeling wall texture",
    "small cluttered room with cracked tile and an old appliance in frame",
  ],
};

const GLYPHS = ["!", "?", "\u2665", "?!", "..."];

const PROPS = [
  "cardboard box on the floor with a marker label",
  "crumpled note pinned to the wall",
  "vinyl sticker on the side of an appliance",
  "open spiral notebook with one word visible",
  "polaroid taped at an angle",
];

export interface SkillForPrompt {
  name: string;
  description: string;
  category?: string | null;
  slug?: string | null;
}

export function buildPrompt(skill: SkillForPrompt): string {
  const concept = derivConcept(skill.name, skill.description);
  const word = graffitiWord(skill.name);
  const setting = pickFor(skill, SETTINGS_BY_CATEGORY[skill.category ?? "other"] ?? SETTINGS_BY_CATEGORY.other!);
  const glyph = pickFor(skill, GLYPHS);
  const prop = pickFor(skill, PROPS);

  return [
    "Fisheye circular comic portrait, square 16:9-friendly canvas.",
    "",
    `CHARACTER: a unique original character who personifies the skill "${skill.name}". ${concept}`,
    "",
    `CHARACTER ANATOMY:\n${CHARACTER_DNA}`,
    "",
    `SETTING: ${setting}.`,
    `Drippy deep-purple graffiti tag on the wall reading "${word}".`,
    `Speech bubble with "${glyph}".`,
    `Small narrative prop in the foreground: ${prop}.`,
    "",
    `STYLE:\n${STYLE_DNA}`,
    "",
    "HARD DON'TS: no glossy 3D render, no Pixar softness, no pure white, no pure black, no symmetrical fisheye, no copyrighted likenesses.",
  ].join("\n");
}

function derivConcept(name: string, description: string): string {
  const first =
    description
      .replace(/^use when\s+/i, "")
      .replace(/^when\s+/i, "")
      .split(/[.!?]/)[0]
      ?.trim() || name;
  const trimmed = first.length > 160 ? first.slice(0, 157) + "..." : first;
  return `Pose / expression conveys: ${trimmed}.`;
}

/** Skill name -> short uppercase graffiti word (max 12 chars). */
function graffitiWord(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]+/g, " ").trim();
  const parts = cleaned.split(/\s+/).sort((a, b) => b.length - a.length);
  const pick = (parts[0] ?? cleaned).toUpperCase().slice(0, 12);
  return pick || "SKILL";
}

function pickFor<T>(skill: SkillForPrompt, options: T[]): T {
  const seed = (skill.slug ?? skill.name).split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return options[seed % options.length] as T;
}
