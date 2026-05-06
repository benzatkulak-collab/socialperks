import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { INDUSTRIES } from "@/lib/industries";
import { safeJsonForScript } from "@/lib/security/json-ld";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Social Media Marketing for Small Businesses — Social Perks by Industry",
  description:
    "Social Perks works for every industry. Explore ready-made campaign templates for restaurants, salons, gyms, dentists, and 16 more industries.",
  openGraph: {
    title: "Social Media Marketing for Small Businesses — Social Perks",
    description:
      "Explore industry-specific marketing campaigns. From restaurants to real estate, find the right template for your business.",
    type: "website",
    url: "https://socialperks.io/for",
    siteName: "Social Perks",
  },
  twitter: {
    card: "summary_large_image",
    title: "Social Perks — Marketing for Every Industry",
    description:
      "Explore ready-made social media marketing campaigns for 20 industries.",
  },
  alternates: {
    canonical: "https://socialperks.io/for",
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IndustriesIndexPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonForScript({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Social Perks — Industries",
            description:
              "Explore social media marketing campaigns tailored for 20 different industries.",
            url: "https://socialperks.io/for",
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: INDUSTRIES.length,
              itemListElement: INDUSTRIES.map((industry, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: industry.name,
                url: `https://socialperks.io/for/${industry.slug}`,
              })),
            },
          }),
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden bg-brand-bg pt-32 pb-20 sm:pt-40 sm:pb-28 lg:pt-48 lg:pb-32"
        aria-label="Industries hero"
      >
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
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Built for your industry
          </p>
          <h1 className="font-heading text-[clamp(2rem,5vw,4rem)] italic leading-[1.1] tracking-tight text-brand-white">
            Social media marketing for{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              every small business
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg md:text-xl">
            Whether you run a coffee shop or a dental practice, Social Perks has
            ready-made campaigns designed for your industry. Pick yours and
            launch in minutes.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          INDUSTRY GRID
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative bg-brand-bg pb-20 sm:pb-28 lg:pb-32"
        aria-labelledby="industries-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-28 lg:px-8">
          <h2 id="industries-heading" className="sr-only">
            All industries
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
            {INDUSTRIES.map((industry) => (
              <Link
                key={industry.slug}
                href={`/for/${industry.slug}`}
                className="group flex flex-col rounded-xl border border-brand-border/40 bg-brand-surface/30 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-border/70 hover:bg-brand-surface/50 hover:shadow-lg hover:shadow-brand-bg/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 sm:p-6"
              >
                {/* Icon + name */}
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {industry.icon}
                  </span>
                  <h3 className="font-body text-base font-semibold text-brand-white sm:text-lg">
                    {industry.name}
                  </h3>
                </div>

                {/* Headline preview */}
                <p className="mb-4 text-sm leading-relaxed text-brand-dim">
                  {industry.headline}
                </p>

                {/* Stats preview */}
                <div className="mt-auto flex items-center gap-4 border-t border-brand-border/30 pt-4">
                  <span className="font-mono text-xs text-brand-cyan">
                    {industry.templateSuggestions.length} templates
                  </span>
                  <span className="font-mono text-xs text-brand-green">
                    {industry.useCases.length} use cases
                  </span>
                </div>

                {/* Arrow hint */}
                <span className="mt-3 text-sm font-medium text-brand-muted transition-colors group-hover:text-brand-cyan">
                  Explore {industry.name.toLowerCase()} &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CTA
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
            Don&apos;t see your industry?
            <br />
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              Social Perks works for everyone.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            If you have customers and they have phones, Social Perks can turn
            them into your marketing team. Start free and build your first
            campaign in five minutes.
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
              Works for any business
            </span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
