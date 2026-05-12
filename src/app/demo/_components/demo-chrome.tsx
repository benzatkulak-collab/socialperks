import Link from "next/link";
import { DEMO_BUSINESS, DEMO_NAV_TABS } from "@/lib/demo/data";

export function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 border-b border-brand-cyan/30 bg-gradient-to-r from-brand-cyan/15 via-brand-purple/10 to-brand-cyan/15 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-cyan sm:text-sm">
          <span aria-hidden="true">🎬</span>
          <span>Demo Mode</span>
          <span className="hidden text-brand-dim sm:inline">
            — exploring with sample data
          </span>
        </div>
        <Link
          href="/auth"
          className="rounded-lg bg-brand-cyan px-3 py-1.5 text-xs font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 sm:text-sm"
        >
          Start free trial →
        </Link>
      </div>
    </div>
  );
}

export function DemoNav({ activeTab }: { activeTab: string }) {
  return (
    <div className="border-b border-brand-border/60 bg-brand-surface/40 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-cyan/20 font-mono text-sm font-bold text-brand-cyan">
              {DEMO_BUSINESS.logoInitials}
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-brand-white">
                {DEMO_BUSINESS.name}
              </div>
              <div className="text-xs text-brand-muted">
                {DEMO_BUSINESS.industry} · {DEMO_BUSINESS.location}
              </div>
            </div>
          </div>
          <div className="hidden text-xs text-brand-muted sm:block">
            Plan: <span className="text-brand-text">Growth</span> · Member since
            Sep 2025
          </div>
        </div>
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Demo navigation">
          {DEMO_NAV_TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-brand-cyan text-brand-cyan"
                    : "border-transparent text-brand-dim hover:border-brand-border hover:text-brand-text"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function DemoFloatingCta() {
  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-sm">
      <Link
        href="/auth"
        className="group flex items-center gap-3 rounded-2xl border border-brand-cyan/40 bg-brand-surface/95 px-5 py-3.5 shadow-xl shadow-brand-cyan/20 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-brand-cyan hover:shadow-brand-cyan/40"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-cyan text-base text-brand-bg">
          ✨
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-brand-white">
            Like what you see?
          </div>
          <div className="text-xs text-brand-cyan">
            Start your free trial →
          </div>
        </div>
      </Link>
    </div>
  );
}

export function DemoShell({
  activeTab,
  children,
}: {
  activeTab: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <DemoBanner />
      <DemoNav activeTab={activeTab} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
      <DemoFloatingCta />
    </div>
  );
}
