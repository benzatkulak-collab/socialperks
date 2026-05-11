import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { INDUSTRIES } from "@/lib/programmatic-seo/data";
import {
  NEIGHBORHOODS,
  getNeighborhood,
  getNearbyNeighborhoods,
} from "@/lib/programmatic-seo/neighborhoods";

const NEIGHBORHOOD_INDUSTRIES = [
  "restaurants",
  "coffee-shops",
  "yoga-studios",
  "salons",
  "boutiques",
  "gyms",
  "bars",
  "bakeries",
];

export function generateStaticParams() {
  return NEIGHBORHOODS.map((n) => ({
    city: n.citySlug,
    neighborhood: n.slug,
  }));
}

interface PageProps {
  params: Promise<{ city: string; neighborhood: string }>;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.onrender.com";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { city: citySlug, neighborhood: neighborhoodSlug } = await params;
  const neighborhood = getNeighborhood(citySlug, neighborhoodSlug);
  if (!neighborhood) return {};

  const title = `Marketing for ${neighborhood.name} businesses | Social Perks`;
  const description = `Hyperlocal marketing for ${neighborhood.name}, ${neighborhood.cityName}. Pick your industry and launch a perk-driven customer campaign in five minutes.`;
  const url = `${SITE_URL}/neighborhood/${neighborhood.citySlug}/${neighborhood.slug}`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website", url, siteName: "Social Perks" },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: url },
  };
}

export default async function NeighborhoodPage({ params }: PageProps) {
  const { city: citySlug, neighborhood: neighborhoodSlug } = await params;
  const neighborhood = getNeighborhood(citySlug, neighborhoodSlug);
  if (!neighborhood) notFound();

  const industries = INDUSTRIES.filter((i) =>
    NEIGHBORHOOD_INDUSTRIES.includes(i.slug),
  );
  const nearby = getNearbyNeighborhoods(
    neighborhood.citySlug,
    neighborhood.slug,
    9,
  );

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
            <Link
              href={`/neighborhood/${neighborhood.citySlug}`}
              className="transition-colors hover:text-brand-text"
            >
              {neighborhood.cityName}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">{neighborhood.name}</span>
          </nav>

          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            {neighborhood.cityName} · {neighborhood.name}
          </p>

          <h1 className="font-heading text-[clamp(2rem,5vw,3.75rem)] italic leading-[1.1] tracking-tight text-brand-white">
            Marketing for{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              {neighborhood.name}
            </span>{" "}
            businesses
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            {neighborhood.vibe}
          </p>

          <ul className="mt-8 flex flex-wrap gap-2 sm:gap-3">
            {neighborhood.landmarks.map((landmark) => (
              <li
                key={landmark}
                className="inline-flex items-center rounded-lg border border-brand-border/40 bg-brand-surface/30 px-3.5 py-2 font-mono text-xs uppercase tracking-[0.12em] text-brand-text"
              >
                {landmark}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="relative bg-brand-bg py-20 sm:py-24"
        aria-labelledby="industries-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Pick your industry
          </p>
          <h2
            id="industries-heading"
            className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] italic leading-tight text-brand-white"
          >
            8 industries we cover in {neighborhood.name}
          </h2>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {industries.map((industry) => (
              <li key={industry.slug}>
                <Link
                  href={`/neighborhood/${neighborhood.citySlug}/${neighborhood.slug}/${industry.slug}`}
                  className="block h-full rounded-xl border border-brand-border/40 bg-brand-surface/30 p-5 transition-all hover:-translate-y-1 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  <p className="font-heading text-lg italic text-brand-white">
                    {industry.plural}
                  </p>
                  <p className="mt-2 text-sm text-brand-dim">
                    in {neighborhood.name}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="relative bg-brand-bg py-20 sm:py-24"
        aria-labelledby="nearby-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted sm:text-xs">
            Nearby
          </p>
          <h2
            id="nearby-heading"
            className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] italic leading-tight text-brand-white"
          >
            Other {neighborhood.cityName} neighborhoods
          </h2>
          <ul className="mt-8 flex flex-wrap gap-2 sm:gap-3">
            {nearby.map((n) => (
              <li key={n.slug}>
                <Link
                  href={`/neighborhood/${n.citySlug}/${n.slug}`}
                  className="inline-flex items-center rounded-lg border border-brand-border/40 bg-brand-surface/30 px-3.5 py-2 text-sm text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  {n.name}
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
            Run your first {neighborhood.name} campaign tonight
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            Try Social Perks free for 14 days. No credit card, setup in 5
            minutes.
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
