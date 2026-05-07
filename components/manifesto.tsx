import { Mascot } from "./mascot";

/**
 * Intro panel just under the hero. Mascot on the right, manifesto on the left.
 * Lives between hero and sort tabs to add identity / breathing room.
 */
export function Manifesto() {
  return (
    <section className="ink-frame mt-10 bg-[var(--color-paper)] grain relative overflow-hidden">
      <div className="grid md:grid-cols-[1.4fr_1fr] gap-0 md:gap-6 items-stretch">
        {/* Copy */}
        <div className="p-7 md:p-10 relative">
          <span className="bubble text-sm">manifesto ‼</span>

          <h2 className="display text-4xl md:text-6xl leading-[0.95] mt-5 mb-4">
            no more <span className="drip">github</span> spelunking.
          </h2>
          <p className="type-font text-base md:text-lg leading-relaxed max-w-lg mb-6">
            skillZs scrapes every public claude skill repo on the planet, tags em, slaps a cover on em, and ranks em by what real people actually use. you scroll, you vote, you steal good ideas. that&apos;s it.
          </p>

          <div className="flex flex-wrap gap-2 type-font text-sm">
            <span className="tag-pill">∅ no login</span>
            <span className="tag-pill">∅ no tracking</span>
            <span className="tag-pill">∅ no algorithm</span>
            <span className="tag-pill" style={{ background: "var(--color-grape)", color: "var(--color-paper)" }}>
              ✓ open source
            </span>
          </div>
        </div>

        {/* Mascot column */}
        <div className="relative bg-[var(--color-paper-2)] border-t-[3px] md:border-t-0 md:border-l-[3px] border-[var(--color-ink)] flex items-end justify-center min-h-[280px] overflow-hidden grain">
          {/* Speech bubble pointed at the mascot */}
          <div
            className="absolute top-6 left-6 md:left-10 z-10 bubble text-sm rotate-[-4deg]"
            style={{ background: "var(--color-paper)" }}
          >
            yo. dont lurk.
          </div>
          <Mascot height={360} tilt={-2} className="-mb-2 drop-shadow-[6px_6px_0_#1A1A1A]" />
        </div>
      </div>
    </section>
  );
}
