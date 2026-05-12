"use client";

import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

export function CtaSection() {
  return (
    <section
      className="relative bg-brand-bg py-20 sm:py-28 lg:py-36"
      aria-label="Call to action"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute left-1/4 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-brand-cyan/[0.04] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-1/4 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-brand-purple/[0.04] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <AnimateOnScroll animation="fade-up">
          <h2 className="font-heading text-[clamp(1.75rem,4vw,3rem)] italic text-brand-white leading-[1.15]">
            Stop paying for ads.
            <br />
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              Start rewarding your customers.
            </span>
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fade-up" delay={100}>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            Your customers already tell their friends about you.
            <br className="hidden sm:block" />
            Now give them a reason to tell everyone else.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fade-up" delay={200}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:mt-12">
            <a
              href="/auth"
              className="w-full sm:w-auto rounded-xl bg-brand-cyan px-10 py-4 font-body text-base font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg active:translate-y-0"
            >
              Create Your First Campaign
            </a>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fade-in" delay={300} className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-brand-muted sm:mt-12 sm:gap-x-8">
          <span className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green/10 text-brand-green text-[10px]" aria-hidden="true">✓</span>
            Free to start
          </span>
          <span className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green/10 text-brand-green text-[10px]" aria-hidden="true">✓</span>
            5-minute setup
          </span>
          <span className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green/10 text-brand-green text-[10px]" aria-hidden="true">✓</span>
            No credit card
          </span>
          <span className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green/10 text-brand-green text-[10px]" aria-hidden="true">✓</span>
            Works for any business
          </span>
        </AnimateOnScroll>

        <p className="mt-8 text-xs text-brand-subtle sm:mt-10">
          Building AI social media agents?{" "}
          <a href="/agents" className="text-brand-purple hover:text-brand-purple/80 hover:underline transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/40">
            Connect them to our API &rarr;
          </a>
        </p>
      </div>
    </section>
  );
}
