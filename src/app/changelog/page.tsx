import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Changelog · Social Perks",
  description:
    "Everything new, improved, and fixed in Social Perks. Reverse-chronological changelog with shipping dates and details.",
  alternates: { canonical: "https://socialperks.io/changelog" },
  openGraph: {
    title: "Social Perks Changelog",
    description: "What we shipped, when we shipped it.",
    url: "https://socialperks.io/changelog",
    siteName: "Social Perks",
    type: "website",
  },
};

type EntryType = "NEW" | "IMPROVED" | "FIXED";

interface Entry {
  date: string;
  type: EntryType;
  title: string;
  description: string;
}

interface MonthGroup {
  month: string;
  entries: Entry[];
}

const CHANGELOG: MonthGroup[] = [
  {
    month: "April 2026",
    entries: [
      {
        date: "Apr 28, 2026",
        type: "NEW",
        title: "AI-first landing page at /ai",
        description:
          "New dedicated landing page positioning Social Perks as the AI marketing manager for small business. Live for A/B testing alongside the standard homepage.",
      },
      {
        date: "Apr 22, 2026",
        type: "NEW",
        title: "Render deployment blueprint",
        description:
          "Free-tier hosting on Render with one-click deploy. Production-ready Postgres, full TLS, custom domains.",
      },
      {
        date: "Apr 18, 2026",
        type: "IMPROVED",
        title: "Vercel build with explicit env vars",
        description:
          "Replaced secret references with direct env vars in vercel.json. Resolves a recurring build failure for new deployments.",
      },
      {
        date: "Apr 14, 2026",
        type: "NEW",
        title: "Programmatic SEO: /local city pages",
        description:
          "Launched 50 city pages and 1,000 city × industry combinations for local-SEO discovery. Each page is uniquely-templated, indexed, and linked from the sitemap.",
      },
      {
        date: "Apr 9, 2026",
        type: "NEW",
        title: "Three free tools at /tools",
        description:
          "Google Review Email Generator, Instagram Caption Generator, and SMS Review Templates. All no-signup, all free, all SEO-targeted.",
      },
      {
        date: "Apr 4, 2026",
        type: "IMPROVED",
        title: "Affiliate program landing page",
        description:
          "Public affiliate program at /affiliate with 30% recurring commission. Application form, tier breakdown, and FAQ.",
      },
      {
        date: "Apr 1, 2026",
        type: "FIXED",
        title: "Mobile nav overflow on iOS Safari",
        description:
          "Fixed a layout overflow on the mobile nav menu in iOS Safari that hid the last menu item behind the viewport edge.",
      },
    ],
  },
  {
    month: "March 2026",
    entries: [
      {
        date: "Mar 27, 2026",
        type: "NEW",
        title: "Blog system at /blog",
        description:
          "Full editorial blog with categories, tags, author pages, RSS feed, and JSON-LD article schema. 14 launch posts at GA.",
      },
      {
        date: "Mar 24, 2026",
        type: "IMPROVED",
        title: "Security audit — Score 5.0 → 8.2",
        description:
          "Layered security overhaul: CSRF on all writes, tiered rate limiting, HTML sanitization, CORS hardening, and 150+ vulnerability fixes across the codebase.",
      },
      {
        date: "Mar 22, 2026",
        type: "NEW",
        title: "Audit log at /api/v1/audit",
        description:
          "Full audit log of 11 event types — auth, billing, perk redemption, submission decisions, admin actions. Queryable via API and dashboard.",
      },
      {
        date: "Mar 19, 2026",
        type: "IMPROVED",
        title: "Multi-audience architecture",
        description:
          "Restructured from monolithic single-audience app into separate flows for small businesses, influencers, and enterprise. Each audience now gets a tailored dashboard and onboarding.",
      },
      {
        date: "Mar 15, 2026",
        type: "NEW",
        title: "2FA / TOTP support",
        description:
          "Time-based one-time password 2FA for all account holders. QR-code setup, recovery codes, and per-session enforcement options.",
      },
      {
        date: "Mar 12, 2026",
        type: "NEW",
        title: "Session listing and revocation",
        description:
          "View every active session for your account and revoke any one of them from the security settings page.",
      },
      {
        date: "Mar 8, 2026",
        type: "IMPROVED",
        title: "Idempotency keys on all mutations",
        description:
          "Every mutation endpoint now accepts an Idempotency-Key header for safe retries. Prevents duplicate campaigns and submissions on network flakiness.",
      },
      {
        date: "Mar 4, 2026",
        type: "FIXED",
        title: "Stripe webhook signature replay",
        description:
          "Tightened replay-protection window on the Stripe webhook handler from 10 minutes to 5 minutes.",
      },
      {
        date: "Mar 1, 2026",
        type: "NEW",
        title: "Free tier — forever",
        description:
          "Launched a forever-free tier: AI campaigns, up to 100 submissions/month, full review collection, and one influencer slot. No credit card.",
      },
    ],
  },
  {
    month: "February 2026",
    entries: [
      {
        date: "Feb 26, 2026",
        type: "NEW",
        title: "GraphQL API at /api/graphql",
        description:
          "Full typed GraphQL schema mirroring the REST surface. Playground UI included.",
      },
      {
        date: "Feb 22, 2026",
        type: "IMPROVED",
        title: "PWA: installable web app",
        description:
          "Service worker, manifest, and offline indicator. Social Perks now installs as a standalone app on iOS and Android.",
      },
      {
        date: "Feb 18, 2026",
        type: "NEW",
        title: "MCP server at /api/v1/mcp",
        description:
          "Model Context Protocol server definition for agent integrations. Claude, GPT, and Cursor can now call Social Perks directly.",
      },
      {
        date: "Feb 14, 2026",
        type: "IMPROVED",
        title: "OpenAPI 3.1 spec + Swagger UI",
        description:
          "Full machine-readable OpenAPI spec at /api/v1/docs and a Swagger UI at /api/v1/docs/ui. Used by the Python SDK and agent integrations.",
      },
      {
        date: "Feb 10, 2026",
        type: "NEW",
        title: "Python SDK download",
        description:
          "Official Python SDK distributed via /api/v1/sdk/python. Wraps the entire REST API with type hints and async support.",
      },
      {
        date: "Feb 6, 2026",
        type: "NEW",
        title: "Sandbox environment",
        description:
          "Isolated /api/v1/sandbox environment for safe agent testing. No real billing, no real submissions, no real influencers harmed.",
      },
      {
        date: "Feb 3, 2026",
        type: "IMPROVED",
        title: "i18n: Spanish + Portuguese",
        description:
          "Full Spanish and Portuguese support via useTranslation() — pluralization, interpolation, and ICU-style formatting.",
      },
      {
        date: "Feb 1, 2026",
        type: "FIXED",
        title: "Campaign duplicate-launch race",
        description:
          "Closed a race condition where a slow click could launch the same campaign twice. Idempotency keys + DB-level uniqueness now enforce single launch.",
      },
    ],
  },
  {
    month: "January 2026",
    entries: [
      {
        date: "Jan 28, 2026",
        type: "NEW",
        title: "ML recommendations engine",
        description:
          "Trained-model recommendations at /api/v1/recommendations. Suggests next perk, next platform, and next campaign action based on historical performance.",
      },
      {
        date: "Jan 24, 2026",
        type: "NEW",
        title: "Embeddable widget at /widget/[businessId]",
        description:
          "Drop-in JS snippet to embed your perk program on your own website. Customers enroll without leaving your domain.",
      },
      {
        date: "Jan 20, 2026",
        type: "IMPROVED",
        title: "Full-text search (TF-IDF + fuzzy)",
        description:
          "New search engine across campaigns, submissions, influencers, and perks. Fuzzy matching, typo tolerance, and weighted ranking.",
      },
      {
        date: "Jan 17, 2026",
        type: "NEW",
        title: "CSV and PDF export",
        description:
          "Export any dashboard view as CSV or PDF. Useful for monthly reporting and CFO handoffs.",
      },
      {
        date: "Jan 14, 2026",
        type: "NEW",
        title: "Server-Sent Events real-time stream",
        description:
          "Subscribe to a real-time event stream at /api/v1/events. Live submissions, perk redemptions, and campaign changes pushed to your client without polling.",
      },
      {
        date: "Jan 10, 2026",
        type: "NEW",
        title: "Feature flag API",
        description:
          "CRUD feature flags at /api/v1/flags. Per-customer rollouts, percentage targeting, and audit logging.",
      },
      {
        date: "Jan 7, 2026",
        type: "IMPROVED",
        title: "Server-Timing headers on every response",
        description:
          "100% request tracing now exposes per-handler timing via the Server-Timing response header. Easier to debug slow endpoints in production.",
      },
      {
        date: "Jan 4, 2026",
        type: "FIXED",
        title: "Postgres pool exhaustion under burst load",
        description:
          "Tuned PgBouncer pool sizing and added connection-level timeouts. Resolves intermittent 503s observed during traffic spikes.",
      },
      {
        date: "Jan 2, 2026",
        type: "NEW",
        title: "Year-in-review dashboard",
        description:
          "An annual recap dashboard for every business: campaigns run, customers activated, revenue tied to perks, and top-performing influencers.",
      },
    ],
  },
];

const TYPE_STYLES: Record<EntryType, string> = {
  NEW: "border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan",
  IMPROVED: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  FIXED: "border-green-400/40 bg-green-400/10 text-green-300",
};

export default function ChangelogPage() {
  const totalEntries = CHANGELOG.reduce((n, m) => n + m.entries.length, 0);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <header className="mb-12">
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            Changelog
          </h1>
          <p className="mt-4 text-lg text-brand-text/80">
            Everything new, improved, and fixed in Social Perks. Newest first.
          </p>
          <p className="mt-3 text-sm text-brand-text/50">
            {totalEntries} entries across {CHANGELOG.length} months
          </p>
        </header>

        {CHANGELOG.map((group) => (
          <section key={group.month} className="mb-14">
            <h2 className="sticky top-0 z-10 mb-6 bg-brand-bg/90 py-3 font-serif text-2xl italic text-brand-white backdrop-blur">
              {group.month}
            </h2>
            <div className="space-y-4">
              {group.entries.map((entry, i) => (
                <article
                  key={`${group.month}-${i}`}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono uppercase tracking-wider ${TYPE_STYLES[entry.type]}`}
                    >
                      {entry.type}
                    </span>
                    <span className="font-mono text-brand-text/50">
                      {entry.date}
                    </span>
                  </div>
                  <h3 className="mb-2 font-medium text-brand-white">
                    {entry.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-brand-text/75">
                    {entry.description}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-12 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 text-center">
          <h2 className="font-serif text-2xl italic text-brand-white">
            See what&apos;s next
          </h2>
          <p className="mt-2 text-brand-text/80">
            Check the public roadmap to see what we&apos;re building now, next,
            and later.
          </p>
          <Link
            href="/roadmap"
            className="mt-5 inline-block rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
          >
            View roadmap
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
