"use client";

import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

interface Capability {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const CAPABILITIES: Capability[] = [
  {
    title: "Knows your brand",
    description:
      "Reads your Instagram bio, past posts, and reviews to match your voice.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M4 21a8 8 0 0 1 16 0"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Picks the right perks",
    description:
      "Looks at your margin and suggests offers that won't break the bank.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path
          d="M20 12V8a2 2 0 0 0-2-2h-3l-3-3-3 3H6a2 2 0 0 0-2 2v4M4 12h16M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Filters spam automatically",
    description:
      "Catches fake submissions and bot-driven content before they get a perk.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path
          d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="m9 12 2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Times campaigns to events",
    description:
      "Knows when local events, holidays, and weekends are coming.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <rect
          x="3"
          y="5"
          width="18"
          height="16"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M3 10h18M8 3v4M16 3v4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Writes the copy",
    description:
      "Generates Instagram captions, email blasts, and review prompts.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path
          d="M4 5h16M4 12h10M4 19h16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="m17 14 3 3-5 5h-3v-3l5-5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Reports what worked",
    description:
      "Weekly digest in plain English, not a dashboard you have to learn.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path
          d="M4 19V5M4 19h16M8 16v-6M12 16V8M16 16v-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function AiCapabilities() {
  return (
    <section
      className="relative bg-brand-bg py-20 sm:py-28 lg:py-32"
      aria-labelledby="ai-capabilities-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll animation="fade-up" className="mb-14 text-center sm:mb-16">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Capabilities
          </p>
          <h2
            id="ai-capabilities-heading"
            className="font-heading text-[clamp(1.75rem,3vw,3rem)] italic text-brand-white leading-tight"
          >
            Meet your AI marketing manager
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-brand-dim leading-relaxed sm:text-lg">
            Six things it does without asking. So you can stop juggling
            tabs and get back to running your business.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll
          animation="fade-up"
          stagger
          staggerDelay={80}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 lg:gap-6"
        >
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.title}
              className="group rounded-xl border border-brand-border/40 bg-brand-surface/30 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-cyan/40 hover:bg-brand-surface/50 hover:shadow-lg hover:shadow-brand-cyan/5"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-cyan/10 text-brand-cyan transition-colors group-hover:bg-brand-cyan/15">
                {cap.icon}
              </div>
              <h3 className="mb-2 font-body text-base font-semibold text-brand-white sm:text-lg">
                {cap.title}
              </h3>
              <p className="text-sm leading-relaxed text-brand-dim">
                {cap.description}
              </p>
            </div>
          ))}
        </AnimateOnScroll>
      </div>
    </section>
  );
}
