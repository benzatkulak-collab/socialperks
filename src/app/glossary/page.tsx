import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { GLOSSARY } from "@/lib/glossary/terms";

export const metadata: Metadata = {
  title: "Marketing Glossary · 30 terms every small business should know",
  description:
    "A plain-language marketing glossary for small business owners. Definitions, examples, and how-to-use tips for UGC, influencer marketing, local SEO, NPS, CAC, LTV, and 24 more.",
  alternates: { canonical: "https://socialperks.io/glossary" },
  openGraph: {
    title: "Social Perks Marketing Glossary",
    description:
      "30 marketing terms defined plainly, with real examples and practical use cases.",
    url: "https://socialperks.io/glossary",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function GlossaryIndexPage() {
  // Group by category
  const byCategory = GLOSSARY.reduce<Record<string, typeof GLOSSARY>>(
    (acc, t) => {
      acc[t.category] = acc[t.category] || [];
      acc[t.category].push(t);
      return acc;
    },
    {}
  );

  const orderedCategories = [
    "Channels",
    "People",
    "Content",
    "Programs",
    "Local SEO",
    "Metrics",
    "Psychology",
    "Compliance",
    "Operations",
  ].filter((c) => byCategory[c]);

  // DefinedTermSet JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Social Perks Marketing Glossary",
    description:
      "30 marketing terms every small business owner should know — defined plainly with examples.",
    url: "https://socialperks.io/glossary",
    hasDefinedTerm: GLOSSARY.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      url: `https://socialperks.io/glossary/${t.slug}`,
      inDefinedTermSet: "https://socialperks.io/glossary",
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <header className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            Glossary
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            Marketing terms,{" "}
            <span className="text-brand-cyan">explained plainly</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-brand-text/80">
            Thirty marketing terms every small business owner should understand
            — defined in plain English, with real examples and practical
            how-to-use tips. No jargon. No fluff.
          </p>
          <p className="mt-3 text-sm text-brand-text/50">
            {GLOSSARY.length} terms · last updated May 2026
          </p>
        </header>

        {orderedCategories.map((cat) => (
          <section key={cat} className="mb-12">
            <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
              {cat}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {byCategory[cat].map((t) => (
                <Link
                  key={t.slug}
                  href={`/glossary/${t.slug}`}
                  className="group rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
                >
                  <div className="font-medium text-brand-white group-hover:text-brand-cyan">
                    {t.term}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-brand-text/60">
                    {t.definition.split(".")[0]}.
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <div className="mt-12 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 text-center">
          <h2 className="font-serif text-2xl italic text-brand-white">
            Run automated UGC campaigns with Social Perks
          </h2>
          <p className="mt-2 text-brand-text/80">
            Put these concepts to work. Free 14-day trial. No credit card.
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
