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
