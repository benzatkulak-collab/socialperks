import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides-data";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

export const metadata: Metadata = {
  title: "How-To Guides: Incentivized Marketing & Compliance",
  description: `${GUIDES.length} step-by-step guides for incentivized marketing, FTC compliance, perk-amount selection, and AI agent integration.`,
  alternates: { canonical: `${SITE_URL}/guides` },
};

export const dynamic = "force-static";
export const revalidate = 86400;

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "How-to guides",
          url: `${SITE_URL}/guides`,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: GUIDES.map((g, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: g.title,
              url: `${SITE_URL}/guides/${g.slug}`,
            })),
          },
        }) }}
      />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <p className="text-sm text-brand-text-dim mb-2">Guides</p>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            How-to guides
          </h1>
          <p className="text-lg text-brand-text-dim">
            Step-by-step walkthroughs for {GUIDES.length} of the most
            common questions: launching campaigns, FTC compliance,
            picking perk amounts, redemption setup, and building MCP
            agents.
          </p>
        </header>

        <ul className="space-y-3">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/guides/${g.slug}`}
                className="block rounded-xl border border-brand-border bg-brand-card p-5 hover:border-brand-cyan/40"
              >
                <p className="font-medium text-brand-white mb-1">{g.title}</p>
                <p className="text-sm text-brand-text-dim mb-2 line-clamp-2">
                  {g.description}
                </p>
                <p className="text-xs text-brand-text-dim">
                  {g.steps.length} steps · {g.timeLabel}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
