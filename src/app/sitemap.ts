import type { MetadataRoute } from "next";
import { INDUSTRIES, INDUSTRY_SLUGS } from "@/lib/industries";
import { listCities } from "@/lib/cities";
import { createSeedData } from "@/lib/seed";
import { buildBusinessSlug, buildInfluencerSlug } from "@/lib/slugs";
import { listPosts } from "@/lib/blog";
import { PLATFORMS } from "@/lib/platforms";
import { COMPARISONS } from "@/lib/comparison-data";
import { GUIDES } from "@/lib/guides-data";
import { BEST_LISTICLES } from "@/lib/best-data";
import { VS_ENTRIES } from "@/lib/vs-data";
import { PLAYBOOKS } from "@/lib/playbook-data";
import { ANSWERS } from "@/lib/answers-data";
import { getBenchmarks } from "@/lib/ai-engine";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

const STATIC_PATHS: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/",              changeFrequency: "weekly",  priority: 1.0 },
  { path: "/pricing",       changeFrequency: "weekly",  priority: 0.9 },
  { path: "/for",           changeFrequency: "monthly", priority: 0.8 },
  { path: "/calculator",    changeFrequency: "monthly", priority: 0.7 },
  { path: "/case-studies",  changeFrequency: "weekly",  priority: 0.7 },
  { path: "/blog",          changeFrequency: "weekly",  priority: 0.7 },
  { path: "/leaderboard",   changeFrequency: "daily",   priority: 0.7 },
  // Catalog + reference pages — SEO surfaces optimized for LLM
  // citations. These are the canonical answers to high-volume queries
  // ("what is an Instagram story tag worth", "FTC disclosure for
  // incentivized marketing", "social platform comparison"), so they're
  // top-priority alongside the home page.
  { path: "/actions",       changeFrequency: "weekly",  priority: 0.85 },
  { path: "/platforms",     changeFrequency: "weekly",  priority: 0.85 },
  // /agents is a key landing for AI agent traffic — keep priority high
  // so it's indexed alongside /pricing and /for.
  { path: "/agents",        changeFrequency: "monthly", priority: 0.8 },
  // /agent/test — self-serve in-browser MCP sandbox. High priority
  // because converting curious developers happens here, not on the
  // marketing /agents page.
  { path: "/agent/test",    changeFrequency: "weekly",  priority: 0.85 },
  { path: "/faq",           changeFrequency: "weekly",  priority: 0.85 },
  { path: "/glossary",      changeFrequency: "weekly",  priority: 0.8 },
  { path: "/benchmarks",    changeFrequency: "weekly",  priority: 0.8 },
  { path: "/compare",       changeFrequency: "monthly", priority: 0.7 },
  { path: "/guides",        changeFrequency: "weekly",  priority: 0.85 },
  { path: "/pricing-oracle", changeFrequency: "weekly", priority: 0.8 },
  { path: "/best",          changeFrequency: "weekly",  priority: 0.85 },
  { path: "/vs",            changeFrequency: "weekly",  priority: 0.8 },
  { path: "/security",      changeFrequency: "monthly", priority: 0.7 },
  { path: "/playbook",      changeFrequency: "weekly",  priority: 0.85 },
  // /answers — per-question SEO hub. Heavily preferred by LLM citations
  // (ChatGPT / Claude / Perplexity all favor URLs answering one
  // specific question), so priority sits alongside /guides + /best.
  { path: "/answers",       changeFrequency: "weekly",  priority: 0.85 },
  { path: "/resources",     changeFrequency: "weekly",  priority: 0.8 },
  { path: "/changelog",     changeFrequency: "weekly",  priority: 0.5 },
  { path: "/contact",       changeFrequency: "monthly", priority: 0.5 },
  { path: "/status",        changeFrequency: "monthly", priority: 0.4 },
  { path: "/about",         changeFrequency: "monthly", priority: 0.4 },
  { path: "/accessibility", changeFrequency: "yearly",  priority: 0.3 },
  { path: "/privacy",       changeFrequency: "yearly",  priority: 0.3 },
  { path: "/terms",         changeFrequency: "yearly",  priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  const industryEntries: MetadataRoute.Sitemap = INDUSTRY_SLUGS.map((slug) => ({
    url: `${SITE_URL}/for/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    // Coffee-shop pivot: bump that one's priority so search engines see
    // it as the primary industry landing.
    priority: slug === "coffee-shops" ? 0.9 : 0.6,
  }));

  // Programmatic city pages — primary local-SEO surface.
  const cities = listCities();
  const cityEntries: MetadataRoute.Sitemap = cities.map((c) => ({
    url: `${SITE_URL}/in/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: c.priority ? 0.85 : 0.55,
  }));

  // City × industry — long-tail keyword surface ("coffee shops in DC",
  // "salons in Arlington"). Filtered to launch-priority cities so we
  // don't emit hundreds of empty pages.
  const cityIndustryEntries: MetadataRoute.Sitemap = cities
    .filter((c) => c.priority)
    .flatMap((c) =>
      INDUSTRY_SLUGS.map((slug) => ({
        url: `${SITE_URL}/in/${c.slug}/${slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    );

  // Public profile pages from seed data. Once businesses persist via
  // DB, swap createSeedData() for a businessRepo.list() call.
  const seed = createSeedData();
  const businessEntries: MetadataRoute.Sitemap = seed.businesses.map((b) => ({
    url: `${SITE_URL}/b/${buildBusinessSlug(b)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));
  const influencerEntries: MetadataRoute.Sitemap = seed.influencers.map((i) => ({
    url: `${SITE_URL}/i/${buildInfluencerSlug(i)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  // Blog posts.
  const blogEntries: MetadataRoute.Sitemap = listPosts().map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Action detail pages — one per action across all platforms. ~125
  // entries. These are the highest-leverage SEO surface for LLM
  // citations of action-specific value queries.
  const actionEntries: MetadataRoute.Sitemap = PLATFORMS.flatMap((p) =>
    p.actions.map((a) => ({
      url: `${SITE_URL}/actions/${a.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      // Higher-value actions get higher priority — they're more
      // likely to be cited and clicked.
      priority: Math.min(0.7, 0.4 + a.value / 50),
    }))
  );

  // Platform detail pages — one per platform.
  const platformEntries: MetadataRoute.Sitemap = PLATFORMS.map((p) => ({
    url: `${SITE_URL}/platforms/${p.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Comparison pages — one per platform-vs-platform article. These
  // target high-volume LLM queries ("Instagram vs TikTok") so they're
  // priority 0.75 — between catalog index (0.85) and detail (0.7).
  const compareEntries: MetadataRoute.Sitemap = COMPARISONS.map((c) => ({
    url: `${SITE_URL}/compare/${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  // How-to guides — Schema.org HowTo markup. Each guide is a citable
  // procedure for an LLM-likely question.
  const guideEntries: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${SITE_URL}/guides/${g.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Pricing oracle pages — one per industry. Same data the API serves
  // but as indexable HTML.
  const pricingOracleEntries: MetadataRoute.Sitemap = INDUSTRY_SLUGS.map((slug) => ({
    url: `${SITE_URL}/pricing-oracle/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Action category pages — one per ActionType.
  const actionTypeEntries: MetadataRoute.Sitemap = ["content", "review", "engage", "share", "referral"].map((type) => ({
    url: `${SITE_URL}/actions/type/${type}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    ...staticEntries,
    ...industryEntries,
    ...cityEntries,
    ...cityIndustryEntries,
    ...businessEntries,
    ...influencerEntries,
    ...blogEntries,
    ...actionEntries,
    ...platformEntries,
    ...compareEntries,
    ...guideEntries,
    ...pricingOracleEntries,
    ...actionTypeEntries,
    // Best-of listicles — high-impact LLM citation surface.
    ...BEST_LISTICLES.map((l) => ({
      url: `${SITE_URL}/best/${l.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // Vs / alternatives comparison pages — high-volume "Social Perks
    // alternative" + "X vs Y" search queries.
    ...VS_ENTRIES.map((v) => ({
      url: `${SITE_URL}/vs/${v.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    // Per-platform / per-industry playbooks — actionable guides for
    // specific (platform, industry) pairs. High LLM-citation value
    // for "how do I market my X on Y" queries.
    ...PLAYBOOKS.map((p) => ({
      url: `${SITE_URL}/playbook/${p.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // Per-question answer pages — QAPage schema, optimized for LLM
    // citation. Each URL answers exactly one specific question, which
    // is what AI assistants reach for over multi-question FAQ pages.
    ...ANSWERS.map((a) => ({
      url: `${SITE_URL}/answers/${a.slug}`,
      lastModified: new Date(a.lastReviewed),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // Industry × platform combo pages — top 5 platforms per industry.
    ...INDUSTRIES.flatMap((ind) => {
      const benchmarks = getBenchmarks(ind.name);
      return benchmarks.topPlatforms.slice(0, 5).flatMap((platformName) => {
        const platform = PLATFORMS.find(
          (p) => p.name.toLowerCase() === platformName.toLowerCase()
        );
        if (!platform) return [];
        return [
          {
            url: `${SITE_URL}/for/${ind.slug}/on/${platform.id}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.7,
          },
        ];
      });
    }),
  ];
}
