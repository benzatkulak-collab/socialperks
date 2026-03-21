"use client";

interface Testimonial {
  name: string;
  role: string;
  business: string;
  avatar: string;
  quote: string;
  metric: string;
  metricLabel: string;
  accent: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Maria Chen",
    role: "Owner",
    business: "Sunrise Coffee",
    avatar: "☕",
    quote:
      "We went from 12 Google reviews to 89 in three months. Customers love getting a free pastry for posting. It's the easiest marketing I've ever done.",
    metric: "+640%",
    metricLabel: "Google reviews",
    accent: "border-brand-green",
  },
  {
    name: "James Okafor",
    role: "Manager",
    business: "Flow Yoga Studio",
    avatar: "🧘",
    quote:
      "Our Instagram went from crickets to 200+ tags a month. New members keep saying they found us through a friend's story. That's the whole point.",
    metric: "3x",
    metricLabel: "Instagram mentions",
    accent: "border-brand-cyan",
  },
  {
    name: "Sofia Rodriguez",
    role: "Owner",
    business: "Taqueria Sol",
    avatar: "🌮",
    quote:
      "I was paying $800/month on ads that didn't work. Now I spend $200 in perks and get way more walk-ins. Real people talking about my food beats any ad.",
    metric: "4x",
    metricLabel: "ROI vs paid ads",
    accent: "border-brand-amber",
  },
  {
    name: "Aisha Patel",
    role: "Owner",
    business: "Glow Studio Salon",
    avatar: "💇",
    quote:
      "Before-and-after posts from my clients get more engagement than anything I could create. Social Perks made it simple to ask and reward them.",
    metric: "+180%",
    metricLabel: "Booking inquiries",
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
        {/* Section header */}
        <div className="mb-16 text-center sm:mb-20">
          <p className="mb-3 font-mono text-sm uppercase tracking-widest text-brand-cyan">
            Testimonials
          </p>
          <h2
            id="testimonials-heading"
            className="font-heading text-3xl italic text-brand-white sm:text-4xl lg:text-5xl"
          >
            Don&apos;t take our word for it
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim sm:text-lg">
            Hear from businesses that turned their customers into advocates.
          </p>
        </div>

        {/* Testimonial grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
          {TESTIMONIALS.map((testimonial, i) => (
            <article
              key={testimonial.name}
              className={`animate-fade-up rounded-xl border-l-2 ${testimonial.accent} border border-brand-border/50 bg-brand-surface/30 p-6 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-brand-surface/50 sm:p-8`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Quote */}
              <blockquote className="mb-6">
                <p className="text-base leading-relaxed text-brand-text">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
              </blockquote>

              {/* Footer */}
              <div className="flex items-center justify-between">
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-elevated text-xl">
                    <span aria-hidden="true">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-white">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {testimonial.role}, {testimonial.business}
                    </p>
                  </div>
                </div>

                {/* Metric */}
                <div className="text-right">
                  <p className="font-mono text-lg font-semibold text-brand-white">
                    {testimonial.metric}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {testimonial.metricLabel}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
