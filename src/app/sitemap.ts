import type { MetadataRoute } from "next";
import { INDUSTRY_SLUGS } from "@/lib/industries";
import { listCities } from "@/lib/cities";
import { createSeedData } from "@/lib/seed";
import { buildBusinessSlug, buildInfluencerSlug } from "@/lib/slugs";
import { listPosts } from "@/lib/blog";

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

  return [
    ...staticEntries,
    ...industryEntries,
    ...cityEntries,
    ...cityIndustryEntries,
    ...businessEntries,
    ...influencerEntries,
    ...blogEntries,
  ];
}
