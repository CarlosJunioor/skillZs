import { MotionLink } from "@/components/motion/motion-link";
import { Mascot } from "@/components/mascot";

export default function NotFound() {
  return (
    <div className="pt-16 pb-20 grid md:grid-cols-[1fr_1fr] gap-10 items-center">
      <div className="order-2 md:order-1">
        <div className="display text-[8rem] md:text-[12rem] leading-none text-[var(--color-grape)]">
          404
        </div>
        <p className="tag-font text-3xl text-[var(--color-ink)] -mt-4 mb-2 rotate-[-2deg]">
          skill went missing
        </p>
        <p className="type-font text-[var(--color-rust)] mb-6 max-w-sm">
          mascot says it never existed. could be a slug typo. could be the catalog hasn&apos;t scraped it yet.
        </p>
        <MotionLink
          href="/"
          className="tag-pill text-lg px-6 py-3 inline-block"
          style={{ background: "var(--color-grape)", color: "var(--color-paper)" }}
        >
          ← head back
        </MotionLink>
      </div>
      <div className="order-1 md:order-2 flex justify-center">
        <Mascot height={420} tilt={3} className="drop-shadow-[8px_8px_0_#1A1A1A]" />
      </div>
    </div>
  );
}
