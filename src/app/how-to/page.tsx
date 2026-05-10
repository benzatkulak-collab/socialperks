import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { GUIDES, CATEGORIES, groupByCategory } from "@/lib/howto/guides";
import { HowToSearch } from "./how-to-search";

export const metadata: Metadata = {
  title: "How-to guides for small business marketing · 30 tutorials",
  description:
    "Step-by-step tutorials for getting reviews, setting up social media, creating content, acquiring customers, and measuring growth. Plain-English how-to guides for small business owners.",
  alternates: { canonical: "https://socialperks.io/how-to" },
  openGraph: {
    title: "How-to guides for small business marketing",
    description:
      "30 step-by-step tutorials covering reviews, social media, content, acquisition, and analytics.",
    url: "https://socialperks.io/how-to",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function HowToIndexPage() {
  const grouped = groupByCategory();

  // ItemList JSON-LD for the index
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Social Perks How-To Guides",
    description: "30 step-by-step tutorials for small business marketing",
    url: "https://socialperks.io/how-to",
    numberOfItems: GUIDES.length,
    itemListElement: GUIDES.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://socialperks.io/how-to/${g.slug}`,
      name: g.title,
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main
        id="main-content"
        className="mx-auto max-w-5xl px-6 py-16 md:py-24"
      >
        <header className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            How-to guides
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            How-to guides for{" "}
            <span className="text-brand-cyan">small business marketing</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-brand-text/80">
            Thirty step-by-step tutorials covering reviews, social media setup,
            content creation, customer acquisition, and analytics. Plain
            English. No fluff. Built for owners, not agencies.
          </p>
          <p className="mt-3 text-sm text-brand-text/50">
            {GUIDES.length} guides · last updated May 2026
          </p>
        </header>

        <HowToSearch guides={GUIDES} />

        {CATEGORIES.map((cat) =>
          grouped[cat] ? (
            <section key={cat} className="mb-12">
              <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
                {cat}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped[cat].map((g) => (
                  <Link
                    key={g.slug}
                    href={`/how-to/${g.slug}`}
                    className="group rounded-lg border border-white/10 bg-white/[0.02] p-5 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
                  >
                    <div className="font-medium text-brand-white group-hover:text-brand-cyan">
                      {g.title}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-brand-text/60">
                      {g.description}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-brand-text/50">
                      <span className="font-mono text-brand-cyan/80">
                        {g.timeMinutes} min read
                      </span>
                      <span>·</span>
                      <span>{g.difficulty}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null,
        )}

        <div className="mt-12 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 text-center">
          <h2 className="font-serif text-2xl italic text-brand-white">
            Skip the manual work
          </h2>
          <p className="mt-2 text-brand-text/80">
            Social Perks runs your customer marketing on autopilot. 14-day free
            trial. No card required.
          </p>
          <Link
            href="/ai"
            className="mt-5 inline-block rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
          >
            Start free
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
