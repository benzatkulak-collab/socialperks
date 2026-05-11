import type { Metadata } from "next";
import Link from "next/link";
import {
  LOCAL_NICHES,
  LOCAL_CITIES,
  LOCAL_OUTCOMES,
} from "@/lib/local-niche/data";

export const metadata: Metadata = {
  title: "Local Marketing Playbooks — Niche × City × Outcome",
  description:
    "600 free local marketing playbooks: 8 small business niches × 15 cities × 5 growth outcomes. Pick your business, your city, and what you want to grow.",
  alternates: { canonical: "/local-niche" },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16 text-white">
      <header className="mb-12">
        <h1 className="font-serif text-5xl italic leading-tight mb-6">
          Local marketing playbooks by niche, city, and outcome
        </h1>
        <p className="text-xl text-white/70 max-w-3xl">
          {LOCAL_NICHES.length} niches × {LOCAL_CITIES.length} cities ×{" "}
          {LOCAL_OUTCOMES.length} outcomes ={" "}
          {LOCAL_NICHES.length * LOCAL_CITIES.length * LOCAL_OUTCOMES.length}{" "}
          tailored playbooks. Pick yours.
        </p>
      </header>

      <section className="mb-16">
        <h2 className="font-serif text-3xl italic mb-6">Start with your business</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {LOCAL_NICHES.map((n) => (
            <Link
              key={n.slug}
              href={`/local-niche/${n.slug}`}
              className="border border-white/10 rounded-lg p-5 hover:border-cyan-400/50 hover:bg-white/[0.02] transition"
            >
              <div className="font-medium text-white capitalize mb-1">
                {n.plural}
              </div>
              <div className="text-xs text-white/50">
                {LOCAL_CITIES.length} cities × {LOCAL_OUTCOMES.length} outcomes
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-3xl italic mb-6">Browse by city</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {LOCAL_CITIES.map((c) => (
            <div key={c.slug} className="text-white/70">
              <span className="text-white font-medium">{c.name}, {c.stateCode}</span>
              <span className="text-white/40"> — {c.vibe}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-3xl italic mb-6">Browse by outcome</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {LOCAL_OUTCOMES.map((o) => (
            <div
              key={o.slug}
              className="border border-white/10 rounded-lg p-5"
            >
              <div className="font-medium text-white mb-1">{o.name}</div>
              <div className="text-xs text-white/60">{o.benefit}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
