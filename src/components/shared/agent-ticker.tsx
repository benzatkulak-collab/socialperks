"use client";

import { useEffect, useState } from "react";

interface TickerItem {
  text: string;
}

const BASE_TICKER_ITEMS: TickerItem[] = [
  { text: "47 businesses active now" },
  { text: "128K actions this month" },
  { text: "New review campaign launched in Portland" },
  { text: "12 perks redeemed in the last hour" },
  { text: "Instagram mentions up 23% this week" },
  { text: "340 Google reviews generated today" },
  { text: "Referral campaign trending in Austin" },
  { text: "89 creators matched with brands today" },
  { text: "25 platforms connected" },
  { text: "Revenue driven: $2.1M and counting" },
];

export function AgentTicker() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Double the items so the animation loops seamlessly
  const items = [...BASE_TICKER_ITEMS, ...BASE_TICKER_ITEMS];

  if (!mounted) return null;

  return (
    <div
      className="relative overflow-hidden border-b border-brand-border/30 bg-brand-surface/30"
      role="region"
      aria-label="Live platform activity"
    >
      {/* Fade edges */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-brand-bg to-transparent sm:w-24"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-brand-bg to-transparent sm:w-24"
        aria-hidden="true"
      />

      {/* Scrolling content */}
      <div className="flex ticker-scroll items-center py-2.5">
        {items.map((item, i) => (
          <div
            key={`${item.text}-${i}`}
            className="flex shrink-0 items-center gap-2 px-6"
          >
            {/* Pulse dot */}
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-green" />
            </span>
            <span className="whitespace-nowrap font-mono text-xs text-brand-muted">
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
