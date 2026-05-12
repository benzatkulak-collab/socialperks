import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  COMPETITORS,
  getCompetitor,
  getOtherCompetitors,
} from "@/lib/comparison/competitors";

interface Params {
  competitor: string;
}

export function generateStaticParams(): Params[] {
  return COMPETITORS.map((c) => ({ competitor: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { competitor: slug } = await params;
  const competitor = getCompetitor(slug);
  if (!competitor) return {};

  const title = `Social Perks vs ${competitor.name}: Honest Comparison (2026)`;
  const description = `An honest, side-by-side comparison of Social Perks and ${competitor.name}. Pricing, features, target audience, and when each tool is the right fit.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://socialperks.app/vs/${competitor.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://socialperks.app/vs/${competitor.slug}`,
      siteName: "Social Perks",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { competitor: slug } = await params;
  const competitor = getCompetitor(slug);
  if (!competitor) notFound();

  const others = getOtherCompetitors(competitor.slug, 4);

  // SoftwareApplication-style JSON-LD comparison
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Social Perks vs ${competitor.name}: Honest Comparison`,
    description: `Comparison of Social Perks and ${competitor.name} covering pricing, features, target audience, and ideal fit.`,
    author: { "@type": "Organization", name: "Social Perks" },
    publisher: {
      "@type": "Organization",
      name: "Social Perks",
      logo: {
        "@type": "ImageObject",
        url: "https://socialperks.app/icon-192.png",
      },
    },
    mainEntityOfPage: `https://socialperks.app/vs/${competitor.slug}`,
    about: [
      { "@type": "SoftwareApplication", name: "Social Perks" },
      { "@type": "SoftwareApplication", name: competitor.name },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main id="main-content" className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-brand-text/60">
          <Link href="/" className="hover:text-brand-cyan">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/vs" className="hover:text-brand-cyan">
            Comparisons
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text/80">{competitor.name}</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            Comparison
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            Social Perks vs {competitor.name}:
            <br />
            <span className="text-brand-cyan">Honest Comparison</span>
          </h1>
          <p className="mt-6 text-lg text-brand-text/80">
            {competitor.tagline}. Founded {competitor.founded} in{" "}
            {competitor.headquarters}. Best for: {competitor.bestFor}
          </p>
          <p className="mt-3 text-sm text-brand-text/50">
            Last updated May 2026 · 8 min read
          </p>
        </header>

        {/* TL;DR */}
        <section className="mb-12 rounded-xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <h2 className="mb-3 font-serif text-2xl italic text-brand-white">
            Short version
          </h2>
          <p className="text-brand-text/80">{competitor.bottomLine}</p>
        </section>

        {/* Quick comparison table */}
        <section className="mb-14">
          <h2 className="mb-6 font-serif text-3xl italic text-brand-white">
            Quick comparison
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-brand-text/60">
                <tr>
                  <th className="px-5 py-4 font-medium">Feature</th>
                  <th className="px-5 py-4 font-medium text-brand-cyan">
                    Social Perks
                  </th>
                  <th className="px-5 py-4 font-medium">{competitor.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {competitor.table.map((row) => (
                  <tr key={row.feature} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4 font-medium text-brand-white">
                      {row.feature}
                    </td>
                    <td className="px-5 py-4 text-brand-text/80">
                      {row.socialPerks}
                    </td>
                    <td className="px-5 py-4 text-brand-text/80">
                      {row.competitor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pricing */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            How they differ on pricing
          </h2>
          <p className="leading-relaxed text-brand-text/80">
            {competitor.pricingDifference}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 p-5">
              <div className="text-xs uppercase tracking-wider text-brand-cyan">
                Social Perks
              </div>
              <div className="mt-2 font-serif text-2xl italic text-brand-white">
                Free forever · paid from $19/mo
              </div>
              <p className="mt-2 text-sm text-brand-text/70">
                AI campaigns, perks, reviews, referrals, influencer access — all
                included. No demo required.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="text-xs uppercase tracking-wider text-brand-text/60">
                {competitor.name}
              </div>
              <div className="mt-2 font-serif text-2xl italic text-brand-white">
                {competitor.pricing.split(".")[0]}.
              </div>
              <p className="mt-2 text-sm text-brand-text/70">
                Free tier: {competitor.freeTier}
              </p>
            </div>
          </div>
        </section>

        {/* When competitor is better */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            When {competitor.name} is the better choice
          </h2>
          <p className="mb-6 text-brand-text/70">
            We&apos;d rather tell you the truth than sell you the wrong tool. Pick{" "}
            {competitor.name} if:
          </p>
          <ul className="space-y-3">
            {competitor.whenCompetitorIsBetter.map((point, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4"
              >
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" />
                <span className="text-brand-text/80">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* When Social Perks is better */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            When Social Perks is the better choice
          </h2>
          <p className="mb-6 text-brand-text/70">Pick Social Perks if:</p>
          <ul className="space-y-3">
            {competitor.whenSocialPerksIsBetter.map((point, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-brand-cyan/20 bg-brand-cyan/[0.04] p-4"
              >
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-cyan" />
                <span className="text-brand-text/90">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Feature differences */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            How they differ on features
          </h2>
          <p className="leading-relaxed text-brand-text/80">
            {competitor.featureDifference}
          </p>
        </section>

        {/* Target audience */}
        <section className="mb-14 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-2 text-xs uppercase tracking-wider text-brand-cyan">
              Social Perks target audience
            </div>
            <p className="text-brand-text/80">
              Local businesses, growing DTC brands, and service providers who
              want AI to run customer marketing across reviews, referrals,
              perks-for-posts, and influencer outreach — without an in-house
              marketing manager.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-2 text-xs uppercase tracking-wider text-brand-text/60">
              {competitor.name} target audience
            </div>
            <p className="text-brand-text/80">{competitor.targetAudience}</p>
          </div>
        </section>

        {/* AI features */}
        <section className="mb-14 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/[0.04] p-6">
            <div className="mb-2 text-xs uppercase tracking-wider text-brand-cyan">
              Social Perks AI
            </div>
            <p className="text-brand-text/80">
              Backend AI agent generates the full campaign — perk structure,
              copy across 25 platforms, posting schedule, FTC disclosure,
              follower-tier bonuses, and submission review. The customer-facing
              app never runs AI logic; it&apos;s all behind authenticated APIs.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-2 text-xs uppercase tracking-wider text-brand-text/60">
              {competitor.name} AI
            </div>
            <p className="text-brand-text/80">{competitor.aiFeatures}</p>
          </div>
        </section>

        {/* Integrations */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
            Integrations
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
              <div className="mb-2 text-xs uppercase tracking-wider text-brand-cyan">
                Social Perks
              </div>
              <p className="text-sm text-brand-text/80">
                Instagram, TikTok, YouTube, Google Business Profile, Yelp,
                Facebook, X, LinkedIn, Pinterest, Threads, Snapchat, plus 14
                more. Stripe, Shopify, WooCommerce, Square, Toast, Mindbody,
                Calendly, Zapier, and a public REST + GraphQL API.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
              <div className="mb-2 text-xs uppercase tracking-wider text-brand-text/60">
                {competitor.name}
              </div>
              <p className="text-sm text-brand-text/80">
                {competitor.integrations}
              </p>
            </div>
          </div>
        </section>

        {/* Bottom line */}
        <section className="mb-14 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            Bottom line
          </h2>
          <p className="text-lg leading-relaxed text-brand-text/90">
            {competitor.bottomLine}
          </p>
        </section>

        {/* CTA */}
        <section className="mb-14 text-center">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            Try Social Perks free for 14 days
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-brand-text/70">
            No credit card. No demo. Run your first AI-generated campaign in
            under 10 minutes — and keep it running on the free tier as long as
            you want.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/ai"
              className="rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
            >
              Start free
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-white/20 px-6 py-3 font-medium text-brand-white transition hover:border-brand-cyan hover:text-brand-cyan"
            >
              See pricing
            </Link>
          </div>
        </section>

        {/* Related comparisons */}
        <section className="border-t border-white/10 pt-12">
          <h2 className="mb-6 font-serif text-2xl italic text-brand-white">
            Compare Social Perks to other tools
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/vs/${o.slug}`}
                className="group rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
              >
                <div className="text-sm text-brand-text/60">
                  Social Perks vs
                </div>
                <div className="mt-1 font-medium text-brand-white group-hover:text-brand-cyan">
                  {o.name} →
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/vs"
              className="text-sm text-brand-cyan hover:underline"
            >
              See all comparisons →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
