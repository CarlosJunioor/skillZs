import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { LoopLibrary } from "@/components/loop-library";
import { MotionLink } from "@/components/motion/motion-link";
import { agentLoops } from "@/lib/loops";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

const description = "Explore reusable AI agent loops with visual stages, stop conditions, copyable prompts, and terminal-style previews.";
const faqs = [
  {
    question: "What is an AI agent loop?",
    answer: "An agent loop repeats a defined cycle of observing, acting, and verifying until an explicit condition is met. The stop condition prevents a useful iterative process from becoming an endless one.",
  },
  {
    question: "How do you turn a loop into an agent skill?",
    answer: "Copy the loop's prompt, adapt its inputs and finish condition to one repeatable job, then package it in SKILL.md with a clear trigger description and outcome test.",
  },
];

export const metadata: Metadata = buildPageMetadata({
  title: "AI agent loop library",
  description,
  path: "/loops",
});

export default function LoopsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "AI agent loop library",
    description,
    url: absoluteUrl("/loops"),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: agentLoops.length,
      itemListElement: agentLoops.map((loop, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: loop.name,
        description: loop.summary,
      })),
    },
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div className="pt-8">
      <JsonLd data={[
        jsonLd,
        faq,
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "AI Agent Loop Library", path: "/loops" },
        ]),
      ]} />
      <header className="relative overflow-hidden border-b border-[#29313a] py-12 md:py-20">
        <div className="type-font mb-6 text-xs uppercase tracking-[0.18em] text-[var(--color-grape)]">
          ~/agent-patterns <span className="text-[var(--color-rust)]">/ 10 field-tested cycles</span>
        </div>
        <div className="relative z-10 max-w-5xl">
          <h1 className="display text-5xl leading-[0.88] sm:text-7xl md:text-8xl">
            work that<br />
            <span className="text-[var(--color-grape)]">knows when to stop.</span>
          </h1>
          <p className="type-font mt-8 max-w-2xl text-sm leading-6 text-[var(--color-ink-soft)] md:text-base">
            A loop is a contract: what repeats, what changes, and what ends the cycle. Preview the behavior, then copy the prompt into Claude Code, Codex, Cursor, or your agent of choice.
          </p>
        </div>

        <div className="type-font mt-10 flex max-w-3xl flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.12em] md:text-xs" aria-label="Example agent loop">
          <span className="border border-[#303944] bg-[#080a0c] px-3 py-2">observe</span>
          <span className="text-[var(--color-grape)]">→</span>
          <span className="border border-[#303944] bg-[#080a0c] px-3 py-2">act</span>
          <span className="text-[var(--color-grape)]">→</span>
          <span className="border border-[#303944] bg-[#080a0c] px-3 py-2">verify</span>
          <span className="text-[var(--color-grape)]">↺</span>
          <span className="ml-2 text-[var(--color-rust)]">until done ≠ forever</span>
        </div>

        <div className="pointer-events-none absolute -right-20 top-0 hidden size-80 rounded-full border border-[#1e3d47] opacity-40 md:block" aria-hidden>
          <div className="absolute inset-8 rounded-full border border-[#17313a]" />
          <div className="absolute inset-20 rounded-full border border-[#12262d]" />
        </div>
      </header>

      <section className="my-10 grid gap-5 md:grid-cols-2" aria-label="AI agent loops explained">
        <article className="ink-frame-soft bg-[var(--color-paper-2)] p-6">
          <h2 className="display text-2xl">{faqs[0].question}</h2>
          <p className="type-font mt-3 text-sm leading-6">{faqs[0].answer}</p>
        </article>
        <article className="ink-frame-soft bg-[var(--color-paper-2)] p-6">
          <h2 className="display text-2xl">{faqs[1].question}</h2>
          <p className="type-font mt-3 text-sm leading-6">
            {faqs[1].answer} The <MotionLink href="/guides/how-to-create-agent-skills">agent skill guide</MotionLink> covers the complete format and publishing process.
          </p>
        </article>
      </section>

      <LoopLibrary loops={agentLoops} />
    </div>
  );
}
