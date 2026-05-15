// components/drawer-skeleton.tsx
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
      <div className="ink-frame aspect-square bg-[var(--color-mauve)] mb-4 animate-pulse" />
      <div className="h-10 bg-[var(--color-paper-2)] mb-3 animate-pulse" />
      <div className="h-4 bg-[var(--color-paper-2)] mb-2 animate-pulse" />
      <div className="h-4 bg-[var(--color-paper-2)] w-3/4 animate-pulse" />
    </aside>
  );
}
