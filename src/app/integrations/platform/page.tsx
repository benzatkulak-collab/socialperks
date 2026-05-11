import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  PLATFORM_INTEGRATIONS,
  PLATFORM_INTEGRATION_CATEGORIES,
  type PlatformIntegration,
  type PlatformIntegrationCategory,
} from "@/lib/platform-integrations/data";

export const metadata: Metadata = {
  title: "Platform Integrations | Social Perks",
  description:
    "Connect Social Perks to Zapier, Make.com, Shopify, WordPress, Squarespace, HubSpot, Klaviyo, and more. Browse all 15 official platform integrations.",
  alternates: {
    canonical: "/integrations/platform",
  },
  openGraph: {
    title: "Connect Social Perks to the tools you already use",
    description:
      "15 platform integrations across automation, e-commerce, CMS, CRM, and email tools.",
    type: "website",
    url: "/integrations/platform",
  },
};

function PlatformCard({ p }: { p: PlatformIntegration }) {
  const initial = p.name.charAt(0).toUpperCase();
  const isAvailable = p.status === "available";
  return (
    <Link
      href={`/integrations/platform/${p.slug}`}
      className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-cyan-500/30 hover:bg-white/[0.04]"
    >
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-lg font-bold text-cyan-400 ring-1 ring-cyan-500/30">
          {initial}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-white group-hover:text-cyan-400">
            {p.name}
          </div>
          {isAvailable ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400 ring-1 ring-green-500/30">
              <span className="h-1 w-1 rounded-full bg-green-400" />
              Available
            </span>
          ) : (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 ring-1 ring-amber-500/30">
              <span className="h-1 w-1 rounded-full bg-amber-400" />
              Coming soon
            </span>
          )}
        </div>
      </div>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-white/60">
        {p.oneLiner}
      </p>
      <div className="text-sm font-medium text-cyan-400 group-hover:text-cyan-300">
        View integration →
      </div>
    </Link>
  );
}

export default function PlatformIntegrationsIndexPage() {
  const byCategory: Record<PlatformIntegrationCategory, PlatformIntegration[]> = {
    automation: [],
    ecommerce: [],
    cms: [],
    crm: [],
    email: [],
  };
  for (const p of PLATFORM_INTEGRATIONS) {
    byCategory[p.category].push(p);
  }
  // Sort each category by popularity desc
  for (const k of Object.keys(byCategory) as PlatformIntegrationCategory[]) {
    byCategory[k].sort((a, b) => b.popularity - a.popularity);
  }

  const total = PLATFORM_INTEGRATIONS.length;
  const availableCount = PLATFORM_INTEGRATIONS.filter(
    (p) => p.status === "available",
  ).length;

  return (
    <div className="min-h-screen bg-[#0C0F1A] text-white">
      <Nav />

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Hero */}
        <section className="mb-16 text-center">
          <div className="mb-4 text-xs uppercase tracking-widest text-cyan-400">
            {availableCount} live · {total - availableCount} coming soon
          </div>
          <h1
            className="mb-6 font-serif text-5xl italic leading-tight md:text-6xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Connect Social Perks to the tools you already use
          </h1>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-white/70">
            Native integrations with the automation, e-commerce, CMS, CRM, and
            email platforms that power your business. No middleware. No
            engineering team required.
          </p>
        </section>

        {/* Category sections */}
        {PLATFORM_INTEGRATION_CATEGORIES.map((cat) => {
          const items = byCategory[cat.key];
          if (items.length === 0) return null;
          return (
            <section key={cat.key} className="mb-16">
              <div className="mb-8 flex items-end justify-between">
                <div>
                  <h2
                    className="font-serif text-3xl italic text-cyan-400 md:text-4xl"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {cat.label}
                  </h2>
                  <p className="mt-2 text-sm text-white/50">
                    {items.length} integration{items.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <PlatformCard key={p.slug} p={p} />
                ))}
              </div>
            </section>
          );
        })}

        {/* Footer CTA */}
        <section className="mt-16 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent p-10 text-center">
          <h2
            className="mb-4 font-serif text-3xl italic md:text-4xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Don't see your platform?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/70">
            Social Perks ships with a REST API, GraphQL endpoint, and webhooks.
            Build your own integration in minutes — or request one and we'll
            build it for you.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/api/v1/docs/ui"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 font-medium text-[#0C0F1A] transition hover:bg-cyan-400"
            >
              Read the API docs
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/?cta=trial"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 font-medium text-white transition hover:border-white/40"
            >
              Try free for 14 days
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
