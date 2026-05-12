import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  INDUSTRIES,
  INDUSTRY_MAP,
} from "@/lib/programmatic-seo/data";
import {
  NEIGHBORHOODS,
  getNeighborhood,
  getNearbyNeighborhoods,
} from "@/lib/programmatic-seo/neighborhoods";

// ---------------------------------------------------------------------------
// ISR: prebuild only NYC neighborhoods × 8 industries = 80 pages (was 240).
// LA and Chicago neighborhood pages render on-demand and cache for 24h.
// ---------------------------------------------------------------------------

export const dynamicParams = true;
export const revalidate = 86400;

const NEIGHBORHOOD_INDUSTRIES = [
  "restaurants",
  "coffee-shops",
  "yoga-studios",
  "salons",
  "boutiques",
  "gyms",
  "bars",
  "bakeries",
] as const;

export function generateStaticParams() {
  const nycNeighborhoods = NEIGHBORHOODS.filter(
    (n) => n.citySlug === "new-york-ny",
  );
  const params: { city: string; neighborhood: string; industry: string }[] = [];
  for (const n of nycNeighborhoods) {
    for (const ind of NEIGHBORHOOD_INDUSTRIES) {
      params.push({
        city: n.citySlug,
        neighborhood: n.slug,
        industry: ind,
      });
    }
  }
  return params;
}

interface PageProps {
  params: Promise<{
    city: string;
    neighborhood: string;
    industry: string;
  }>;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.onrender.com";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const {
    city: citySlug,
    neighborhood: neighborhoodSlug,
    industry: industrySlug,
  } = await params;
  const neighborhood = getNeighborhood(citySlug, neighborhoodSlug);
  const industry = INDUSTRY_MAP.get(industrySlug);
  if (!neighborhood || !industry) return {};

  const title = `Marketing for ${industry.plural} in ${neighborhood.name}, ${neighborhood.cityName} | Social Perks`;
  const description = `${industry.plural} in ${neighborhood.name} use Social Perks to turn ${neighborhood.name} regulars into a local marketing team. Start free for 14 days.`;
  const url = `${SITE_URL}/neighborhood/${neighborhood.citySlug}/${neighborhood.slug}/${industry.slug}`;

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

export default async function NeighborhoodIndustryPage({ params }: PageProps) {
  const {
    city: citySlug,
    neighborhood: neighborhoodSlug,
    industry: industrySlug,
  } = await params;
  const neighborhood = getNeighborhood(citySlug, neighborhoodSlug);
  const industry = INDUSTRY_MAP.get(industrySlug);
  if (!neighborhood || !industry) notFound();

  const [p1, p2, p3] = industry.platforms;
  const [landmark1, landmark2, landmark3] = neighborhood.landmarks;
  const nearbyNeighborhoods = getNearbyNeighborhoods(
    neighborhood.citySlug,
    neighborhood.slug,
    5,
  );
  // Only cross-link to industries that have neighborhood pages.
  const otherIndustries = INDUSTRIES.filter(
    (i) =>
      i.slug !== industry.slug &&
      NEIGHBORHOOD_INDUSTRIES.includes(
        i.slug as (typeof NEIGHBORHOOD_INDUSTRIES)[number],
      ),
  ).slice(0, 5);
  const url = `${SITE_URL}/neighborhood/${neighborhood.citySlug}/${neighborhood.slug}/${industry.slug}`;

  // Hyperlocal pain points
  const localPainPoints = [
    `Competing with established ${neighborhood.name} ${industry.plural.toLowerCase()} for foot traffic — the regulars already have their go-to spots and changing minds takes more than a discount.`,
    `${neighborhood.name} rent and labor costs mean every customer matters, but most ${industry.plural.toLowerCase()} have no system to turn one good visit into three social-media posts.`,
    `Locals near ${landmark1} and ${landmark2} search by neighborhood, not by city — and a generic "${neighborhood.cityName} ${industry.plural.toLowerCase()}" listing buries you under places miles away.`,
  ];

  // What works in this neighborhood
  const whatWorks = [
    `Lead with the neighborhood, not the city. Pin "${neighborhood.name}" in your Google Business profile and feature it in your ${p1} bio — local search ranks proximity over brand.`,
    `Tap the ${landmark1} foot-traffic moment. Customers passing ${landmark1} are already in discovery mode, so a perk for posting from your location converts faster than cold reach.`,
    `Lean into ${neighborhood.name}'s vibe. ${neighborhood.vibe.split(".")[0]}. Generic campaigns get ignored — neighborhood-coded ones get shared.`,
    `Use ${p2} reviews as proof, not vanity. A handful of recent reviews mentioning "${neighborhood.name}" outperforms hundreds of generic five-stars for local-pack ranking.`,
    `Reward second visits over first ones. ${industry.plural} in ${neighborhood.name} live on repeat customers, so structure perks to bring people back within two weeks rather than chase one-time tourists.`,
  ];

  // Hyperlocal campaign ideas
  const campaignIdeas = [
    `10% off the next visit for any customer who posts a ${p1} Story tagging your location near ${landmark1}.`,
    `Free upgrade (extra shot, side dish, add-on service) for a ${p2} review that mentions "${neighborhood.name}" by name.`,
    `Featured on your ${neighborhood.name} customer wall and a free item for the best ${p3} post of the week.`,
    `${neighborhood.name}-only loyalty perk: tag your shop three times in 30 days from ${landmark2} or ${landmark3} and unlock a bonus reward.`,
    `Neighbor-of-the-month: pick one ${neighborhood.name} regular each month, comp their visit, and feature their story on ${p1} — every other regular wants to be next.`,
  ];

  // Service schema (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Social Perks marketing for ${industry.plural} in ${neighborhood.name}, ${neighborhood.cityName}`,
    description: `Customer-perks marketing platform that helps ${industry.plural.toLowerCase()} in ${neighborhood.name}, ${neighborhood.cityName} drive ${p1} posts, ${p2} reviews, and word-of-mouth referrals from neighborhood customers.`,
    provider: {
      "@type": "Organization",
      name: "Social Perks",
      url: SITE_URL,
    },
    areaServed: [
      {
        "@type": "Place",
        name: `${neighborhood.name}, ${neighborhood.cityName}`,
      },
      {
        "@type": "City",
        name: neighborhood.cityName,
        containedInPlace: {
          "@type": "AdministrativeArea",
          name: `${neighborhood.state}, ${neighborhood.stateCode}`,
        },
      },
    ],
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
            <Link
              href={`/neighborhood/${neighborhood.citySlug}/${neighborhood.slug}`}
              className="transition-colors hover:text-brand-text"
            >
              {neighborhood.name}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">{industry.plural}</span>
          </nav>

          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            {neighborhood.name} · {neighborhood.cityName} · {industry.plural}
          </p>

          <h1 className="font-heading text-[clamp(2rem,5vw,3.75rem)] italic leading-[1.1] tracking-tight text-brand-white">
            Marketing for{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              {industry.plural}
            </span>{" "}
            in {neighborhood.name}, {neighborhood.cityName}
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            Help your {neighborhood.name} customers post about your business.
            Social Perks lets {industry.plural.toLowerCase()} near {landmark1}{" "}
            and {landmark2} offer small rewards in exchange for {p1} posts,{" "}
            {p2} reviews, and {p3} shares — the kind of neighborhood word of
            mouth that beats paid ads on cost and wins on local search.
          </p>

          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
            <a
              href="/auth"
              className="w-full rounded-xl bg-brand-cyan px-8 py-3.5 text-center font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 sm:w-auto"
            >
              Start your 14-day free trial
            </a>
            <Link
              href={`/neighborhood/${neighborhood.citySlug}/${neighborhood.slug}`}
              className="w-full rounded-xl border border-brand-border bg-brand-surface/50 px-8 py-3.5 text-center font-body text-base font-medium text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-subtle hover:bg-brand-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/30 sm:w-auto"
            >
              See all industries in {neighborhood.name}
            </Link>
          </div>

          <p className="mt-6 text-sm text-brand-muted">
            14 days free. No credit card. Setup in 5 minutes.
          </p>
        </div>
      </section>

      {/* NEIGHBORHOOD CONTEXT */}
      <section
        className="relative bg-brand-bg py-20 sm:py-24"
        aria-labelledby="context-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            About the neighborhood
          </p>
          <h2
            id="context-heading"
            className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] italic leading-tight text-brand-white"
          >
            What makes {neighborhood.name} different
          </h2>
          <p className="mt-6 text-base leading-relaxed text-brand-dim sm:text-lg">
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
            {neighborhood.name} {industry.plural.toLowerCase()} face unique
            challenges
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
            Owners we talk to in {neighborhood.name} keep raising the same
            three issues:
          </p>

          <ul className="mt-10 grid gap-4 sm:gap-5 lg:grid-cols-3">
            {localPainPoints.map((point, i) => {
              const accents = [
                "border-brand-amber",
                "border-brand-cyan",
                "border-brand-green",
              ];
              return (
                <li
                  key={i}
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

      {/* WHAT WORKS */}
      <section
        className="relative bg-brand-bg py-20 sm:py-24"
        aria-labelledby="works-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Tactics
          </p>
          <h2
            id="works-heading"
            className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] italic leading-tight text-brand-white"
          >
            What works in {neighborhood.name}
          </h2>

          <ol className="mt-10 space-y-4">
            {whatWorks.map((tactic, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-xl border border-brand-border/40 bg-brand-surface/30 p-5 backdrop-blur-sm transition-all hover:border-brand-border/70 hover:bg-brand-surface/50 sm:gap-5 sm:p-6"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 font-mono text-sm font-semibold text-brand-green"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-brand-text sm:text-base">
                  {tactic}
                </p>
              </li>
            ))}
          </ol>
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
            5 campaign ideas for {neighborhood.name}{" "}
            {industry.plural.toLowerCase()}
          </h2>

          <ol className="mt-10 space-y-4">
            {campaignIdeas.map((idea, i) => (
              <li
                key={i}
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
            How Social Perks helps {neighborhood.name} businesses
          </h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-brand-dim sm:text-lg">
            <p>
              Most {industry.plural.toLowerCase()} in {neighborhood.name}{" "}
              already have the marketing channel they need — it's the line at
              the counter and the table by the window. Social Perks turns that
              foot traffic into measurable {p1} posts, {p2} reviews, and{" "}
              {p3} shares, all tagged with your {neighborhood.name} location
              so neighbors searching nearby actually find you.
            </p>
            <p>
              Pick a perk (a discount, an upgrade, a featured spot), pick the
              action, and we handle the verification, FTC disclosure, and
              tracking automatically. A campaign goes live in five minutes,
              your customers get a real reward for sharing, and your shop
              shows up where people near {landmark3} are already looking. No
              agency, no contracts, and no paid-ad spend you can't attribute
              back to a real {neighborhood.name} customer.
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
            Ready to grow your {neighborhood.name}{" "}
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
              href="/auth"
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
                More {neighborhood.cityName} neighborhoods for{" "}
                {industry.plural.toLowerCase()}
              </p>
              <ul className="flex flex-wrap gap-2 sm:gap-3">
                {nearbyNeighborhoods.map((n) => (
                  <li key={n.slug}>
                    <Link
                      href={`/neighborhood/${n.citySlug}/${n.slug}/${industry.slug}`}
                      className="inline-flex items-center rounded-lg border border-brand-border/40 bg-brand-surface/30 px-3.5 py-2 text-sm text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                    >
                      {industry.plural} in {n.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted sm:text-xs">
                More industries in {neighborhood.name}
              </p>
              <ul className="flex flex-wrap gap-2 sm:gap-3">
                {otherIndustries.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/neighborhood/${neighborhood.citySlug}/${neighborhood.slug}/${other.slug}`}
                      className="inline-flex items-center rounded-lg border border-brand-border/40 bg-brand-surface/30 px-3.5 py-2 text-sm text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                    >
                      {other.plural} in {neighborhood.name}
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
