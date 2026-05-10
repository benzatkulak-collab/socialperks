import type { MetadataRoute } from "next";
import { CITIES, INDUSTRIES } from "@/lib/programmatic-seo/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.com";
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/developers`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tools/review-email-generator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/instagram-caption-generator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/sms-review-templates`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/api/v1/docs`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/api/v1/docs/ui`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/local`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // City index pages (50)
  const cityEntries: MetadataRoute.Sitemap = CITIES.map((c) => ({
    url: `${baseUrl}/local/${c.slug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // City × industry pages (50 × 20 = 1,000)
  const localEntries: MetadataRoute.Sitemap = [];
  for (const c of CITIES) {
    for (const i of INDUSTRIES) {
      localEntries.push({
        url: `${baseUrl}/local/${c.slug}/${i.slug}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      });
    }
  }

  return [...staticEntries, ...cityEntries, ...localEntries];
}
