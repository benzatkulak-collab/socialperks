"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const MESSAGES: { name: string; text: string }[] = [
  { name: "Sarah K.", text: "Sarah at a coffee shop in Austin just signed up" },
  { name: "Mike P.", text: "Mike's Pizza in Denver just launched a campaign" },
  { name: "Bloom Salon", text: "Bloom Salon earned 12 new Google reviews this week" },
  { name: "Yoga Studio", text: "A yoga studio in Portland just hit 100 perk redemptions" },
  { name: "Jenna R.", text: "Jenna's Bakery in Nashville just signed up" },
  { name: "Carlos M.", text: "Carlos at Taco Truck SF launched a referral campaign" },
  { name: "Iron Gym", text: "Iron Gym in Brooklyn earned 8 new Instagram tags" },
  { name: "Sol Cafe", text: "Sol Cafe in Miami just hit 50 perk redemptions" },
  { name: "Priya S.", text: "Priya, an influencer in LA, joined the marketplace" },
  { name: "Glow Spa", text: "Glow Spa in Seattle launched a TikTok campaign" },
  { name: "Marcus T.", text: "Marcus, a creator in Atlanta, accepted his first perk" },
  { name: "Ink Tattoo", text: "Ink Tattoo Studio in Chicago just signed up" },
  { name: "Vet Clinic", text: "A vet clinic in Boulder earned 5 new Yelp reviews today" },
  { name: "Smith & Co.", text: "Smith & Co. Coffee in Charleston just launched a perk" },
  { name: "Spark Fitness", text: "Spark Fitness in Phoenix hit 200 referrals this month" },
  { name: "Bloom Florist", text: "Bloom Florist in Boston just signed up" },
  { name: "Style Wendy", text: "Wendy, a style creator in NYC, earned $400 this week" },
  { name: "Baked Goods", text: "A bakery in San Diego launched a review campaign" },
  { name: "Wellness Co.", text: "Wellness Co. in Austin earned 30 new Instagram followers" },
  { name: "Photo Jay", text: "Jay, a photographer in Dallas, joined the marketplace" },
  { name: "Pet Groomers", text: "A pet grooming shop in Portland just signed up" },
  { name: "Brew Pub", text: "Brew Pub in Minneapolis launched a check-in campaign" },
  { name: "Nail Bar", text: "A nail bar in Houston earned 15 new tagged posts" },
  { name: "Book Shop", text: "An indie bookshop in Asheville just hit 75 redemptions" },
  { name: "Juice Bar", text: "Juice Bar in Tampa launched their first perk program" },
  { name: "Yoga Loft", text: "Yoga Loft in Berkeley earned 22 new reviews this week" },
  { name: "Pizza Place", text: "A pizza shop in Brooklyn just signed up for Growth plan" },
  { name: "Hair Studio", text: "Hair Studio in Nashville earned 18 new Google reviews" },
  { name: "Craft Beer", text: "A craft brewery in Vermont launched a referral perk" },
  { name: "Sushi Spot", text: "Sushi Spot in Honolulu hit 60 perk redemptions this month" },
];

const HIDE_PATHS = ["/dashboard", "/admin", "/auth"];
const INITIAL_DELAY_MS = 15_000;
const SHOW_DURATION_MS = 5_000;
const GAP_MS = 30_000;
const MAX_DISPLAYS = 3;

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function SocialProofPopup() {
  const [current, setCurrent] = useState<{ name: string; text: string } | null>(null);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const usedIndicesRef = useRef<Set<number>>(new Set());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const hide = HIDE_PATHS.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (hide) return;

    const initialCount = parseInt(sessionStorage.getItem("sp-popup-count") || "0", 10);
    if (initialCount >= MAX_DISPLAYS) return;

    const pickMessage = () => {
      const available = MESSAGES.map((_, i) => i).filter(
        (i) => !usedIndicesRef.current.has(i)
      );
      if (available.length === 0) return null;
      const idx = available[Math.floor(Math.random() * available.length)];
      usedIndicesRef.current.add(idx);
      return MESSAGES[idx];
    };

    const showNext = () => {
      const count = parseInt(sessionStorage.getItem("sp-popup-count") || "0", 10);
      if (count >= MAX_DISPLAYS) return;

      const msg = pickMessage();
      if (!msg) return;

      setCurrent(msg);
      setVisible(true);
      sessionStorage.setItem("sp-popup-count", String(count + 1));

      const hideTimer = setTimeout(() => {
        setVisible(false);
        const nextTimer = setTimeout(() => {
          setCurrent(null);
          const newCount = parseInt(sessionStorage.getItem("sp-popup-count") || "0", 10);
          if (newCount < MAX_DISPLAYS) {
            const gapTimer = setTimeout(showNext, GAP_MS);
            timersRef.current.push(gapTimer);
          }
        }, 400); // allow fade out
        timersRef.current.push(nextTimer);
      }, SHOW_DURATION_MS);
      timersRef.current.push(hideTimer);
    };

    const initialTimer = setTimeout(showNext, INITIAL_DELAY_MS);
    timersRef.current.push(initialTimer);

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, [hide]);

  if (hide || !current) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 z-30 w-[320px] max-w-[calc(100vw-2rem)] transition-all duration-300 ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-lg bg-gray-900 border border-gray-800 shadow-xl p-3 flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-400/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 text-xs font-medium">
          {initials(current.name)}
        </div>
        <p className="flex-1 text-sm text-gray-200 leading-snug pt-0.5">{current.text}</p>
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="flex-shrink-0 text-gray-500 hover:text-gray-300 p-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
