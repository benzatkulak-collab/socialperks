import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { CITIES, INDUSTRIES } from "@/lib/programmatic-seo/data";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.onrender.com";

export const metadata: Metadata = {
  title: "Local Marketing Tips by City | Social Perks",
  description:
    "Find Social Perks marketing tips for your city. Customer-perks campaigns built for small businesses across 50 U.S. cities and 20 industries.",
  alternates: { canonical: `${SITE_URL}/local` },
  openGraph: {
    title: "Local Marketing Tips by City | Social Perks",
    description:
      "Find Social Perks marketing tips for your city. 50 U.S. cities × 20 industries.",
    type: "website",
    url: `${SITE_URL}/local`,
    siteName: "Social Perks",
  },
};

export default function LocalIndexPage() {
  // Sort by population descending so the biggest cities surface first.
  const sorted = [...CITIES].sort((a, b) => b.population - a.population);
  const industryCount = INDUSTRIES.length;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      {/* HERO */}
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
            Local marketing
          </p>
          <h1 className="font-heading text-[clamp(2rem,5vw,3.75rem)] italic leading-[1.1] tracking-tight text-brand-white">
            Find Social Perks marketing tips{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              for your city
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            We've put together {CITIES.length} city playbooks across{" "}
            {industryCount} industries. Pick your city to see campaign ideas,
            top platforms, and the perks that work best for local
            small-business owners.
          </p>
        </div>
      </section>

      {/* CITY GRID */}
      <section
        className="relative bg-brand-bg pb-20 sm:pb-28"
        aria-labelledby="cities-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <h2
            id="cities-heading"
            className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] italic leading-tight text-brand-white"
          >
            All cities
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            Sorted by population. {industryCount} industries available per
            city.
          </p>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {sorted.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/local/${city.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-brand-border/40 bg-brand-surface/30 px-5 py-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  <span>
                    <span className="block font-body text-base font-medium text-brand-white">
                      {city.name}, {city.stateCode}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-brand-muted">
                      {city.region}
                    </span>
                  </span>
                  <span className="rounded-md bg-brand-cyan/10 px-2 py-1 font-mono text-[11px] font-semibold text-brand-cyan">
                    {industryCount} industries
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer />
    </div>
  );
}
