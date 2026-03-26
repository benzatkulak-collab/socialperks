"use client";

import { useInView } from "@/lib/hooks/use-in-view";
import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

interface PlatformItem {
  name: string;
  icon: string;
}

const PLATFORM_LIST: PlatformItem[] = [
  { name: "Instagram", icon: "📸" },
  { name: "TikTok", icon: "🎬" },
  { name: "Google", icon: "⭐" },
  { name: "Facebook", icon: "👍" },
  { name: "X", icon: "✍️" },
  { name: "YouTube", icon: "📺" },
  { name: "Yelp", icon: "🔴" },
  { name: "LinkedIn", icon: "💼" },
  { name: "Pinterest", icon: "📌" },
  { name: "Nextdoor", icon: "🏘️" },
  { name: "Threads", icon: "🧵" },
  { name: "Snapchat", icon: "👻" },
  { name: "TripAdvisor", icon: "🦉" },
  { name: "Reddit", icon: "🤖" },
  { name: "Direct Referral", icon: "🤝" },
];

export function PlatformShowcase() {
  const { ref: sectionRef, inView } = useInView({ threshold: 0.2 });

  return (
    <section
      ref={sectionRef}
      className="relative bg-brand-bg py-20 sm:py-28 lg:py-32"
      aria-labelledby="platforms-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <AnimateOnScroll animation="fade-up" className="mb-14 text-center sm:mb-16 lg:mb-20">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Platform coverage
          </p>
          <h2
            id="platforms-heading"
            className="font-heading text-[clamp(1.75rem,3vw,3rem)] italic text-brand-white leading-tight"
          >
            Works everywhere your customers are
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim leading-relaxed sm:text-lg">
            One dashboard to manage campaigns across every major social and
            review platform.
          </p>
        </AnimateOnScroll>

        {/* Platform grid */}
        <div
          className="mx-auto grid max-w-4xl grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:gap-4"
          role="list"
          aria-label="Supported platforms"
        >
          {PLATFORM_LIST.map((platform, i) => (
            <div
              key={platform.name}
              role="listitem"
              className={`group flex flex-col items-center gap-2 rounded-xl border border-brand-border/30 bg-brand-surface/25 px-3 py-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-border/60 hover:bg-brand-surface/50 hover:shadow-lg hover:shadow-brand-bg/50 sm:gap-2.5 sm:px-4 sm:py-5 ${
                inView ? "animate-fade-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <span className="text-xl sm:text-2xl lg:text-3xl" aria-hidden="true">
                {platform.icon}
              </span>
              <span className="text-center text-[11px] font-medium text-brand-dim group-hover:text-brand-text sm:text-xs lg:text-sm transition-colors">
                {platform.name}
              </span>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <AnimateOnScroll animation="fade-up" delay={200} className="mx-auto mt-12 flex max-w-2xl flex-col items-center justify-center gap-6 rounded-xl border border-brand-border/30 bg-brand-surface/25 px-6 py-6 backdrop-blur-sm sm:mt-16 sm:flex-row sm:gap-10 sm:px-10 sm:py-8">
          <div className="text-center">
            <p className="font-mono text-2xl font-semibold text-brand-cyan sm:text-3xl">
              25
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-brand-muted sm:text-xs">
              Platforms
            </p>
          </div>
          <div
            className="hidden h-8 w-px bg-brand-border/40 sm:block"
            aria-hidden="true"
          />
          <div className="text-center">
            <p className="font-mono text-2xl font-semibold text-brand-green sm:text-3xl">
              125
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-brand-muted sm:text-xs">
              Marketing Actions
            </p>
          </div>
          <div
            className="hidden h-8 w-px bg-brand-border/40 sm:block"
            aria-hidden="true"
          />
          <div className="text-center">
            <p className="font-mono text-2xl font-semibold text-brand-amber sm:text-3xl">
              1
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-brand-muted sm:text-xs">
              Simple Dashboard
            </p>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
