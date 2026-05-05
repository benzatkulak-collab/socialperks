"use client";

import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BusinessInfo {
  name: string;
  type: string;
  avatar: string;
}

interface SidebarProps {
  activePage: string;
  business: BusinessInfo;
  onNavigate: (page: string) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "campaigns", label: "Campaigns" },
  { id: "analytics", label: "Analytics" },
  { id: "qr", label: "QR Codes" },
  { id: "settings", label: "Settings" },
] as const;

// Dev-tooling section: separate links to actual routes (not in-portal pages).
const DEV_NAV_ITEMS = [
  {
    href: "/dashboard/webhooks",
    label: "Webhooks",
  },
] as const;

// ─── Component ──────────────────────────────────────────────────────────────

export function Sidebar({ activePage, business, onNavigate }: SidebarProps) {
  return (
    <aside className="flex flex-col h-full bg-brand-surface border-r border-brand-border w-56 shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-brand-border">
        <div className="font-heading italic text-lg text-brand-text">
          Social<span className="text-brand-cyan">Perks</span>
        </div>
        <div className="text-3xs text-brand-muted font-mono tracking-wider uppercase mt-0.5">
          Business Portal
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1 list-none">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-body font-medium transition-colors duration-150 cursor-pointer border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                    isActive
                      ? "bg-brand-cyan/10 text-brand-cyan"
                      : "bg-transparent text-brand-dim hover:text-brand-text hover:bg-brand-elevated"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Developer tools — links out to dedicated routes */}
        <div className="mt-6 pt-4 border-t border-brand-border">
          <div className="px-3 mb-2 text-3xs font-mono uppercase tracking-widest text-brand-muted">
            Developer
          </div>
          <ul className="space-y-1 list-none">
            {DEV_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-body font-medium transition-colors duration-150 bg-transparent text-brand-dim hover:text-brand-text hover:bg-brand-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className="shrink-0"
                  >
                    <path
                      d="M4 4l4 4-4 4M9 12h3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Business Info */}
      <div className="px-4 py-4 border-t border-brand-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-elevated border border-brand-border flex items-center justify-center text-sm shrink-0">
            {business.avatar}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-brand-text font-body truncate">
              {business.name}
            </div>
            <div className="text-3xs text-brand-muted font-body truncate">
              {business.type}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
