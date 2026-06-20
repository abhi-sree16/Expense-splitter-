export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const CATEGORIES = [
  "accommodation",
  "activities",
  "food",
  "transport",
  "shopping",
  "utilities",
  "entertainment",
  "health",
  "home",
  "general",
  "other",
] as const;

export const SPLIT_TYPES = ["equal", "percentage", "exact"] as const;
