"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "sp_activity_ticker_dismissed";
const ROTATE_MS = 8000;

const ACTIVITIES: string[] = [
  "Sarah from Austin just signed up",
  "Coffee shop in Brooklyn earned 12 new reviews this week",
  "Yoga studio in LA just launched a campaign",
  "Bakery in Seattle got 47 Instagram tags in 24 hours",
  "Pet groomer in Denver hit 1,000 perks redeemed",
  "Tattoo studio in Portland matched with 8 creators",
  "Boutique in Nashville earned 22 Google reviews this week",
  "Cafe in Chicago saw a 34% spike in TikTok mentions",
  "Auto shop in Phoenix just enabled cashback",
  "Florist in San Diego launched a referral perk",
  "Gym in Miami connected to Instagram",
  "Nail salon in Boston approved 14 submissions today",
  "Pizza place in Detroit got 31 new Yelp reviews this month",
  "Bookstore in Minneapolis launched a Reels campaign",
  "Smoothie bar in Orlando rewarded 56 customers this week",
  "Bike shop in Boulder hit 200 active members",
  "Veterinarian in Atlanta just upgraded to Pro",
  "Spa in Scottsdale earned 19 Instagram tags today",
  "Pottery studio in Asheville matched with 5 creators",
  "Brewery in Milwaukee saw $4,200 in attributed revenue",
  "Hair salon in Dallas hit 500 perks distributed",
  "Food truck in Portland trended on TikTok",
  "Bookkeeper in Raleigh launched a review campaign",
  "Marcus from Houston just signed up",
  "Priya from Brooklyn just signed up",
];

function shouldHide(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard")
  );
}

export function ActivityTicker() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [index, setIndex] = useState(0);
  const [visibleNow, setVisibleNow] = useState(false);

  // Stable randomized order per session
  const order = useMemo(() => {
    const arr = [...ACTIVITIES];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  useEffect(() => {
    setMounted(true);
    try {
      const isDismissed = sessionStorage.getItem(STORAGE_KEY) === "1";
      setDismissed(isDismissed);
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted || dismissed) return;
    // Show first message after a short delay so it animates in
    const initial = setTimeout(() => setVisibleNow(true), 1500);
    return () => clearTimeout(initial);
  }, [mounted, dismissed]);

  useEffect(() => {
    if (!mounted || dismissed) return;
    const id = setInterval(() => {
      setVisibleNow(false);
      // Brief pause to let it slide out before the next one slides in
      setTimeout(() => {
        setIndex((i) => (i + 1) % order.length);
        setVisibleNow(true);
      }, 350);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [mounted, dismissed, order.length]);

  if (!mounted) return null;
  if (dismissed) return null;
  if (shouldHide(pathname)) return null;

  const message = order[index];

  function handleDismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* no-op */
    }
    setDismissed(true);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "fixed bottom-4 left-4 z-40 max-w-xs sm:max-w-sm",
        "transition-all duration-300 ease-out",
        visibleNow
          ? "translate-x-0 opacity-100"
          : "-translate-x-6 opacity-0",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 rounded-xl border border-brand-border/60 bg-brand-card/95 p-3 shadow-xl backdrop-blur-md">
        <span
          aria-hidden
          className="relative mt-1 inline-flex h-2 w-2 flex-shrink-0"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-wider text-brand-muted">
            Live activity
          </p>
          <p className="mt-1 text-sm leading-snug text-brand-text">
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss live activity notifications"
          className="-mr-1 -mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-brand-muted transition-colors hover:bg-brand-border/40 hover:text-brand-text"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M4.28 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.66-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.66 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.66 4.72a.75.75 0 0 1-1.06-1.06L8.94 10 4.28 5.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ActivityTicker;
