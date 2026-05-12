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
import { STORIES } from "@/lib/stories/data";
import {
  INDUSTRIES as PLAYBOOK_INDUSTRIES,
  CAMPAIGNS as PLAYBOOK_CAMPAIGNS,
} from "@/lib/playbooks/data";
import { DIY_METHODS } from "@/lib/instead-of/data";
import { SERVICES, SERVICE_CITIES } from "@/lib/services/data";
import { COURSES } from "@/lib/courses/data";
import { PILLARS } from "@/lib/pillars/data";
import { PLATFORM_INTEGRATIONS } from "@/lib/platform-integrations/data";
import { HOOKS } from "@/lib/hooks/data";
import {
  LOCAL_NICHES,
  LOCAL_CITIES,
  LOCAL_OUTCOMES,
} from "@/lib/local-niche/data";
import {
  OUTREACH_TEMPLATES,
  OUTREACH_CATEGORIES,
} from "@/lib/outreach/data";
import { ANSWERS } from "@/lib/answers/data";
import { BEST_FOR } from "@/lib/best-for/data";
import { CONTENT_CATEGORIES, ALL_CONTENT_PATHS } from "@/lib/content/data";

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
    process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.app";
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
      url: `${baseUrl}/auth`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
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
      url: `${baseUrl}/quiz`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/quiz/perk-value-optimizer`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/quiz/brand-voice`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/quiz/best-platform`,
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
      url: `${baseUrl}/tools/break-even-calculator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/profit-margin-calculator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/social-media-roi-calculator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/customer-lifetime-value-calculator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/marketing-budget-calculator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/breakeven-on-perks-calculator`,
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
      url: `${baseUrl}/demo`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/demo/campaigns`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/demo/submissions`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/demo/analytics`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/embed`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/embed/install`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
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
    {
      url: `${baseUrl}/stories`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/instead-of`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/services`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/outreach`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  // Outreach template detail pages (30)
  const outreachTemplateEntries: MetadataRoute.Sitemap = OUTREACH_TEMPLATES.map(
    (t) => ({
      url: `${baseUrl}/outreach/${t.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    }),
  );

  // Outreach category landing pages (6)
  const outreachCategoryEntries: MetadataRoute.Sitemap = OUTREACH_CATEGORIES.map(
    (c) => ({
      url: `${baseUrl}/outreach/category/${c}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }),
  );

  // Pillar guide pages: 1 index + 10 long-form authority pillars (priority 0.9)
  const pillarIndexEntry: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/guide`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
  ];

  const pillarEntries: MetadataRoute.Sitemap = PILLARS.map((p) => ({
    url: `${baseUrl}/guide/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

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

  // Story pages (long-form first-person narratives)
  const storyEntries: MetadataRoute.Sitemap = STORIES.map((s) => ({
    url: `${baseUrl}/stories/${s.slug}`,
    lastModified: new Date(s.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Playbook pages: 1 index + 10 industries + 100 industry × campaign = 111
  const playbookIndexEntry: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/playbooks`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
  ];

  const playbookIndustryEntries: MetadataRoute.Sitemap =
    PLAYBOOK_INDUSTRIES.map((i) => ({
      url: `${baseUrl}/playbooks/${i.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  const playbookDetailEntries: MetadataRoute.Sitemap = [];
  for (const i of PLAYBOOK_INDUSTRIES) {
    for (const c of PLAYBOOK_CAMPAIGNS) {
      playbookDetailEntries.push({
        url: `${baseUrl}/playbooks/${i.slug}/${c.slug}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      });
    }
  }

  // Instead-of comparison pages (12 DIY methods vs Social Perks)
  const insteadOfEntries: MetadataRoute.Sitemap = DIY_METHODS.map((m) => ({
    url: `${baseUrl}/instead-of/${m.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Service overview pages (8)
  const serviceEntries: MetadataRoute.Sitemap = SERVICES.map((s) => ({
    url: `${baseUrl}/services/${s.slug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Service × city pages (8 × 20 = 160)
  const serviceCityEntries: MetadataRoute.Sitemap = [];
  for (const s of SERVICES) {
    for (const c of SERVICE_CITIES) {
      serviceCityEntries.push({
        url: `${baseUrl}/services/${s.slug}/${c.slug}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      });
    }
  }

  // Free email courses: 1 index + 5 course pages + 29 lesson pages
  const courseIndexEntry: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/courses`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    },
  ];
  const courseEntries: MetadataRoute.Sitemap = COURSES.map((c) => ({
    url: `${baseUrl}/courses/${c.slug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const courseLessonEntries: MetadataRoute.Sitemap = [];
  for (const c of COURSES) {
    for (const l of c.lessons) {
      courseLessonEntries.push({
        url: `${baseUrl}/courses/${c.slug}/lesson/${l.day}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.65,
      });
    }
  }

  // Platform integration pages: 1 index + 15 detail
  const platformIntegrationIndexEntry: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/integrations/platform`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
  ];
  const platformIntegrationEntries: MetadataRoute.Sitemap =
    PLATFORM_INTEGRATIONS.map((p) => ({
      url: `${baseUrl}/integrations/platform/${p.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  // Hook squeeze pages: 1 index + 25 hooks (TikTok-bio link destinations)
  const hookIndexEntry: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/h`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
  ];
  const hookEntries: MetadataRoute.Sitemap = HOOKS.map((h) => ({
    url: `${baseUrl}/h/${h.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Local niche × city × outcome (8 × 15 × 5 = 600) + index + niche + niche×city
  const localNicheIndexEntry: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/local-niche`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
  ];
  const localNicheEntries: MetadataRoute.Sitemap = LOCAL_NICHES.map((n) => ({
    url: `${baseUrl}/local-niche/${n.slug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));
  const localNicheCityEntries: MetadataRoute.Sitemap = [];
  for (const n of LOCAL_NICHES) {
    for (const c of LOCAL_CITIES) {
      localNicheCityEntries.push({
        url: `${baseUrl}/local-niche/${n.slug}/${c.slug}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      });
    }
  }
  const localNicheLeafEntries: MetadataRoute.Sitemap = [];
  for (const n of LOCAL_NICHES) {
    for (const c of LOCAL_CITIES) {
      for (const o of LOCAL_OUTCOMES) {
        localNicheLeafEntries.push({
          url: `${baseUrl}/local-niche/${n.slug}/${c.slug}/${o.slug}`,
          lastModified,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        });
      }
    }
  }

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
    ...storyEntries,
    ...playbookIndexEntry,
    ...playbookIndustryEntries,
    ...playbookDetailEntries,
    ...insteadOfEntries,
    ...serviceEntries,
    ...serviceCityEntries,
    ...courseIndexEntry,
    ...courseEntries,
    ...courseLessonEntries,
    ...platformIntegrationIndexEntry,
    ...platformIntegrationEntries,
    ...hookIndexEntry,
    ...hookEntries,
    ...localNicheIndexEntry,
    ...localNicheEntries,
    ...localNicheCityEntries,
    ...localNicheLeafEntries,
    ...outreachCategoryEntries,
    ...outreachTemplateEntries,
    ...pillarIndexEntry,
    ...pillarEntries,
    {
      url: `${baseUrl}/answers`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    ...ANSWERS.map((a) => ({
      url: `${baseUrl}/answers/${a.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: `${baseUrl}/best-for`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    ...BEST_FOR.map((b) => ({
      url: `${baseUrl}/best-for/${b.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${baseUrl}/content`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    ...CONTENT_CATEGORIES.map((c) => ({
      url: `${baseUrl}/content/${c.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...ALL_CONTENT_PATHS.map((p) => ({
      url: `${baseUrl}/content/${p.category}/${p.topic}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
