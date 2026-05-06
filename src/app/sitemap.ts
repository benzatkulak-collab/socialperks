import type { MetadataRoute } from "next";
import { INDUSTRY_SLUGS } from "@/lib/industries";
import { listCities } from "@/lib/cities";
import { createSeedData } from "@/lib/seed";
import { buildBusinessSlug, buildInfluencerSlug } from "@/lib/slugs";
import { listPosts } from "@/lib/blog";
import { PLATFORMS } from "@/lib/platforms";
import { COMPARISONS } from "@/lib/comparison-data";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

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
  { path: "/agents",        changeFrequency: "monthly", priority: 0.8 },
  { path: "/faq",           changeFrequency: "weekly",  priority: 0.85 },
  { path: "/glossary",      changeFrequency: "weekly",  priority: 0.8 },
  { path: "/benchmarks",    changeFrequency: "weekly",  priority: 0.8 },
  { path: "/compare",       changeFrequency: "monthly", priority: 0.7 },
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
  ];
}
