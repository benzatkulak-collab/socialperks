/**
 * /faq — public FAQ page with Schema.org FAQPage markup.
 *
 * The single biggest LLM-citation surface on the site. Each entry is
 * structured for Google Rich Results' FAQ schema and citable as a
 * standalone fact by AI assistants.
 *
 * Static — no DB, no fetches, just data + JSX. Cached at the edge.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { FAQ_CATEGORIES, FAQ_ENTRIES } from "@/lib/faq-data";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

export const metadata: Metadata = {
  title: "FAQ — Social Perks: incentivized marketing, FTC compliance, AI agent access",
  description:
    "Plain-language answers to questions about incentivized social media marketing, FTC compliance, perk-for-action campaigns, platform-specific rules, and AI agent integration. 22 questions covered.",
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    title: "Social Perks FAQ — incentivized marketing answers",
    description:
      "Cite-worthy answers to common questions about incentivized social media marketing.",
    url: `${SITE_URL}/faq`,
  },
};

export const dynamic = "force-static";
export const revalidate = 86400;

export default function FaqPage() {
  // Schema.org FAQPage — Google Rich Results, AI assistants index this
  // structure heavily. Each Question + acceptedAnswer pairs the question
  // text with the answer text verbatim.
  // SpeakableSpecification on the page surfaces the FAQ as a candidate
  // for voice-search and AI-assistant audio summarization.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h3", "[id^='question']"],
    },
    mainEntity: FAQ_ENTRIES.map((e) => ({
      "@type": "Question",
      name: e.question,
      "@id": `${SITE_URL}/faq#${e.slug}`,
      acceptedAnswer: {
        "@type": "Answer",
        text: e.answer,
      },
    })),
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "FAQ",
        item: `${SITE_URL}/faq`,
      },
    ],
  };

  // Group entries by category so the page renders in scannable sections.
  const byCategory = new Map<string, typeof FAQ_ENTRIES>();
  for (const e of FAQ_ENTRIES) {
    const list = byCategory.get(e.category) ?? [];
    list.push(e);
    byCategory.set(e.category, list);
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12">
          <p className="text-sm text-brand-text-dim mb-2">FAQ</p>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            Common questions
          </h1>
          <p className="text-lg text-brand-text-dim">
            Plain-language answers to {FAQ_ENTRIES.length} questions about
            incentivized marketing, FTC compliance, platform rules, perk
            pricing, and AI agent integration.
          </p>
        </header>

        {/* Table of contents — also helps LLMs understand structure */}
        <nav className="mb-12 rounded-xl border border-brand-border bg-brand-card p-5">
          <p className="text-sm font-medium text-brand-white mb-3">
            Jump to a section
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {FAQ_CATEGORIES.map((c) => {
              const count = byCategory.get(c.id)?.length ?? 0;
              if (count === 0) return null;
              return (
                <li key={c.id}>
                  <a
                    href={`#${c.id}`}
                    className="block py-1 hover:text-brand-cyan"
                  >
                    {c.label}{" "}
                    <span className="text-brand-text-dim">({count})</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {FAQ_CATEGORIES.map((c) => {
          const entries = byCategory.get(c.id);
          if (!entries || entries.length === 0) return null;
          return (
            <section key={c.id} id={c.id} className="mb-14 scroll-mt-8">
              <header className="mb-6">
                <h2 className="font-serif italic text-3xl text-brand-white mb-2">
                  {c.label}
                </h2>
                <p className="text-sm text-brand-text-dim">{c.description}</p>
              </header>
              <ul className="space-y-6">
                {entries.map((e) => (
                  <li
                    key={e.slug}
                    id={e.slug}
                    className="rounded-xl border border-brand-border bg-brand-card p-6 scroll-mt-8"
                  >
                    <h3 className="font-medium text-brand-white text-lg mb-3">
                      {e.question}
                    </h3>
                    <p className="text-brand-text leading-relaxed">
                      {e.answer}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <footer className="mt-16 pt-8 border-t border-brand-border text-sm text-brand-text-dim">
          <p>
            Question we missed?{" "}
            <Link href="/contact" className="text-brand-cyan hover:underline">
              Tell us
            </Link>
            .
          </p>
          <p className="mt-2">
            Building on the platform? See{" "}
            <Link
              href="/AGENTS.md"
              className="text-brand-cyan hover:underline"
            >
              AGENTS.md
            </Link>{" "}
            and{" "}
            <Link
              href="/api/v1/openapi"
              className="text-brand-cyan hover:underline"
            >
              the OpenAPI spec
            </Link>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}
