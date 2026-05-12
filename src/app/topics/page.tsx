import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { TOPIC_HUBS } from "@/lib/seo-pillars/topics";

export const metadata: Metadata = {
  title: "Topic Hubs · Social Perks",
  description:
    "Browse 20 topic hubs covering every angle of customer marketing, social media, reviews, loyalty, and more — for small business.",
  alternates: { canonical: "https://socialperks.app/topics" },
  openGraph: {
    title: "Topic Hubs · Social Perks",
    description:
      "Browse 20 topic hubs covering every angle of customer marketing for small business.",
    url: "https://socialperks.app/topics",
    type: "website",
    siteName: "Social Perks",
  },
};

export default function TopicsIndexPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <main
        id="main-content"
        className="mx-auto max-w-6xl px-6 py-16 md:py-24"
      >
        <header className="mb-12">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            Topic hubs
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-6xl">
            Resource hubs by topic
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-brand-text/80">
            Every topic in customer marketing for small business — guides, tools, examples, and comparisons, organized for you to drill into whatever you&apos;re working on next.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TOPIC_HUBS.map((t) => (
            <Link
              key={t.slug}
              href={`/topics/${t.slug}`}
              className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
            >
              <h2 className="font-serif text-xl italic text-brand-white group-hover:text-brand-cyan">
                {t.topic}
              </h2>
              <p className="mt-3 line-clamp-3 text-sm text-brand-text/70">
                {t.intro[0]}
              </p>
              <div className="mt-4 text-xs uppercase tracking-wider text-brand-cyan">
                Explore →
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 text-center md:p-12">
          <h2 className="mb-3 font-serif text-2xl italic text-brand-white">
            Looking for the ultimate guides?
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-brand-text/80">
            Topic hubs are curated entry points. For deeper dives, see our 8 pillar guides.
          </p>
          <Link
            href="/resources"
            className="inline-block rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
          >
            See all resources
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
