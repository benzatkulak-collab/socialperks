/**
 * Public catalog of all 25+ supported social media platforms.
 *
 * Each platform gets a static page at /platforms/[id] listing the
 * actions available on it, their values, and integration notes.
 * Indexable, citable by LLMs.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { PLATFORMS } from "@/lib/platforms";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

export const metadata: Metadata = {
  title: "Supported Platforms — 25 social platforms with marketing actions | Social Perks",
  description:
    "Instagram, TikTok, Google, Facebook, Yelp, and 20 more. Browse all 25 platforms Social Perks supports with their available marketing actions and market-rate pricing.",
  alternates: { canonical: `${SITE_URL}/platforms` },
  openGraph: {
    title: "Supported Platforms — Social Perks",
    description:
      "All 25 platforms supported for marketing campaigns, with action lists and pricing.",
    url: `${SITE_URL}/platforms`,
  },
};

export const dynamic = "force-static";
export const revalidate = 86400;

export default function PlatformsCatalog() {
  const totalActions = PLATFORMS.reduce((sum, p) => sum + p.actions.length, 0);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Social Perks Supported Platforms",
    description: `${PLATFORMS.length} social platforms supported, with ${totalActions} marketing actions in total.`,
    numberOfItems: PLATFORMS.length,
    itemListElement: PLATFORMS.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${SITE_URL}/platforms/${p.id}`,
      name: p.name,
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
            Supported platforms
          </h1>
          <p className="text-lg text-brand-text-dim max-w-2xl">
            {PLATFORMS.length} social platforms covered with{" "}
            {totalActions} actions in total. Each platform has its own
            page with the full action list and integration notes.
          </p>
        </header>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PLATFORMS.map((p) => {
            const totalValue = p.actions.reduce((s, a) => s + a.value, 0);
            return (
              <li key={p.id}>
                <Link
                  href={`/platforms/${p.id}`}
                  className="block rounded-lg border border-brand-border bg-brand-card p-5 hover:border-brand-cyan/40 transition-colors"
                  style={{ borderLeftColor: p.color, borderLeftWidth: 3 }}
                >
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl">{p.icon}</span>
                    <h2 className="font-serif italic text-lg text-brand-white">
                      {p.name}
                    </h2>
                  </div>
                  <p className="text-xs text-brand-text-dim">
                    {p.actions.length} actions · ${totalValue.toFixed(2)}{" "}
                    combined value per cycle
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>

        <footer className="mt-16 pt-8 border-t border-brand-border text-sm text-brand-text-dim">
          <p>
            Browse all actions:{" "}
            <Link href="/actions" className="text-brand-cyan hover:underline">
              /actions →
            </Link>
          </p>
          <p className="mt-2">
            Building an agent? See{" "}
            <Link href="/AGENTS.md" className="text-brand-cyan hover:underline">
              AGENTS.md
            </Link>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}
