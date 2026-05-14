/**
 * Prompt construction for diptych text + image.
 *
 * Style guide source of truth: design/character-style-guide.md (shared with
 * covers; the diptych uses the same town-of-Aquarius aesthetic but renders a
 * 3:2 before/after split rather than a character portrait).
 *
 * Bumping STYLE_VERSION + resetting diptych_status to 'pending' triggers regen
 * on the next cron run.
 */

export const STYLE_VERSION = "v1-aquarius";

const STYLE_DNA = `
Painterly comic illustration, THICK black ink lineart, hand-drawn feel.
Muted desaturated palette - never saturated, never pastel.
Soft grunge overlay: paper grain, ink scratches.
Whites are bone cream #E8DFC9, never pure white. Blacks #1A1A1A, never pure black.
Palette anchors: olive yellow #C8C346, dusty mauve #9A6E7A, deep purple #5C3D6B, warm brown #7C5C3E.
HARD DON'TS: no glossy 3D, no Pixar softness, no realistic faces, no pure white, no pure black, no text characters or words inside the artwork, no copyrighted likenesses.
`.trim();

const COMPOSITION = `
Two equal panels, horizontal split with a hand-painted arrow between them.
Left panel labeled BEFORE in tiny stencil at the top-left corner of the panel.
Right panel labeled AFTER in tiny stencil at the top-left corner of the panel.
No other text or words in the image. Both panels share the same character and style.
`.trim();

export interface DiptychTextInput {
  name: string;
  description: string;
  body: string;
}

/** Chat prompt that produces the JSON used for both UI text and image scenes. */
export function buildTextPrompt(input: DiptychTextInput): string {
  const trimmedBody = input.body.length > 6_000 ? input.body.slice(0, 6_000) + "\n[...]" : input.body;
  return [
    "You are condensing a Claude/Codex/Cursor skill into a 1-card pitch for a discovery feed.",
    "",
    "Return STRICT JSON with EXACTLY these three keys and no others:",
    `  - "tagline":     verb-led, MAX 8 words. The card headline. No trailing period. No marketing fluff.`,
    `  - "before_text": MAX 10 words. The pain the user has TODAY when they don't have this skill.`,
    `  - "after_text":  MAX 10 words. The concrete outcome AFTER this skill runs.`,
    "",
    "Tone: punchy, GenZ-friendly, plain English. No emojis. No quotes around the strings.",
    "",
    `SKILL NAME: ${input.name}`,
    `SKILL DESCRIPTION: ${input.description}`,
    "",
    "SKILL.md body (truncated to 6000 chars):",
    "---",
    trimmedBody,
    "---",
  ].join("\n");
}

export interface DiptychImageInput {
  name: string;
  before_text: string;
  after_text: string;
  category: string | null;
}

const CATEGORY_HINT: Record<string, string> = {
  coding:   "Setting: cluttered developer desk with a CRT monitor and a glowing keyboard.",
  agent:    "Setting: dingy kitchen with three open laptops and a flickering bulb.",
  creative: "Setting: paint-splattered artist bedroom with an old boombox.",
  utils:    "Setting: cracked-tile bathroom corner with sticky notes and tools.",
  research: "Setting: bedroom corner buried in stacked books and printed papers.",
};

export function buildImagePrompt(input: DiptychImageInput): string {
  const setting = input.category && CATEGORY_HINT[input.category]
    ? CATEGORY_HINT[input.category]
    : "Setting: a small cluttered domestic interior with peeling wallpaper.";
  return [
    `Diptych illustration: 3:2 canvas, two equal horizontal panels for the skill "${input.name}".`,
    "",
    `LEFT PANEL (BEFORE): a scene representing - ${input.before_text}.`,
    `RIGHT PANEL (AFTER): a scene representing - ${input.after_text}.`,
    "",
    `COMPOSITION:\n${COMPOSITION}`,
    "",
    setting,
    "",
    `STYLE:\n${STYLE_DNA}`,
  ].join("\n");
}
