"use client";

import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

interface Example {
  business: string;
  offer: string;
  action: string;
  result: string;
}

const EXAMPLES: Example[] = [
  {
    business: "Coffee Shop",
    offer: "Free pastry",
    action: "Instagram story tag",
    result: "200+ stories in 3 months",
  },
  {
    business: "Yoga Studio",
    offer: "10% off next month",
    action: "Instagram story with tag",
    result: "200+ tags per month",
  },
  {
    business: "Barber Shop",
    offer: "$5 off next cut",
    action: "Before/after photo post",
    result: "3x more booking inquiries",
  },
  {
    business: "Restaurant",
    offer: "Free appetizer",
    action: "TikTok review",
    result: "45K views, 12% new customers",
  },
  {
    business: "Auto Shop",
    offer: "Free tire rotation",
    action: "Yelp review",
    result: "Jumped from 3.8 to 4.6 stars",
  },
  {
    business: "Salon",
    offer: "15% off color service",
    action: "Before/after Instagram post",
    result: "+180% booking inquiries",
  },
];

const ACTIONS = [
  { platform: "Google", actions: ["Upload photos", "Answer a question", "Check in at your location"], icon: "🌐" },
  { platform: "Instagram", actions: ["Post a story", "Tag your business", "Create a reel", "Share a photo"], icon: "📸" },
  { platform: "TikTok", actions: ["Post a video review", "Duet with your content", "Create a visit vlog"], icon: "🎵" },
  { platform: "Facebook", actions: ["Leave a recommendation", "Check in at your location", "Share a post"], icon: "👍" },
  { platform: "Yelp", actions: ["Write a review", "Upload photos", "Check in"], icon: "⭐" },
  { platform: "YouTube", actions: ["Post a short", "Film a review video"], icon: "📺" },
];

export function AudienceSections() {
  return (
    <section
      className="relative bg-brand-bg py-20 sm:py-28 lg:py-32"
      id="examples"
      aria-label="What businesses can do"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section: What you can ask for */}
        <div className="mb-20 sm:mb-24">
          <AnimateOnScroll animation="fade-up" className="mb-10 text-center sm:mb-14">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
              What your customers can do for you
            </p>
            <h2 className="font-heading text-[clamp(1.75rem,3vw,3rem)] italic text-brand-white leading-tight">
              Pick the platforms. Pick the actions.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim leading-relaxed sm:text-lg">
              You decide exactly what you want customers to do — and what they get in return.
            </p>
          </AnimateOnScroll>

          <AnimateOnScroll animation="fade-up" stagger staggerDelay={80} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
            {ACTIONS.map((platform) => (
              <div
                key={platform.platform}
                className="group rounded-xl border border-brand-border/40 bg-brand-surface/30 p-5 transition-all duration-300 hover:border-brand-border/70 hover:bg-brand-surface/50 sm:p-6"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="text-xl" aria-hidden="true">{platform.icon}</span>
                  <span className="text-sm font-semibold text-brand-white">{platform.platform}</span>
                </div>
                <ul className="space-y-2">
                  {platform.actions.map((action) => (
                    <li key={action} className="flex items-center gap-2 text-sm text-brand-dim">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green text-[10px]" aria-hidden="true">+</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </AnimateOnScroll>
        </div>

        {/* Section: Real examples */}
        <AnimateOnScroll animation="fade-in" className="rounded-2xl border border-brand-green/20 bg-brand-green/[0.02] p-6 sm:p-10 lg:p-12">
          <AnimateOnScroll animation="fade-up" className="mb-10 text-center sm:mb-12">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-green sm:text-xs">
              Real examples
            </p>
            <h2 className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] italic text-brand-white leading-tight">
              Here&apos;s what it looks like in practice
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim leading-relaxed sm:text-lg">
              Small discount in, real marketing out. Every time.
            </p>
          </AnimateOnScroll>

          <AnimateOnScroll animation="fade-up" stagger staggerDelay={80} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
            {EXAMPLES.map((ex) => (
              <div
                key={ex.business}
                className="rounded-xl border border-brand-green/15 bg-brand-bg/80 p-5 transition-all duration-300 hover:border-brand-green/30 hover:bg-brand-bg/90"
              >
                <p className="mb-3.5 text-sm font-semibold text-brand-white">{ex.business}</p>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0 rounded bg-brand-amber/10 px-1.5 py-0.5 text-brand-amber text-[10px] font-bold tracking-wide">GIVES</span>
                    <span className="text-brand-dim">{ex.offer}</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0 rounded bg-brand-cyan/10 px-1.5 py-0.5 text-brand-cyan text-[10px] font-bold tracking-wide">FOR</span>
                    <span className="text-brand-dim">{ex.action}</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0 rounded bg-brand-green/10 px-1.5 py-0.5 text-brand-green text-[10px] font-bold tracking-wide">GETS</span>
                    <span className="text-brand-green font-medium">{ex.result}</span>
                  </div>
                </div>
              </div>
            ))}
          </AnimateOnScroll>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
