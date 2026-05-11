import Link from "next/link";
import type { Metadata } from "next";
import { BEST_FOR } from "@/lib/best-for/data";

export const metadata: Metadata = {
  title: "Best Customer Marketing Platform — By Business Type",
  description:
    "See how Social Perks compares for restaurants, salons, gyms, boutiques, agencies, franchises, and 14 other business types.",
};

export default function BestForIndexPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-serif text-4xl italic text-white">Best customer marketing platform — by business type</h1>
      <p className="mt-4 text-gray-300">
        Pick your business type to see exactly how Social Perks fits, what tier makes sense, and how it compares to alternatives.
      </p>
      <div className="mt-10 grid gap-3 md:grid-cols-2">
        {BEST_FOR.map((b) => (
          <Link
            key={b.slug}
            href={`/best-for/${b.slug}`}
            className="block rounded-lg border border-white/10 px-4 py-4 transition hover:border-cyan-400/40 hover:bg-white/5"
          >
            <p className="font-semibold text-white">{b.criteria}</p>
            <p className="mt-1 text-sm text-gray-400">{b.heroSubhead.slice(0, 120)}…</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
