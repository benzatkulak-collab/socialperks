import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  STATES,
  STATE_INDUSTRIES,
  type StateRegion,
  regionLabel,
} from "@/lib/programmatic-seo/states";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.onrender.com";

export const metadata: Metadata = {
  title: "Small Business Marketing by State | Social Perks",
  description: `Customer-perks marketing tips for small businesses across all 50 U.S. states and ${STATE_INDUSTRIES.length} industries. Find your state and industry to get started.`,
  alternates: { canonical: `${SITE_URL}/state` },
  openGraph: {
    title: "Small Business Marketing by State | Social Perks",
    description: `Customer-perks campaigns built for all 50 U.S. states × ${STATE_INDUSTRIES.length} industries.`,
    type: "website",
    url: `${SITE_URL}/state`,
    siteName: "Social Perks",
  },
};

const REGION_ORDER: StateRegion[] = [
  "northeast",
  "midwest",
  "south",
  "west",
];

export default function StateIndexPage() {
  const grouped = REGION_ORDER.map((region) => ({
    region,
    states: STATES.filter((s) => s.region === region).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  }));

  const industryCount = STATE_INDUSTRIES.length;
  const totalPages = STATES.length * industryCount;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      <section
        className="relative overflow-hidden bg-brand-bg pt-32 pb-16 sm:pt-40 sm:pb-20"
        aria-label="Hero"
      >
        <div
          className="pointer-events-none absolute inset-0 animate-gradient bg-[length:300%_300%] bg-[linear-gradient(135deg,rgba(34,211,238,0.07),rgba(167,139,250,0.05),rgba(244,114,182,0.04),rgba(34,211,238,0.02))]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-cyan/5 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            By state
          </p>
          <h1 className="font-heading text-[clamp(2rem,5vw,3.75rem)] italic leading-[1.1] tracking-tight text-brand-white">
            Small Business Marketing,{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              State by State
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            Customer-perks marketing tips for every U.S. state. {STATES.length}{" "}
            states × {industryCount} industries = {totalPages.toLocaleString()}{" "}
            ways to grow a local business with the customers you already have.
          </p>
        </div>
      </section>

      {grouped.map((group) => (
        <section
          key={group.region}
          className="relative bg-brand-bg py-16 sm:py-20"
          aria-labelledby={`region-${group.region}-heading`}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
            aria-hidden="true"
          />
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
              Region
            </p>
            <h2
              id={`region-${group.region}-heading`}
              className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] italic leading-tight text-brand-white"
            >
              {regionLabel(group.region)} ({group.states.length} states)
            </h2>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.states.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/state/${s.slug}`}
                    className="group block rounded-xl border border-brand-border/40 bg-brand-surface/30 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-heading text-lg italic text-brand-white">
                        {s.name}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                        {s.abbreviation} · {industryCount} industries
                      </p>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-brand-dim sm:text-sm">
                      Largest city: {s.largestCity}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section
        className="relative bg-brand-bg py-20 sm:py-28"
        aria-label="Call to action"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-[clamp(1.75rem,4vw,3rem)] italic leading-[1.15] text-brand-white">
            Don't see your industry?
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            Social Perks works for any local business. Start a free trial and
            we'll generate campaigns tuned to your category.
          </p>
          <div className="mt-10 flex justify-center">
            <a
              href="/auth"
              className="rounded-xl bg-brand-cyan px-10 py-4 font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50"
            >
              Start free trial
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
