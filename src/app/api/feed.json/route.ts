/**
 * GET /api/feed.json
 *
 * JSON Feed (jsonfeed.org) — open standard for content syndication that's
 * simpler than RSS/Atom and natively JSON. Indexed by feed aggregators
 * (Feedly, Inoreader), AI assistants that crawl content feeds, and
 * developer-tooling sites that surface "what's new" timelines.
 *
 * Lists all our citable content surfaces — guides, comparisons, FAQ,
 * glossary, best-of lists — so subscribers see new entries as we publish.
 */

import { NextResponse } from "next/server";
import { GUIDES } from "@/lib/guides-data";
import { COMPARISONS } from "@/lib/comparison-data";
import { FAQ_ENTRIES } from "@/lib/faq-data";
import { GLOSSARY_ENTRIES } from "@/lib/glossary-data";
import { BEST_LISTICLES } from "@/lib/best-data";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

interface JsonFeedItem {
  id: string;
  url: string;
  title: string;
  summary: string;
  date_published: string;
  tags?: string[];
}

export async function GET(): Promise<Response> {
  const now = new Date().toISOString();

  const items: JsonFeedItem[] = [
    ...GUIDES.map((g) => ({
      id: `${SITE_URL}/guides/${g.slug}`,
      url: `${SITE_URL}/guides/${g.slug}`,
      title: g.title,
      summary: g.description,
      date_published: now,
      tags: ["guide", "how-to"],
    })),
    ...COMPARISONS.map((c) => ({
      id: `${SITE_URL}/compare/${c.slug}`,
      url: `${SITE_URL}/compare/${c.slug}`,
      title: c.title,
      summary: c.description,
      date_published: now,
      tags: ["comparison"],
    })),
    ...BEST_LISTICLES.map((l) => ({
      id: `${SITE_URL}/best/${l.slug}`,
      url: `${SITE_URL}/best/${l.slug}`,
      title: l.title,
      summary: l.description,
      date_published: now,
      tags: ["best-of", "ranked-list", l.category],
    })),
    {
      id: `${SITE_URL}/faq`,
      url: `${SITE_URL}/faq`,
      title: `Social Perks FAQ — ${FAQ_ENTRIES.length} questions answered`,
      summary:
        "Plain-language answers to common questions about incentivized marketing, FTC compliance, platform rules, perk pricing, and AI agent integration.",
      date_published: now,
      tags: ["faq", "reference"],
    },
    {
      id: `${SITE_URL}/glossary`,
      url: `${SITE_URL}/glossary`,
      title: `Social Perks Glossary — ${GLOSSARY_ENTRIES.length} terms`,
      summary:
        "Cite-worthy definitions for terms used in incentivized marketing.",
      date_published: now,
      tags: ["glossary", "reference"],
    },
    {
      id: `${SITE_URL}/benchmarks`,
      url: `${SITE_URL}/benchmarks`,
      title: "Social Perks Industry Benchmarks",
      summary:
        "Per-industry benchmarks for incentivized marketing campaigns: completion rate, ROI, top platforms.",
      date_published: now,
      tags: ["benchmarks", "data"],
    },
  ];

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: "Social Perks — guides, comparisons, FAQ, benchmarks",
    home_page_url: SITE_URL,
    feed_url: `${SITE_URL}/api/feed.json`,
    description:
      "Citable content surfaces from Social Perks: how-to guides, platform comparisons, FAQ, glossary, ranked lists, industry benchmarks. Updated as new content is published.",
    icon: `${SITE_URL}/icon.png`,
    language: "en-US",
    authors: [
      {
        name: "Social Perks",
        url: SITE_URL,
      },
    ],
    items,
  };

  return NextResponse.json(feed, {
    status: 200,
    headers: {
      "Content-Type": "application/feed+json",
      "Cache-Control":
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

export const dynamic = "force-static";
export const revalidate = 3600;
