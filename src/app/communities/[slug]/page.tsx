import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  COMMUNITY_MAP,
  COMMUNITY_SLUGS,
} from "@/lib/communities/data";

const BASE_URL = "https://socialperks.com";

export function generateStaticParams() {
  return COMMUNITY_SLUGS.map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const c = COMMUNITY_MAP.get(slug);
  if (!c) return {};

  const title = `${c.h1} | Social Perks`;
  const description = c.heroPain;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${BASE_URL}/communities/${c.slug}`,
      siteName: "Social Perks",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/communities/${c.slug}`,
    },
  };
}

export default async function CommunityPage({ params }: PageProps) {
  const { slug } = await params;
  const c = COMMUNITY_MAP.get(slug);
  if (!c) notFound();

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: `Social media marketing platform for ${c.niche}`,
    provider: {
      "@type": "Organization",
      name: "Social Perks",
      url: BASE_URL,
    },
    description: c.heroPain,
    areaServed: { "@type": "Country", name: "United States" },
    offers: {
      "@type": "Offer",
      price: "49",
      priceCurrency: "USD",
      priceValidUntil: "2030-12-31",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({
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
              href="/communities"
              className="transition-colors hover:text-brand-text"
            >
              Communities
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan capitalize">{c.niche}</span>
          </nav>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-brand-cyan">
            Built for {c.niche}
          </div>

          <h1 className="font-heading text-[clamp(2rem,5vw,4rem)] italic leading-[1.1] tracking-tight text-brand-white">
            {c.h1}
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg md:text-xl">
            {c.heroPain}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base text-brand-muted sm:text-lg">
            {c.heroSubhead}
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:mt-12 sm:flex-row sm:justify-center sm:gap-4">
            <a
              href="/dashboard#signup"
              className="w-full rounded-xl bg-brand-cyan px-8 py-3.5 font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 sm:w-auto"
            >
              Start your 14-day free trial
            </a>
            <a
              href="#built-for"
              className="w-full rounded-xl border border-brand-border px-8 py-3.5 font-body text-base font-semibold text-brand-text transition-all hover:border-brand-cyan/40 hover:bg-white/5 sm:w-auto"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-brand-muted">
            Free for 14 days, then $49/mo. Fair pricing for small operators. Cancel anytime.
          </p>
        </div>
      </section>

      {/* BUILT FOR */}
      <section
        id="built-for"
        className="border-t border-brand-border/30 bg-brand-bg py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl md:text-5xl">
              Built for {c.niche}
            </h2>
            <p className="mt-6 text-base leading-relaxed text-brand-dim sm:text-lg">
              {c.builtForIntro}
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {c.builtFor.map((feature, i) => (
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

      {/* CAMPAIGNS */}
      <section className="border-t border-brand-border/30 bg-brand-bg/60 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-brand-green">
              Campaign examples
            </div>
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl md:text-5xl">
              What {c.niche} are doing with Social Perks
            </h2>
            <p className="mt-5 text-base text-brand-dim sm:text-lg">
              Real campaign templates pre-built for your workflow. Pick one, set a perk value, go live in five minutes.
            </p>
          </div>

          <div className="mt-14 space-y-4">
            {c.campaigns.map((camp, i) => (
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
                      {camp.name}
                    </h3>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-brand-muted">
                      What the customer does
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-brand-text">
                      {camp.description}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-xs uppercase tracking-wider text-brand-muted">
                      Perk earned
                    </div>
                    <p className="mt-1 font-mono text-sm text-brand-green">
                      {camp.perk}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UNFAIR ADVANTAGE */}
      <section className="border-t border-brand-border/30 bg-brand-bg py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-amber/30 bg-brand-amber/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-brand-amber">
              The unfair advantage
            </div>
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl md:text-5xl">
              Why your customers post more than other businesses&apos; customers
            </h2>
            <p className="mt-6 text-base leading-relaxed text-brand-dim sm:text-lg">
              {c.unfairAdvantageIntro}
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {c.unfairAdvantage.map((p, i) => (
              <div
                key={i}
                className="rounded-2xl border border-brand-border/60 bg-white/[0.02] p-7"
              >
                <h3 className="font-heading text-lg text-brand-cyan">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-brand-dim">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUICK START */}
      <section className="border-t border-brand-border/30 bg-brand-bg/60 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl md:text-5xl">
              How to get started in 5 minutes
            </h2>
            <p className="mt-4 text-base text-brand-dim">
              No technical setup. No long onboarding. Just five small steps and you&apos;re live.
            </p>
          </div>

          <ol className="mt-12 space-y-4">
            {c.quickStart.map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-5 rounded-2xl border border-brand-border/60 bg-white/[0.02] p-6"
              >
                <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-cyan/10 font-heading text-base italic text-brand-cyan">
                  {i + 1}
                </div>
                <p className="pt-2 text-sm leading-relaxed text-brand-text sm:text-base">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-brand-border/30 bg-brand-bg py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl md:text-5xl">
              Common questions from {c.niche}
            </h2>
            <p className="mt-4 text-base text-brand-dim">
              The specific concerns we hear from {c.niche} before they start.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {c.faqs.map((faq, i) => (
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
            Start your 14-day free trial — built for {c.niche}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-brand-dim sm:text-lg">
            Free for 14 days, then $49/mo. Fair pricing for small operators. No credit card to start, no setup fees, cancel anytime.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <a
              href="/dashboard#signup"
              className="w-full rounded-xl bg-brand-cyan px-10 py-4 font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 sm:w-auto"
            >
              Start free trial
            </a>
            <Link
              href="/communities"
              className="w-full rounded-xl border border-brand-border px-10 py-4 font-body text-base font-semibold text-brand-text transition-all hover:border-brand-cyan/40 hover:bg-white/5 sm:w-auto"
            >
              See other communities
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
