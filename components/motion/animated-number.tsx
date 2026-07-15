"use client";
// beui.dev/components/motion/number

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/cn";

export interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
  startOnView?: boolean;
}

export function AnimatedNumber({
  value,
  duration = 1.2,
  format = (number) => Math.round(number).toLocaleString(),
  className,
  startOnView = true,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  // Keep the real value in server HTML for crawlers and no-JS clients. Once
  // hydrated, Motion can still tween it from zero when the row enters view.
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);

  useEffect(() => {
    if (startOnView && !inView) return;
    if (reduce) {
      fromRef.current = value;
      return;
    }
    const controls = animate(fromRef.current, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: setDisplay,
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [duration, inView, reduce, startOnView, value]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(reduce ? value : display)}
    </span>
  );
}
