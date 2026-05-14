import Link from "next/link";
import { compactNumber, categoryLabel } from "@/lib/format";
import type { SkillStats } from "@/lib/types";
import { cn } from "@/lib/cn";
import { InstallPill } from "./install-pill";

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
    size === "lg" ? "w-[300px]" : size === "sm" ? "w-[220px]" : "w-[260px]";
  // 3:2 diptych — height tuned to keep cards comparable to the prior cover
  // proportions. Falls back to the original cover height when a diptych has
  // not been generated yet.
  const visualHeight =
    size === "lg" ? "h-[200px]" : size === "sm" ? "h-[145px]" : "h-[170px]";

  const isHot = skill.hotness > 50;
  const tilt = tiltFor(skill.slug);
  const visual = skill.diptych_url ?? skill.cover_url;
  const headline = skill.tagline?.trim() || skill.name;
  const showByline = Boolean(skill.tagline?.trim()) && skill.tagline?.trim() !== skill.name;

  return (
    <div
      style={{ ["--tilt" as string]: tilt }}
      className={cn("group relative shrink-0 ink-frame slap wobble", widthClass)}
    >
      <Link
        href={`/skill/${skill.slug}`}
        aria-label={`Open ${skill.name}`}
        className="block"
      >
        <div className={cn("relative w-full overflow-hidden grain", visualHeight)}>
          {visual ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={visual}
              alt={skill.tagline ?? skill.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <DiptychTextFallback before={skill.before_text} after={skill.after_text} />
          )}

          <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 z-10">
            <span className="bubble text-[10px]">
              {categoryLabel(skill.category)}
            </span>
            <div className="flex flex-col items-end gap-1">
              {isNew && (
                <span
                  className="stamp"
                  style={{ borderColor: "var(--color-grape)", color: "var(--color-grape)" }}
                >
                  NEW
                </span>
              )}
              {isHot && <span className="stamp">HOT</span>}
            </div>
          </div>
        </div>

        <div className="px-3 py-2 border-t-[3px] border-[var(--color-ink)] bg-[var(--color-paper)]">
          <div className="display text-base leading-tight line-clamp-2">
            {headline}
          </div>
          {showByline && (
            <div className="tag-font text-[var(--color-grape)] text-xs mt-0.5 truncate">
              {skill.name}
            </div>
          )}
        </div>
      </Link>

      {/* Install pill sits OUTSIDE the Link to keep its click from navigating. */}
      <div className="px-3 pt-2 pb-2 border-t-2 border-[var(--color-ink)] bg-[var(--color-paper)]">
        <InstallPill slug={skill.slug} skillId={skill.id} />
      </div>

      <Link
        href={`/skill/${skill.slug}`}
        aria-label={`Open ${skill.name} stats`}
        className="block px-3 py-1.5 border-t-2 border-[var(--color-ink)] bg-[var(--color-paper-2)] flex items-center justify-between text-xs type-font"
      >
        <span title="Votes">{"♥"} {compactNumber(skill.vote_count)}</span>
        <span title="People using">@ {compactNumber(skill.use_count)}</span>
        <span title="GitHub stars">{"★"} {compactNumber(skill.github_stars)}</span>
      </Link>
    </div>
  );
}

function DiptychTextFallback({
  before,
  after,
}: {
  before?: string | null;
  after?: string | null;
}) {
  // Last-resort fallback: no diptych_url, no cover_url, but we have AI text.
  // Renders a tiny before/after panel so the card still says something.
  if (!before && !after) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[var(--color-mauve)]">
        <span className="display text-4xl text-[var(--color-paper)]">?!</span>
      </div>
    );
  }
  return (
    <div className="w-full h-full grid grid-cols-2 bg-[var(--color-mauve)]">
      <div className="p-2 border-r-2 border-[var(--color-ink)] flex items-center text-[10px] type-font text-[var(--color-paper)]">
        {before ?? ""}
      </div>
      <div className="p-2 flex items-center text-[10px] type-font text-[var(--color-paper)]">
        {after ?? ""}
      </div>
    </div>
  );
}
