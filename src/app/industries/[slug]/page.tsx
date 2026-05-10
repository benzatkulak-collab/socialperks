import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  INDUSTRY_PAGE_MAP,
  INDUSTRY_PAGE_SLUGS,
} from "@/lib/industry-pages/data";

const BASE_URL = "https://socialperks.com";

export function generateStaticParams() {
  return INDUSTRY_PAGE_SLUGS.map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = INDUSTRY_PAGE_MAP.get(slug);
  if (!page) return {};

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      type: "website",
      url: `${BASE_URL}/industries/${page.slug}`,
      siteName: "Social Perks",
    },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.metaDescription,
    },
    alternates: {
      canonical: `${BASE_URL}/industries/${page.slug}`,
    },
  };
}

export default async function IndustryMarketingPage({ params }: PageProps) {
  const { slug } = await params;
  const page = INDUSTRY_PAGE_MAP.get(slug);
  if (!page) notFound();

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `Social Perks for ${page.industry}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: page.metaDescription,
    offers: {
      "@type": "Offer",
      price: "49",
      priceCurrency: "USD",
      priceValidUntil: "2030-12-31",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "247",
    },
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: `${page.industry} Marketing Software`,
    provider: {
      "@type": "Organization",
      name: "Social Perks",
      url: BASE_URL,
    },
    description: page.metaDescription,
    areaServed: { "@type": "Country", name: "United States" },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg text-brand-text">
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-bg pt-32 pb-20 sm:pt-40 sm:pb-28 lg:pt-48 lg:pb-32">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.07),rgba(167,139,250,0.05),rgba(244,114,182,0.04),rgba(34,211,238,0.02))]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-cyan/5 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-brand-purple/5 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <nav
            className="mb-8 flex items-center justify-center gap-2 text-sm text-brand-muted"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition-colors hover:text-brand-text">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/industries"
              className="transition-colors hover:text-brand-text"
            >
              Industries
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">{page.industry}</span>
          </nav>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-brand-cyan">
            Built for {page.industry}s
          </div>

          <h1 className="font-heading text-[clamp(2rem,5vw,4rem)] italic leading-[1.1] tracking-tight text-brand-white">
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              {page.industry} Marketing Software
            </span>
            <br />
            <span className="text-brand-white/90">
              Get Customers Posting About You
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg md:text-xl">
            {page.heroPain}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base text-brand-muted sm:text-lg">
            {page.heroSubhead}
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:mt-12 sm:flex-row sm:justify-center sm:gap-4">
            <a
              href="/dashboard#signup"
              className="w-full rounded-xl bg-brand-cyan px-8 py-3.5 font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 sm:w-auto"
            >
              Start free trial
            </a>
            <a
              href="#how-it-works"
              className="w-full rounded-xl border border-brand-border px-8 py-3.5 font-body text-base font-semibold text-brand-text transition-all hover:border-brand-cyan/40 hover:bg-white/5 sm:w-auto"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-brand-muted">
            Free for 14 days. No credit card. Cancel anytime.
          </p>
        </div>
      </section>

      {/* BUILT FOR */}
      <section
        id="how-it-works"
        className="border-t border-brand-border/30 bg-brand-bg py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl md:text-5xl">
              Built for {page.industry}s
            </h2>
            <p className="mt-6 text-base leading-relaxed text-brand-dim sm:text-lg">
              {page.builtForSection.intro}
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {page.builtForSection.features.map((feature, i) => (
              <div
                key={i}
                className="rounded-2xl border border-brand-border/60 bg-white/[0.02] p-7 transition-all hover:-translate-y-1 hover:border-brand-cyan/30"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-cyan/10 font-heading text-lg italic text-brand-cyan">
                  {i + 1}
                </div>
                <h3 className="font-heading text-xl text-brand-white">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-brand-dim">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REAL CAMPAIGNS */}
      <section className="border-t border-brand-border/30 bg-brand-bg/60 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-brand-green">
              Campaign templates
            </div>
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl md:text-5xl">
              5 real campaigns for {page.industry.toLowerCase()}s
            </h2>
            <p className="mt-5 text-base text-brand-dim sm:text-lg">
              Launch any of these in under 5 minutes. Perks and copy
              pre-written. You just pick one and go live.
            </p>
          </div>

          <div className="mt-14 space-y-4">
            {page.campaigns.map((c, i) => (
              <div
                key={i}
                className="rounded-2xl border border-brand-border/60 bg-white/[0.02] p-6 transition-colors hover:border-brand-cyan/30 sm:p-7"
              >
                <div className="grid gap-5 sm:grid-cols-[1fr_2fr_1fr] sm:items-center">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-brand-muted">
                      Campaign {i + 1}
                    </div>
                    <h3 className="mt-1 font-heading text-xl italic text-brand-white">
                      {c.name}
                    </h3>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-brand-muted">
                      Customer action
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-brand-text">
                      {c.action}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-xs uppercase tracking-wider text-brand-muted">
                      Perk earned
                    </div>
                    <p className="mt-1 font-mono text-sm text-brand-green">
                      {c.perk}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT SETS US APART */}
      <section className="border-t border-brand-border/30 bg-brand-bg py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl md:text-5xl">
              Why Social Perks beats generic marketing software
            </h2>
            <p className="mt-6 text-base leading-relaxed text-brand-dim sm:text-lg">
              {page.differentiator.intro}
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {page.differentiator.points.map((p, i) => (
              <div
                key={i}
                className="rounded-2xl border border-brand-border/60 bg-white/[0.02] p-7"
              >
                <h3 className="font-heading text-lg text-brand-cyan">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-brand-dim">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-t border-brand-border/30 bg-brand-bg/60 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl md:text-5xl">
              {page.industry} owners are seeing real results
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {page.testimonials.map((t, i) => (
              <figure
                key={i}
                className="flex flex-col rounded-2xl border border-brand-border/60 bg-white/[0.02] p-7"
              >
                <div className="mb-4 inline-flex items-center gap-1 text-brand-amber">
                  {"★★★★★"}
                </div>
                <blockquote className="flex-1 font-body text-sm leading-relaxed text-brand-text">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 border-t border-brand-border/40 pt-4">
                  <div className="font-heading text-sm text-brand-white">
                    {t.author}
                  </div>
                  <div className="mt-0.5 text-xs text-brand-muted">
                    {t.business} — {t.location}
                  </div>
                  <div className="mt-2 inline-block rounded-md bg-brand-green/10 px-2 py-0.5 font-mono text-xs text-brand-green">
                    {t.result}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        className="border-t border-brand-border/30 bg-brand-bg py-20 sm:py-28"
      >
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl md:text-5xl">
            Simple pricing built for {page.industry.toLowerCase()}s
          </h2>
          <p className="mt-5 text-base text-brand-dim sm:text-lg">
            One plan. Everything included. No per-customer fees, no setup
            charges, no hidden surcharges.
          </p>

          <div className="mt-12 rounded-3xl border border-brand-cyan/30 bg-gradient-to-b from-brand-cyan/[0.06] to-transparent p-8 sm:p-12">
            <div className="text-xs uppercase tracking-wider text-brand-cyan">
              Social Perks for {page.industry}s
            </div>
            <div className="mt-4 flex items-baseline justify-center gap-2">
              <div className="font-heading text-6xl italic text-brand-white sm:text-7xl">
                $49
              </div>
              <div className="font-mono text-base text-brand-muted">/month</div>
            </div>
            <p className="mt-3 text-sm text-brand-green">
              Free for your first 14 days. No credit card required.
            </p>

            <ul className="mt-8 space-y-3 text-left text-sm text-brand-text">
              {[
                "Unlimited campaigns and perks",
                "Unlimited customers in your wallet",
                "Auto-FTC compliance on every post",
                "AI content review pipeline",
                "All 107 actions across 15 platforms",
                "Industry-specific templates",
                "QR codes, signage, embeddable widget",
                "Cancel anytime — no contracts",
              ].map((feat) => (
                <li key={feat} className="flex items-start gap-3">
                  <span className="mt-0.5 text-brand-green">✓</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <a
              href="/dashboard#signup"
              className="mt-10 inline-flex w-full items-center justify-center rounded-xl bg-brand-cyan px-8 py-3.5 font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 sm:w-auto"
            >
              Start your free 14 days
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-brand-border/30 bg-brand-bg/60 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl md:text-5xl">
              {page.industry} owners ask us
            </h2>
            <p className="mt-4 text-base text-brand-dim">
              Everything you need to know before starting your free trial.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {page.faqs.map((faq, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-brand-border/60 bg-white/[0.02] p-6 transition-colors hover:border-brand-cyan/30"
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-heading text-base text-brand-white sm:text-lg">
                      {faq.question}
                    </h3>
                    <span
                      className="mt-1 text-brand-cyan transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </div>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-brand-dim">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="border-t border-brand-border/30 bg-gradient-to-b from-brand-bg via-brand-cyan/[0.03] to-brand-bg py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-4xl italic text-brand-white sm:text-5xl md:text-6xl">
            Try Social Perks free for 14 days
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-brand-dim sm:text-lg">
            See your {page.industry.toLowerCase()} grow through real
            customer posts. No credit card. No risk. Just results.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <a
              href="/dashboard#signup"
              className="w-full rounded-xl bg-brand-cyan px-10 py-4 font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 sm:w-auto"
            >
              Start free trial
            </a>
            <Link
              href="/industries"
              className="w-full rounded-xl border border-brand-border px-10 py-4 font-body text-base font-semibold text-brand-text transition-all hover:border-brand-cyan/40 hover:bg-white/5 sm:w-auto"
            >
              See other industries
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
