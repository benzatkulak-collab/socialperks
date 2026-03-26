"use client";

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
