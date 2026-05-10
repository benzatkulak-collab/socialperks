"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface ChecklistItem {
  id: string;
  title: string;
  why: string;
  fix: string;
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: "nap",
    title: "NAP consistency (Name, Address, Phone)",
    why: "Mismatched info across the web kills your local rankings.",
    fix: "Verify your business name, address, and phone match exactly across Google, Yelp, Facebook, your website, and any directories.",
  },
  {
    id: "category",
    title: "Primary category set correctly",
    why: "Your primary category is the #1 ranking factor for local pack results.",
    fix: "Pick the most specific category that fits (e.g. 'Italian restaurant' beats just 'Restaurant'). Add up to 9 secondary categories.",
  },
  {
    id: "hours",
    title: "Hours are accurate, including holidays",
    why: "Wrong hours = upset customers and a 'Suggest an edit' from a stranger.",
    fix: "Double-check regular hours, set special holiday hours in advance, and update for seasonal changes.",
  },
  {
    id: "photos",
    title: "Photos uploaded (at least 10 high-quality)",
    why: "Profiles with 100+ photos get 520% more calls and 2,717% more direction requests.",
    fix: "Upload exterior, interior, team, products, and food/service shots. Add new photos monthly.",
  },
  {
    id: "logo-cover",
    title: "Logo and cover photo set",
    why: "These are the first thing customers see in search results.",
    fix: "Upload a square logo (250×250px+) and a wide cover photo (1080×608px+). Both should look great at small sizes.",
  },
  {
    id: "description",
    title: "Business description filled out (750 chars)",
    why: "Your description appears in 'About' and contributes to keyword relevance.",
    fix: "Write a 600–750 character description that includes your main service, location, and what makes you different. No URLs or HTML.",
  },
  {
    id: "services",
    title: "Services or products listed with prices",
    why: "Customers want to know what you offer and what it costs before they call.",
    fix: "Add at least 5 services or products with descriptions. Include prices where possible.",
  },
  {
    id: "posts",
    title: "Posting weekly Google Posts",
    why: "Posts boost engagement and signal to Google that you're active.",
    fix: "Publish a Post every 7 days — events, offers, news, or product highlights. Posts older than 7 days stop showing prominently.",
  },
  {
    id: "qa",
    title: "Q&A populated with common questions",
    why: "Anyone can answer questions on your profile — including your competitors.",
    fix: "Pre-populate 5–10 common questions yourself with thorough answers. Get email alerts for new questions.",
  },
  {
    id: "reviews-volume",
    title: "Review volume (50+ reviews)",
    why: "More reviews = higher trust + higher rankings. 50+ is the threshold most customers expect.",
    fix: "Ask every happy customer for a review. Use a short link (g.page/r/...) to make it one-click.",
  },
  {
    id: "reviews-response",
    title: "Responding to all reviews (positive AND negative)",
    why: "Response rate is a known local ranking factor and shows you care.",
    fix: "Respond to every review within 48 hours. Thank positives, acknowledge and offer to fix negatives offline.",
  },
  {
    id: "messaging",
    title: "Messaging enabled and monitored",
    why: "Messaging makes it easy for customers to reach you without calling.",
    fix: "Turn on messaging in Google Business Profile, set an auto-welcome message, and respond within 24 hours (Google demotes slow responders).",
  },
];

const STORAGE_PREFIX = "sp:gbp-checker:";

export function GoogleBusinessChecker() {
  const [businessName, setBusinessName] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const name = localStorage.getItem(`${STORAGE_PREFIX}name`) || "";
      const c = localStorage.getItem(`${STORAGE_PREFIX}city`) || "";
      const raw = localStorage.getItem(`${STORAGE_PREFIX}checked`);
      setBusinessName(name);
      setCity(c);
      if (raw) {
        try {
          setChecked(JSON.parse(raw));
        } catch {
          // ignore parse errors
        }
      }
    } catch {
      // ignore storage errors (e.g. private mode)
    }
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(`${STORAGE_PREFIX}name`, businessName);
      localStorage.setItem(`${STORAGE_PREFIX}city`, city);
      localStorage.setItem(`${STORAGE_PREFIX}checked`, JSON.stringify(checked));
    } catch {
      // ignore
    }
  }, [businessName, city, checked, hydrated]);

  const completedCount = useMemo(
    () => CHECKLIST.filter((c) => checked[c.id]).length,
    [checked],
  );
  const pct = Math.round((completedCount / CHECKLIST.length) * 100);

  const toggle = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const reset = () => {
    if (confirm("Reset all checks?")) {
      setChecked({});
    }
  };

  return (
    <section className="pb-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Identity */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                Business name
              </span>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Sunrise Coffee"
                className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-3 text-base text-brand-white placeholder-brand-muted focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                City
              </span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Austin, TX"
                className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-3 text-base text-brand-white placeholder-brand-muted focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              />
            </label>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-6 rounded-2xl border border-brand-border bg-brand-surface/50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                Audit progress
              </div>
              <div className="mt-1 font-heading text-2xl italic text-brand-white">
                {businessName ? `${businessName} · ` : ""}
                {completedCount} / {CHECKLIST.length} complete
              </div>
            </div>
            <button
              onClick={reset}
              className="whitespace-nowrap rounded-lg border border-brand-border bg-brand-bg px-3 py-1.5 text-xs text-brand-muted transition-colors hover:border-brand-subtle hover:text-brand-text"
            >
              Reset
            </button>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-brand-bg">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-green transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 text-right font-mono text-xs text-brand-muted">
            {pct}%
          </div>
        </div>

        {/* Checklist */}
        <div className="mt-6 space-y-3">
          {CHECKLIST.map((item, i) => {
            const isDone = !!checked[item.id];
            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-5 transition-all ${
                  isDone
                    ? "border-brand-green/30 bg-brand-green/5"
                    : "border-brand-border bg-brand-surface/40"
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggle(item.id)}
                    aria-label={
                      isDone ? `Mark ${item.title} incomplete` : `Mark ${item.title} complete`
                    }
                    className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 transition-all ${
                      isDone
                        ? "border-brand-green bg-brand-green text-brand-bg"
                        : "border-brand-subtle hover:border-brand-cyan"
                    }`}
                  >
                    {isDone ? (
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 8.5L6.5 12L13 4.5"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-brand-muted">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3
                        className={`font-heading text-lg italic ${
                          isDone ? "text-brand-dim line-through" : "text-brand-white"
                        }`}
                      >
                        {item.title}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm text-brand-dim">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand-amber">
                        Why
                      </span>{" "}
                      · {item.why}
                    </p>
                    <p className="mt-1.5 text-sm text-brand-dim">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand-cyan">
                        Fix
                      </span>{" "}
                      · {item.fix}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 via-brand-surface/50 to-brand-green/5 p-8 text-center sm:p-10">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Get more reviews automatically with Social Perks
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-dim sm:text-base">
            The biggest lever on this checklist is review volume. Social Perks
            handles review collection for you — compliantly, automatically, on
            every visit.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/ai"
              className="w-full rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20 sm:w-auto"
            >
              Start collecting reviews →
            </Link>
            <Link
              href="/pricing"
              className="w-full rounded-xl border border-brand-border bg-brand-surface/50 px-7 py-3 text-sm font-medium text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-surface sm:w-auto"
            >
              See pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
