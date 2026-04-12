"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  business: string;
  businessType: string;
  stars: number;
  accent: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Our Instagram followers grew 340% in 2 months. We went from begging people to follow us to having customers post about us every single day.",
    name: "Maria Torres",
    role: "Owner",
    business: "Sunrise Beans Coffee",
    businessType: "Coffee Shop",
    stars: 5,
    accent: "border-brand-green",
  },
  {
    quote:
      "We get 15+ Google reviews per week now. Before Social Perks we were lucky to get 2 a month. Our rating went from 4.1 to 4.8 stars.",
    name: "Anika Patel",
    role: "Founder",
    business: "Flow State Yoga",
    businessType: "Yoga Studio",
    stars: 5,
    accent: "border-brand-cyan",
  },
  {
    quote:
      "Social Perks pays for itself 10x over. One free appetizer turns into a TikTok video that gets us 20 new customers. The math is absurd.",
    name: "Carlos Rivera",
    role: "Owner",
    business: "Casa Rivera Kitchen",
    businessType: "Restaurant",
    stars: 5,
    accent: "border-brand-amber",
  },
  {
    quote:
      "Influencers find US now instead of the other way around. We used to cold-DM creators and get ghosted. Now they come to us for the perks.",
    name: "Jasmine Lee",
    role: "Owner",
    business: "Luxe Locks Salon",
    businessType: "Salon",
    stars: 5,
    accent: "border-brand-pink",
  },
  {
    quote:
      "Our TikTok campaign went viral, all from customer posts. One girl posted a haul video and we sold out of three styles the next day.",
    name: "Sophie Winters",
    role: "Founder",
    business: "Ivy & Thread Boutique",
    businessType: "Boutique",
    stars: 5,
    accent: "border-brand-purple",
  },
  {
    quote:
      "Simple enough for my team to run without me. I set up the campaign in 10 minutes, showed my staff how to verify, and it just works.",
    name: "Derek Washington",
    role: "Owner",
    business: "Smoke Signal BBQ",
    businessType: "Food Truck",
    stars: 5,
    accent: "border-brand-green",
  },
];

const ROTATION_INTERVAL = 5000;

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  // Auto-rotation
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, ROTATION_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused]);

  const current = TESTIMONIALS[activeIndex];

  return (
    <section
      className="relative bg-brand-bg py-20 sm:py-28 lg:py-32"
      aria-labelledby="testimonials-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <AnimateOnScroll animation="fade-up" className="mb-14 text-center sm:mb-16 lg:mb-20">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Testimonials
          </p>
          <h2
            id="testimonials-heading"
            className="font-heading text-[clamp(1.75rem,3vw,3rem)] italic text-brand-white leading-tight"
          >
            Loved by business owners everywhere
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim leading-relaxed sm:text-lg">
            Real stories from real businesses that turned their customers into their marketing team.
          </p>
        </AnimateOnScroll>

        {/* Testimonial carousel */}
        <AnimateOnScroll animation="fade-up" delay={100}>
          <div
            className="mx-auto max-w-3xl"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            role="region"
            aria-roledescription="carousel"
            aria-label="Customer testimonials"
          >
            {/* Card */}
            <div
              className={`relative rounded-xl border-l-2 ${current.accent} border border-brand-border/40 bg-brand-surface/30 p-6 backdrop-blur-sm transition-all duration-500 sm:p-8 lg:p-10`}
              role="group"
              aria-roledescription="slide"
              aria-label={`Testimonial ${activeIndex + 1} of ${TESTIMONIALS.length}`}
            >
              {/* Stars */}
              <div className="mb-5 flex gap-1" aria-label={`${current.stars} out of 5 stars`}>
                {Array.from({ length: current.stars }).map((_, i) => (
                  <svg
                    key={i}
                    className="h-4 w-4 text-brand-amber"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="mb-6">
                <p className="font-heading text-lg italic leading-relaxed text-brand-white sm:text-xl lg:text-2xl">
                  &ldquo;{current.quote}&rdquo;
                </p>
              </blockquote>

              {/* Attribution */}
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-surface/80 border border-brand-border/40">
                  <span className="text-sm font-semibold text-brand-cyan">
                    {current.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-white">
                    {current.name}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {current.role}, {current.business}
                    <span className="mx-1.5 text-brand-border">|</span>
                    {current.businessType}
                  </p>
                </div>
              </div>
            </div>

            {/* Dot navigation */}
            <div
              className="mt-8 flex items-center justify-center gap-2"
              role="tablist"
              aria-label="Testimonial navigation"
            >
              {TESTIMONIALS.map((t, i) => (
                <button
                  key={t.name}
                  onClick={() => goTo(i)}
                  className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg ${
                    i === activeIndex
                      ? "w-8 bg-brand-cyan"
                      : "w-2 bg-brand-border hover:bg-brand-subtle"
                  }`}
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`Testimonial from ${t.name}, ${t.businessType}`}
                />
              ))}
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
