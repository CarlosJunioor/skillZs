import Link from "next/link";
import { compactNumber, categoryLabel } from "@/lib/format";
import type { SkillStats } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  skill: SkillStats;
  size?: "sm" | "md" | "lg";
  isNew?: boolean;
}

function tiltFor(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const deg = ((h % 5) - 2) * 0.6;
  return `${deg.toFixed(2)}deg`;
}

export function SkillCard({ skill, size = "md", isNew }: Props) {
  const widthClass =
    size === "lg" ? "w-[300px]" : size === "sm" ? "w-[200px]" : "w-[240px]";
  const coverHeight =
    size === "lg" ? "h-[200px]" : size === "sm" ? "h-[140px]" : "h-[170px]";

  const isHot = skill.hotness > 50;
  const tilt = tiltFor(skill.slug);

  return (
    <Link
      href={`/skill/${skill.slug}`}
      style={{ ["--tilt" as string]: tilt }}
      className={cn(
        "group relative shrink-0 ink-frame slap wobble",
        widthClass,
      )}
    >
      <div className={cn("relative w-full overflow-hidden grain", coverHeight)}>
        {skill.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={skill.cover_url}
            alt={skill.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--color-mauve)]">
            <span className="display text-4xl text-[var(--color-paper)]">?!</span>
          </div>
        )}

        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 z-10">
          <span className="bubble text-[10px]">
            {categoryLabel(skill.category)}
          </span>
          <div className="flex flex-col items-end gap-1">
            {isNew && <span className="stamp" style={{ borderColor: "var(--color-grape)", color: "var(--color-grape)" }}>NEW</span>}
            {isHot && <span className="stamp">HOT</span>}
          </div>
        </div>
      </div>

      <div className="px-3 py-2 border-t-[3px] border-[var(--color-ink)] bg-[var(--color-paper)]">
        <div className="display text-base leading-tight truncate">
          {skill.name}
        </div>
      </div>

      <div className="px-3 py-1.5 border-t-2 border-[var(--color-ink)] bg-[var(--color-paper-2)] flex items-center justify-between text-xs type-font">
        <span title="Votes">{"\u2665"} {compactNumber(skill.vote_count)}</span>
        <span title="People using">@ {compactNumber(skill.use_count)}</span>
        <span title="GitHub stars">{"\u2605"} {compactNumber(skill.github_stars)}</span>
      </div>
    </Link>
  );
}
