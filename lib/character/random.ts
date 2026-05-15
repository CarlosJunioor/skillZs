// lib/character/random.ts
// Shared deterministic randomness helpers. Used by avatar and building prompt
// builders so renders stay stable across runs.

/** Deterministic stable hash from a slug. Non-negative 32-bit integer. */
export function slugHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

/** Pick an element from a pool deterministically per slug + salt. */
export function pick<T>(slug: string, salt: number, pool: readonly T[]): T {
  const idx = (slugHash(slug) + salt) % pool.length;
  return pool[idx];
}
