"use client";

import { useRef, useEffect, useState } from "react";

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

function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.2) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return inView;
}

export function PlatformShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef);

  return (
    <section
      ref={sectionRef}
      className="relative bg-brand-bg py-24 sm:py-32"
      aria-labelledby="platforms-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section header */}
        <div className="mb-16 text-center sm:mb-20">
          <p className="mb-3 font-mono text-sm uppercase tracking-widest text-brand-cyan">
            Platform coverage
          </p>
          <h2
            id="platforms-heading"
            className="font-heading text-3xl italic text-brand-white sm:text-4xl lg:text-5xl"
          >
            Works everywhere your customers are
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim sm:text-lg">
            One dashboard to manage campaigns across every major social and
            review platform.
          </p>
        </div>

        {/* Platform grid */}
        <div
          className="mx-auto grid max-w-4xl grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:gap-5"
          role="list"
          aria-label="Supported platforms"
        >
          {PLATFORM_LIST.map((platform, i) => (
            <div
              key={platform.name}
              role="listitem"
              className={`group flex flex-col items-center gap-2.5 rounded-xl border border-brand-border/40 bg-brand-surface/30 px-3 py-5 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-brand-border hover:bg-brand-surface/60 sm:px-4 sm:py-6 ${
                inView ? "animate-fade-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <span className="text-2xl sm:text-3xl" aria-hidden="true">
                {platform.icon}
              </span>
              <span className="text-center text-xs font-medium text-brand-dim group-hover:text-brand-text sm:text-sm">
                {platform.name}
              </span>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mx-auto mt-12 flex max-w-2xl flex-col items-center justify-center gap-6 rounded-xl border border-brand-border/40 bg-brand-surface/30 px-6 py-6 backdrop-blur-sm sm:mt-16 sm:flex-row sm:gap-10 sm:px-10 sm:py-8">
          <div className="text-center">
            <p className="font-mono text-2xl font-semibold text-brand-cyan sm:text-3xl">
              25
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-brand-muted">
              Platforms
            </p>
          </div>
          <div
            className="hidden h-8 w-px bg-brand-border/50 sm:block"
            aria-hidden="true"
          />
          <div className="text-center">
            <p className="font-mono text-2xl font-semibold text-brand-green sm:text-3xl">
              125
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-brand-muted">
              Marketing Actions
            </p>
          </div>
          <div
            className="hidden h-8 w-px bg-brand-border/50 sm:block"
            aria-hidden="true"
          />
          <div className="text-center">
            <p className="font-mono text-2xl font-semibold text-brand-amber sm:text-3xl">
              1
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-brand-muted">
              Simple Dashboard
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
