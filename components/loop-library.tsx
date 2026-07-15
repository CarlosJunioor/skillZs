"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/motion/button";
import { Input } from "@/components/motion/input";
import type { AgentLoop } from "@/lib/loops";

function LoopIcon({ loop }: { loop: AgentLoop }) {
  const reduce = useReducedMotion();

  return (
    <div className="relative grid size-20 shrink-0 place-items-center rounded-full border border-[#303944] bg-[#080a0c] shadow-[inset_0_0_22px_rgba(85,214,255,0.06)]" aria-hidden>
      <motion.svg
        viewBox="0 0 64 64"
        className="absolute inset-1 size-[calc(100%-0.5rem)] text-[var(--color-grape)]"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 12, ease: "linear", repeat: Infinity }}
      >
        <path d="M51 17A25 25 0 1 0 55 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="m48 9 4 8-9 1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
      <span className="display text-lg tracking-normal text-white">{loop.sigil}</span>
    </div>
  );
}

function TerminalPreview({ loop }: { loop: AgentLoop }) {
  const reduce = useReducedMotion();
  const [frame, setFrame] = useState(reduce ? loop.frames.length - 1 : 0);
  const [playing, setPlaying] = useState(!reduce);
  const [copyState, setCopyState] = useState("copy prompt");

  useEffect(() => {
    if (!playing || reduce) return;
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % loop.frames.length);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [loop.frames.length, playing, reduce]);

  const visibleFrame = reduce ? loop.frames.length - 1 : frame;
  const isPlaying = Boolean(playing && !reduce);
  const current = loop.frames[visibleFrame];

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(loop.prompt);
      setCopyState("copied ✓");
      window.setTimeout(() => setCopyState("copy prompt"), 1800);
    } catch {
      setCopyState("copy failed");
    }
  }

  return (
    <div className="overflow-hidden border border-[#303944] bg-[#020303] shadow-[inset_3px_0_0_var(--color-grape)]">
      <div className="flex items-center gap-2 border-b border-[#29313a] bg-[#080a0c] px-3 py-2">
        <span className="size-2 rounded-full bg-[var(--color-blood)]" />
        <span className="size-2 rounded-full bg-[#f3bd4f]" />
        <span className="size-2 rounded-full bg-[var(--color-grape)]" />
        <span className="type-font ml-2 min-w-0 truncate text-[10px] uppercase tracking-[0.12em] text-[var(--color-rust)]">
          {loop.slug}.loop
        </span>
        <span className="type-font ml-auto text-[10px] text-[var(--color-grape)]">
          {isPlaying ? "● live" : reduce ? "motion off" : "Ⅱ paused"}
        </span>
      </div>

      <div className="type-font min-h-44 p-4 text-xs leading-6" aria-live="polite">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-dashed border-[#29313a] pb-2 text-[10px] uppercase tracking-[0.14em]">
          <span className="text-white">iteration {String(current.iteration).padStart(2, "0")}</span>
          <span className="text-[var(--color-grape)]">{current.stage}</span>
        </div>
        {loop.frames.slice(0, visibleFrame + 1).map((item, index) => (
          <div key={`${item.iteration}-${item.stage}-${index}`} className={index === visibleFrame ? "text-white" : "text-[#6f7a85]"}>
            <span className="mr-2 text-[var(--color-grape)]">{index === visibleFrame ? "›" : "·"}</span>
            {item.line}
          </div>
        ))}
        <span className="terminal-preview__cursor" aria-hidden />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-[#29313a] p-2">
        <Button
          size="sm"
          variant="ghost"
          className="type-font rounded-none px-2 text-[10px] uppercase"
          disabled={Boolean(reduce)}
          onClick={() => setPlaying((currentPlaying) => !currentPlaying)}
        >
          {isPlaying ? "pause" : reduce ? "motion off" : "play"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="type-font rounded-none px-2 text-[10px] uppercase"
          disabled={Boolean(reduce)}
          onClick={() => {
            setFrame(0);
            setPlaying(!reduce);
          }}
        >
          restart
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="type-font ml-auto rounded-none px-2 text-[10px] uppercase"
          onClick={copyPrompt}
        >
          {copyState}
        </Button>
      </div>
    </div>
  );
}

function LoopCard({ loop, index }: { loop: AgentLoop; index: number }) {
  return (
    <article className="grid gap-5 border-t border-[#303944] py-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,1.15fr)] lg:gap-8">
      <div>
        <div className="flex items-start gap-4">
          <LoopIcon loop={loop} />
          <div className="min-w-0 pt-1">
            <div className="tag-font mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--color-rust)]">
              loop {String(index + 1).padStart(2, "0")} · {loop.bestFor}
            </div>
            <h2 className="display text-2xl leading-tight md:text-3xl">{loop.name}</h2>
          </div>
        </div>
        <p className="type-font mt-5 max-w-xl text-sm leading-6 text-[var(--color-ink-soft)]">{loop.summary}</p>

        <ol className="mt-5 flex flex-wrap items-center gap-2" aria-label={`${loop.name} stages`}>
          {loop.stages.map((stage, stageIndex) => (
            <li key={stage} className="contents">
              <span className="type-font border border-[#303944] bg-[#080a0c] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] text-white">
                {stage}
              </span>
              {stageIndex < loop.stages.length - 1 ? <span className="text-[var(--color-grape)]" aria-hidden>→</span> : null}
            </li>
          ))}
          <span className="text-[var(--color-grape)]" aria-hidden>↺</span>
        </ol>

        <div className="type-font mt-5 border-l border-[var(--color-grape)] pl-3 text-xs leading-5">
          <span className="text-[var(--color-rust)]">stop when:</span> {loop.stopWhen}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {loop.tags.map((tag) => <span key={tag} className="stamp">{tag}</span>)}
        </div>
      </div>

      <TerminalPreview loop={loop} />
    </article>
  );
}

export function LoopLibrary({ loops }: { loops: AgentLoop[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return loops;
    return loops.filter((loop) =>
      [loop.name, loop.summary, loop.bestFor, loop.tags.join(" "), loop.stages.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [loops, query]);

  return (
    <section aria-labelledby="loop-library-heading">
      <div className="sticky top-[110px] z-20 -mx-4 border-y border-[#29313a] bg-[#050505]/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label htmlFor="loop-search" id="loop-library-heading" className="type-font text-xs uppercase tracking-[0.14em] text-[var(--color-grape)]">
            find a loop
          </label>
          <Input
            id="loop-search"
            type="search"
            value={query}
            onChange={setQuery}
            placeholder="debugging, research, safety..."
            className="min-w-0 flex-1"
            classNames={{
              field: "h-10 rounded-none bg-[#080a0c]",
              input: "type-font px-3 text-sm",
            }}
          />
          <span className="tag-font text-xs text-[var(--color-rust)]">{filtered.length} / {loops.length} specimens</span>
        </div>
      </div>

      <div>
        {filtered.map((loop, index) => <LoopCard key={loop.slug} loop={loop} index={index} />)}
      </div>

      {filtered.length === 0 ? (
        <div className="my-16 border border-[#303944] bg-[#080a0c] p-10 text-center">
          <h2 className="display text-2xl">no matching loop</h2>
          <p className="type-font mt-2 text-sm text-[var(--color-rust)]">Try a job like debugging, research, writing, or safety.</p>
        </div>
      ) : null}
    </section>
  );
}
