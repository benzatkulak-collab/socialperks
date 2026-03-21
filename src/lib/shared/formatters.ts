export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n < 0) return "-" + formatNumber(-n);
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
}
export function formatCurrency(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  return (n < 0 ? "-$" : "$") + formatNumber(Math.abs(n));
}
/** Like formatCurrency but preserves two decimal places for values under 1K (useful for earnings). */
export function formatCurrencyPrecise(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n < 0 ? "-$" : "$") + (abs / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return (n < 0 ? "-$" : "$") + (abs / 1e3).toFixed(1) + "K";
  return (n < 0 ? "-$" : "$") + abs.toFixed(2);
}
export function formatPerk(value: number, type: "pct" | "dol"): string {
  if (!Number.isFinite(value)) return type === "pct" ? "0%" : "$0";
  return type === "pct" ? value + "%" : "$" + value;
}
export function formatDate(d: string | Date): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export function formatRelativeTime(d: string | Date): string {
  const now = Date.now();
  const then = new Date(d).getTime();
  if (isNaN(then)) return "Unknown";
  const diff = now - then;
  if (diff < 0) return "just now";
  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff/60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff/3600000) + "h ago";
  return Math.floor(diff/86400000) + "d ago";
}
export function formatFollowerCount(n: number): string { return formatNumber(n); }
export function formatEngagementRate(r: number): string {
  if (!Number.isFinite(r)) return "0.0%";
  return r.toFixed(1) + "%";
}
export function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
}
export function slugify(text: string): string {
  if (!text) return "";
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export function pluralize(word: string, count: number): string { return count === 1 ? word : word + "s"; }
