import { createHash } from "node:crypto";

/**
 * Content fingerprint for an ingested SKILL.md body. The diptych pipeline keeps
 * the prior hash on the row so it can short-circuit regeneration when upstream
 * content has not changed.
 *
 * The body alone is enough: name/description live in frontmatter, so a
 * material change to either bumps the matter-stripped body.
 */
export function contentHash(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}
