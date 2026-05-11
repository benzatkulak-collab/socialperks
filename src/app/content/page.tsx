import Link from "next/link";
import type { Metadata } from "next";
import { CONTENT_CATEGORIES } from "@/lib/content/data";

export const metadata: Metadata = {
  title: "Content Hub — Reviews, Influencer Marketing, Social, Loyalty, Local",
  description:
    "Deep guides across 5 categories and 40 topics for small business customer marketing.",
};

export default function ContentHubPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-serif text-4xl italic text-white">Content hub</h1>
      <p className="mt-4 text-gray-300">
        Deep guides across five core categories. Pick a topic to learn the strategy, tactics, and tools that drive results.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {CONTENT_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/content/${c.slug}`}
            className="block rounded-lg border border-white/10 p-6 transition hover:border-cyan-400/40 hover:bg-white/5"
          >
            <p className="font-serif text-2xl italic text-white">{c.label}</p>
            <p className="mt-2 text-sm text-gray-400">{c.description}</p>
            <p className="mt-3 text-xs font-mono uppercase text-cyan-300">{c.topics.length} guides →</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
