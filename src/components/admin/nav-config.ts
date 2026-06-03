/**
 * Admin navigation registry.
 *
 * Single source of truth for the sidebar layout AND for breadcrumbs.
 * Add a new admin page → add it here.
 */

export interface AdminNavItem {
  href: string;
  label: string;
  group: string;
  // Optional short symbol shown in collapsed sidebar / mobile (no emoji deps).
  glyph?: string;
}

export const ADMIN_NAV: AdminNavItem[] = [
  // Overview
  { href: "/admin", label: "Home", group: "Overview", glyph: "H" },
  { href: "/admin/agents", label: "Agents", group: "Overview", glyph: "A" },

  // Accounts
  { href: "/admin/users", label: "Users", group: "Accounts", glyph: "U" },
  { href: "/admin/businesses", label: "Businesses", group: "Accounts", glyph: "B" },
  { href: "/admin/influencers", label: "Influencers", group: "Accounts", glyph: "I" },

  // Operations
  { href: "/admin/campaigns", label: "Campaigns", group: "Operations", glyph: "C" },
  { href: "/admin/submissions", label: "Submissions", group: "Operations", glyph: "S" },
  { href: "/admin/programs", label: "Programs", group: "Operations", glyph: "P" },

  // Money
  { href: "/admin/billing", label: "Billing", group: "Money", glyph: "$" },
  { href: "/admin/referrals", label: "Referrals", group: "Money", glyph: "R" },

  // Trust & Safety
  { href: "/admin/fraud", label: "Fraud", group: "Trust & Safety", glyph: "!" },
  { href: "/admin/compliance", label: "Compliance", group: "Trust & Safety", glyph: "C" },
  { href: "/admin/audit", label: "Audit Log", group: "Trust & Safety", glyph: "L" },

  // Platform
  { href: "/admin/system", label: "System", group: "Platform", glyph: "S" },
  { href: "/admin/api-keys", label: "API Keys", group: "Platform", glyph: "K" },
  { href: "/admin/feature-flags", label: "Feature Flags", group: "Platform", glyph: "F" },
  { href: "/admin/settings", label: "Settings", group: "Platform", glyph: "G" },
];

export const ADMIN_NAV_GROUPS: string[] = Array.from(
  new Set(ADMIN_NAV.map((item) => item.group))
);

export function findNavItem(pathname: string): AdminNavItem | undefined {
  // Exact match wins, then longest-prefix match (for nested routes).
  const exact = ADMIN_NAV.find((n) => n.href === pathname);
  if (exact) return exact;
  return ADMIN_NAV
    .filter((n) => pathname.startsWith(n.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
