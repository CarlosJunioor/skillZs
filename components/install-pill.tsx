"use client";

import { useState } from "react";
import { showToast } from "./ui/toast";

interface Props {
  /** Plugin name as registered in the Claude Code marketplace — typically the
   *  skill slug. Appears before the @ in the slash command. */
  pluginName: string;
  /** Marketplace identifier the plugin lives in — usually `<owner>/<repo>` on
   *  GitHub. Appears after the @ in the slash command. */
  marketplace: string;
  /** Hide if you only want the visual contract (no copy interaction). */
  disabled?: boolean;
  /** Optional skillId for use-counter ping. Omit to skip telemetry. */
  skillId?: string;
}

/**
 * Click-to-copy CTA for installing a Claude Code skill. Renders the canonical
 * `/plugin install <name>@<marketplace>` slash command — what the user types
 * into Claude Code itself, not into a shell. Stamp-style: bold "GET THIS SKILL"
 * headline above a monospace preview of the slash command, so the action and
 * the command are both legible at a glance. The card it lives in is wrapped in
 * <Link>, so we stop propagation + prevent default on click to keep the copy
 * from triggering page navigation.
 */
export function InstallPill({ pluginName, marketplace, disabled, skillId }: Props) {
  const cmd = `/plugin install ${pluginName}@${marketplace}`;
  const [copied, setCopied] = useState(false);

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;

    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      showToast("Copied! Paste into Claude Code.");
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
      data-copied={copied || undefined}
      className="install-pill group/install relative w-full text-left ink-frame block px-3 py-2 transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: copied ? "var(--color-olive)" : "var(--color-ink)",
        color: copied ? "var(--color-ink)" : "var(--color-paper)",
      }}
    >
      <span className="flex items-center justify-between gap-2 leading-none">
        <span className="display text-sm tracking-wide">
          {copied ? "COPIED ✓" : "GET THIS SKILL"}
        </span>
        <span
          aria-hidden
          className="tag-font text-[10px] uppercase opacity-70 group-hover/install:opacity-100"
        >
          {copied ? "in clipboard" : "↓ copy"}
        </span>
      </span>
      <code className="mt-1 block type-font text-[11px] leading-tight truncate opacity-80">
        {cmd}
      </code>
    </button>
  );
}
