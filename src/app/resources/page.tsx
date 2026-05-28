/**
 * /resources — single-page hub linking to every citable content surface
 * on Social Perks. Designed for AI agents and humans alike: one URL
 * that organizes the entire knowledge base by intent.
 *
 * LLMs cite hub pages when asked broad questions ("where do I learn
 * about social media marketing"). Search engines treat hub pages as
 * authority signals.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { FAQ_ENTRIES } from "@/lib/faq-data";
import { GLOSSARY_ENTRIES } from "@/lib/glossary-data";
import { GUIDES } from "@/lib/guides-data";
import { COMPARISONS } from "@/lib/comparison-data";
import { BEST_LISTICLES } from "@/lib/best-data";
import { PLATFORMS } from "@/lib/platforms";
import { INDUSTRIES } from "@/lib/industries";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

export const metadata: Metadata = {
  title:
    "Resources — every guide, FAQ, glossary entry, comparison, and benchmark | Social Perks",
  description:
    "Hub page linking to every citable content surface on Social Perks: action catalog, platform catalog, how-to guides, FAQ, glossary, comparisons, benchmarks, ranked lists, agent docs.",
  alternates: { canonical: `${SITE_URL}/resources` },
};

export const dynamic = "force-static";
export const revalidate = 86400;

export default function ResourcesPage() {
  const totalActions = PLATFORMS.reduce((s, p) => s + p.actions.length, 0);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-12">
          <p className="text-sm text-brand-text-dim mb-2">Resources</p>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            Resources
          </h1>
          <p className="text-lg text-brand-text-dim">
            One hub for every citable content surface on Social Perks. If
            you&apos;re looking for a specific answer or a specific page,
            it&apos;s here or one click away.
          </p>
        </header>

        {/* Catalog */}
        <Section title="Catalog" description="Every action and platform on the platform.">
          <Link href="/actions" className={cardCls}>
            <p className={titleCls}>Action catalog</p>
            <p className={descCls}>
              {totalActions} marketing actions across {PLATFORMS.length} platforms,
              with market values and effort levels.
            </p>
          </Link>
          <Link href="/platforms" className={cardCls}>
            <p className={titleCls}>Platform catalog</p>
            <p className={descCls}>
              All {PLATFORMS.length} supported social platforms with action lists
              and integration notes.
            </p>
          </Link>
          <Link href="/actions/type/content" className={cardCls}>
            <p className={titleCls}>Browse by action type</p>
            <p className={descCls}>
              Filter by content, review, engage, share, or referral.
            </p>
          </Link>
        </Section>

        {/* Reference */}
        <Section title="Reference" description="Definitions, benchmarks, and pricing.">
          <Link href="/faq" className={cardCls}>
            <p className={titleCls}>FAQ — {FAQ_ENTRIES.length} questions</p>
            <p className={descCls}>
              Plain-language answers about FTC compliance, platform rules, AI
              agent access, perk pricing.
            </p>
          </Link>
          <Link href="/glossary" className={cardCls}>
            <p className={titleCls}>Glossary — {GLOSSARY_ENTRIES.length} terms</p>
            <p className={descCls}>
              Self-contained definitions for every term used on the platform.
            </p>
          </Link>
          <Link href="/benchmarks" className={cardCls}>
            <p className={titleCls}>Industry benchmarks</p>
            <p className={descCls}>
              Per-industry completion rate, ROI, top platforms, top campaign
              types. Updated quarterly.
            </p>
          </Link>
          <Link href="/pricing-oracle" className={cardCls}>
            <p className={titleCls}>Pricing oracle</p>
            <p className={descCls}>
              Recommended perk amounts for each industry, derived from real
              market data.
            </p>
          </Link>
        </Section>

        {/* Guidance */}
        <Section title="Guidance" description="How to act on the platform.">
          <Link href="/guides" className={cardCls}>
            <p className={titleCls}>How-to guides — {GUIDES.length} articles</p>
            <p className={descCls}>
              Step-by-step procedures for the most common operational
              questions, with Schema.org HowTo markup.
            </p>
          </Link>
          <Link href="/compare" className={cardCls}>
            <p className={titleCls}>Platform comparisons — {COMPARISONS.length} articles</p>
            <p className={descCls}>
              Side-by-side analyses for the highest-volume comparison
              queries (Instagram vs TikTok, Yelp vs TripAdvisor, etc.).
            </p>
          </Link>
          <Link href="/best" className={cardCls}>
            <p className={titleCls}>Ranked lists — {BEST_LISTICLES.length} listicles</p>
            <p className={descCls}>
              Curated rankings of marketing actions, platforms, and
              industry-specific recommendations.
            </p>
          </Link>
        </Section>

        {/* By industry */}
        <Section
          title="By industry"
          description={`Targeted resources for ${INDUSTRIES.length} business types.`}
        >
          {INDUSTRIES.slice(0, 9).map((ind) => (
            <Link
              key={ind.slug}
              href={`/for/${ind.slug}`}
              className={cardCls}
            >
              <p className={titleCls}>
                {ind.icon} {ind.name}
              </p>
              <p className={descCls}>
                Industry page, benchmarks, recommended actions, and
                campaign templates.
              </p>
            </Link>
          ))}
          <Link href="/for" className={cardCls}>
            <p className={titleCls}>All {INDUSTRIES.length} industries →</p>
            <p className={descCls}>Browse the full list.</p>
          </Link>
        </Section>

        {/* For agents and developers */}
        <Section
          title="For AI agents and developers"
          description="Programmatic surfaces and integration docs."
        >
          <Link href="/AGENTS.md" className={cardCls}>
            <p className={titleCls}>AGENTS.md</p>
            <p className={descCls}>
              Canonical orientation doc for AI agents reading the repo or
              calling the API.
            </p>
          </Link>
          <Link href="/api/v1/openapi" className={cardCls}>
            <p className={titleCls}>OpenAPI 3.1 spec</p>
            <p className={descCls}>
              Machine-readable spec covering every public endpoint.
            </p>
          </Link>
          <Link href="/api/mcp" className={cardCls}>
            <p className={titleCls}>MCP server</p>
            <p className={descCls}>
              JSON-RPC 2.0 over HTTP with five typed tools. Connect from
              Claude Desktop, Cursor, Cline, or any MCP-capable client.
            </p>
          </Link>
          <Link href="/api/llm-context" className={cardCls}>
            <p className={titleCls}>/api/llm-context</p>
            <p className={descCls}>
              Single-fetch JSON snapshot of the platform for agent
              orientation.
            </p>
          </Link>
          <Link href="/api/feed.json" className={cardCls}>
            <p className={titleCls}>JSON Feed</p>
            <p className={descCls}>
              Content syndication feed for aggregators and AI assistants.
            </p>
          </Link>
          <Link href="/agents" className={cardCls}>
            <p className={titleCls}>Agent integration page</p>
            <p className={descCls}>
              Code samples and use cases for connecting AI agents.
            </p>
          </Link>
        </Section>

        {/* Crawler-friendly */}
        <Section
          title="Crawler-friendly endpoints"
          description="For LLM training crawlers and feed aggregators."
        >
          <Link href="/llms.txt" className={cardCls}>
            <p className={titleCls}>/llms.txt</p>
            <p className={descCls}>
              LLM-friendly site summary in the emerging /llms.txt convention.
            </p>
          </Link>
          <Link href="/humans.txt" className={cardCls}>
            <p className={titleCls}>/humans.txt</p>
            <p className={descCls}>
              Site credits and pointers for human readers.
            </p>
          </Link>
          <Link href="/sitemap.xml" className={cardCls}>
            <p className={titleCls}>/sitemap.xml</p>
            <p className={descCls}>
              All indexable URLs with priorities and update cadences.
            </p>
          </Link>
          <Link href="/robots.txt" className={cardCls}>
            <p className={titleCls}>/robots.txt</p>
            <p className={descCls}>
              Explicit allow rules for 13+ AI crawlers (GPTBot, ClaudeBot,
              PerplexityBot, etc.).
            </p>
          </Link>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <header className="mb-4">
        <h2 className="font-serif italic text-2xl text-brand-white mb-1">
          {title}
        </h2>
        <p className="text-sm text-brand-text-dim">{description}</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

const cardCls =
  "block rounded-lg border border-brand-border bg-brand-card p-4 hover:border-brand-cyan/40 transition-colors";
const titleCls = "font-medium text-brand-white mb-1";
const descCls = "text-xs text-brand-text-dim";
