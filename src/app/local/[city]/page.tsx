import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  CITIES,
  CITY_MAP,
  INDUSTRIES,
} from "@/lib/programmatic-seo/data";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.onrender.com";

export function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.slug }));
}

interface PageProps {
  params: Promise<{ city: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = CITY_MAP.get(citySlug);
  if (!city) return {};

  const title = `Small Business Marketing in ${city.name}, ${city.stateCode} | Social Perks`;
  const description = `Customer-perks marketing tips for small businesses in ${city.name}, ${city.state}. ${INDUSTRIES.length} industries with ready-to-launch campaign ideas.`;
  const url = `${SITE_URL}/local/${city.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: "Social Perks",
    },
  };
}

export default async function CityIndexPage({ params }: PageProps) {
  const { city: citySlug } = await params;
  const city = CITY_MAP.get(citySlug);
  if (!city) notFound();

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
              href="/local"
              className="transition-colors hover:text-brand-text"
            >
              Local
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">
              {city.name}, {city.stateCode}
            </span>
          </nav>

          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            {city.region} · {city.state}
          </p>
          <h1 className="font-heading text-[clamp(2rem,5vw,3.75rem)] italic leading-[1.1] tracking-tight text-brand-white">
            Marketing playbooks for{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              {city.name}
            </span>{" "}
            small businesses
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            {city.name}, {city.stateCode} is home to{" "}
            {Math.round(city.population / 1000).toLocaleString()}k residents
            and a tightly-packed neighborhood economy. Whether you run a
            corner coffee shop or a med spa, your best marketing channel is
            the customers already walking in. Pick your industry below to see
            the campaigns we'd run in {city.name}.
          </p>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section
        className="relative bg-brand-bg pb-20 sm:pb-28"
        aria-labelledby="industries-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <h2
            id="industries-heading"
            className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] italic leading-tight text-brand-white"
          >
            Industries in {city.name}
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            {INDUSTRIES.length} ready-to-launch playbooks tailored to{" "}
            {city.name}.
          </p>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {INDUSTRIES.map((industry) => (
              <li key={industry.slug}>
                <Link
                  href={`/local/${city.slug}/${industry.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-brand-border/40 bg-brand-surface/30 px-5 py-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  <span>
                    <span className="block font-body text-base font-medium text-brand-white">
                      {industry.plural} in {city.name}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-brand-muted">
                      {industry.platforms.slice(0, 3).join(" · ")}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-brand-cyan transition-transform group-hover:translate-x-0.5"
                  >
                    &rarr;
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-12 flex justify-center">
            <Link
              href="/local"
              className="rounded-xl border border-brand-border/40 bg-brand-surface/30 px-5 py-3 text-sm text-brand-muted transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 hover:text-brand-text"
            >
              &larr; All cities
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
