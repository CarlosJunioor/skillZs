// lib/skill-demo-types.ts
// Client-safe frame primitives for the terminal preview. NO parser or server
// imports here — the "use client" component imports from this file, so anything
// pulled in lands in the browser bundle. Keep it tiny.

export type DemoFrameKind = "prompt" | "user" | "response" | "thinking";

export interface DemoFrame {
  kind: DemoFrameKind;
  text: string;
  speedMs?: number;
  pauseAfterMs?: number;
}

export const DEFAULT_SPEED_MS: Record<DemoFrameKind, number> = {
  prompt: 32,
  user: 30,
  response: 16,
  thinking: 22,
};

export const LOOP_PAUSE_MS = 2500;
