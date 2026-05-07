"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { compactNumber, categoryLabel } from "@/lib/format";
import type { SkillStats } from "@/lib/types";

interface Props {
  skills: SkillStats[];
  intervalMs?: number;
}

export function HeroCarousel({ skills, intervalMs = 7000 }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (skills.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % skills.length), intervalMs);
    return () => clearInterval(t);
  }, [skills.length, intervalMs]);

  if (skills.length === 0) {
    return (
      <div className="ink-frame relative h-[440px] mt-8 flex items-center justify-center grain bg-[var(--color-paper-2)] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/fisheye.png"
          alt=""
          aria-hidden
          className="absolute right-0 top-1/2 -translate-y-1/2 h-[460px] w-[460px] object-contain pointer-events-none opacity-95"
          style={{ filter: "drop-shadow(8px 8px 0 #1A1A1A)" }}
        />
        <div className="relative z-10 text-left max-w-md px-10">
          <div className="bubble text-sm mb-4">empty zine {"\u203C"}</div>
          <div className="display text-6xl md:text-7xl leading-none mb-3">
            <span className="drip">catalog</span><br />warming up
          </div>
          <p className="type-font text-base mt-4 max-w-xs">
            no skills indexed yet. fire <code className="bg-[var(--color-ink)] text-[var(--color-paper)] px-2 py-0.5">/api/cron/ingest</code> to scrape github.
          </p>
        </div>
      </div>
    );
  }

  const skill = skills[idx]!;

  return (
    <div className="ink-frame relative h-[440px] md:h-[520px] mt-8 overflow-hidden grain bg-[var(--color-mauve)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={skill.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="absolute inset-0"
        >
          <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] h-full">
            <div className="relative h-full border-b-[3px] md:border-b-0 md:border-r-[3px] border-[var(--color-ink)] overflow-hidden">
              {skill.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={skill.cover_url}
                  alt={skill.name}
                  className="w-full h-full object-cover"
                />
              )}
              <span className="absolute top-5 left-5 stamp text-base">
                FEATURED #{idx + 1}
              </span>
            </div>

            <div className="relative p-7 md:p-10 bg-[var(--color-paper)] flex flex-col justify-between">
              <div>
                <div className="bubble text-base mb-6">
                  {categoryLabel(skill.category)} {"\u203C"}
                </div>
                <h1 className="display text-5xl md:text-7xl leading-[0.92] mb-4 break-words">
                  <span className="drip">{skill.name}</span>
                </h1>
                <p className="type-font text-base md:text-lg leading-relaxed line-clamp-5 max-w-xl">
                  {skill.description}
                </p>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={`/skill/${skill.slug}`}
                  className="tag-pill text-lg px-6 py-3"
                  style={{ background: "var(--color-grape)", color: "var(--color-paper)" }}
                >
                  cop it &rarr;
                </Link>
                <div className="type-font text-sm flex flex-wrap gap-4 text-[var(--color-ink-soft)]">
                  <span>{"\u2665"} {compactNumber(skill.vote_count)}</span>
                  <span>@ {compactNumber(skill.use_count)}</span>
                  <span>{"\u2605"} {compactNumber(skill.github_stars)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {skills.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {skills.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              className="w-3 h-3 border-2 border-[var(--color-ink)] transition-all"
              style={{ background: i === idx ? "var(--color-ink)" : "var(--color-paper)" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
