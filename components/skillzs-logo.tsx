/**
 * skillZs wordmark rebuilt from the painted teeth tag in /public/fisheye.png.
 *
 * The asset keeps the original source-art letter shapes, star i-dot, custom Z,
 * and paint texture, but the letters are placed on a horizontal header baseline.
 */

import { cn } from "@/lib/cn";
import type { CSSProperties } from "react";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Enables the header-only print-jam animation. */
  animate?: boolean;
}

const HEIGHT_PX = { sm: 56, md: 88, lg: 140 };
const LOGO_WIDTH = 780;
const LOGO_HEIGHT = 329;

export function SkillZsLogo({ size = "md", className, animate = false }: Props) {
  const h = HEIGHT_PX[size];
  const w = Math.round((h * LOGO_WIDTH) / LOGO_HEIGHT);

  if (animate) {
    return (
      <span
        className={cn("skillzs-logo", className)}
        style={
          {
            "--skillzs-logo-height": `${h}px`,
            "--skillzs-logo-width": `${w}px`,
          } as CSSProperties
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/skillzs-wordmark.png"
          alt="skillZs"
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          draggable={false}
          className="skillzs-logo__image"
        />
        <span aria-hidden className="skillzs-logo__ghost skillzs-logo__ghost--grape" />
        <span aria-hidden className="skillzs-logo__ghost skillzs-logo__ghost--olive" />
        <span aria-hidden className="skillzs-logo__slice skillzs-logo__slice--high" />
        <span aria-hidden className="skillzs-logo__slice skillzs-logo__slice--low" />
        <span aria-hidden className="skillzs-logo__shutter" />
        <span aria-hidden className="skillzs-logo__register skillzs-logo__register--top" />
        <span aria-hidden className="skillzs-logo__register skillzs-logo__register--bottom" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/skillzs-wordmark.png"
      alt="skillZs"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      draggable={false}
      style={{ height: h, width: w }}
      className={cn("block select-none", className)}
    />
  );
}
