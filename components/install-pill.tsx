"use client";

import { useState } from "react";
import { showToast } from "./ui/toast";

interface Props {
  slug: string;
  /** Hide if you only want the visual contract (no copy interaction). */
  disabled?: boolean;
  /** Optional skillId for use-counter ping. Omit to skip telemetry. */
  skillId?: string;
}

/**
 * Click-to-copy install pill. The card it lives in is wrapped in <Link>, so we
 * call stopPropagation+preventDefault to keep the click from triggering page
 * navigation. The actual install happens in the user's terminal after they
 * paste the string and the `skillzs` CLI does runtime detection.
 */
export function InstallPill({ slug, disabled, skillId }: Props) {
  const cmd = `npx github:CarlosJunioor/skillzs-cli install ${slug}`;
  const [copied, setCopied] = useState(false);

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;

    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      showToast("Copied! Paste in your terminal.");
      window.setTimeout(() => setCopied(false), 1_400);
    } catch {
      showToast("Couldn't copy. Long-press to copy manually.");
      return;
    }

    if (skillId) {
      // Best-effort use-counter ping. Silent on failure: the copy already
      // succeeded and that's what the user cares about.
      void fetch("/api/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      }).catch(() => undefined);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Copy install command: ${cmd}`}
      title={cmd}
      className="install-pill"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        width: "100%",
        padding: "0.35rem 0.55rem",
        fontFamily: "var(--font-body, monospace)",
        fontSize: "0.72rem",
        background: copied ? "var(--color-olive)" : "var(--color-ink)",
        color: copied ? "var(--color-ink)" : "var(--color-paper)",
        border: "2px solid var(--color-ink)",
        boxShadow: "2px 2px 0 var(--shadow-color)",
        cursor: disabled ? "not-allowed" : "copy",
        textAlign: "left",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <span aria-hidden style={{ flex: "0 0 auto" }}>{copied ? "✓" : "⎘"}</span>
      <code style={{ flex: "1 1 auto", overflow: "hidden", textOverflow: "ellipsis" }}>{cmd}</code>
    </button>
  );
}
