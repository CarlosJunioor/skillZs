// components/skill-contents.tsx
import type { SubSkill } from "@/lib/plugin-config";

interface Props {
  /** The plugin slug — used in copy ("inside <slug>"). */
  pluginSlug: string;
  subSkills: SubSkill[];
}

/**
 * "What's inside" panel for a plugin. Surfaces the bundled sub-skills with
 * their when-to-use descriptions so users can decide whether the plugin earns
 * a spot in their setup before they install it. Zine-styled to match the
 * surrounding comic-page composition on /skill/[slug].
 */
export function SkillContents({ pluginSlug, subSkills }: Props) {
  if (subSkills.length === 0) return null;

  return (
    <section className="mt-14">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
        <h2 className="display text-3xl">
          <span className="drip">what&apos;s inside</span>
        </h2>
        <span className="tag-font text-sm text-[var(--color-rust)] uppercase tracking-wide">
          {`${subSkills.length} skill${subSkills.length === 1 ? "" : "s"} ship with ${pluginSlug}`}
        </span>
      </div>

      <ul className="grid md:grid-cols-2 gap-4">
        {subSkills.map((s) => (
          <li
            key={s.name}
            className="ink-frame bg-[var(--color-paper)] p-4 md:p-5 grain"
          >
            <div className="flex items-baseline gap-2 mb-2">
              <code className="display text-lg leading-none text-[var(--color-ink)]">
                {s.name}
              </code>
            </div>
            <p className="type-font text-sm leading-relaxed text-[var(--color-ink)]/85">
              {s.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
