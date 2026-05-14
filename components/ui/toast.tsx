"use client";

/**
 * Tiny imperative toast for transient "Copied!" feedback. Intentionally not a
 * React component tree — call `showToast(msg)` from anywhere on the client and
 * a bone-cream pill slides in at the bottom-right for 2 seconds.
 *
 * No deps, no portals, no provider. Inline styles + one mount node, ARIA-live
 * for screen readers.
 */

const MOUNT_ID = "skillzs-toast-root";
const TOAST_TTL_MS = 2_000;

function ensureMount(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let mount = document.getElementById(MOUNT_ID);
  if (mount) return mount;

  mount = document.createElement("div");
  mount.id = MOUNT_ID;
  mount.setAttribute("role", "status");
  mount.setAttribute("aria-live", "polite");
  mount.style.cssText = [
    "position:fixed",
    "right:1.25rem",
    "bottom:1.25rem",
    "z-index:9999",
    "display:flex",
    "flex-direction:column",
    "gap:0.5rem",
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(mount);
  return mount;
}

export function showToast(message: string): void {
  const mount = ensureMount();
  if (!mount) return;

  const node = document.createElement("div");
  node.textContent = message;
  node.className = "tag-pill";
  node.style.cssText = [
    "background:var(--color-ink)",
    "color:var(--color-paper)",
    "padding:0.6rem 1rem",
    "font-size:0.875rem",
    "box-shadow:3px 3px 0 var(--shadow-color)",
    "border:2.5px solid var(--color-ink)",
    "opacity:0",
    "transform:translateY(8px)",
    "transition:opacity 140ms ease-out, transform 140ms ease-out",
  ].join(";");
  mount.appendChild(node);

  requestAnimationFrame(() => {
    node.style.opacity = "1";
    node.style.transform = "translateY(0)";
  });

  window.setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(8px)";
    window.setTimeout(() => node.remove(), 200);
  }, TOAST_TTL_MS);
}
