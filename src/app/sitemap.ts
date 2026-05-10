import type { MetadataRoute } from "next";
import { CITIES, INDUSTRIES } from "@/lib/programmatic-seo/data";
import { allPosts } from "@/lib/blog/posts";
import { COMPETITORS } from "@/lib/comparison/competitors";
import { GLOSSARY } from "@/lib/glossary/terms";

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
      url: `${baseUrl}/tools/cac-calculator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/review-roi-calculator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/loyalty-program-generator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/google-business-checker`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/integrations`,
      lastModified,
      changeFrequency: "weekly",
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
    {
      url: `${baseUrl}/blog`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/vs`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/glossary`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/roadmap`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  // Competitor comparison pages
  const vsEntries: MetadataRoute.Sitemap = COMPETITORS.map((c) => ({
    url: `${baseUrl}/vs/${c.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Glossary term pages
  const glossaryEntries: MetadataRoute.Sitemap = GLOSSARY.map((t) => ({
    url: `${baseUrl}/glossary/${t.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Integration platform pages
  const integrationSlugs = [
    "instagram",
    "tiktok",
    "google-business",
    "facebook",
    "yelp",
    "youtube",
    "twitter",
    "pinterest",
    "linkedin",
    "snapchat",
    "threads",
    "reddit",
  ];
  const integrationEntries: MetadataRoute.Sitemap = integrationSlugs.map(
    (slug) => ({
      url: `${baseUrl}/integrations/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }),
  );

  // Blog post pages
  const blogEntries: MetadataRoute.Sitemap = allPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt ?? post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

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

  return [
    ...staticEntries,
    ...integrationEntries,
    ...vsEntries,
    ...glossaryEntries,
    ...blogEntries,
    ...cityEntries,
    ...localEntries,
  ];
}
