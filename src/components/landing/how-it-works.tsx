"use client";

interface Step {
  number: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "Create Your Perks",
    description:
      "Set what you'll offer — 10% off, a free item, early access. You choose the reward that fits your budget.",
    icon: "🎁",
    accent: "border-brand-green",
  },
  {
    number: "02",
    title: "Customers Take Action",
    description:
      "They post on Instagram, leave a Google review, share with friends — real marketing from real customers.",
    icon: "📱",
    accent: "border-brand-cyan",
  },
  {
    number: "03",
    title: "We Verify It",
    description:
      "Automatic verification across 25 platforms. No manual checking. No guesswork. Just confirmed results.",
    icon: "✓",
    accent: "border-brand-amber",
  },
  {
    number: "04",
    title: "They Earn, You Grow",
    description:
      "Customers get their perk, you get lasting marketing that keeps working long after the post goes live.",
    icon: "📈",
    accent: "border-brand-pink",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative bg-brand-bg py-24 sm:py-32"
      aria-labelledby="how-it-works-heading"
    >
      {/* Subtle top divider */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section header */}
        <div className="mb-16 text-center sm:mb-20">
          <p className="mb-3 font-mono text-sm uppercase tracking-widest text-brand-cyan">
            How it works
          </p>
          <h2
            id="how-it-works-heading"
            className="font-heading text-3xl italic text-brand-white sm:text-4xl lg:text-5xl"
          >
            Four steps to word-of-mouth growth
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim sm:text-lg">
            No marketing degree needed. If you can set a price, you can run a campaign.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className={`group animate-fade-up rounded-xl border-l-2 ${step.accent} border border-brand-border/50 bg-brand-surface/40 p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-brand-border hover:bg-brand-surface/60 sm:p-8`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Step number */}
              <div className="mb-4 flex items-center gap-3">
                <span className="font-mono text-xs font-semibold text-brand-muted">
                  {step.number}
                </span>
                <div className="h-px flex-1 bg-brand-border/50" />
              </div>

              {/* Icon */}
              <div className="mb-4 text-3xl" aria-hidden="true">
                {step.icon}
              </div>

              {/* Content */}
              <h3 className="mb-2 font-body text-lg font-semibold text-brand-white">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-brand-dim">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Connecting line (desktop) */}
        <div
          className="mx-auto mt-12 hidden max-w-3xl items-center gap-2 lg:flex"
          aria-hidden="true"
        >
          <div className="h-0.5 flex-1 rounded-full bg-gradient-to-r from-brand-green via-brand-cyan to-brand-amber" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-pink/30 bg-brand-surface">
            <span className="text-xs text-brand-pink">✦</span>
          </div>
          <div className="h-0.5 flex-1 rounded-full bg-gradient-to-r from-brand-amber via-brand-pink to-brand-purple" />
        </div>
      </div>
    </section>
  );
}
