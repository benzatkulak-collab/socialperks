import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  ASK_QUESTIONS,
  getAskQuestion,
} from "@/lib/ask/questions";

interface Params {
  slug: string;
}

const SITE = "https://socialperks.io";

export function generateStaticParams(): Params[] {
  return ASK_QUESTIONS.map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const q = getAskQuestion(slug);
  if (!q) return {};

  return {
    title: `${q.question} · Social Perks`,
    description: q.metaDescription,
    alternates: { canonical: `${SITE}/ask/${q.slug}` },
    openGraph: {
      title: q.question,
      description: q.metaDescription,
      url: `${SITE}/ask/${q.slug}`,
      siteName: "Social Perks",
      type: "article",
      publishedTime: q.datePublished,
      modifiedTime: q.dateModified,
      authors: ["Social Perks Editorial"],
    },
    twitter: {
      card: "summary_large_image",
      title: q.question,
      description: q.metaDescription,
    },
  };
}

export default async function AskQuestionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const q = getAskQuestion(slug);
  if (!q) notFound();

  const url = `${SITE}/ask/${q.slug}`;
  const author = q.author ?? "Social Perks Editorial";

  // 1. FAQPage JSON-LD - the question as the FAQ entity
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: q.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: q.tldr,
        },
      },
    ],
  };

  // 2. QAPage JSON-LD
  const qaJsonLd = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: q.question,
      text: q.question,
      answerCount: 1,
      url,
      datePublished: q.datePublished,
      author: {
        "@type": "Organization",
        name: author,
      },
      acceptedAnswer: {
        "@type": "Answer",
        text: q.tldr,
        upvoteCount: 0,
        url,
        datePublished: q.datePublished,
        author: {
          "@type": "Organization",
          name: author,
        },
      },
    },
  };

  // 3. Article JSON-LD with mainEntity
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: q.h1,
    description: q.metaDescription,
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    datePublished: q.datePublished,
    dateModified: q.dateModified,
    author: {
      "@type": "Organization",
      name: author,
      url: SITE,
    },
    publisher: {
      "@type": "Organization",
      name: "Social Perks",
      url: SITE,
      logo: {
        "@type": "ImageObject",
        url: `${SITE}/icon.png`,
      },
    },
    articleSection: q.category,
    keywords: q.question,
  };

  // 4. Breadcrumb JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Ask",
        item: `${SITE}/ask`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: q.category,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: q.question,
        item: url,
      },
    ],
  };

  const relatedQuestions = q.related
    .map((s) => ASK_QUESTIONS.find((x) => x.slug === s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(qaJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
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
          <Link href="/ask" className="hover:text-brand-cyan">
            Ask
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text/80">{q.category}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            {q.category}
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            {q.h1}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-brand-text/60">
            <span>By {author}</span>
            <span>·</span>
            <time dateTime={q.datePublished}>
              Published {new Date(q.datePublished).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </time>
            <span>·</span>
            <time dateTime={q.dateModified}>
              Updated {new Date(q.dateModified).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </time>
          </div>
        </header>

        {/* TL;DR */}
        <section
          aria-label="Quick answer"
          className="mb-10 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/[0.08] to-transparent p-6"
        >
          <div className="mb-2 font-mono text-xs uppercase tracking-wider text-brand-cyan">
            TL;DR
          </div>
          <p className="text-lg leading-relaxed text-brand-white">{q.tldr}</p>
        </section>

        {/* Detailed answer */}
        <section className="mb-12">
          {q.sections.map((s, i) => (
            <div key={i} className="mb-8">
              <h2 className="mb-3 font-serif text-2xl italic text-brand-white">
                {s.heading}
              </h2>
              {s.body.split("\n\n").map((para, pi) => (
                <p
                  key={pi}
                  className="mb-4 leading-relaxed text-brand-text/85"
                >
                  {para}
                </p>
              ))}
            </div>
          ))}
        </section>

        {/* Key facts */}
        <section className="mb-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
            Key facts
          </h2>
          <ul className="space-y-3">
            {q.keyFacts.map((f, i) => (
              <li key={i} className="flex gap-3 text-brand-text/85">
                <span className="mt-1 text-brand-cyan">▸</span>
                <span className="leading-relaxed">{f}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Step-by-step */}
        {q.steps && q.steps.length > 0 ? (
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
              Step-by-step
            </h2>
            <ol className="space-y-3">
              {q.steps.map((s, i) => (
                <li
                  key={i}
                  className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
                >
                  <span className="font-mono text-sm text-brand-cyan">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed text-brand-text/85">
                    {s}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Common mistakes */}
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
            Common mistakes
          </h2>
          <ul className="space-y-3">
            {q.mistakes.map((m, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 text-brand-text/85"
              >
                <span className="text-amber-400">×</span>
                <span className="leading-relaxed">{m}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Tools and resources */}
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
            Tools and resources
          </h2>
          <div className="space-y-3">
            {q.tools.map((t, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
              >
                <div className="mb-1 font-medium text-brand-white">
                  {t.href ? (
                    <Link
                      href={t.href}
                      className="hover:text-brand-cyan"
                    >
                      {t.name} →
                    </Link>
                  ) : (
                    t.name
                  )}
                </div>
                <p className="text-sm leading-relaxed text-brand-text/70">
                  {t.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Related questions */}
        <section className="mb-12 border-t border-white/10 pt-10">
          <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
            Related questions
          </h2>
          <ul className="space-y-2">
            {relatedQuestions.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/ask/${r.slug}`}
                  className="group flex items-start gap-2 rounded-lg p-3 transition hover:bg-white/[0.03]"
                >
                  <span className="mt-1 text-brand-cyan">→</span>
                  <span className="leading-snug text-brand-text/85 group-hover:text-brand-cyan">
                    {r.question}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 text-center">
          <h2 className="mb-3 font-serif text-2xl italic text-brand-white">
            Stop doing this manually
          </h2>
          <p className="mb-5 text-brand-text/80">
            Social Perks turns every customer into part of your marketing team -
            reviews, referrals, and posts on autopilot. 14-day free trial. No
            card required.
          </p>
          <Link
            href="/"
            className="inline-block rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
          >
            Try Social Perks free
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
