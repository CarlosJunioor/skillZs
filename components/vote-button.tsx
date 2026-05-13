"use client";

import { useState, useTransition } from "react";
import { compactNumber } from "@/lib/format";

interface Props {
  skillId: string;
  initialCount: number;
  variant: "vote" | "use";
}

const COPY = {
  vote: { idle: "\u2665 vote it", active: "\u2713 voted", endpoint: "/api/vote" },
  use: { idle: "@ I use this", active: "\u2713 noted", endpoint: "/api/use" },
} as const;

export function VoteButton({ skillId, initialCount, variant }: Props) {
  const [count, setCount] = useState(initialCount);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const cfg = COPY[variant];

  function handleClick() {
    if (done || pending) return;
    setCount((c) => c + 1);
    setDone(true);
    startTransition(async () => {
      try {
        const res = await fetch(cfg.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skillId }),
        });
        const json = (await res.json().catch(() => null)) as { count?: number; ok?: boolean } | null;
        if (json && typeof json.count === "number") setCount(json.count);
        if (!res.ok) {
          setCount((c) => Math.max(0, c - 1));
          setDone(false);
        }
      } catch {
        setCount((c) => Math.max(0, c - 1));
        setDone(false);
      }
    });
  }

  const bg = done
    ? "var(--color-paper-2)"
    : variant === "vote"
      ? "var(--color-grape)"
      : "var(--color-olive)";
  const fg = done ? "var(--color-ink-soft)" : variant === "vote" ? "var(--color-paper)" : "var(--color-ink)";

  return (
    <button
      onClick={handleClick}
      disabled={done || pending}
      className="tag-pill text-base px-5 py-2.5"
      style={{ background: bg, color: fg }}
    >
      {done ? cfg.active : cfg.idle} &middot; {compactNumber(count)}
    </button>
  );
}
