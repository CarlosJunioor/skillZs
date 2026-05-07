"use client";

import { useRef, useState } from "react";
import { SkillCard } from "./skill-card";
import type { SkillStats } from "@/lib/types";

interface Props {
  title: string;
  emoji?: string;
  skills: SkillStats[];
  size?: "sm" | "md" | "lg";
  newCutoffDays?: number;
  /** Drop a giant fisheye watermark behind this row. */
  watermark?: boolean;
}

export function SkillRow({ title, emoji, skills, size = "md", newCutoffDays = 14, watermark }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [cutoff] = useState(() => Date.now() - newCutoffDays * 24 * 60 * 60 * 1000);

  function scroll(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  if (skills.length === 0) return null;

  return (
    <section className="mt-14 relative">
      {watermark && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/fisheye.png"
          alt=""
          aria-hidden
          className="hidden md:block absolute -right-32 top-0 w-[600px] h-[600px] object-contain pointer-events-none select-none z-0 rotate-[6deg] opacity-[0.08]"
        />
      )}
      <div className="relative z-10">
      <div className="flex items-end justify-between mb-5 px-1 gap-3">
        <h2 className="display text-3xl md:text-4xl leading-none">
          <span className="drip">{title}</span>
          {emoji && <span className="ml-3 text-2xl">{emoji}</span>}
        </h2>
        <div className="flex items-center gap-2">
          <span className="tag-font text-[var(--color-grape)] hidden md:inline-block rotate-[-2deg]">
            scroll &rarr;
          </span>
          <button
            onClick={() => scroll(-1)}
            className="w-10 h-10 ink-frame-soft bg-[var(--color-paper)] hover:bg-[var(--color-olive)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none flex items-center justify-center display"
            aria-label={`Scroll ${title} left`}
          >‹</button>
          <button
            onClick={() => scroll(1)}
            className="w-10 h-10 ink-frame-soft bg-[var(--color-paper)] hover:bg-[var(--color-olive)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none flex items-center justify-center display"
            aria-label={`Scroll ${title} right`}
          >›</button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="row-scroll flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-px-2 px-2 pb-3 pt-1"
      >
        {skills.map((s) => (
          <div key={s.id} className="snap-start">
            <SkillCard
              skill={s}
              size={size}
              isNew={new Date(s.first_seen).getTime() > cutoff}
            />
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}
