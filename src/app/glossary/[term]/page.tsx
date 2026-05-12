import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  GLOSSARY,
  getTerm,
  getRelatedTerms,
} from "@/lib/glossary/terms";

interface Params {
  term: string;
}

export function generateStaticParams(): Params[] {
  return GLOSSARY.map((t) => ({ term: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { term: slug } = await params;
  const t = getTerm(slug);
  if (!t) return {};

  const title = `What is ${t.shortTitle}? Definition + Examples · Social Perks`;
  const description = t.definition.split(".").slice(0, 2).join(".") + ".";

  return {
    title,
    description,
    alternates: { canonical: `https://socialperks.app/glossary/${t.slug}` },
    openGraph: {
      title,
      description,
      url: `https://socialperks.app/glossary/${t.slug}`,
      siteName: "Social Perks",
      type: "article",
    },
  };
}

export default async function TermPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { term: slug } = await params;
  const t = getTerm(slug);
  if (!t) notFound();

  const related = getRelatedTerms(t.relatedSlugs);

  // DefinedTerm JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: t.term,
    description: t.definition,
    url: `https://socialperks.app/glossary/${t.slug}`,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Social Perks Marketing Glossary",
      url: "https://socialperks.app/glossary",
    },
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
        className="mx-auto max-w-3xl px-6 py-16 md:py-24"
      >
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-brand-text/60">
          <Link href="/" className="hover:text-brand-cyan">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/glossary" className="hover:text-brand-cyan">
            Glossary
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text/80">{t.shortTitle}</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            {t.category}
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            What is {t.shortTitle}?
            <br />
            <span className="text-brand-cyan">Definition + Examples</span>
          </h1>
        </header>

        {/* Definition */}
        <section className="mb-10">
          <h2 className="mb-3 font-serif text-2xl italic text-brand-white">
            Definition
          </h2>
          <p className="text-lg leading-relaxed text-brand-text/85">
            {t.definition}
          </p>
        </section>

        {/* Why it matters */}
        <section className="mb-10 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-3 font-serif text-2xl italic text-brand-white">
            Why it matters for small businesses
          </h2>
          <p className="leading-relaxed text-brand-text/80">{t.whyItMatters}</p>
        </section>

        {/* Examples */}
        <section className="mb-10">
          <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
            Examples
          </h2>
          <div className="space-y-4">
            {t.examples.map((ex, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
              >
                <div className="mb-2 text-xs uppercase tracking-wider text-brand-cyan">
                  Example {i + 1}
                </div>
                <h3 className="mb-2 font-medium text-brand-white">
                  {ex.title}
                </h3>
                <p className="text-brand-text/80">{ex.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How to use */}
        <section className="mb-10">
          <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
            How to use {t.shortTitle.toLowerCase()} in your marketing
          </h2>
          <ol className="space-y-3">
            {t.howToUse.map((step, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4"
              >
                <span className="flex-shrink-0 font-mono text-sm text-brand-cyan">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-brand-text/85">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <section className="mb-12 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 text-center">
          <h2 className="mb-3 font-serif text-2xl italic text-brand-white">
            Run automated UGC campaigns with Social Perks
          </h2>
          <p className="mb-5 text-brand-text/80">
            Put {t.shortTitle.toLowerCase()} to work for your business. AI
            generates the campaign, customers do the marketing, and you get the
            results. Free for 14 days.
          </p>
          <Link
            href="/ai"
            className="inline-block rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
          >
            Start free
          </Link>
        </section>

        {/* Related terms */}
        <section className="border-t border-white/10 pt-10">
          <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
            Related terms
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/glossary/${r.slug}`}
                className="group rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
              >
                <div className="font-medium text-brand-white group-hover:text-brand-cyan">
                  {r.term} →
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-brand-text/60">
                  {r.definition.split(".")[0]}.
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/glossary"
              className="text-sm text-brand-cyan hover:underline"
            >
              See all glossary terms →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
