import type { MetadataRoute } from "next";
import { CITIES, INDUSTRIES } from "@/lib/programmatic-seo/data";
import {
  NEIGHBORHOODS,
  NEIGHBORHOOD_CITY_SLUGS,
} from "@/lib/programmatic-seo/neighborhoods";
import {
  STATES,
  STATE_INDUSTRIES,
} from "@/lib/programmatic-seo/states";
import { allPosts } from "@/lib/blog/posts";
import { COMPETITORS } from "@/lib/comparison/competitors";
import { ALTERNATIVES } from "@/lib/alternatives/data";
import { GLOSSARY } from "@/lib/glossary/terms";
import { GUIDES as HOWTO_GUIDES } from "@/lib/howto/guides";
import { INDUSTRY_PAGE_SLUGS } from "@/lib/industry-pages/data";
import { TEMPLATES } from "@/lib/templates/data";
import { COMMUNITY_SLUGS } from "@/lib/communities/data";
import { ASK_QUESTIONS } from "@/lib/ask/questions";

const NEIGHBORHOOD_INDUSTRY_SLUGS = [
  "restaurants",
  "coffee-shops",
  "yoga-studios",
  "salons",
  "boutiques",
  "gyms",
  "bars",
  "bakeries",
] as const;

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
      alternates: {
        languages: {
          en: baseUrl,
          es: `${baseUrl}/es`,
        },
      },
    },
    {
      url: `${baseUrl}/es`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: {
          en: baseUrl,
          es: `${baseUrl}/es`,
        },
      },
    },
    {
      url: `${baseUrl}/developers`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/search`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
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
      url: `${baseUrl}/templates`,
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
      url: `${baseUrl}/tools/utm-link-generator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/viral-coefficient-calculator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/saas-pricing-comparison`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/clv-calculator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/conversion-rate-calculator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/email-subject-line-tester`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/hashtag-research`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/nps-calculator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/marketing-budget-allocator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/utm-link-generator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/viral-coefficient-calculator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/status`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/partners`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/embed/badge-preview`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
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
      url: `${baseUrl}/alternatives`,
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
      url: `${baseUrl}/how-to`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
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
    {
      url: `${baseUrl}/extension`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/marketplace`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/integrations/software`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/webhooks`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/security`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/industries`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/communities`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  // Niche community landing pages (15)
  const communityEntries: MetadataRoute.Sitemap = COMMUNITY_SLUGS.map(
    (slug) => ({
      url: `${baseUrl}/communities/${slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }),
  );

  // Industry-specific marketing software landing pages (20)
  const industryPageEntries: MetadataRoute.Sitemap = INDUSTRY_PAGE_SLUGS.map(
    (slug) => ({
      url: `${baseUrl}/industries/${slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }),
  );

  // Competitor comparison pages
  const vsEntries: MetadataRoute.Sitemap = COMPETITORS.map((c) => ({
    url: `${baseUrl}/vs/${c.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Alternatives pages (exit-motion framing)
  const alternativesEntries: MetadataRoute.Sitemap = ALTERNATIVES.map((a) => ({
    url: `${baseUrl}/alternatives/${a.slug}`,
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

  // How-to guide pages
  const howToEntries: MetadataRoute.Sitemap = HOWTO_GUIDES.map((g) => ({
    url: `${baseUrl}/how-to/${g.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
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

  // Template library pages
  const templateEntries: MetadataRoute.Sitemap = TEMPLATES.map((t) => ({
    url: `${baseUrl}/templates/${t.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
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

  // Neighborhood programmatic pages: 1 + 3 + 30 + 240 = 274
  const neighborhoodIndexEntry: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/neighborhood`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
  ];

  const neighborhoodCityEntries: MetadataRoute.Sitemap =
    NEIGHBORHOOD_CITY_SLUGS.map((citySlug) => ({
      url: `${baseUrl}/neighborhood/${citySlug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));

  const neighborhoodEntries: MetadataRoute.Sitemap = NEIGHBORHOODS.map(
    (n) => ({
      url: `${baseUrl}/neighborhood/${n.citySlug}/${n.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }),
  );

  const neighborhoodIndustryEntries: MetadataRoute.Sitemap = [];
  for (const n of NEIGHBORHOODS) {
    for (const ind of NEIGHBORHOOD_INDUSTRY_SLUGS) {
      neighborhoodIndustryEntries.push({
        url: `${baseUrl}/neighborhood/${n.citySlug}/${n.slug}/${ind}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      });
    }
  }

  // State programmatic pages: 1 + 50 + 400 = 451
  const stateIndexEntry: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/state`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
  ];

  const stateEntries: MetadataRoute.Sitemap = STATES.map((s) => ({
    url: `${baseUrl}/state/${s.slug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  const stateIndustryEntries: MetadataRoute.Sitemap = [];
  for (const s of STATES) {
    for (const i of STATE_INDUSTRIES) {
      stateIndustryEntries.push({
        url: `${baseUrl}/state/${s.slug}/${i.slug}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.65,
      });
    }
  }

  // Ask index + 40 Q&A pages
  const askIndexEntry: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/ask`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
  ];
  const askEntries: MetadataRoute.Sitemap = ASK_QUESTIONS.map((q) => ({
    url: `${baseUrl}/ask/${q.slug}`,
    lastModified: new Date(q.dateModified),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [
    ...staticEntries,
    ...industryPageEntries,
    ...integrationEntries,
    ...vsEntries,
    ...alternativesEntries,
    ...glossaryEntries,
    ...howToEntries,
    ...blogEntries,
    ...templateEntries,
    ...communityEntries,
    ...cityEntries,
    ...localEntries,
    ...neighborhoodIndexEntry,
    ...neighborhoodCityEntries,
    ...neighborhoodEntries,
    ...neighborhoodIndustryEntries,
    ...stateIndexEntry,
    ...stateEntries,
    ...stateIndustryEntries,
    ...askIndexEntry,
    ...askEntries,
  ];
}
