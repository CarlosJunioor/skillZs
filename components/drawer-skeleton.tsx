import { Loader } from "@/components/motion/loader";

/**
 * Suspense fallback for BuildingDrawer. Same outer footprint so the slot
 * doesn't shift when data arrives.
 */
export function DrawerSkeleton() {
  return (
    <aside
      aria-busy
      className="fixed inset-x-0 bottom-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[420px] z-40 bg-[var(--color-paper)] border-t-[3px] lg:border-l-[3px] lg:border-t-0 border-[var(--color-ink)] p-6"
    >
      <div className="ink-frame mb-4 flex aspect-square items-center justify-center bg-[var(--color-mauve)]">
        <Loader label="Loading character" className="text-[var(--color-grape)]" />
      </div>
      <div className="mb-3 h-10 bg-[var(--color-paper-2)]" />
      <div className="mb-2 h-4 bg-[var(--color-paper-2)]" />
      <div className="h-4 w-3/4 bg-[var(--color-paper-2)]" />
    </aside>
  );
}
