"use client";

import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

export function AiFinalCta() {
  return (
    <section
      className="relative bg-brand-bg py-20 sm:py-28 lg:py-36"
      aria-label="Final call to action"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/4 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-brand-cyan/[0.05] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-1/4 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-brand-purple/[0.04] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <AnimateOnScroll animation="fade-up">
          <h2 className="font-heading text-[clamp(1.75rem,4vw,3rem)] italic text-brand-white leading-[1.15]">
            Hire your{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              AI marketing manager
            </span>{" "}
            today.
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fade-up" delay={100}>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            Free for 14 days. No credit card. Cancel any time.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fade-up" delay={200}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:mt-12">
            <a
              href="/dashboard#signup"
              className="rounded-xl bg-brand-cyan px-12 py-4 font-body text-base font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:shadow-xl hover:shadow-brand-cyan/30 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg active:translate-y-0 sm:text-lg"
            >
              Start free trial →
            </a>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll
          animation="fade-in"
          delay={300}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm text-brand-muted sm:mt-12 sm:gap-x-8"
        >
          <span className="flex items-center gap-2">
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-cyan/15 text-[10px] text-brand-cyan"
              aria-hidden="true"
            >
              ✓
            </span>
            Join 1,200+ small businesses
          </span>
          <span className="flex items-center gap-2">
            <span className="text-brand-amber" aria-hidden="true">
              ★
            </span>
            <span className="font-mono text-brand-text">4.9</span>
            <span>average rating</span>
          </span>
          <span className="flex items-center gap-2">
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green/15 text-[10px] text-brand-green"
              aria-hidden="true"
            >
              ✓
            </span>
            No credit card required
          </span>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
