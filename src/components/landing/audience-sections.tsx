"use client";

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
    action: "Google review",
    result: "89 new reviews in 3 months",
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
  { platform: "Google", actions: ["Leave a review", "Post a photo", "Answer a question"], icon: "🌐" },
  { platform: "Instagram", actions: ["Post a story", "Tag your business", "Create a reel", "Share a photo"], icon: "📸" },
  { platform: "TikTok", actions: ["Post a video review", "Duet with your content", "Create a visit vlog"], icon: "🎵" },
  { platform: "Facebook", actions: ["Leave a recommendation", "Check in at your location", "Share a post"], icon: "👍" },
  { platform: "Yelp", actions: ["Write a review", "Upload photos", "Check in"], icon: "⭐" },
  { platform: "YouTube", actions: ["Post a short", "Film a review video"], icon: "📺" },
];

export function AudienceSections() {
  return (
    <section
      className="relative bg-brand-bg py-24 sm:py-32"
      aria-label="What businesses can do"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section: What you can ask for */}
        <div className="mb-20">
          <div className="mb-12 text-center">
            <p className="mb-3 font-mono text-sm uppercase tracking-widest text-brand-cyan">
              What your customers can do for you
            </p>
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl lg:text-5xl">
              Pick the platforms. Pick the actions.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim sm:text-lg">
              You decide exactly what you want customers to do — and what they get in return.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ACTIONS.map((platform) => (
              <div
                key={platform.platform}
                className="rounded-xl border border-brand-border/50 bg-brand-surface/40 p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">{platform.icon}</span>
                  <span className="text-sm font-semibold text-brand-white">{platform.platform}</span>
                </div>
                <ul className="space-y-1.5">
                  {platform.actions.map((action) => (
                    <li key={action} className="flex items-center gap-2 text-sm text-brand-dim">
                      <span className="text-brand-green text-xs" aria-hidden="true">+</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Real examples */}
        <div>
          <div className="mb-12 text-center">
            <p className="mb-3 font-mono text-sm uppercase tracking-widest text-brand-green">
              Real examples
            </p>
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl lg:text-5xl">
              Here&apos;s what it looks like in practice
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim sm:text-lg">
              Small discount in, real marketing out. Every time.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXAMPLES.map((ex) => (
              <div
                key={ex.business}
                className="rounded-xl border border-brand-border/50 bg-brand-surface/30 p-5"
              >
                <p className="mb-3 text-sm font-semibold text-brand-white">{ex.business}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-amber text-xs font-bold">GIVES</span>
                    <span className="text-brand-dim">{ex.offer}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-cyan text-xs font-bold">FOR</span>
                    <span className="text-brand-dim">{ex.action}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-green text-xs font-bold">GETS</span>
                    <span className="text-brand-green font-medium">{ex.result}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
