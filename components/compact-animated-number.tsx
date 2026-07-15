"use client";

import { AnimatedNumber } from "@/components/motion/animated-number";
import { compactNumber } from "@/lib/format";

export function CompactAnimatedNumber({ value }: { value: number }) {
  return <AnimatedNumber value={value} format={(number) => compactNumber(Math.round(number))} />;
}
