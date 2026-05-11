import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  NEIGHBORHOOD_CITIES,
  NEIGHBORHOOD_CITY_SLUGS,
  getNeighborhoodsForCity,
} from "@/lib/programmatic-seo/neighborhoods";

export function generateStaticParams() {
  return NEIGHBORHOOD_CITY_SLUGS.map((city) => ({ city }));
}

interface PageProps {
  params: Promise<{ city: string }>;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.onrender.com";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = NEIGHBORHOOD_CITIES.find((c) => c.slug === citySlug);
  if (!city) return {};

  const title = `${city.name} neighborhood marketing | Social Perks`;
  const description = `Hyperlocal marketing pages for every ${city.name} neighborhood. Pick a neighborhood and launch a customer-perks campaign tonight.`;
  const url = `${SITE_URL}/neighborhood/${city.slug}`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website", url, siteName: "Social Perks" },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: url },
  };
}

export default async function NeighborhoodCityPage({ params }: PageProps) {
  const { city: citySlug } = await params;
  const city = NEIGHBORHOOD_CITIES.find((c) => c.slug === citySlug);
  if (!city) notFound();

  const neighborhoods = getNeighborhoodsForCity(city.slug);

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
            <Link
              href="/neighborhood"
              className="transition-colors hover:text-brand-text"
            >
              Neighborhoods
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">{city.name}</span>
          </nav>

          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            {city.state} · {city.neighborhoodCount} neighborhoods
          </p>

          <h1 className="font-heading text-[clamp(2rem,5vw,3.75rem)] italic leading-[1.1] tracking-tight text-brand-white">
            Neighborhood marketing in{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              {city.name}
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            {city.name} is a city of neighborhoods, and local search treats it
            that way. Pick yours below to see hyperlocal marketing tactics,
            campaign ideas, and Social Perks plays that match the vibe of your
            block — not a generic city-wide listing.
          </p>
        </div>
      </section>

      <section
        className="relative bg-brand-bg py-20 sm:py-24"
        aria-labelledby="neighborhoods-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 id="neighborhoods-heading" className="sr-only">
            Neighborhoods
          </h2>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {neighborhoods.map((n) => (
              <li key={n.slug}>
                <Link
                  href={`/neighborhood/${n.citySlug}/${n.slug}`}
                  className="block h-full rounded-xl border border-brand-border/40 bg-brand-surface/30 p-6 transition-all hover:-translate-y-1 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                    {n.cityName}, {n.stateCode}
                  </p>
                  <p className="mt-3 font-heading text-xl italic text-brand-white">
                    {n.name}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-brand-dim line-clamp-3">
                    {n.vibe.split(".")[0]}.
                  </p>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
                    {n.industriesActive}+ active businesses
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
            Launch your {city.name} campaign in 5 minutes
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            Start your 14-day free trial — no credit card required.
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
