"use client";

import Link, { type LinkProps } from "next/link";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import { SPRING_PRESS } from "@/lib/ease";

const AnimatedLink = motion.create(Link);

export interface MotionLinkProps extends Omit<HTMLMotionProps<"a">, "href">, LinkProps {
  children?: ReactNode;
  lift?: number;
  pressScale?: number;
}

/** Keeps Next.js link semantics while applying BeUI's hover/press physics. */
export function MotionLink({ lift = 1, pressScale = 0.98, ...props }: MotionLinkProps) {
  const reduce = useReducedMotion();

  return (
    <AnimatedLink
      {...props}
      whileHover={reduce ? undefined : { y: -lift }}
      whileTap={reduce ? undefined : { scale: pressScale }}
      transition={SPRING_PRESS}
    />
  );
}
