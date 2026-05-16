import { fetchActivityForCharacter } from "@/lib/stats";
import { formatTimeAgo } from "@/lib/format";

interface Props {
  characterId: string;
}

/**
 * Server component. Reads last-7-days / max-5 GH activity rows for a
 * character. Renders an ordered list of outbound links, or an empty-state
 * "quiet week." paragraph.
 */
export async function CharacterActivity({ characterId }: Props) {
  const rows = await fetchActivityForCharacter(characterId);

  if (rows.length === 0) {
    return (
      <section className="mt-8" aria-labelledby="this-week-heading">
        <h2 id="this-week-heading" className="display text-2xl mb-3">this week</h2>
        <p className="tag-font text-base text-[var(--color-ink)]/60">quiet week.</p>
      </section>
    );
  }

  return (
    <section className="mt-8" aria-labelledby="this-week-heading">
      <h2 id="this-week-heading" className="display text-2xl mb-3">this week</h2>
      <ol className="space-y-2 type-font text-base">
        {rows.map((r) => (
          <li key={r.id} className="leading-relaxed">
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--color-grape)]"
            >
              ↗ {r.title}{" "}
              <span className="text-[var(--color-ink)]/60">
                · {formatTimeAgo(new Date(r.occurred_at))}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
