"use client";

import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

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
    title: "Print your QR code",
    description:
      "We generate a printable poster + small counter card with your perk on it. Tape it to the counter, slip it in the bag, stick it on the cup.",
    example: "\"Scan to claim 15% off — post about us!\"",
    icon: "🖨️",
    accent: "border-brand-green",
  },
  {
    number: "02",
    title: "Your customer scans it",
    description:
      "Right after they pay. They land on a clean page that explains the perk and links them to Instagram, TikTok, or Facebook to post.",
    example: "Tap → camera opens → 30 seconds to post",
    icon: "📱",
    accent: "border-brand-cyan",
  },
  {
    number: "03",
    title: "We verify the post",
    description:
      "No honor system. We check the post actually went live with the right hashtag and FTC disclosure. Auto-injected, can&apos;t be skipped.",
    example: "Verified in under 5 minutes",
    icon: "✓",
    accent: "border-brand-amber",
  },
  {
    number: "04",
    title: "They get the perk. You get reach.",
    description:
      "Customer redeems on their next visit. Their post stays up forever, seen by every friend they have. Most posts reach 800+ people.",
    example: "$2 pastry → 800-person ad that lasts forever",
    icon: "🤝",
    accent: "border-brand-pink",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative bg-brand-bg py-20 sm:py-28 lg:py-32"
      aria-labelledby="how-it-works-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <AnimateOnScroll animation="fade-up" className="mb-14 text-center sm:mb-16 lg:mb-20">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            How it works
          </p>
          <h2
            id="how-it-works-heading"
            className="font-heading text-[clamp(1.75rem,3vw,3rem)] italic text-brand-white leading-tight"
          >
            Set it up in 5 minutes. Forget about it.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim leading-relaxed sm:text-lg">
            No campaigns to babysit. No influencers to chase. Just a QR code and your real customers doing what they already want to do — show off where they go.
          </p>
        </AnimateOnScroll>

        {/* Steps grid */}
        <AnimateOnScroll animation="fade-up" stagger staggerDelay={100} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5 lg:gap-6">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className={`group rounded-xl border-l-2 ${step.accent} border border-brand-border/40 bg-brand-surface/30 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-border/70 hover:bg-brand-surface/50 hover:shadow-lg hover:shadow-brand-bg/50 sm:p-6 lg:p-7`}
            >
              {/* Step number */}
              <div className="mb-4 flex items-center gap-3">
                <span className="font-mono text-[11px] font-semibold text-brand-muted">
                  {step.number}
                </span>
                <div className="h-px flex-1 bg-brand-border/40" />
              </div>

              {/* Icon */}
              <div className="mb-4 text-2xl sm:text-3xl" aria-hidden="true">
                {step.icon}
              </div>

              {/* Content */}
              <h3 className="mb-2 font-body text-base font-semibold text-brand-white sm:text-lg leading-snug">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-brand-dim">
                {step.description}
              </p>

              {/* Concrete example */}
              <p className="mt-4 rounded-lg bg-brand-bg/60 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-brand-muted">
                {step.example}
              </p>
            </div>
          ))}
        </AnimateOnScroll>
      </div>
    </section>
  );
}
