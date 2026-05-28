import type { Metadata } from "next";
import Link from "next/link";
import { BEST_LISTICLES } from "@/lib/best-data";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

export const metadata: Metadata = {
  title:
    "Best of Social Perks — ranked lists for marketing actions, platforms, industries | Social Perks",
  description: `${BEST_LISTICLES.length} ranked lists of the best marketing actions, platforms, and industry strategies — curated and updated quarterly.`,
  alternates: { canonical: `${SITE_URL}/best` },
};

export const dynamic = "force-static";
export const revalidate = 86400;

export default function BestIndex() {
  const byCategory = new Map<string, typeof BEST_LISTICLES>();
  for (const l of BEST_LISTICLES) {
    const list = byCategory.get(l.category) ?? [];
    list.push(l);
    byCategory.set(l.category, list);
  }
  const labels: Record<string, string> = {
    actions: "Marketing actions",
    platforms: "Social platforms",
    industries: "By industry",
    agents: "For AI agents",
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <p className="text-sm text-brand-text-dim mb-2">Best of</p>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            Best of Social Perks
          </h1>
          <p className="text-lg text-brand-text-dim">
            {BEST_LISTICLES.length} ranked lists answering specific
            questions about marketing actions, platforms, and
            industry-specific strategies.
          </p>
        </header>

        {Object.entries(labels).map(([cat, label]) => {
          const items = byCategory.get(cat);
          if (!items || items.length === 0) return null;
          return (
            <section key={cat} className="mb-10">
              <h2 className="font-serif italic text-2xl text-brand-white mb-4">
                {label}
              </h2>
              <ul className="space-y-2">
                {items.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={`/best/${l.slug}`}
                      className="block rounded-lg border border-brand-border bg-brand-card p-4 hover:border-brand-cyan/40"
                    >
                      <p className="font-medium text-brand-white mb-1">
                        {l.title}
                      </p>
                      <p className="text-sm text-brand-text-dim line-clamp-2">
                        {l.description}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
