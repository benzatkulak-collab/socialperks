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

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 pb-24 pt-32 text-center sm:px-6 md:px-8 sm:pt-40 lg:pt-48 lg:pb-32">
        {/* Headline */}
        <h1 className="animate-fade-up font-heading text-[clamp(2.25rem,5vw,4.5rem)] italic leading-[1.1] text-brand-white tracking-tight">
          Your customers love you.
          <br />
          <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
            Pay them to say it online.
          </span>
        </h1>

        {/* Subline */}
        <p className="mt-6 max-w-[42rem] animate-fade-up text-base leading-relaxed text-brand-dim animate-delay-100 sm:mt-8 sm:text-lg md:text-xl">
          Give customers a small discount. They post on Instagram,
          share on TikTok, tag you on Facebook. You get real marketing
          from real people — not ads nobody trusts.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex animate-fade-up flex-col items-center gap-3 animate-delay-200 sm:flex-row sm:gap-4 sm:mt-12">
          <a
            href="/dashboard#signup"
            className="w-full sm:w-auto rounded-xl bg-brand-cyan px-8 py-3.5 font-body text-base font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg active:translate-y-0"
          >
            Create Your First Campaign
          </a>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto rounded-xl border border-brand-border bg-brand-surface/50 px-8 py-3.5 font-body text-base font-medium text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-surface hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/30 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg active:translate-y-0"
          >
            See How It Works
          </a>
        </div>

        <p className="mt-6 animate-fade-up text-sm text-brand-muted animate-delay-300 sm:mt-8">
          Free to start. No credit card. Takes 5 minutes. Or{" "}
          <a
            href="#waitlist"
            className="text-brand-cyan underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 rounded-sm"
          >
            join the early-access list →
          </a>
        </p>

        {/* Concrete Example */}
        <div className="mt-16 w-full max-w-2xl animate-fade-up animate-delay-400 sm:mt-20">
          <div className="rounded-2xl border border-brand-border/50 bg-brand-surface/40 p-5 backdrop-blur-sm sm:p-8">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-widest text-brand-muted">
              Real example
            </p>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-brand-white sm:text-base">Maria&apos;s Coffee Shop</p>
                <p className="mt-1.5 text-sm text-brand-dim leading-relaxed">
                  Offers a <span className="text-brand-green font-semibold">free pastry</span> for an Instagram story tag
                </p>
              </div>
              <div className="hidden h-12 w-px bg-brand-border/50 sm:block" aria-hidden="true" />
              <div className="flex gap-6 text-center sm:gap-8">
                <div>
                  <p className="font-mono text-2xl font-semibold text-brand-white sm:text-3xl">89</p>
                  <p className="mt-1 text-xs text-brand-muted">customer posts</p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-semibold text-brand-green sm:text-3xl">$0</p>
                  <p className="mt-1 text-xs text-brand-muted">ad spend</p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-semibold text-brand-cyan sm:text-3xl">3 mo</p>
                  <p className="mt-1 text-xs text-brand-muted">time frame</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
