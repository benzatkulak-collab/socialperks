import type { MetadataRoute } from "next";
import { INDUSTRY_SLUGS } from "@/lib/industries";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

const STATIC_PATHS: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/",              changeFrequency: "weekly",  priority: 1.0 },
  { path: "/pricing",       changeFrequency: "weekly",  priority: 0.9 },
  { path: "/for",           changeFrequency: "monthly", priority: 0.8 },
  { path: "/case-studies",  changeFrequency: "weekly",  priority: 0.7 },
  { path: "/changelog",     changeFrequency: "weekly",  priority: 0.5 },
  { path: "/contact",       changeFrequency: "monthly", priority: 0.5 },
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

  return [...staticEntries, ...industryEntries];
}
