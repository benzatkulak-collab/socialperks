import type { Metadata } from "next";
import Link from "next/link";
import { COMPARISONS, getPlatform } from "@/lib/comparison-data";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

export const metadata: Metadata = {
  title: "Platform comparisons — Instagram vs TikTok, Google vs Yelp, more | Social Perks",
  description:
    "Side-by-side comparisons of social media platforms for incentivized marketing campaigns. Action counts, market values, FTC rules, and recommendations for small businesses.",
  alternates: { canonical: `${SITE_URL}/compare` },
};

export const dynamic = "force-static";
export const revalidate = 86400;

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <p className="text-sm text-brand-text-dim mb-2">Comparisons</p>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            Platform comparisons
          </h1>
          <p className="text-lg text-brand-text-dim">
            Side-by-side analyses of social media platforms for
            incentivized marketing. Pick the one closest to your
            question.
          </p>
        </header>

        <ul className="space-y-3">
          {COMPARISONS.map((c) => {
            const a = getPlatform(c.platformAId);
            const b = getPlatform(c.platformBId);
            return (
              <li key={c.slug}>
                <Link
                  href={`/compare/${c.slug}`}
                  className="block rounded-xl border border-brand-border bg-brand-card p-5 hover:border-brand-cyan/40"
                >
                  <p className="font-medium text-brand-white mb-1">
                    {a?.icon} {a?.name} vs {b?.icon} {b?.name}
                  </p>
                  <p className="text-sm text-brand-text-dim line-clamp-2">
                    {c.description}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
