import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  ALTERNATIVES,
  getAlternativesByCategory,
} from "@/lib/alternatives/data";

export const metadata: Metadata = {
  title: "Alternatives to Yotpo, Smile.io, GRIN & More | Social Perks (2026)",
  description:
    "Looking to switch from your current UGC, influencer, or loyalty platform? Compare 20 alternatives and see why small businesses pick Social Perks. Free for 14 days.",
  alternates: {
    canonical: "https://socialperks.app/alternatives",
  },
  openGraph: {
    title: "Alternatives to UGC, Influencer & Loyalty Platforms",
    description:
      "Switching from Yotpo, Smile.io, GRIN, or another platform? See why small businesses move to Social Perks.",
    url: "https://socialperks.app/alternatives",
    siteName: "Social Perks",
    type: "website",
  },
};

const CATEGORIES: {
  key: "ugc-reviews" | "influencer" | "loyalty";
  label: string;
  description: string;
}[] = [
  {
    key: "ugc-reviews",
    label: "UGC & Review Platforms",
    description:
      "Review collection tools, on-site widgets, and UGC platforms. Switch for AI-generated campaigns, bundled referrals and perks, and broader platform support.",
  },
  {
    key: "influencer",
    label: "Influencer & Ambassador Platforms",
    description:
      "Influencer marketplaces and ambassador program tools. Switch for public flat pricing, self-serve onboarding, and a customer-as-creator model.",
  },
  {
    key: "loyalty",
    label: "Loyalty Programs",
    description:
      "Points-and-rewards loyalty platforms. Switch to perk-for-action programs that earn social posts, reviews, and referrals — not just repeat purchases.",
  },
];

export default function AlternativesIndexPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://socialperks.app",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Alternatives",
        item: "https://socialperks.app/alternatives",
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-brand-text/60">
          <Link href="/" className="hover:text-brand-cyan">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text/80">Alternatives</span>
        </nav>

        {/* Hero */}
        <header className="mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            Switching guide
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            Looking to switch?
            <br />
            <span className="text-brand-cyan">Here&apos;s the honest take.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-brand-text/80">
            We talk to dozens of customers switching from {ALTERNATIVES.length}+
            other platforms every month. Each page below covers why people
            switch, what migration actually looks like, what you&apos;d give up,
            and where Social Perks isn&apos;t the right answer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/ai"
              className="rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
            >
              Try free for 14 days
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-white/20 px-6 py-3 font-medium text-brand-white transition hover:border-brand-cyan hover:text-brand-cyan"
            >
              See pricing
            </Link>
          </div>
        </header>

        {/* Category sections */}
        {CATEGORIES.map((cat) => {
          const items = getAlternativesByCategory(cat.key);
          return (
            <section key={cat.key} className="mb-16">
              <div className="mb-8 border-b border-white/10 pb-6">
                <h2 className="font-serif text-3xl italic text-brand-white">
                  {cat.label}
                </h2>
                <p className="mt-3 max-w-2xl text-brand-text/70">
                  {cat.description}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/alternatives/${item.slug}`}
                    className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-serif text-xl italic text-brand-white group-hover:text-brand-cyan">
                          {item.name}
                        </div>
                        <p className="mt-2 text-sm text-brand-text/70">
                          {item.oneLiner}
                        </p>
                      </div>
                      <span className="ml-3 text-brand-cyan transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {/* Final CTA */}
        <section className="mt-8 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 text-center md:p-12">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white md:text-4xl">
            Not sure which alternative fits?
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-brand-text/80">
            Start the free tier in 10 minutes. The AI agent will recommend a
            campaign based on your business type — no need to commit before you
            see it work.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/ai"
              className="rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
            >
              Start free
            </Link>
            <Link
              href="/vs"
              className="rounded-full border border-white/20 px-6 py-3 font-medium text-brand-white transition hover:border-brand-cyan hover:text-brand-cyan"
            >
              See head-to-head comparisons
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
