import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  CITIES,
  CITY_MAP,
  INDUSTRIES,
  INDUSTRY_MAP,
  getNearbyCities,
  getOtherIndustries,
} from "@/lib/programmatic-seo/data";

// ---------------------------------------------------------------------------
// ISR: prebuild top 10 cities × top 5 industries = 50 pages (was up to 1,000).
// Other city/industry combinations render on-demand and cache for 24h.
// ---------------------------------------------------------------------------

export const dynamicParams = true;
export const revalidate = 86400;

export function generateStaticParams() {
  const topCities = CITIES.slice(0, 10);
  const topIndustries = INDUSTRIES.slice(0, 5);
  const params: { city: string; industry: string }[] = [];
  for (const c of topCities) {
    for (const i of topIndustries) {
      params.push({ city: c.slug, industry: i.slug });
    }
  }
  return params;
}

interface PageProps {
  params: Promise<{ city: string; industry: string }>;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.onrender.com";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { city: citySlug, industry: industrySlug } = await params;
  const city = CITY_MAP.get(citySlug);
  const industry = INDUSTRY_MAP.get(industrySlug);
  if (!city || !industry) return {};

  const [p1, p2] = industry.platforms;
  const title = `Marketing for ${industry.plural} in ${city.name}, ${city.stateCode} | Social Perks`;
  const description = `${industry.plural} in ${city.name} can use customer perks to drive ${p1} posts and ${p2} reviews. Start free for 14 days.`;
  const url = `${SITE_URL}/local/${city.slug}/${industry.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: "Social Perks",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: { canonical: url },
  };
}

export default async function LocalIndustryPage({ params }: PageProps) {
  const { city: citySlug, industry: industrySlug } = await params;
  const city = CITY_MAP.get(citySlug);
  const industry = INDUSTRY_MAP.get(industrySlug);
  if (!city || !industry) notFound();

  const [p1, p2, p3] = industry.platforms;
  const nearbyCities = getNearbyCities(city.slug, 5);
  const otherIndustries = getOtherIndustries(industry.slug, 5);
  const url = `${SITE_URL}/local/${city.slug}/${industry.slug}`;

  // Service schema (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Social Perks marketing for ${industry.plural} in ${city.name}`,
    description: `Customer-perks marketing platform that helps ${industry.plural.toLowerCase()} in ${city.name}, ${city.stateCode} drive ${p1} posts, ${p2} reviews, and word-of-mouth referrals.`,
    provider: {
      "@type": "Organization",
      name: "Social Perks",
      url: SITE_URL,
    },
    areaServed: {
      "@type": "City",
      name: city.name,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: `${city.state}, ${city.stateCode}`,
      },
    },
    serviceType: `${industry.singular} marketing`,
    url,
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
          {/* Breadcrumb */}
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
            <Link
              href={`/local/${city.slug}`}
              className="transition-colors hover:text-brand-text"
            >
              {city.name}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">{industry.plural}</span>
          </nav>

          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            {city.name}, {city.stateCode} · {industry.plural}
          </p>

          <h1 className="font-heading text-[clamp(2rem,5vw,3.75rem)] italic leading-[1.1] tracking-tight text-brand-white">
            Marketing for{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              {industry.plural}
            </span>{" "}
            in {city.name}, {city.state}
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            {industry.plural} in {city.name} can turn happy customers into a
            local marketing team. Social Perks lets you offer small rewards in
            exchange for {p1} posts, {p2} reviews, and {p3} shares — the kind
            of word-of-mouth that wins on neighborhood search and beats paid
            ads on cost.
          </p>

          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
            <a
              href="/dashboard#signup"
              className="w-full rounded-xl bg-brand-cyan px-8 py-3.5 text-center font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 sm:w-auto"
            >
              Start your 14-day free trial
            </a>
            <Link
              href={`/local/${city.slug}`}
              className="w-full rounded-xl border border-brand-border bg-brand-surface/50 px-8 py-3.5 text-center font-body text-base font-medium text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-subtle hover:bg-brand-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/30 sm:w-auto"
            >
              See all industries in {city.name}
            </Link>
          </div>

          <p className="mt-6 text-sm text-brand-muted">
            14 days free. No credit card. Setup in 5 minutes.
          </p>
        </div>
      </section>

      {/* CHALLENGES */}
      <section
        className="relative bg-brand-bg py-20 sm:py-24"
        aria-labelledby="challenges-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Local context
          </p>
          <h2
            id="challenges-heading"
            className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] italic leading-tight text-brand-white"
          >
            Common challenges for {industry.plural.toLowerCase()} in{" "}
            {city.name}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
            Owners we talk to in {city.name}, {city.stateCode} keep raising the
            same three issues:
          </p>

          <ul className="mt-10 grid gap-4 sm:gap-5 lg:grid-cols-3">
            {industry.painPoints.map((point, i) => {
              const accents = [
                "border-brand-amber",
                "border-brand-cyan",
                "border-brand-green",
              ];
              return (
                <li
                  key={point}
                  className={`group rounded-xl border-l-2 ${accents[i % 3]} border border-brand-border/40 bg-brand-surface/30 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-border/70 hover:bg-brand-surface/50 sm:p-6`}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                    Challenge {i + 1}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-brand-text sm:text-base">
                    {point}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* PLATFORMS */}
      <section
        className="relative bg-brand-bg py-20 sm:py-24"
        aria-labelledby="platforms-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Channel mix
          </p>
          <h2
            id="platforms-heading"
            className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] italic leading-tight text-brand-white"
          >
            Best social platforms for {industry.plural.toLowerCase()}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
            For {industry.plural.toLowerCase()} in {city.name}, these three
            platforms drive the most measurable lift:
          </p>

          <div className="mt-10 grid gap-4 sm:gap-5 lg:grid-cols-3">
            {industry.platforms.map((platform, i) => (
              <div
                key={platform}
                className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-border/70 hover:bg-brand-surface/50"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                  Platform {i + 1}
                </p>
                <p className="mt-3 font-heading text-2xl italic text-brand-white">
                  {platform}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-brand-dim">
                  Local-intent reach plus a discovery feed your neighborhood
                  customers already scroll daily.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAMPAIGN IDEAS */}
      <section
        className="relative bg-brand-bg py-20 sm:py-24"
        aria-labelledby="ideas-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Ready-to-run
          </p>
          <h2
            id="ideas-heading"
            className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] italic leading-tight text-brand-white"
          >
            5 campaign ideas for {city.name} {industry.plural.toLowerCase()}
          </h2>

          <ol className="mt-10 space-y-4">
            {[
              ...industry.campaignIdeas,
              `Loyalty perk for ${city.name} regulars who tag the shop on ${p1} three times in a month`,
              `Neighborhood spotlight: feature the best ${city.name} customer post each week on ${p2}`,
            ].map((idea, i) => (
              <li
                key={`${idea}-${i}`}
                className="flex gap-4 rounded-xl border border-brand-border/40 bg-brand-surface/30 p-5 backdrop-blur-sm transition-all hover:border-brand-border/70 hover:bg-brand-surface/50 sm:gap-5 sm:p-6"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-cyan/10 font-mono text-sm font-semibold text-brand-cyan"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-brand-text sm:text-base">
                  {idea}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* HOW SOCIAL PERKS HELPS */}
      <section
        className="relative bg-brand-bg py-20 sm:py-24"
        aria-labelledby="help-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Why Social Perks
          </p>
          <h2
            id="help-heading"
            className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] italic leading-tight text-brand-white"
          >
            How Social Perks helps {industry.singular.toLowerCase()} owners in{" "}
            {city.name}
          </h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-brand-dim sm:text-lg">
            <p>
              Most {industry.plural.toLowerCase()} in {city.name} already have
              the marketing budget they need — it's just walking through the
              door every day. Social Perks turns that traffic into measurable
              social proof. Pick a perk (a discount, a freebie, a featured
              spot), pick the action (a {p1} post, a {p2} review, a {p3}{" "}
              share), and we handle the verification, FTC disclosure, and
              tracking automatically.
            </p>
            <p>
              You get a campaign live in five minutes, customers get a real
              reward for sharing, and your shop shows up where {city.name}{" "}
              neighbors are already searching. No agency contracts, no
              guesswork, and no paid-ad spend you can't track back to a real
              customer.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="relative bg-brand-bg py-20 sm:py-28"
        aria-label="Call to action"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/4 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-brand-cyan/[0.04] blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-[clamp(1.75rem,4vw,3rem)] italic leading-[1.15] text-brand-white">
            Ready to grow your {city.name}{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              {industry.singular.toLowerCase()}
            </span>
            ?
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            Try Social Perks free for 14 days. Launch your first campaign
            tonight.
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

      {/* CROSS-LINKS */}
      <section
        className="relative bg-brand-bg pb-20 sm:pb-28"
        aria-labelledby="crosslinks-heading"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 id="crosslinks-heading" className="sr-only">
            Related pages
          </h2>

          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted sm:text-xs">
                More cities for {industry.plural.toLowerCase()}
              </p>
              <ul className="flex flex-wrap gap-2 sm:gap-3">
                {nearbyCities.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/local/${c.slug}/${industry.slug}`}
                      className="inline-flex items-center rounded-lg border border-brand-border/40 bg-brand-surface/30 px-3.5 py-2 text-sm text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                    >
                      {industry.plural} in {c.name}, {c.stateCode}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted sm:text-xs">
                More industries in {city.name}
              </p>
              <ul className="flex flex-wrap gap-2 sm:gap-3">
                {otherIndustries.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/local/${city.slug}/${other.slug}`}
                      className="inline-flex items-center rounded-lg border border-brand-border/40 bg-brand-surface/30 px-3.5 py-2 text-sm text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                    >
                      {other.plural} in {city.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
