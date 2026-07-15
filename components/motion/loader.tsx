"use client";
// Focused spinner from beui.dev/components/motion/loader. The catalog only
// needs one loading language, so unused showcase variants stay out of bundle.

import { motion, useReducedMotion } from "motion/react";
import { EASE_IN_OUT } from "@/lib/ease";
import { cn } from "@/lib/cn";

export function Loader({
  size = 28,
  speed = 1,
  label = "Loading",
  className,
}: {
  size?: number;
  speed?: number;
  label?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const stroke = Math.max(2, size * 0.09);
  const radius = (size - stroke) / 2;

  return (
    <span role="status" aria-label={label} className={cn("inline-flex items-center justify-center text-foreground", className)}>
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        animate={reduce ? { opacity: [1, 0.45, 1] } : { rotate: 360 }}
        transition={
          reduce
            ? { duration: 1.4, ease: EASE_IN_OUT, repeat: Infinity }
            : { duration: speed, ease: "linear", repeat: Infinity }
        }
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={stroke}
        />
        <path
          d={`M ${size / 2} ${size / 2 - radius} A ${radius} ${radius} 0 0 1 ${size / 2 + radius} ${size / 2}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </motion.svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
