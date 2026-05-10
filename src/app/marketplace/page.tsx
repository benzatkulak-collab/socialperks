import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Marketplace — Social Perks",
  description:
    "Plug Social Perks into 1000+ apps via Zapier, Make, n8n, Pipedream, REST API, GraphQL, Python and JavaScript SDKs.",
  openGraph: {
    title: "Social Perks API Marketplace",
    description:
      "Plug Social Perks into 1000+ apps via Zapier, Make, or our API.",
    url: "https://socialperks.onrender.com/marketplace",
    siteName: "Social Perks",
    type: "website",
  },
};

interface IntegrationCard {
  name: string;
  icon: string;
  description: string;
  href: string;
  external?: boolean;
  badge?: string;
}

const INTEGRATIONS: IntegrationCard[] = [
  {
    name: "Zapier",
    icon: "Z",
    description:
      "Connect Social Perks to 6,000+ apps without writing a line of code.",
    href: "/integrations/software",
    badge: "200 connected apps",
  },
  {
    name: "Make",
    icon: "M",
    description:
      "Visual automation builder (formerly Integromat). Drag, drop, ship.",
    href: "/integrations/software",
  },
  {
    name: "n8n",
    icon: "n8",
    description:
      "Self-hosted, open-source workflow automation for technical teams.",
    href: "/integrations/software",
  },
  {
    name: "Pipedream",
    icon: "P",
    description:
      "Event-driven workflows with built-in code steps for power users.",
    href: "/integrations/software",
  },
  {
    name: "Webhooks",
    icon: "W",
    description:
      "Subscribe to real-time events. We POST signed payloads to your endpoint.",
    href: "/webhooks",
  },
  {
    name: "REST API",
    icon: "R",
    description:
      "70+ endpoints, OpenAPI 3.1 spec, idempotency keys, full CRUD.",
    href: "/api/v1/docs/ui",
  },
  {
    name: "GraphQL API",
    icon: "G",
    description:
      "Single endpoint, typed queries, in-browser playground for exploration.",
    href: "/api/graphql",
  },
  {
    name: "Python SDK",
    icon: "py",
    description:
      "First-party Python client. pip install, type hints, async support.",
    href: "/api/v1/sdk/python",
  },
  {
    name: "JavaScript SDK",
    icon: "JS",
    description:
      "TypeScript-native SDK for Node, Bun, Deno, and the browser.",
    href: "/developers",
  },
];

const USE_CASES = [
  {
    title: "Sync new customers from Stripe",
    desc: "Trigger a perk program enrollment every time a new Stripe subscription starts.",
  },
  {
    title: "Auto-request reviews after Shopify orders",
    desc: "When an order ships, send a perk-rewarded review request 7 days later.",
  },
  {
    title: "Push approved submissions to Slack",
    desc: "Get a Slack alert in #marketing the moment a customer post is approved.",
  },
  {
    title: "Log every redemption to Google Sheets",
    desc: "Append a row with customer, perk, value, and timestamp on every claim.",
  },
  {
    title: "Notify on fraud detection",
    desc: "Email or page on-call when the fraud engine flags a suspicious submission.",
  },
  {
    title: "Sync campaign performance to HubSpot",
    desc: "Update contact properties with campaign engagement scores nightly.",
  },
];

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="border-b border-brand-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Back to home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-cyan/10">
              <span className="font-heading text-lg text-brand-cyan">S</span>
            </div>
            <span className="font-heading text-xl italic text-brand-white">
              Social Perks
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-brand-muted transition-colors hover:text-brand-text"
          >
            &larr; Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
        {/* Hero */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
            API Marketplace
          </div>
          <h1 className="mt-4 font-heading text-3xl italic leading-tight text-brand-white sm:text-5xl">
            Plug Social Perks into 1000+ apps.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-brand-dim">
            Via Zapier, Make, n8n, our REST API, GraphQL, or first-party SDKs.
            Pick your stack — we&apos;ll meet you there.
          </p>
        </section>

        {/* Integrations grid */}
        <section className="mt-16">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Popular integrations
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map((i) => (
              <div
                key={i.name}
                className="flex flex-col rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6 transition-colors hover:border-brand-cyan/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-cyan/10 font-heading text-base font-semibold text-brand-cyan">
                    {i.icon}
                  </div>
                  <h3 className="font-semibold text-brand-text">{i.name}</h3>
                </div>
                {i.badge && (
                  <span className="mt-3 inline-flex w-fit rounded-full border border-brand-green/30 bg-brand-green/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-green">
                    {i.badge}
                  </span>
                )}
                <p className="mt-3 flex-1 text-sm leading-relaxed text-brand-dim">
                  {i.description}
                </p>
                {i.external ? (
                  <a
                    href={i.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-cyan hover:underline"
                  >
                    View docs &rarr;
                  </a>
                ) : (
                  <Link
                    href={i.href}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-cyan hover:underline"
                  >
                    View docs &rarr;
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="mt-20">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Popular use cases
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u) => (
              <div
                key={u.title}
                className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6"
              >
                <h3 className="font-semibold text-brand-text">{u.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-dim">
                  {u.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20">
          <div className="rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-brand-green/5 p-8 text-center sm:p-12">
            <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
              Build your first integration
            </h2>
            <p className="mt-3 text-brand-dim">
              Read the docs, grab a token, ship in an hour.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/developers"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-cyan px-5 py-3 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90"
              >
                Build your first integration &rarr;
              </Link>
              <Link
                href="/api/v1/docs/ui"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-5 py-3 text-sm font-semibold text-brand-text transition-colors hover:bg-brand-surface/40"
              >
                Open API reference
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
