// beui.dev/components/motion/marquee
import { Children, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface MarqueeProps {
  children: ReactNode;
  speed?: number;
  pauseOnHover?: boolean;
  gap?: string;
  className?: string;
  fade?: boolean;
}

export function Marquee({
  children,
  speed = 30,
  pauseOnHover = true,
  gap = "1rem",
  className,
  fade = true,
}: MarqueeProps) {
  const items = Children.toArray(children);

  return (
    <div
      className={cn(
        "group relative flex overflow-hidden",
        fade && "[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        className,
      )}
      style={{ "--gap": gap, gap } as React.CSSProperties}
    >
      {[0, 1].map((duplicate) => (
        <div
          key={duplicate}
          aria-hidden={duplicate === 1}
          style={{ animationDuration: `${speed}s`, gap }}
          className={cn(
            "animate-marquee flex shrink-0 items-center",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
          )}
        >
          {items.map((child, index) => (
            <div key={index} className="shrink-0">
              {child}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
