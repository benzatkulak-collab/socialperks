/**
 * Public catalog of all 125+ marketing actions across 25+ platforms.
 *
 * Why this exists: when someone (human or LLM) searches "what's an
 * Instagram story tag worth" or "list of marketing actions for small
 * businesses", they should land here. Each action gets its own page at
 * /actions/[id] with structured data, so search engines and LLMs can
 * cite the catalog entries.
 *
 * Static — generated at build time, served from CDN. No DB calls.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { PLATFORMS } from "@/lib/platforms";
import type { Action, ActionType } from "@social-perks/shared/types";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

export const metadata: Metadata = {
  title: "Marketing Action Catalog — 125 ways customers can promote your business | Social Perks",
  description:
    "Browse 125 marketing actions across 25 social platforms. Each action has a market-rate dollar value, an effort level, and instructions for incentivizing it. Free to browse — no signup required.",
  alternates: {
    canonical: `${SITE_URL}/actions`,
  },
  openGraph: {
    title: "Marketing Action Catalog — Social Perks",
    description:
      "125 marketing actions across 25 platforms with market-rate pricing. Used by AI agents and small businesses to plan campaigns.",
    url: `${SITE_URL}/actions`,
  },
};

// Allow this page to be statically generated and cached at the edge.
export const dynamic = "force-static";
export const revalidate = 86400;

const TYPE_LABELS: Record<ActionType, string> = {
  content: "Content",
  review: "Review",
  engage: "Engage",
  share: "Share",
  referral: "Referral",
};

const TYPE_COLORS: Record<ActionType, string> = {
  content: "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20",
  review: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  engage: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  share: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  referral: "bg-pink-500/10 text-pink-300 border-pink-500/20",
};

interface FlatAction extends Action {
  platformId: string;
  platformName: string;
  platformIcon: string;
  platformColor: string;
}

function flatten(): FlatAction[] {
  const out: FlatAction[] = [];
  for (const p of PLATFORMS) {
    for (const a of p.actions) {
      out.push({
        ...a,
        platformId: p.id,
        platformName: p.name,
        platformIcon: p.icon,
        platformColor: p.color,
      });
    }
  }
  return out;
}

export default function ActionsCatalog() {
  const all = flatten();
  const totalValue = all.reduce((sum, a) => sum + a.value, 0);

  // Group by platform for the layout.
  const byPlatform = new Map<string, FlatAction[]>();
  for (const a of all) {
    const list = byPlatform.get(a.platformId) ?? [];
    list.push(a);
    byPlatform.set(a.platformId, list);
  }

  // JSON-LD ItemList of every action so search engines and LLMs can
  // index the catalog as a structured dataset.
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Social Perks Marketing Action Catalog",
    description: `${all.length} marketing actions across ${PLATFORMS.length} platforms with market-rate pricing.`,
    numberOfItems: all.length,
    itemListElement: all.slice(0, 100).map((a, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${SITE_URL}/actions/${a.id}`,
      name: `${a.platformName} ${a.label}`,
    })),
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(itemList) }}
      />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-12">
          <p className="text-sm text-brand-text-dim mb-2">Catalog</p>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            Marketing Action Catalog
          </h1>
          <p className="text-lg text-brand-text-dim max-w-2xl mb-6">
            Every social media action a customer can take to promote a
            business, with market-rate pricing. {all.length} actions
            across {PLATFORMS.length} platforms. Free to browse — no
            signup required.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Stat label="Total actions" value={all.length.toString()} />
            <Stat label="Platforms" value={PLATFORMS.length.toString()} />
            <Stat label="Combined value per cycle" value={`$${totalValue.toFixed(0)}`} />
          </div>
        </header>

        {/* Programmatic + agent access notice */}
        <section className="mb-12 rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-5">
          <p className="text-sm font-medium text-brand-white mb-2">
            For AI agents and developers
          </p>
          <p className="text-sm text-brand-text-dim mb-3">
            This catalog is also available as JSON via the public API
            (no auth required) and as an MCP tool.
          </p>
          <div className="flex flex-wrap gap-2 font-mono text-xs">
            <code className="px-3 py-1.5 bg-black/40 rounded border border-brand-border">
              GET /api/v1/actions
            </code>
            <code className="px-3 py-1.5 bg-black/40 rounded border border-brand-border">
              MCP tool: listActions
            </code>
            <Link
              href="/api/v1/openapi"
              className="px-3 py-1.5 bg-black/40 rounded border border-brand-border hover:border-brand-cyan"
            >
              OpenAPI spec →
            </Link>
          </div>
        </section>

        {Array.from(byPlatform.entries()).map(([platformId, actions]) => {
          const platform = PLATFORMS.find((p) => p.id === platformId)!;
          return (
            <section key={platformId} className="mb-12">
              <Link
                href={`/platforms/${platformId}`}
                className="inline-flex items-center gap-3 mb-4 group"
              >
                <span className="text-3xl">{platform.icon}</span>
                <h2 className="font-serif italic text-2xl text-brand-white group-hover:text-brand-cyan transition-colors">
                  {platform.name}
                </h2>
                <span className="text-sm text-brand-text-dim">
                  {actions.length} actions
                </span>
              </Link>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {actions.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/actions/${a.id}`}
                      className="block rounded-lg border border-brand-border bg-brand-card p-4 hover:border-brand-cyan/40 transition-colors h-full"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-medium text-brand-white">
                          {a.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded text-brand-cyan font-mono">
                          ${a.value.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <span
                          className={`px-1.5 py-0.5 rounded border ${TYPE_COLORS[a.type]}`}
                        >
                          {TYPE_LABELS[a.type]}
                        </span>
                        <span className="px-1.5 py-0.5 rounded border border-brand-border text-brand-text-dim">
                          Effort {a.effort}
                        </span>
                        {!a.incentivizable && (
                          <span className="px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-300">
                            FTC: organic only
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <footer className="mt-16 pt-8 border-t border-brand-border text-sm text-brand-text-dim">
          <p>
            Want to use these actions in a campaign? <Link href="/" className="text-brand-cyan hover:underline">Get started →</Link>
          </p>
          <p className="mt-2">
            Building an agent? See <Link href="/AGENTS.md" className="text-brand-cyan hover:underline">AGENTS.md</Link>{" "}
            and <Link href="/api/v1/openapi" className="text-brand-cyan hover:underline">/api/v1/openapi</Link>.
          </p>
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2 rounded-lg border border-brand-border bg-brand-card">
      <p className="text-xs text-brand-text-dim">{label}</p>
      <p className="font-mono text-brand-white">{value}</p>
    </div>
  );
}
