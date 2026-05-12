import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  PILLARS,
  getPillarBySlug,
  type Pillar,
} from "@/lib/pillars/data";
import { renderBody, renderInline, stripMarkdown } from "@/lib/pillars/render";

interface Params {
  slug: string;
}

export function generateStaticParams(): Params[] {
  return PILLARS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pillar = getPillarBySlug(slug);
  if (!pillar) return {};
  const url = `https://socialperks.app/guide/${pillar.slug}`;
  return {
    title: pillar.title,
    description: pillar.description,
    alternates: { canonical: url },
    openGraph: {
      title: pillar.title,
      description: pillar.description,
      url,
      siteName: "Social Perks",
      type: "article",
      publishedTime: pillar.publishedAt,
      modifiedTime: pillar.updatedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: pillar.title,
      description: pillar.description,
    },
  };
}

function buildArticleJsonLd(pillar: Pillar, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: pillar.h1,
    description: pillar.description,
    datePublished: pillar.publishedAt,
    dateModified: pillar.updatedAt,
    author: {
      "@type": "Organization",
      name: "Social Perks Editorial",
    },
    publisher: {
      "@type": "Organization",
      name: "Social Perks",
      url: "https://socialperks.app",
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    articleSection: pillar.category,
    wordCount: pillar.wordCount,
  };
}

function buildFaqJsonLd(pillar: Pillar) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pillar.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: stripMarkdown(f.a),
      },
    })),
  };
}

function buildBreadcrumbJsonLd(pillar: Pillar, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://socialperks.app",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Guides",
        item: "https://socialperks.app/guide",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: pillar.h1,
        item: url,
      },
    ],
  };
}

export default async function PillarPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const pillar = getPillarBySlug(slug);
  if (!pillar) notFound();

  const url = `https://socialperks.app/guide/${pillar.slug}`;

  // Anchor IDs for TOC
  const tocEntries = [
    { id: "tldr", label: "TL;DR" },
    ...pillar.sections.map((s) => ({ id: s.id, label: s.heading })),
    { id: "common-mistakes", label: "Common mistakes" },
    { id: "faq", label: "FAQ" },
    { id: "conclusion", label: "Conclusion & next steps" },
  ];

  const related = PILLARS.filter((p) => p.slug !== pillar.slug).slice(0, 4);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildArticleJsonLd(pillar, url)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildFaqJsonLd(pillar)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBreadcrumbJsonLd(pillar, url)),
        }}
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
          <Link href="/guide" className="hover:text-brand-cyan">
            Guides
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text/80">{pillar.category}</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            Pillar · {pillar.category}
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl lg:text-6xl">
            {pillar.h1}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-brand-text/70 md:text-xl">
            {pillar.hero}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-text/60">
            <span className="font-mono text-brand-cyan">
              {pillar.readingMinutes} min read
            </span>
            <span aria-hidden>·</span>
            <span>{pillar.wordCount.toLocaleString()} words</span>
            <span aria-hidden>·</span>
            <span>Updated {pillar.updatedAt}</span>
          </div>
        </header>

        {/* TL;DR */}
        <section
          id="tldr"
          className="mb-12 rounded-2xl border border-brand-cyan/25 bg-gradient-to-br from-brand-cyan/[0.06] to-transparent p-6 md:p-8"
        >
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-brand-cyan">
            TL;DR — executive summary
          </h2>
          {pillar.tldr.map((p, i) => (
            <p
              key={i}
              className="mb-4 text-base leading-relaxed text-brand-text/85 last:mb-0 md:text-lg"
            >
              {p}
            </p>
          ))}
        </section>

        {/* Table of contents */}
        <nav
          aria-label="Table of contents"
          className="mb-12 rounded-xl border border-white/10 bg-white/[0.02] p-5"
        >
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-brand-text/70">
            On this page
          </h2>
          <ol className="space-y-1 text-sm">
            {tocEntries.map((e, idx) => (
              <li key={e.id} className="flex gap-2">
                <span className="font-mono text-brand-cyan/60">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <a
                  href={`#${e.id}`}
                  className="text-brand-text/80 hover:text-brand-cyan"
                >
                  {e.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <article>
          {pillar.sections.map((section) => (
            <section key={section.id} id={section.id} className="mb-14 scroll-mt-24">
              <h2 className="mb-5 font-serif text-3xl italic leading-snug text-brand-white md:text-4xl">
                {section.heading}
              </h2>
              {renderBody(section.body, `${section.id}-body`)}
              {section.subsections?.map((sub, j) => (
                <div key={j} className="mt-8">
                  <h3 className="mb-3 font-serif text-xl text-brand-white md:text-2xl">
                    {sub.heading}
                  </h3>
                  <p className="text-base leading-relaxed text-brand-text/85 md:text-lg">
                    {renderInline(sub.body, `${section.id}-sub-${j}`)}
                  </p>
                </div>
              ))}
            </section>
          ))}

          {/* Common mistakes */}
          <section id="common-mistakes" className="mb-14 scroll-mt-24">
            <h2 className="mb-5 font-serif text-3xl italic leading-snug text-brand-white md:text-4xl">
              Common mistakes to avoid
            </h2>
            <ol className="space-y-5">
              {pillar.mistakes.map((m, i) => (
                <li key={i} className="flex gap-4">
                  <span className="shrink-0 font-mono text-sm text-brand-cyan">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="mb-1 font-medium text-brand-white">
                      {m.title}
                    </h3>
                    <p className="text-base leading-relaxed text-brand-text/80">
                      {renderInline(m.body, `mistake-${i}`)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* FAQ */}
          <section id="faq" className="mb-14 scroll-mt-24">
            <h2 className="mb-5 font-serif text-3xl italic leading-snug text-brand-white md:text-4xl">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {pillar.faqs.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-lg border border-white/10 bg-white/[0.02] p-5 transition hover:border-brand-cyan/30"
                >
                  <summary className="cursor-pointer font-medium text-brand-white">
                    {f.q}
                  </summary>
                  <p className="mt-3 text-base leading-relaxed text-brand-text/80">
                    {renderInline(f.a, `faq-${i}`)}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Conclusion + CTA */}
          <section id="conclusion" className="mb-14 scroll-mt-24">
            <h2 className="mb-5 font-serif text-3xl italic leading-snug text-brand-white md:text-4xl">
              Conclusion and next steps
            </h2>
            <p className="text-base leading-relaxed text-brand-text/85 md:text-lg">
              The strategies above are the durable ones — they compound, they
              outlast platform changes, and they get cheaper per acquired
              customer over time. The right next step depends on where you are.
              If you are starting from zero, pick one strategy from the list
              and run it for ninety days before adding another. If you already
              have one working, layer the second. Skim the{" "}
              <Link href="/how-to" className="text-brand-cyan hover:underline">
                how-to library
              </Link>{" "}
              for tactical walkthroughs, the{" "}
              <Link href="/playbooks" className="text-brand-cyan hover:underline">
                playbooks
              </Link>{" "}
              for category-specific plans, and the{" "}
              <Link href="/tools" className="text-brand-cyan hover:underline">
                tools directory
              </Link>{" "}
              for calculators that quantify the lift.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-lg bg-brand-cyan px-5 py-2.5 text-sm font-medium text-brand-bg transition hover:bg-brand-cyan/90"
              >
                See pricing
              </Link>
              <Link
                href="/quiz/best-platform"
                className="inline-flex items-center rounded-lg border border-white/15 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-brand-white transition hover:border-brand-cyan/40"
              >
                Take the platform quiz
              </Link>
            </div>
          </section>

          {/* Related resources */}
          <section
            aria-label="Related resources"
            className="mb-14 border-t border-white/10 pt-10"
          >
            <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
              Related resources
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pillar.internalLinks.map((l) => (
                <Link
                  key={l.href + l.label}
                  href={l.href}
                  className="group flex items-center justify-between rounded-md border border-white/5 bg-white/[0.015] px-3 py-2 text-sm transition hover:border-brand-cyan/30 hover:bg-white/[0.04]"
                >
                  <span className="text-brand-text/85 group-hover:text-brand-cyan">
                    {l.label}
                  </span>
                  <span className="text-xs text-brand-text/40">
                    {l.context}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Other pillars */}
          {related.length > 0 ? (
            <section className="border-t border-white/10 pt-10">
              <h2 className="mb-5 font-serif text-2xl italic text-brand-white">
                Other pillar guides
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/guide/${r.slug}`}
                    className="group rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
                  >
                    <div className="font-medium text-brand-white group-hover:text-brand-cyan">
                      {r.h1}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-brand-text/60">
                      {r.description}
                    </p>
                    <div className="mt-2 font-mono text-xs text-brand-cyan/70">
                      {r.readingMinutes} min read
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link
                  href="/guide"
                  className="text-sm text-brand-cyan hover:underline"
                >
                  See all pillar guides →
                </Link>
              </div>
            </section>
          ) : null}
        </article>
      </main>
      <Footer />
    </div>
  );
}
