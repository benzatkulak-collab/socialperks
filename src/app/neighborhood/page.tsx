import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { NEIGHBORHOOD_CITIES } from "@/lib/programmatic-seo/neighborhoods";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.onrender.com";

export const metadata: Metadata = {
  title: "Neighborhood marketing pages | Social Perks",
  description:
    "Hyperlocal marketing pages across NYC, LA, and Chicago. 30 neighborhoods, 8 industries, 240 ways to win local search.",
  openGraph: {
    title: "Neighborhood marketing pages | Social Perks",
    description:
      "Hyperlocal marketing pages across NYC, LA, and Chicago. 30 neighborhoods, 8 industries.",
    type: "website",
    url: `${SITE_URL}/neighborhood`,
    siteName: "Social Perks",
  },
  alternates: { canonical: `${SITE_URL}/neighborhood` },
};

export default function NeighborhoodIndexPage() {
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
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <nav
            className="mb-8 flex flex-wrap items-center gap-2 text-sm text-brand-muted"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition-colors hover:text-brand-text">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">Neighborhoods</span>
          </nav>

          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            30 neighborhoods · 8 industries · 240 pages
          </p>

          <h1 className="font-heading text-[clamp(2rem,5vw,3.75rem)] italic leading-[1.1] tracking-tight text-brand-white">
            Neighborhood{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              marketing
            </span>{" "}
            pages
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            Local search is hyperlocal — customers type "{`{industry}`} in{" "}
            {`{neighborhood}`}", not "{`{industry}`} in {`{city}`}". We
            built dedicated marketing pages for every neighborhood we cover so
            your shop shows up where the search actually happens.
          </p>
        </div>
      </section>

      <section
        className="relative bg-brand-bg py-20 sm:py-24"
        aria-labelledby="cities-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Cities
          </p>
          <h2
            id="cities-heading"
            className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] italic leading-tight text-brand-white"
          >
            Pick a city
          </h2>

          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {NEIGHBORHOOD_CITIES.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/neighborhood/${city.slug}`}
                  className="block h-full rounded-xl border border-brand-border/40 bg-brand-surface/30 p-6 transition-all hover:-translate-y-1 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                    {city.state}
                  </p>
                  <p className="mt-3 font-heading text-2xl italic text-brand-white">
                    {city.name}
                  </p>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
                    {city.neighborhoodCount} neighborhoods
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

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
            Win neighborhood search
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            Start your 14-day free trial. No credit card, no setup fee.
          </p>
          <div className="mt-10 flex justify-center">
            <a
              href="/dashboard#signup"
              className="rounded-xl bg-brand-cyan px-10 py-4 font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50"
            >
              Start your 14-day free trial
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
