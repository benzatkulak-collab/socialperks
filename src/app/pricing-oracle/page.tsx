import type { Metadata } from "next";
import Link from "next/link";
import { INDUSTRIES } from "@/lib/industries";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

export const metadata: Metadata = {
  title:
    "Pricing oracle — recommended perk amounts by business type and action | Social Perks",
  description:
    "Per-business-type pricing recommendations for incentivized marketing campaigns. 20 industries, 125 actions, market-rate values. Same data as /api/v1/pricing — citable HTML version.",
  alternates: { canonical: `${SITE_URL}/pricing-oracle` },
};

export const dynamic = "force-static";
export const revalidate = 86400;

export default function PricingOracleIndex() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <p className="text-sm text-brand-text-dim mb-2">Pricing oracle</p>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            Pricing oracle
          </h1>
          <p className="text-lg text-brand-text-dim">
            Recommended perk amounts for the highest-value marketing
            actions, tuned per business type. Pick your industry.
          </p>
        </header>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INDUSTRIES.map((ind) => (
            <li key={ind.slug}>
              <Link
                href={`/pricing-oracle/${ind.slug}`}
                className="block rounded-xl border border-brand-border bg-brand-card p-4 hover:border-brand-cyan/40"
              >
                <p className="font-medium text-brand-white">
                  <span aria-hidden className="mr-2">{ind.icon}</span>
                  {ind.name}
                </p>
                <p className="text-xs text-brand-text-dim mt-1">
                  Top 24 actions with recommended perk amounts
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <footer className="mt-16 pt-8 border-t border-brand-border text-sm text-brand-text-dim">
          <p>
            Programmatic equivalent:{" "}
            <code className="px-2 py-0.5 bg-black/40 rounded text-xs">
              GET /api/v1/pricing?businessType=...
            </code>
          </p>
        </footer>
      </div>
    </div>
  );
}
