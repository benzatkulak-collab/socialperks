"use client";

interface Step {
  number: string;
  title: string;
  description: string;
  example: string;
  icon: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "You pick the reward",
    description:
      "10% off, a free coffee, $5 off their next visit — whatever works for your business and your margins.",
    example: "\"15% off your next order for an Instagram story\"",
    icon: "🏷️",
    accent: "border-brand-green",
  },
  {
    number: "02",
    title: "Customers do the marketing",
    description:
      "They post on Instagram, share on TikTok, check in on Google, tag you on Facebook — whatever you choose.",
    example: "Customer posts a photo at your shop with a tag",
    icon: "📱",
    accent: "border-brand-cyan",
  },
  {
    number: "03",
    title: "We make sure it happened",
    description:
      "No honor system. We verify the post, review, or share actually went live before anyone gets their discount.",
    example: "Automatic check — did the review actually post?",
    icon: "✓",
    accent: "border-brand-amber",
  },
  {
    number: "04",
    title: "They get their discount. You get the exposure.",
    description:
      "Customer redeems their reward. Their post stays up forever — bringing you new customers long after.",
    example: "One $2 pastry → a review seen by 500 people",
    icon: "🤝",
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
            Simple enough for any business owner
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim sm:text-lg">
            If you can set a price on your menu, you can run a campaign. No marketing experience needed.
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

              {/* Concrete example */}
              <p className="mt-4 rounded-md bg-brand-bg/50 px-3 py-2 font-mono text-xs text-brand-muted">
                {step.example}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
