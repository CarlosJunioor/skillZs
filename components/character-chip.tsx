import { MotionLink } from "@/components/motion/motion-link";

interface Props {
  slug: string;
  name: string;
  avatarUrl?: string | null;
}

/**
 * Compact chip rendered in place of the SkillCard byline when a skill has a
 * character_id. Falls back to a mauve circle when no avatar has been generated
 * yet (avatar_status='pending'). Layout is byline-sized — no extra row.
 */
export function CharacterChip({ slug, name, avatarUrl }: Props) {
  return (
    <MotionLink
      href={`/character/${slug}`}
      aria-label={`See more from ${name}`}
      className="character-chip flex items-center gap-1.5 tag-font text-[var(--color-grape)] text-xs mt-0.5 truncate hover:underline"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          loading="lazy"
          className="w-5 h-5 rounded-full border border-[var(--color-ink)] object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="w-5 h-5 rounded-full border border-[var(--color-ink)] bg-[var(--color-mauve)]"
        />
      )}
      <span className="truncate">{name}</span>
    </MotionLink>
  );
}
