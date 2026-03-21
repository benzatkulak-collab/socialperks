"use client";

export function Hero() {
  return (
    <section
      className="relative min-h-screen overflow-hidden bg-brand-bg"
      aria-label="Hero section"
    >
      {/* Background gradient mesh */}
      <div
        className="pointer-events-none absolute inset-0 animate-gradient bg-[length:300%_300%] bg-[linear-gradient(135deg,rgba(34,211,238,0.07),rgba(167,139,250,0.05),rgba(244,114,182,0.04),rgba(34,211,238,0.02))]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-cyan/5 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-brand-purple/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-5 pb-20 pt-32 text-center sm:px-8 sm:pt-40 lg:pt-48">
        {/* Headline */}
        <h1 className="animate-fade-up font-heading text-4xl italic leading-tight text-brand-white sm:text-5xl md:text-6xl lg:text-7xl">
          Your customers love you.
          <br />
          <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
            Pay them to say it online.
          </span>
        </h1>

        {/* Subline */}
        <p className="mt-6 max-w-2xl animate-fade-up text-lg leading-relaxed text-brand-dim animate-delay-100 sm:mt-8 sm:text-xl">
          Give customers a small discount. They leave you a Google review,
          post on Instagram, or share with friends. You get real marketing
          from real people — not ads nobody trusts.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex animate-fade-up flex-col items-center gap-4 animate-delay-200 sm:flex-row">
          <a
            href="#signup"
            className="rounded-lg bg-brand-cyan px-8 py-3.5 font-body text-base font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/20 focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 focus:ring-offset-2 focus:ring-offset-brand-bg"
          >
            Create Your First Campaign
          </a>
          <a
            href="#how-it-works"
            className="rounded-lg border border-brand-border bg-brand-surface/50 px-8 py-3.5 font-body text-base font-medium text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:ring-offset-2 focus:ring-offset-brand-bg"
          >
            See How It Works
          </a>
        </div>

        <p className="mt-8 animate-fade-up text-sm text-brand-muted animate-delay-300">
          Free to start. No credit card. Takes 5 minutes.
        </p>

        {/* Concrete Example */}
        <div className="mt-16 w-full max-w-2xl animate-fade-up animate-delay-400 sm:mt-20">
          <div className="rounded-2xl border border-brand-border/50 bg-brand-surface/40 p-6 backdrop-blur-sm sm:p-8">
            <p className="mb-4 font-mono text-xs uppercase tracking-wider text-brand-muted">
              Real example
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-brand-white">Maria&apos;s Coffee Shop</p>
                <p className="mt-1 text-sm text-brand-dim">
                  Offers a <span className="text-brand-green font-semibold">free pastry</span> for a Google review
                </p>
              </div>
              <div className="hidden h-12 w-px bg-brand-border/50 sm:block" aria-hidden="true" />
              <div className="flex gap-6 text-center">
                <div>
                  <p className="font-mono text-2xl font-semibold text-brand-white">89</p>
                  <p className="text-xs text-brand-muted">new reviews</p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-semibold text-brand-green">$0</p>
                  <p className="text-xs text-brand-muted">ad spend</p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-semibold text-brand-cyan">3 mo</p>
                  <p className="text-xs text-brand-muted">time frame</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
