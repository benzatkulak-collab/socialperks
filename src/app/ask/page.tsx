import type { Metadata } from "next";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { ASK_QUESTIONS } from "@/lib/ask/questions";
import { AskSearch } from "./ask-search";

const SITE = "https://socialperks.io";

export const metadata: Metadata = {
  title: "Ask · Real answers to real small business marketing questions",
  description:
    "Direct, cited answers to 40 common small business marketing questions - reviews, Instagram, influencers, customer acquisition. Built for owners, not agencies.",
  alternates: { canonical: `${SITE}/ask` },
  openGraph: {
    title: "Ask · Small business marketing answers",
    description:
      "40 plain-English answers to the questions small business owners actually ask about marketing.",
    url: `${SITE}/ask`,
    siteName: "Social Perks",
    type: "website",
  },
};

export default function AskIndexPage() {
  // FAQPage JSON-LD with all 40 questions
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ASK_QUESTIONS.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.tldr,
      },
    })),
  };

  // ItemList JSON-LD for the index
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Social Perks Ask - Small Business Marketing Q&A",
    description:
      "40 cited answers to the most common small business marketing questions.",
    url: `${SITE}/ask`,
    numberOfItems: ASK_QUESTIONS.length,
    itemListElement: ASK_QUESTIONS.map((q, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/ask/${q.slug}`,
      name: q.question,
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <main
        id="main-content"
        className="mx-auto max-w-5xl px-6 py-16 md:py-24"
      >
        <header className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            Ask
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-6xl">
            Real answers to real{" "}
            <span className="text-brand-cyan">
              small business marketing questions
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-brand-text/80">
            Forty plain-English answers to the questions small business owners
            actually ask: how to get reviews, find influencers, run Instagram,
            and acquire customers without wasting money. Cited. No fluff.
          </p>
          <p className="mt-3 text-sm text-brand-text/50">
            {ASK_QUESTIONS.length} questions · last updated May 2026
          </p>
        </header>

        <AskSearch questions={ASK_QUESTIONS} />

        <div className="mt-16 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 text-center">
          <h2 className="font-serif text-2xl italic text-brand-white">
            Have a question we missed?
          </h2>
          <p className="mt-2 text-brand-text/80">
            Social Perks helps small businesses turn customers into a marketing
            team. 14-day free trial. No card required.
          </p>
          <a
            href="/"
            className="mt-5 inline-block rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
          >
            Try Social Perks free
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
