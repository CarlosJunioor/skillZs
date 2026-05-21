export function compactNumber(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "") + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

export function categoryEmoji(category: string | null | undefined): string {
  switch (category) {
    case "coding": return "\u{1F6E0}\uFE0F";
    case "creative": return "\u{1F3A8}";
    case "agent": return "\u{1F916}";
    case "utils": return "\u26A1";
    case "research": return "\u{1F50D}";
    default: return "\u2728";
  }
}

export function categoryLabel(category: string | null | undefined): string {
  if (!category) return "Other";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function formatTimeAgo(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day <= 30) return `${day}d ago`;
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}
