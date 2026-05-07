/**
 * skillZs hand-tagged graffiti logo. Renders as inline SVG so the drips animate.
 *
 * Brand spec (from design/character-style-guide.md + reference cover):
 *   - lowercase "skill" + uppercase "Z" (slightly oversized) + lowercase "s"
 *   - small star in top-left negative space of Z
 *   - wobbly baseline (per-letter dy / rotate)
 *   - marker stroke: deep-purple fill #6B3FA0, dark-purple outline #2D1B3D
 *   - vertical paint drips dripping off the bottom (animated)
 *
 * Non-goals (yet):
 *   - true hand-traced bezier paths per letter — that's a Figma/Illustrator job.
 *     For now we render via the loaded "Permanent Marker" font with a roughen
 *     filter so it reads as hand-painted.
 */

import { cn } from "@/lib/cn";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** `true` makes drips animate. Disable for tiny-context use (favicons, OG cards). */
  animate?: boolean;
}

const HEIGHT_PX = { sm: 56, md: 88, lg: 140 };

export function SkillZsLogo({ size = "md", className, animate = true }: Props) {
  const h = HEIGHT_PX[size];

  // Drip definitions — anchored to letter baselines (y≈84). Each gets its own
  // delay + duration so the paint constantly weeps.
  const drips: Array<{ x: number; len: number; thick: number; delay: number; dur: number }> = [
    { x: 22,  len: 22, thick: 7, delay: 0,    dur: 3.4 },
    { x: 56,  len: 14, thick: 6, delay: 0.6,  dur: 2.9 },
    { x: 82,  len: 30, thick: 6, delay: 1.2,  dur: 3.6 },
    { x: 110, len: 18, thick: 6, delay: 0.3,  dur: 3.1 },
    { x: 154, len: 26, thick: 9, delay: 0.9,  dur: 4.0 },
    { x: 198, len: 12, thick: 7, delay: 1.6,  dur: 2.7 },
    { x: 232, len: 32, thick: 7, delay: 0.4,  dur: 3.8 },
    { x: 268, len: 16, thick: 6, delay: 1.1,  dur: 3.2 },
  ];

  return (
    <svg
      viewBox="0 0 320 130"
      height={h}
      role="img"
      aria-label="skillZs"
      className={cn("select-none overflow-visible", className)}
    >
      <defs>
        {/* Slight roughening for the marker stroke. */}
        <filter id="szl-rough" x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="7" result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale="2.4" />
        </filter>
        {/* Subtle ink bleed shadow under the type. */}
        <filter id="szl-bleed" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
      </defs>

      {/* DRIPS — rendered before the type so they tuck behind it. */}
      <g aria-hidden>
        {drips.map((d, i) => {
          const top = 84;
          const dripPath = `
            M ${d.x - d.thick / 2} ${top}
            C ${d.x - d.thick / 2} ${top + d.len * 0.5},
              ${d.x - d.thick / 4} ${top + d.len * 0.85},
              ${d.x} ${top + d.len}
            C ${d.x + d.thick / 4} ${top + d.len * 0.85},
              ${d.x + d.thick / 2} ${top + d.len * 0.5},
              ${d.x + d.thick / 2} ${top}
            Z
          `;
          return (
            <path
              key={i}
              d={dripPath}
              fill="#5C3D6B"
              style={
                animate
                  ? ({
                      transformOrigin: `${d.x}px ${top}px`,
                      animation: `szl-drip ${d.dur}s ease-in ${d.delay}s infinite`,
                    } as React.CSSProperties)
                  : undefined
              }
            />
          );
        })}
      </g>

      {/* WORDMARK — Permanent Marker base + heavy stroke + roughen filter. */}
      <g filter="url(#szl-rough)">
        {/* Drop-shadow / outline pass: render text twice, once larger black-ish behind */}
        <text
          x="10" y="84"
          fontFamily="var(--font-tag-loaded), 'Permanent Marker', cursive"
          fontSize="86"
          fill="#2D1B3D"
          stroke="#2D1B3D"
          strokeWidth="6"
          strokeLinejoin="round"
          letterSpacing="-2"
        >
          skill<tspan fontSize="100">Z</tspan>s
        </text>
        {/* Main fill */}
        <text
          x="10" y="84"
          fontFamily="var(--font-tag-loaded), 'Permanent Marker', cursive"
          fontSize="86"
          fill="#6B3FA0"
          stroke="#2D1B3D"
          strokeWidth="2.2"
          strokeLinejoin="round"
          letterSpacing="-2"
        >
          skill<tspan fontSize="100">Z</tspan>s
        </text>
        {/* Top highlight — narrow lighter stroke at the upper edge for shine */}
        <text
          x="10" y="80"
          fontFamily="var(--font-tag-loaded), 'Permanent Marker', cursive"
          fontSize="86"
          fill="none"
          stroke="#9B6BC4"
          strokeWidth="0.9"
          letterSpacing="-2"
          opacity="0.55"
          filter="url(#szl-bleed)"
        >
          skill<tspan fontSize="100">Z</tspan>s
        </text>
      </g>

      {/* STAR — small five-point in the top-left negative space of the Z. */}
      <g transform="translate(160, 28) rotate(-12)">
        {/* outline */}
        <path
          d="M 0 -10 L 2.6 -3.1 L 9.8 -3.1 L 4 1.1 L 6.1 8 L 0 3.7 L -6.1 8 L -4 1.1 L -9.8 -3.1 L -2.6 -3.1 Z"
          fill="#E8DFC9"
          stroke="#2D1B3D"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
