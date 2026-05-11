import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { DIY_METHODS } from "@/lib/instead-of/data";

export const metadata: Metadata = {
  title:
    "Instead of Spreadsheets, Punch Cards & Flyers: Try Social Perks (2026)",
  description:
    "Switching from your current marketing method? Compare 12 DIY approaches (spreadsheets, punch cards, Yelp Deals, Groupon, and more) and see what changes with Social Perks. Free for 14 days.",
  alternates: {
    canonical: "https://socialperks.io/instead-of",
  },
  openGraph: {
    title: "Instead of DIY Marketing — Try Social Perks",
    description:
      "Switching from spreadsheets, punch cards, Groupon, Yelp Deals, or word-of-mouth? See the honest comparison.",
    url: "https://socialperks.io/instead-of",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function InsteadOfIndexPage() {
  // Group methods by category in stable order
  const categoriesInOrder: string[] = [];
  for (const m of DIY_METHODS) {
    if (!categoriesInOrder.includes(m.category)) {
      categoriesInOrder.push(m.category);
    }
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://socialperks.io",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Instead of",
        item: "https://socialperks.io/instead-of",
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-brand-text/60">
          <Link href="/" className="hover:text-brand-cyan">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text/80">Instead of</span>
        </nav>

        {/* Hero */}
        <header className="mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            Method comparison
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            Switching from your current
            <br />
            <span className="text-brand-cyan">marketing method?</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-brand-text/80">
            Most small businesses don&apos;t replace another platform — they
            replace a spreadsheet, a stack of punch cards, or a habit of asking
            customers in person. Here&apos;s the honest comparison across{" "}
            {DIY_METHODS.length} common DIY methods: what works, where it
            breaks, and when Social Perks is worth the switch.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/ai"
              className="rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
            >
              Try free for 14 days
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-white/20 px-6 py-3 font-medium text-brand-white transition hover:border-brand-cyan hover:text-brand-cyan"
            >
              See pricing
            </Link>
          </div>
        </header>

        {/* Category sections */}
        {categoriesInOrder.map((cat) => {
          const items = DIY_METHODS.filter((m) => m.category === cat);
          return (
            <section key={cat} className="mb-16">
              <div className="mb-8 border-b border-white/10 pb-6">
                <h2 className="font-serif text-3xl italic text-brand-white">
                  {cat}
                </h2>
                <p className="mt-3 max-w-2xl text-brand-text/70">
                  {items.length === 1
                    ? "One DIY method in this category."
                    : `${items.length} DIY methods in this category.`}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/instead-of/${item.slug}`}
                    className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-serif text-xl italic text-brand-white group-hover:text-brand-cyan">
                          {item.displayName}
                        </div>
                        <p className="mt-2 text-sm text-brand-text/70">
                          {item.description}
                        </p>
                      </div>
                      <span className="ml-3 text-brand-cyan transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {/* Final CTA */}
        <section className="mt-8 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 text-center md:p-12">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white md:text-4xl">
            Not sure which method you&apos;re replacing?
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-brand-text/80">
            Start the free tier in 10 minutes. The AI agent will suggest a
            first campaign based on your business — you can keep the
            spreadsheet running in parallel for as long as you want.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/ai"
              className="rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
            >
              Start free
            </Link>
            <Link
              href="/alternatives"
              className="rounded-full border border-white/20 px-6 py-3 font-medium text-brand-white transition hover:border-brand-cyan hover:text-brand-cyan"
            >
              Switching from a platform instead?
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
