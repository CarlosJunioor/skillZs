import { CompactAnimatedNumber } from "@/components/compact-animated-number";
import { MotionLink } from "@/components/motion/motion-link";
import { inferCatalogTags } from "@/lib/catalog-tags";
import { catalogSkillPath, type CatalogSkill } from "@/lib/skills-sh";

export function SkillLeaderboard({
  skills,
  startRank = 1,
}: {
  skills: CatalogSkill[];
  startRank?: number;
}) {
  return (
    <ol className="ink-frame bg-[var(--color-paper)] divide-y divide-[#242b33]">
      {skills.map((skill, index) => {
        const tags = inferCatalogTags(skill);
        return (
        <li key={skill.id}>
          <MotionLink
            href={catalogSkillPath(skill)}
            className="group grid grid-cols-[3rem_minmax(0,1fr)_auto] md:grid-cols-[4rem_minmax(0,1fr)_12rem_8rem] items-center gap-3 px-3 md:px-5 py-4 border-l-2 border-transparent hover:border-[var(--color-grape)] hover:bg-[#0b151a] focus-visible:border-[var(--color-grape)] focus-visible:bg-[#0b151a] outline-none transition-colors"
          >
            <span className="type-font text-sm md:text-base text-[var(--color-grape)] tabular-nums">
              {startRank + index}
            </span>
            <span className="min-w-0">
              <span className="display text-lg md:text-xl block truncate group-hover:text-[var(--color-grape)]">
                {skill.name}
              </span>
              <span className="type-font text-xs text-[var(--color-rust)] block truncate md:hidden">
                {skill.source}
              </span>
              <span className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <span key={tag} className="stamp text-[9px]">{tag}</span>
                ))}
              </span>
            </span>
            <span className="type-font text-xs text-[var(--color-rust)] truncate hidden md:block">
              {skill.source}
            </span>
            <span className="text-right">
              <span className="display block text-lg"><CompactAnimatedNumber value={skill.installs} /></span>
              <span className="type-font text-[10px] text-[var(--color-rust)]">installs</span>
            </span>
          </MotionLink>
        </li>
        );
      })}
    </ol>
  );
}
