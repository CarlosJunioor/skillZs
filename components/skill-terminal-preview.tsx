"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DEFAULT_SPEED_MS,
  LOOP_PAUSE_MS,
  type DemoFrame,
} from "@/lib/skill-demo-types";

interface Props {
  scenarios: DemoFrame[][];
  slug: string;
}

const NO_OP_SUBSCRIBE = () => () => {};
const SERVER_FALSE = () => false;
const CLIENT_TRUE = () => true;

function useHasHydrated(): boolean {
  return useSyncExternalStore(NO_OP_SUBSCRIBE, CLIENT_TRUE, SERVER_FALSE);
}

function subscribeReducedMotion(cb: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, SERVER_FALSE);
}

export function SkillTerminalPreview({ scenarios, slug }: Props) {
  const animated = useHasHydrated();
  const [loopCount, setLoopCount] = useState(0);
  const handleLoopComplete = useCallback(() => setLoopCount((c) => c + 1), []);

  const safe = scenarios.length > 0 ? scenarios : [[]];
  const frames = safe[loopCount % safe.length];

  return (
    <section className="mt-14">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
        <h2 className="display text-3xl">
          <span className="drip">terminal preview</span>
        </h2>
        <span className="tag-font text-sm text-[var(--color-rust)] uppercase tracking-wide">
          simulated Claude Code run
        </span>
      </div>

      <div className="terminal-preview ink-frame" aria-label={`${slug} terminal preview`}>
        <div className="terminal-preview__chrome">
          <span className="terminal-preview__dot" />
          <span className="terminal-preview__dot" />
          <span className="terminal-preview__dot" />
          <span className="ml-2 truncate">{`skillz://${slug}`}</span>
        </div>

        <pre className="terminal-preview__body" aria-live="off">
          {animated ? (
            <AnimatedFrames
              key={loopCount}
              frames={frames}
              onLoopComplete={handleLoopComplete}
            />
          ) : (
            <StaticFrames frames={frames} />
          )}
        </pre>
      </div>
    </section>
  );
}

function StaticFrames({ frames }: { frames: DemoFrame[] }) {
  return (
    <>
      {frames.map((f, i) => (
        <TerminalLine key={`static-${i}`} kind={f.kind} text={f.text} />
      ))}
    </>
  );
}

function TerminalLine({
  kind,
  text,
  cursor = false,
}: {
  kind: DemoFrame["kind"];
  text: string;
  cursor?: boolean;
}) {
  const sigil =
    kind === "prompt" ? "$ " : kind === "user" ? "> " : kind === "thinking" ? "» " : "  ";
  const classes = ["terminal-preview__line"];
  if (kind === "prompt") classes.push("terminal-preview__line--prompt");
  if (kind === "user") classes.push("terminal-preview__line--user");
  if (kind === "thinking") classes.push("terminal-preview__line--thinking");
  return (
    <span className={classes.join(" ")}>
      {sigil}
      {text}
      {cursor && <span className="terminal-preview__cursor" aria-hidden="true" />}
      {"\n"}
    </span>
  );
}

function AnimatedFrames({
  frames,
  onLoopComplete,
}: {
  frames: DemoFrame[];
  onLoopComplete: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLSpanElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion || !inView) return;
    const frame = frames[frameIndex];
    if (!frame) return;
    const isLast = frameIndex === frames.length - 1;
    const fullyTyped = charCount >= frame.text.length;

    if (!fullyTyped) {
      const speed = frame.speedMs ?? DEFAULT_SPEED_MS[frame.kind];
      const id = window.setTimeout(() => setCharCount((c) => c + 1), speed);
      return () => window.clearTimeout(id);
    }

    if (!isLast) {
      const pause = frame.pauseAfterMs ?? 320;
      const id = window.setTimeout(() => {
        setFrameIndex((i) => i + 1);
        setCharCount(0);
      }, pause);
      return () => window.clearTimeout(id);
    }

    const id = window.setTimeout(() => onLoopComplete(), LOOP_PAUSE_MS);
    return () => window.clearTimeout(id);
  }, [frames, frameIndex, charCount, reducedMotion, inView, onLoopComplete]);

  if (reducedMotion) {
    return (
      <span ref={containerRef}>
        <StaticFrames frames={frames} />
      </span>
    );
  }

  const completed = frames.slice(0, frameIndex);
  const live = frames[frameIndex];

  return (
    <span ref={containerRef}>
      {completed.map((f, i) => (
        <TerminalLine key={`done-${i}`} kind={f.kind} text={f.text} />
      ))}
      {live && (
        <TerminalLine
          key={`live-${frameIndex}`}
          kind={live.kind}
          text={live.text.slice(0, charCount)}
          cursor
        />
      )}
    </span>
  );
}
