// components/activity-skeleton.tsx
/**
 * Suspense fallback for <CharacterActivity/>. Same outer shape: heading bar +
 * 5 rows. No data deps; pure presentational.
 */
export function ActivitySkeleton() {
  return (
    <section aria-label="loading activity" className="mt-8">
      <div className="h-6 w-32 mb-4 bg-[var(--color-ink)]/10" />
      <ol className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-5 w-full max-w-md bg-[var(--color-ink)]/10" />
        ))}
      </ol>
    </section>
  );
}
