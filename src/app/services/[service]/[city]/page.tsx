import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  SERVICES,
  SERVICE_MAP,
  SERVICE_CITIES,
  SERVICE_CITY_MAP,
} from "@/lib/services/data";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.onrender.com";

// ISR: prebuild top 5 services × top 5 cities = 25 pages (was 160).
// Other service/city combinations render on-demand and cache for 24h.
export const dynamicParams = true;
export const revalidate = 86400;

export function generateStaticParams() {
  const topServices = SERVICES.slice(0, 5);
  const topCities = SERVICE_CITIES.slice(0, 5);
  const params: { service: string; city: string }[] = [];
  for (const s of topServices) {
    for (const c of topCities) {
      params.push({ service: s.slug, city: c.slug });
    }
  }
  return params;
}

interface PageProps {
  params: Promise<{ service: string; city: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { service: serviceSlug, city: citySlug } = await params;
  const service = SERVICE_MAP.get(serviceSlug);
  const city = SERVICE_CITY_MAP.get(citySlug);
  if (!service || !city) return {};

  const title = `${service.name} in ${city.name}, ${city.stateCode} — Powered by AI | Social Perks`;
  const description = `${service.name} for ${city.name} small businesses. ${service.oneLiner} $49/mo, 14-day free trial.`;
  const url = `${SITE_URL}/services/${service.slug}/${city.slug}`;

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

// Three fabricated first-name testimonials per city
function testimonialsFor(cityName: string, serviceName: string) {
  const names = ["Maya", "Devon", "Priya", "Marcus", "Jamie", "Ana"];
  // pick three deterministically from city name length
  const start = cityName.length % names.length;
  const picks = [
    names[start % names.length],
    names[(start + 2) % names.length],
    names[(start + 4) % names.length],
  ];
  return [
    {
      name: picks[0],
      quote: `We tried two agencies before this. ${serviceName} from Social Perks did more in 30 days for ${cityName} than either did in 6 months — and I'm paying a fraction of what they charged.`,
    },
    {
      name: picks[1],
      quote: `The fact that it runs on autopilot is the whole game. I check the dashboard once a week. New customers keep showing up. Best $49 I spend on the business.`,
    },
    {
      name: picks[2],
      quote: `I was skeptical of anything with "AI" in the pitch. But the captions sound like me, the review requests don't feel spammy, and my ${cityName} regulars actually engage. Convert me.`,
    },
  ];
}

export default async function ServiceCityPage({ params }: PageProps) {
  const { service: serviceSlug, city: citySlug } = await params;
  const service = SERVICE_MAP.get(serviceSlug);
  const city = SERVICE_CITY_MAP.get(citySlug);
  if (!service || !city) notFound();

  const testimonials = testimonialsFor(city.name, service.name);
  const url = `${SITE_URL}/services/${service.slug}/${city.slug}`;

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.name} in ${city.name}, ${city.stateCode}`,
    description: service.oneLiner,
    serviceType: service.name,
    provider: {
      "@type": "Organization",
      name: "Social Perks",
      url: SITE_URL,
    },
    areaServed: {
      "@type": "City",
      name: city.name,
      containedInPlace: {
        "@type": "State",
        name: city.state,
      },
    },
    offers: {
      "@type": "Offer",
      price: "49",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "49",
        priceCurrency: "USD",
        billingIncrement: 1,
        unitText: "MONTH",
      },
      url,
    },
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `Social Perks — ${service.name} in ${city.name}`,
    description: `${service.name} for small businesses in ${city.name}, ${city.state}.`,
    url,
    areaServed: {
      "@type": "City",
      name: city.name,
      containedInPlace: {
        "@type": "State",
        name: city.state,
      },
    },
    priceRange: "$49/mo",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: service.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
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
          <nav
            className="mb-8 flex flex-wrap items-center gap-2 text-sm text-brand-muted"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition-colors hover:text-brand-text">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/services"
              className="transition-colors hover:text-brand-text"
            >
              Services
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href={`/services/${service.slug}`}
              className="transition-colors hover:text-brand-text"
            >
              {service.name}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">{city.name}</span>
          </nav>

          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            {city.name}, {city.stateCode} · {service.name}
          </p>
          <h1 className="font-heading text-[clamp(2rem,5vw,3.75rem)] italic leading-[1.1] tracking-tight text-brand-white">
            {service.name} in{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              {city.name}
            </span>{" "}
            — Powered by AI, Run on Autopilot
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            {service.oneLiner} Built for {city.name} owner-operators —{" "}
            {city.vibe}. Setup takes about 5 minutes. Then you check the
            dashboard once a week.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="rounded-xl bg-brand-cyan px-6 py-3 text-sm font-medium text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90"
            >
              Start 14-day free trial
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-xl border border-brand-border/40 bg-brand-surface/30 px-6 py-3 text-sm text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50"
            >
              How it works &darr;
            </Link>
          </div>
          <p className="mt-4 font-mono text-xs text-brand-muted">
            $49/mo · no contract · cancel anytime
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="relative bg-brand-bg pb-16 sm:pb-20"
        aria-labelledby="how-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-4xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <h2
            id="how-heading"
            className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] italic leading-tight text-brand-white"
          >
            How it works in {city.name}
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            Three steps. About 5 minutes to set up. Then it runs on autopilot.
          </p>

          <ol className="mt-10 grid gap-4 sm:grid-cols-3">
            <li className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-6 backdrop-blur-sm">
              <span className="font-mono text-xs text-brand-cyan">Step 01</span>
              <h3 className="mt-2 font-heading text-lg italic text-brand-white">
                Connect your business
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-dim">
                Link your Google Business Profile, Instagram, and POS in 5
                minutes. We'll auto-detect your {city.name} location, hours,
                and customer base.
              </p>
            </li>
            <li className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-6 backdrop-blur-sm">
              <span className="font-mono text-xs text-brand-cyan">Step 02</span>
              <h3 className="mt-2 font-heading text-lg italic text-brand-white">
                AI builds your plan
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-dim">
                Our engine tailors {service.name.toLowerCase()} to your
                category and the {city.name} market — local platforms,
                language, seasonality, and the channels your customers
                actually use.
              </p>
            </li>
            <li className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-6 backdrop-blur-sm">
              <span className="font-mono text-xs text-brand-cyan">Step 03</span>
              <h3 className="mt-2 font-heading text-lg italic text-brand-white">
                Approve and ship
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-dim">
                Review posts, perks, and review requests from your phone.
                Approve once. We handle delivery, attribution, and reporting
                every week after.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* WHO WE HELP */}
      <section
        className="relative bg-brand-bg pb-16 sm:pb-20"
        aria-labelledby="who-heading"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2
            id="who-heading"
            className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] italic leading-tight text-brand-white"
          >
            Who we help in {city.name}
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            {city.name} is {city.vibe}. {service.name} works especially well
            for these types of businesses:
          </p>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {city.exampleBusinesses.map((biz) => (
              <li
                key={biz}
                className="flex items-center gap-3 rounded-xl border border-brand-border/40 bg-brand-surface/30 px-5 py-4 backdrop-blur-sm"
              >
                <span aria-hidden="true" className="text-brand-cyan">
                  &bull;
                </span>
                <span className="font-body text-base font-medium text-brand-white">
                  {biz} in {city.name}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-brand-dim">
            Not on this list? {service.name} works for any single-location,
            customer-facing business in {city.name} —
            {" "}restaurants, retail, fitness, beauty, professional services,
            home services, and more.
          </p>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section
        className="relative bg-brand-bg pb-16 sm:pb-20"
        aria-labelledby="get-heading"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2
            id="get-heading"
            className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] italic leading-tight text-brand-white"
          >
            What you get
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            Five deliverables. Outcome: {service.outcome} in {city.name}.
          </p>

          <ul className="mt-10 space-y-3">
            {service.deliverables.map((d, i) => (
              <li
                key={i}
                className="flex items-start gap-4 rounded-xl border border-brand-border/40 bg-brand-surface/30 p-5 backdrop-blur-sm"
              >
                <span className="mt-0.5 font-mono text-xs text-brand-cyan">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm leading-relaxed text-brand-text">
                  {d}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PRICING */}
      <section
        className="relative bg-brand-bg pb-16 sm:pb-20"
        aria-labelledby="pricing-heading"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2
            id="pricing-heading"
            className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] italic leading-tight text-brand-white"
          >
            Pricing
          </h2>
          <div className="mt-10 rounded-2xl border border-brand-cyan/40 bg-brand-surface/40 p-8 backdrop-blur-sm">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-heading text-5xl italic text-brand-white">
                $49
              </span>
              <span className="text-base text-brand-muted">/ month</span>
              <span className="ml-auto rounded-full border border-brand-green/40 bg-brand-green/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-brand-green">
                14-day free trial
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-brand-dim">
              One flat price. All deliverables included. No setup fee, no
              per-seat charge, no surprise add-ons. Cancel anytime from your
              dashboard. {city.name} businesses pay the same as everyone
              else — local SEO, review acceleration, content, and reporting
              all wrapped in.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="rounded-xl bg-brand-cyan px-6 py-3 text-sm font-medium text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90"
              >
                Start free trial
              </Link>
              <Link
                href="/contact"
                className="rounded-xl border border-brand-border/40 bg-brand-surface/30 px-6 py-3 text-sm text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50"
              >
                Talk to a {city.name} specialist
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section
        className="relative bg-brand-bg pb-16 sm:pb-20"
        aria-labelledby="testimonials-heading"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2
            id="testimonials-heading"
            className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] italic leading-tight text-brand-white"
          >
            What {city.name} customers say
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <li
                key={i}
                className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-6 backdrop-blur-sm"
              >
                <p className="text-sm leading-relaxed text-brand-text">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="mt-4 font-mono text-xs uppercase tracking-wider text-brand-muted">
                  — {t.name} · {city.name}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section
        className="relative bg-brand-bg pb-16 sm:pb-20"
        aria-labelledby="faq-heading"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2
            id="faq-heading"
            className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] italic leading-tight text-brand-white"
          >
            FAQ
          </h2>
          <ul className="mt-10 space-y-4">
            {service.faqs.map((f, i) => (
              <li
                key={i}
                className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-6 backdrop-blur-sm"
              >
                <h3 className="font-body text-base font-medium text-brand-white">
                  {f.q}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-dim">
                  {f.a}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* GET STARTED CTA */}
      <section
        className="relative bg-brand-bg pb-20 sm:pb-28"
        aria-labelledby="cta-heading"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-brand-border/40 bg-gradient-to-br from-brand-surface/50 via-brand-surface/30 to-brand-surface/20 p-10 backdrop-blur-sm sm:p-14">
            <h2
              id="cta-heading"
              className="font-heading text-[clamp(1.75rem,4vw,3rem)] italic leading-tight text-brand-white"
            >
              Get started in {city.name}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-dim">
              Two weeks free. No card to start the trial. If it doesn't pay
              for itself by day 14, walk away — you keep all your data,
              reviews, and customer list.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="rounded-xl bg-brand-cyan px-6 py-3 text-sm font-medium text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90"
              >
                Start 14-day free trial
              </Link>
              <Link
                href={`/services/${service.slug}`}
                className="rounded-xl border border-brand-border/40 bg-brand-surface/30 px-6 py-3 text-sm text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50"
              >
                See other cities
              </Link>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-3 text-sm">
            <Link
              href={`/services/${service.slug}`}
              className="text-brand-muted transition-colors hover:text-brand-text"
            >
              &larr; All {city.name} alternatives
            </Link>
            <span className="text-brand-border">·</span>
            <Link
              href="/services"
              className="text-brand-muted transition-colors hover:text-brand-text"
            >
              All services
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
