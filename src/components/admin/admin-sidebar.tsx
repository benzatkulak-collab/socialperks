"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV, ADMIN_NAV_GROUPS } from "./nav-config";

export function AdminSidebar() {
  const pathname = usePathname() ?? "";

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-brand-border bg-brand-surface/30 min-h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-brand-border">
        <Link href="/admin" className="flex items-center gap-2 group">
          <span className="w-7 h-7 rounded-md bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan font-mono text-xs font-bold">
            SP
          </span>
          <div className="flex flex-col">
            <span className="font-heading text-sm text-brand-white italic">
              Admin Console
            </span>
            <span className="text-2xs text-brand-muted font-mono uppercase tracking-wider">
              Social Perks
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group} className="mb-4">
            <p className="px-3 py-1.5 text-2xs uppercase tracking-wider font-mono text-brand-muted">
              {group}
            </p>
            <div className="space-y-0.5">
              {ADMIN_NAV.filter((item) => item.group === group).map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      active
                        ? "bg-brand-cyan/10 text-brand-cyan border-l-2 border-brand-cyan -ml-px"
                        : "text-brand-dim hover:text-brand-text hover:bg-brand-surface/50"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center font-mono text-2xs shrink-0 ${
                        active ? "bg-brand-cyan/20" : "bg-brand-surface/50"
                      }`}
                    >
                      {item.glyph}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-brand-border">
        <p className="text-2xs text-brand-muted font-mono">
          v1.0 &middot; build {process.env.NEXT_PUBLIC_BUILD_ID?.slice(0, 7) ?? "dev"}
        </p>
      </div>
    </aside>
  );
}
