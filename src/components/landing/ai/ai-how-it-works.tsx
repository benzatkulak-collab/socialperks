"use client";

import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

interface Step {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "Connect",
    description:
      "Plug in your Instagram, Google Business, and TikTok in 60 seconds. Your AI reads your business profile, your past posts, your reviews.",
    accent: "border-brand-cyan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path
          d="M9 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1 1M15 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1-1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    number: "02",
    title: "AI launches campaigns",
    description:
      "Without you lifting a finger, it creates personalized perk offers, picks the right platforms, follows FTC rules, and A/B tests headlines.",
    accent: "border-brand-green",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path
          d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Watch results show up",
    description:
      "Customers post about you. The AI approves submissions, sends out perks, and emails you a weekly digest. You just answer the door.",
    accent: "border-brand-amber",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path
          d="M3 3v18h18M7 14l4-4 4 4 5-5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export function AiHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative bg-brand-bg py-20 sm:py-28 lg:py-32"
      aria-labelledby="ai-how-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll animation="fade-up" className="mb-14 text-center sm:mb-16 lg:mb-20">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            How it works
          </p>
          <h2
            id="ai-how-heading"
            className="font-heading text-[clamp(1.75rem,3vw,3rem)] italic text-brand-white leading-tight"
          >
            Three steps. Then it runs itself.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim leading-relaxed sm:text-lg">
            The setup takes longer to read about than it does to do.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll
          animation="fade-up"
          stagger
          staggerDelay={120}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
        >
          {STEPS.map((step) => (
            <div
              key={step.number}
              className={`group relative rounded-xl border-l-2 ${step.accent} border border-brand-border/40 bg-brand-surface/30 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-border/70 hover:bg-brand-surface/50 hover:shadow-lg hover:shadow-brand-bg/50 sm:p-7 lg:p-8`}
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="font-mono text-[11px] font-semibold text-brand-muted">
                  {step.number}
                </span>
                <div className="h-px flex-1 bg-brand-border/40" />
              </div>

              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-cyan/10 text-brand-cyan">
                {step.icon}
              </div>

              <h3 className="mb-3 font-body text-lg font-semibold text-brand-white leading-snug sm:text-xl">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-brand-dim sm:text-base">
                {step.description}
              </p>
            </div>
          ))}
        </AnimateOnScroll>
      </div>
    </section>
  );
}
