import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import {
  INDUSTRY_MAP,
  INDUSTRY_SLUGS,
} from "@/lib/industries";

// ---------------------------------------------------------------------------
// Static generation
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return INDUSTRY_SLUGS.map((slug) => ({ industry: slug }));
}

// ---------------------------------------------------------------------------
// Dynamic metadata
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ industry: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { industry: slug } = await params;
  const industry = INDUSTRY_MAP.get(slug);
  if (!industry) return {};

  const title = `Social Perks for ${industry.name} — ${industry.headline}`;
  const description = industry.description;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://socialperks.io/for/${industry.slug}`,
      siteName: "Social Perks",
    },
    twitter: {
      card: "summary_large_image",
      title: `Social Perks for ${industry.name}`,
      description,
    },
    alternates: {
      canonical: `https://socialperks.io/for/${industry.slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function IndustryPage({ params }: PageProps) {
  const { industry: slug } = await params;
  const industry = INDUSTRY_MAP.get(slug);
  if (!industry) notFound();

  // Pick related industries from the data
  const related = industry.relatedIndustries
    .map((s) => INDUSTRY_MAP.get(s))
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `Social Perks for ${industry.name}`,
            description: industry.description,
            url: `https://socialperks.io/for/${industry.slug}`,
            mainEntity: {
              "@type": "SoftwareApplication",
              name: "Social Perks",
              applicationCategory: "BusinessApplication",
              description: industry.description,
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            },
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: "https://socialperks.io",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Industries",
                  item: "https://socialperks.io/for",
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: industry.name,
                  item: `https://socialperks.io/for/${industry.slug}`,
                },
              ],
            },
          }),
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden bg-brand-bg pt-32 pb-20 sm:pt-40 sm:pb-28 lg:pt-48 lg:pb-32"
        aria-label="Hero"
      >
        {/* Background effects */}
        <div
          className="pointer-events-none absolute inset-0 animate-gradient bg-[length:300%_300%] bg-[linear-gradient(135deg,rgba(34,211,238,0.07),rgba(167,139,250,0.05),rgba(244,114,182,0.04),rgba(34,211,238,0.02))]"
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

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav
            className="mb-8 flex items-center justify-center gap-2 text-sm text-brand-muted"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="transition-colors hover:text-brand-text"
            >
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/for"
              className="transition-colors hover:text-brand-text"
            >
              Industries
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">{industry.name}</span>
          </nav>

          {/* Icon */}
          <div
            className="mb-6 text-5xl sm:text-6xl"
            aria-hidden="true"
          >
            {industry.icon}
          </div>

          {/* Headline */}
          <h1 className="font-heading text-[clamp(2rem,5vw,4rem)] italic leading-[1.1] tracking-tight text-brand-white">
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              {industry.headline}
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg md:text-xl">
            {industry.subheadline}
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center gap-3 sm:mt-12 sm:flex-row sm:justify-center sm:gap-4">
            <a
              href="/dashboard#signup"
              className="w-full rounded-xl bg-brand-cyan px-8 py-3.5 font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg active:translate-y-0 sm:w-auto"
            >
              Start Free for {industry.name}
            </a>
            <a
              href="#templates"
              className="w-full rounded-xl border border-brand-border bg-brand-surface/50 px-8 py-3.5 font-body text-base font-medium text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-subtle hover:bg-brand-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/30 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg active:translate-y-0 sm:w-auto"
            >
              See Templates
            </a>
          </div>

          <p className="mt-6 text-sm text-brand-muted sm:mt-8">
            Free to start. No credit card. Takes 5 minutes.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          USE CASES
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative bg-brand-bg py-20 sm:py-28"
        aria-labelledby="use-cases-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center sm:mb-16">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
              Marketing actions
            </p>
            <h2
              id="use-cases-heading"
              className="font-heading text-[clamp(1.75rem,3vw,3rem)] italic leading-tight text-brand-white"
            >
              How {industry.name.toLowerCase()} use Social Perks
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-dim sm:text-lg">
              Proven campaigns that work specifically for your industry. Pick one and launch in minutes.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
            {industry.useCases.map((useCase, i) => {
              const accents = [
                "border-brand-green",
                "border-brand-cyan",
                "border-brand-amber",
              ];
              return (
                <div
                  key={useCase.title}
                  className={`group rounded-xl border-l-2 ${accents[i % 3]} border border-brand-border/40 bg-brand-surface/30 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-border/70 hover:bg-brand-surface/50 hover:shadow-lg hover:shadow-brand-bg/50 sm:p-6 lg:p-7`}
                >
                  {/* Platform badge */}
                  <div className="mb-4 flex items-center gap-3">
                    <span className="rounded-md bg-brand-cyan/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-brand-cyan">
                      {useCase.platform}
                    </span>
                    <div className="h-px flex-1 bg-brand-border/40" />
                  </div>

                  <h3 className="mb-2 font-body text-base font-semibold leading-snug text-brand-white sm:text-lg">
                    {useCase.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-brand-dim">
                    {useCase.description}
                  </p>

                  <p className="mt-4 rounded-lg bg-brand-bg/60 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-brand-muted">
                    Action: {useCase.action}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          STATS
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative bg-brand-bg py-20 sm:py-28"
        aria-labelledby="stats-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center sm:mb-16">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
              Results
            </p>
            <h2
              id="stats-heading"
              className="font-heading text-[clamp(1.75rem,3vw,3rem)] italic leading-tight text-brand-white"
            >
              The numbers speak for themselves
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 sm:gap-5 lg:gap-6">
            {industry.stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-6 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-border/70 hover:bg-brand-surface/50 sm:p-8"
              >
                <p className="font-mono text-3xl font-semibold text-brand-cyan sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-brand-dim">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          TEMPLATES
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="templates"
        className="relative bg-brand-bg py-20 sm:py-28"
        aria-labelledby="templates-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center sm:mb-16">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
              Ready-to-use
            </p>
            <h2
              id="templates-heading"
              className="font-heading text-[clamp(1.75rem,3vw,3rem)] italic leading-tight text-brand-white"
            >
              Campaign templates for {industry.name.toLowerCase()}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-dim sm:text-lg">
              Pre-built campaigns designed for your industry. Pick one, customize the reward, and launch today.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
            {industry.templateSuggestions.map((template) => (
              <div
                key={template.name}
                className="group flex flex-col rounded-xl border border-brand-border/40 bg-brand-surface/30 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-border/70 hover:bg-brand-surface/50 hover:shadow-lg hover:shadow-brand-bg/50 sm:p-6"
              >
                {/* Template header */}
                <div className="mb-4 flex items-center gap-3">
                  <span className="rounded-md bg-brand-green/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-brand-green">
                    {template.platform}
                  </span>
                </div>

                <h3 className="mb-2 font-body text-base font-semibold text-brand-white">
                  {template.name}
                </h3>

                <div className="mb-4 space-y-2 text-sm text-brand-dim">
                  <p>
                    <span className="text-brand-muted">Action:</span>{" "}
                    {template.action}
                  </p>
                  <p>
                    <span className="text-brand-muted">Reward:</span>{" "}
                    <span className="font-semibold text-brand-green">
                      {template.reward}
                    </span>
                  </p>
                </div>

                <div className="mt-auto pt-4">
                  <a
                    href="/dashboard#signup"
                    className="block w-full rounded-lg border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-2.5 text-center text-sm font-medium text-brand-cyan transition-all hover:border-brand-cyan/50 hover:bg-brand-cyan/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                  >
                    Use This Template
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          TESTIMONIAL
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative bg-brand-bg py-20 sm:py-28"
        aria-label="Testimonial"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/4 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-brand-cyan/[0.03] blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-brand-border/50 bg-brand-surface/40 p-8 backdrop-blur-sm sm:p-12">
            <svg
              className="mx-auto mb-6 h-8 w-8 text-brand-cyan/40"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <blockquote className="font-heading text-xl italic leading-relaxed text-brand-white sm:text-2xl">
              {industry.testimonialQuote}
            </blockquote>
            <p className="mt-6 text-sm text-brand-muted">
              {industry.testimonialAuthor}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative bg-brand-bg py-20 sm:py-28 lg:py-36"
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
        <div
          className="pointer-events-none absolute right-1/4 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-brand-purple/[0.04] blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-[clamp(1.75rem,4vw,3rem)] italic leading-[1.15] text-brand-white">
            Start growing your{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              {industry.name.toLowerCase()}
            </span>{" "}
            today
          </h2>

          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            Join thousands of {industry.name.toLowerCase()} already using Social
            Perks to turn customers into their marketing team.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:mt-12 sm:flex-row">
            <a
              href="/dashboard#signup"
              className="w-full rounded-xl bg-brand-cyan px-10 py-4 font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg active:translate-y-0 sm:w-auto"
            >
              Create Your First Campaign
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-brand-muted sm:mt-12 sm:gap-x-8">
            <span className="flex items-center gap-2">
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green/10 text-[10px] text-brand-green"
                aria-hidden="true"
              >
                ✓
              </span>
              Free to start
            </span>
            <span className="flex items-center gap-2">
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green/10 text-[10px] text-brand-green"
                aria-hidden="true"
              >
                ✓
              </span>
              5-minute setup
            </span>
            <span className="flex items-center gap-2">
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green/10 text-[10px] text-brand-green"
                aria-hidden="true"
              >
                ✓
              </span>
              No credit card
            </span>
            <span className="flex items-center gap-2">
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green/10 text-[10px] text-brand-green"
                aria-hidden="true"
              >
                ✓
              </span>
              Built for {industry.name.toLowerCase()}
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          WAITLIST CAPTURE — industry-tagged
          Industry pages get organic SEO traffic; this gives that traffic
          somewhere to convert besides /dashboard#signup (which is too
          much commitment for cold visitors).
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="waitlist"
        className="relative bg-brand-bg pb-20 pt-12 sm:pb-28"
        aria-labelledby="waitlist-heading"
      >
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
          <p className="mb-3 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
            Early access for {industry.name}
          </p>
          <h2
            id="waitlist-heading"
            className="mb-3 text-center font-heading text-2xl italic text-brand-white sm:text-3xl"
          >
            Not ready to sign up?
          </h2>
          <p className="mb-6 text-center text-sm text-brand-dim">
            Drop your email — we&apos;ll reach out when we&apos;re onboarding {industry.name.toLowerCase()} in your area.
          </p>
          <WaitlistForm
            // Map known industries to recognized verticals; everything
            // else falls through to "other" but still gets captured.
            vertical={industry.slug === "coffee-shops" ? "coffee_shops" : "other"}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CROSS-LINKS
          ═══════════════════════════════════════════════════════════════════ */}
      {related.length > 0 && (
        <section
          className="relative bg-brand-bg pb-20 sm:pb-28"
          aria-labelledby="related-heading"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <p
              id="related-heading"
              className="mb-6 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted sm:text-xs"
            >
              Also popular for
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {related.map((r) => (
                <Link
                  key={r!.slug}
                  href={`/for/${r!.slug}`}
                  className="flex items-center gap-2 rounded-xl border border-brand-border/40 bg-brand-surface/30 px-5 py-3 text-sm text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  <span aria-hidden="true">{r!.icon}</span>
                  <span>{r!.name}</span>
                </Link>
              ))}
              <Link
                href="/for"
                className="flex items-center gap-2 rounded-xl border border-brand-border/40 bg-brand-surface/30 px-5 py-3 text-sm text-brand-muted transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 hover:text-brand-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
              >
                View all industries &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CATALOG CROSS-LINKS — drive search-engine and LLM crawl into
          the action and platform catalogs from every industry page.
          Each card answers a separate question an LLM might be asked
          ("what actions are available", "what platforms", "what's the
          benchmark"), so they're high-value cross-references rather
          than generic footer links.
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative bg-brand-bg pb-20 sm:pb-28"
        aria-labelledby="catalog-heading"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p
            id="catalog-heading"
            className="mb-6 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted sm:text-xs"
          >
            Explore further
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/actions"
              className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-4 hover:border-brand-cyan/40 transition-colors"
            >
              <p className="text-sm font-semibold text-brand-white mb-1">
                All 125 actions
              </p>
              <p className="text-xs text-brand-dim">
                Every marketing action with market-rate pricing.
              </p>
            </Link>
            <Link
              href="/platforms"
              className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-4 hover:border-brand-cyan/40 transition-colors"
            >
              <p className="text-sm font-semibold text-brand-white mb-1">
                All 25 platforms
              </p>
              <p className="text-xs text-brand-dim">
                Instagram, TikTok, Google, Yelp, and 21 more.
              </p>
            </Link>
            <Link
              href={`/benchmarks#${industry.slug}`}
              className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-4 hover:border-brand-cyan/40 transition-colors"
            >
              <p className="text-sm font-semibold text-brand-white mb-1">
                {industry.name} benchmarks
              </p>
              <p className="text-xs text-brand-dim">
                Completion rate, ROI, top platforms for this industry.
              </p>
            </Link>
            <Link
              href="/faq"
              className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-4 hover:border-brand-cyan/40 transition-colors"
            >
              <p className="text-sm font-semibold text-brand-white mb-1">
                FAQ
              </p>
              <p className="text-xs text-brand-dim">
                FTC compliance, platform rules, agent integration.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
