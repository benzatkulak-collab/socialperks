"use client";

export function CtaSection() {
  return (
    <section
      className="relative bg-brand-bg py-24 sm:py-32"
      aria-label="Call to action"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      {/* Background accents */}
      <div
        className="pointer-events-none absolute left-1/3 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-brand-cyan/5 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-1/3 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-brand-purple/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-3xl px-5 text-center sm:px-8">
        {/* Heading */}
        <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl lg:text-5xl">
          Ready to turn customers
          <br />
          <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
            into advocates?
          </span>
        </h2>

        {/* Subline */}
        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-brand-dim sm:text-lg">
          Start free. No credit card required.
          <br className="hidden sm:block" />
          Set up your first campaign in 5 minutes.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#signup"
            className="rounded-lg bg-brand-cyan px-10 py-4 font-body text-base font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/20 focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 focus:ring-offset-2 focus:ring-offset-brand-bg"
            aria-label="Start free account"
          >
            Start Free
          </a>
          <a
            href="#login"
            className="rounded-lg border border-brand-border bg-brand-surface/50 px-10 py-4 font-body text-base font-medium text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:ring-offset-2 focus:ring-offset-brand-bg"
            aria-label="Talk to sales for enterprise plans"
          >
            Talk to Sales
          </a>
        </div>

        {/* Trust signals */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-brand-muted sm:gap-8">
          <span className="flex items-center gap-1.5">
            <span className="text-brand-green" aria-hidden="true">
              ✓
            </span>
            Free forever plan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-brand-green" aria-hidden="true">
              ✓
            </span>
            5-minute setup
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-brand-green" aria-hidden="true">
              ✓
            </span>
            No credit card
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-brand-green" aria-hidden="true">
              ✓
            </span>
            Cancel anytime
          </span>
        </div>
      </div>
    </section>
  );
}
