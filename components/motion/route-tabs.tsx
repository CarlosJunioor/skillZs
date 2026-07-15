"use client";

import { motion, useReducedMotion } from "motion/react";
import { MotionLink } from "@/components/motion/motion-link";
import { SPRING_LAYOUT } from "@/lib/ease";

export interface RouteTab {
  href: string;
  label: string;
  active: boolean;
}

/** BeUI-style shared indicator with crawlable, URL-backed Next.js links. */
export function RouteTabs({ tabs }: { tabs: RouteTab[] }) {
  const reduce = useReducedMotion();

  return (
    <nav aria-label="Skill ranking" className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => (
        <MotionLink
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className="tag-pill relative isolate overflow-hidden"
          data-active={tab.active || undefined}
          lift={0}
        >
          {tab.active ? (
            <motion.span
              layoutId="browse-rank-indicator"
              className="absolute inset-0 -z-10 bg-primary"
              transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
            />
          ) : null}
          <span className="relative">{tab.label}</span>
        </MotionLink>
      ))}
    </nav>
  );
}
