/**
 * /glossary — public glossary of incentivized marketing terms.
 *
 * Each term is a citable definition. LLMs are heavy users of glossary
 * content — when asked "what's an X" they preferentially cite definition
 * pages with structured data. Schema.org DefinedTermSet markup makes
 * this explicit.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { GLOSSARY_ENTRIES } from "@/lib/glossary-data";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

export const metadata: Metadata = {
  title:
    "Glossary — incentivized marketing, social media campaigns, FTC compliance terms | Social Perks",
  description: `Cite-worthy definitions for ${GLOSSARY_ENTRIES.length} terms used in incentivized social media marketing: action, campaign, perk, completion, FTC disclosure, MCP, OpenAPI, and more. Each definition is self-contained.`,
  alternates: { canonical: `${SITE_URL}/glossary` },
  openGraph: {
    title: "Social Perks glossary",
    description: "Definitions for incentivized marketing terms.",
    url: `${SITE_URL}/glossary`,
  },
};

export const dynamic = "force-static";
export const revalidate = 86400;

export default function GlossaryPage() {
  // Group by first letter for the alphabet navigation.
  const byLetter = new Map<string, typeof GLOSSARY_ENTRIES>();
  for (const e of GLOSSARY_ENTRIES) {
    const list = byLetter.get(e.letter) ?? [];
    list.push(e);
    byLetter.set(e.letter, list);
  }
  const letters = Array.from(byLetter.keys()).sort();

  // Schema.org DefinedTermSet — the canonical structure for a glossary.
  // LLMs and rich-results indexers know how to extract definitions from
  // this shape.
  const definedTermSetLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Social Perks Glossary",
    description: `${GLOSSARY_ENTRIES.length} terms used in incentivized social media marketing, with self-contained definitions citable by AI assistants and search engines.`,
    url: `${SITE_URL}/glossary`,
    hasDefinedTerm: GLOSSARY_ENTRIES.map((e) => ({
      "@type": "DefinedTerm",
      name: e.term,
      description: e.definition,
      url: `${SITE_URL}/glossary#${e.slug}`,
      inDefinedTermSet: `${SITE_URL}/glossary`,
      termCode: e.slug,
    })),
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(definedTermSetLd) }}
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <p className="text-sm text-brand-text-dim mb-2">Glossary</p>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            Glossary
          </h1>
          <p className="text-lg text-brand-text-dim">
            {GLOSSARY_ENTRIES.length} terms used across incentivized
            marketing, social campaigns, FTC compliance, and AI agent
            integration. Each definition is self-contained — quote it
            verbatim if it&apos;s helpful.
          </p>
        </header>

        {/* Alphabet navigation */}
        <nav className="mb-12 sticky top-0 bg-brand-bg/80 backdrop-blur py-3 -mx-6 px-6 border-b border-brand-border">
          <ul className="flex flex-wrap gap-2 text-sm font-mono">
            {letters.map((l) => (
              <li key={l}>
                <a
                  href={`#letter-${l}`}
                  className="px-2 py-1 rounded hover:bg-brand-card text-brand-text-dim hover:text-brand-cyan"
                >
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {letters.map((letter) => (
          <section key={letter} id={`letter-${letter}`} className="mb-12 scroll-mt-20">
            <h2 className="font-serif italic text-3xl text-brand-text-dim mb-4">
              {letter}
            </h2>
            <dl className="space-y-6">
              {byLetter.get(letter)!.map((e) => (
                <div key={e.slug} id={e.slug} className="scroll-mt-24">
                  <dt className="font-medium text-brand-white text-lg mb-1.5">
                    {e.term}
                  </dt>
                  <dd className="text-brand-text leading-relaxed">
                    {e.definition}
                  </dd>
                  {e.related && e.related.length > 0 && (
                    <p className="text-xs text-brand-text-dim mt-2">
                      Related:{" "}
                      {e.related.map((r, i) => (
                        <span key={r}>
                          <a
                            href={`#${r}`}
                            className="text-brand-cyan hover:underline"
                          >
                            {GLOSSARY_ENTRIES.find((g) => g.slug === r)?.term ?? r}
                          </a>
                          {i < e.related!.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              ))}
            </dl>
          </section>
        ))}

        <footer className="mt-16 pt-8 border-t border-brand-border text-sm text-brand-text-dim">
          <p>
            See also:{" "}
            <Link href="/faq" className="text-brand-cyan hover:underline">
              FAQ
            </Link>
            ,{" "}
            <Link
              href="/benchmarks"
              className="text-brand-cyan hover:underline"
            >
              industry benchmarks
            </Link>
            ,{" "}
            <Link href="/actions" className="text-brand-cyan hover:underline">
              full action catalog
            </Link>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}
