import type { Metadata } from "next";
import Link from "next/link";
import { VS_ENTRIES } from "@/lib/vs-data";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

export const metadata: Metadata = {
  title: "Compare Social Perks vs alternatives — head-to-head | Social Perks",
  description:
    "Side-by-side comparisons with Yotpo, influencer-marketing platforms, Meta Ads, Google Ads. Honest verdicts on which one wins for your situation.",
  alternates: { canonical: `${SITE_URL}/vs` },
};

export const dynamic = "force-static";

export default function VsIndex() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Social Perks alternatives — head-to-head comparisons",
    itemListElement: VS_ENTRIES.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/vs/${e.slug}`,
      name: `Social Perks vs ${e.competitor}`,
    })),
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(ld) }}
      />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <p className="text-sm text-brand-text-dim mb-2">Alternatives</p>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            Compare Social Perks vs alternatives
          </h1>
          <p className="text-lg text-brand-text-dim">
            Honest, side-by-side comparisons. We tell you when the
            alternative wins, too.
          </p>
        </header>

        <ul className="space-y-3">
          {VS_ENTRIES.map((e) => (
            <li key={e.slug}>
              <Link
                href={`/vs/${e.slug}`}
                className="block rounded-lg border border-brand-border bg-brand-card p-5 hover:border-brand-cyan/40"
              >
                <p className="font-medium text-brand-white text-lg mb-1">
                  Social Perks vs {e.competitor}
                </p>
                <p className="text-sm text-brand-text-dim">{e.shortDescription}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
