import { cn } from "@/lib/cn";

interface Props {
  /** logical pixel height — width auto-scales by aspect (~square 1:1). */
  height?: number;
  className?: string;
  /** rotate degrees, e.g. -4 for slight slap-tilt. */
  tilt?: number;
  alt?: string;
}

/**
 * The skillZs mascot. Lives at /public/mascot.png — a full kitchen-scene
 * illustration of the green-skin hoodie character from the cover-art series.
 * Looks great on both light + dark themes (already has its own dark interior).
 */
export function Mascot({ height = 320, className, tilt = 0, alt = "skillZs mascot" }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mascot.png"
      alt={alt}
      style={{
        height,
        width: "auto",
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
      }}
      className={cn("select-none pointer-events-none", className)}
    />
  );
}
