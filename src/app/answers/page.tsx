import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  ANSWERS_BY_CATEGORY,
  CATEGORY_META,
  type AnswerCategory,
} from "@/lib/answers-data";
import { safeJsonForScript } from "@/lib/security/json-ld";

export const metadata: Metadata = {
  title: "Answers — Social Perks",
  description:
    "Plain-English answers to the questions small-business owners ask about customer marketing, FTC compliance, Google reviews, Instagram incentives, and more.",
  alternates: {
    canonical: "https://socialperks.app/answers",
  },
};

// The order categories appear in. Buyer-intent questions first
// (legality, FTC) because that's what new visitors arrive looking for.
const CATEGORY_ORDER: AnswerCategory[] = [
  "legality",
  "ftc-compliance",
  "tactics",
  "pricing",
  "comparison",
  "getting-started",
  "platform-rules",
];

export default function AnswersIndexPage() {
  // Schema.org ItemList — gives Google a clean machine-readable index
  // of every Q&A on the site, improving sitelink-style results.
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Social Perks Answers",
    description:
      "Plain-English answers to questions about customer marketing, FTC compliance, and incentivized social posts.",
    itemListElement: CATEGORY_ORDER.flatMap((cat, catIdx) =>
      ANSWERS_BY_CATEGORY[cat].map((ans, idx) => ({
        "@type": "ListItem",
        position: catIdx * 100 + idx + 1,
        url: `https://socialperks.app/answers/${ans.slug}`,
        name: ans.question,
      }))
    ),
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(itemListSchema) }}
      />

      <section className="relative bg-brand-bg pt-32 pb-12 sm:pt-40 sm:pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <nav
            className="mb-6 flex items-center gap-2 text-sm text-brand-muted"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-brand-text transition-colors">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">Answers</span>
          </nav>

          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Answers
          </p>
          <h1 className="font-heading text-[clamp(2rem,5vw,3.5rem)] italic leading-[1.1] text-brand-white">
            Straight answers to the questions{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              small-business owners
            </span>{" "}
            actually ask
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
            No fluff, no SEO word-salad. Each page answers one specific
            question — the way you&apos;d explain it to a friend over coffee.
          </p>
        </div>
      </section>

      <section className="bg-brand-bg pb-20 sm:pb-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
          {CATEGORY_ORDER.map((cat) => {
            const answers = ANSWERS_BY_CATEGORY[cat];
            if (answers.length === 0) return null;
            const meta = CATEGORY_META[cat];
            return (
              <div key={cat}>
                <div className="mb-5">
                  <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
                    {meta.label}
                  </h2>
                  <p className="mt-1 text-sm text-brand-dim">{meta.description}</p>
                </div>
                <ul className="space-y-2" role="list">
                  {answers.map((ans) => (
                    <li key={ans.slug}>
                      <Link
                        href={`/answers/${ans.slug}`}
                        className="group flex items-start justify-between gap-3 rounded-xl border border-brand-border/40 bg-brand-surface/30 px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-brand-cyan/40 hover:bg-brand-surface/50 sm:px-5 sm:py-5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-brand-white group-hover:text-brand-cyan transition-colors sm:text-base">
                            {ans.question}
                          </p>
                          <p className="mt-1 text-xs text-brand-dim leading-relaxed sm:text-sm line-clamp-2">
                            {ans.shortAnswer}
                          </p>
                        </div>
                        <span
                          className="shrink-0 text-brand-cyan transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}
