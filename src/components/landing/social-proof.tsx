"use client";

interface Testimonial {
  name: string;
  role: string;
  business: string;
  avatar: string;
  quote: string;
  offer: string;
  result: string;
  accent: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Maria Chen",
    role: "Owner",
    business: "Sunrise Coffee",
    avatar: "☕",
    quote:
      "I used to beg people for Google reviews. Now I just give them a free pastry and they're happy to do it. Went from 12 reviews to 89 in three months.",
    offer: "Free pastry for a review",
    result: "+640% Google reviews",
    accent: "border-brand-green",
  },
  {
    name: "James Okafor",
    role: "Manager",
    business: "Flow Yoga Studio",
    avatar: "🧘",
    quote:
      "New members keep saying they saw us on a friend's Instagram story. We give 10% off for a story tag. Costs us almost nothing, brings in 3-4 new members a week.",
    offer: "10% off for an IG story",
    result: "200+ tags per month",
    accent: "border-brand-cyan",
  },
  {
    name: "Sofia Rodriguez",
    role: "Owner",
    business: "Taqueria Sol",
    avatar: "🌮",
    quote:
      "I was spending $800 a month on Instagram ads that maybe brought in 5 people. Now I spend $200 in free appetizers and get way more walk-ins from real word of mouth.",
    offer: "Free appetizer for a TikTok",
    result: "4x better ROI than ads",
    accent: "border-brand-amber",
  },
  {
    name: "Aisha Patel",
    role: "Owner",
    business: "Glow Studio Salon",
    avatar: "💇",
    quote:
      "My clients already take before-and-after photos. Now they actually post them because they get 15% off their next color. I didn't have to learn anything new.",
    offer: "15% off for a before/after post",
    result: "+180% booking inquiries",
    accent: "border-brand-pink",
  },
];

export function SocialProof() {
  return (
    <section
      className="relative bg-brand-bg py-24 sm:py-32"
      aria-labelledby="testimonials-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-16 text-center sm:mb-20">
          <p className="mb-3 font-mono text-sm uppercase tracking-widest text-brand-cyan">
            From real business owners
          </p>
          <h2
            id="testimonials-heading"
            className="font-heading text-3xl italic text-brand-white sm:text-4xl lg:text-5xl"
          >
            They tried it. Here&apos;s what happened.
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
          {TESTIMONIALS.map((t, i) => (
            <article
              key={t.name}
              className={`animate-fade-up rounded-xl border-l-2 ${t.accent} border border-brand-border/50 bg-brand-surface/30 p-6 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-brand-surface/50 sm:p-8`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <blockquote className="mb-5">
                <p className="text-base leading-relaxed text-brand-text">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </blockquote>

              {/* What they offered */}
              <div className="mb-5 flex gap-4 rounded-lg bg-brand-bg/50 px-4 py-3">
                <div>
                  <p className="text-xs text-brand-muted">Their offer</p>
                  <p className="text-sm font-medium text-brand-amber">{t.offer}</p>
                </div>
                <div className="w-px bg-brand-border/30" />
                <div>
                  <p className="text-xs text-brand-muted">Result</p>
                  <p className="text-sm font-semibold text-brand-green">{t.result}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-elevated text-xl">
                  <span aria-hidden="true">{t.avatar}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-white">{t.name}</p>
                  <p className="text-xs text-brand-muted">{t.role}, {t.business}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
