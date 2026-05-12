/**
 * JSON-LD Structured Data Generators for Social Perks
 * =====================================================
 *
 * Generates Schema.org JSON-LD objects for search engines, AI crawlers,
 * and knowledge graphs. Each function returns a plain object that can
 * be serialized via `JSON.stringify` inside a `<script type="application/ld+json">` tag.
 *
 * References:
 * - https://schema.org/Organization
 * - https://schema.org/SoftwareApplication
 * - https://schema.org/WebAPI
 * - https://schema.org/BreadcrumbList
 * - https://schema.org/Offer
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface CampaignSchemaInput {
  id: string;
  name: string;
  description: string;
  discountValue: number;
  discountType: "percent" | "dollar" | "fixed";
  category?: string;
  url?: string;
}

// ─── Organization ────────────────────────────────────────────────────────────

/**
 * Schema.org Organization schema for Social Perks.
 */
export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Social Perks",
    url: "https://socialperks.app",
    logo: "https://socialperks.app/favicon.svg",
    description:
      "Turn customers into your marketing team. Offer perks in exchange for social media posts, reviews, and shares.",
    foundingDate: "2024",
    sameAs: [
      "https://twitter.com/socialperks",
      "https://github.com/socialperks",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@socialperks.app",
      availableLanguage: ["English"],
    },
  };
}

// ─── Software Application ────────────────────────────────────────────────────

/**
 * Schema.org SoftwareApplication schema describing the platform.
 */
export function getSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Social Perks",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Marketing Platform",
    description:
      "Platform connecting businesses with customers for social media marketing perks. Supports 15 platforms, 107 marketing actions, and AI-powered campaign generation.",
    operatingSystem: "Web",
    url: "https://socialperks.app",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "0",
      highPrice: "299",
      offerCount: 3,
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "USD",
          description: "For small businesses getting started",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "49",
          priceCurrency: "USD",
          description: "For growing businesses with advanced features",
        },
        {
          "@type": "Offer",
          name: "Enterprise",
          price: "299",
          priceCurrency: "USD",
          description:
            "For brands and agencies with multi-location management",
        },
      ],
    },
    featureList: [
      "AI-powered campaign generation",
      "15 social media platform integrations",
      "107 marketing actions",
      "Real-time analytics dashboard",
      "FTC compliance automation",
      "Fraud detection engine",
      "Influencer matching algorithm",
      "RESTful API with SDK",
      "Multi-location enterprise management",
      "Perk wallet and cashback system",
    ],
    screenshot: "https://socialperks.app/og-image.png",
    softwareVersion: "1.0.0",
    creator: {
      "@type": "Organization",
      name: "Social Perks",
    },
  };
}

// ─── Web API ─────────────────────────────────────────────────────────────────

/**
 * Schema.org WebAPI schema describing the REST API.
 */
export function getWebAPISchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebAPI",
    name: "Social Perks API",
    description:
      "RESTful API for managing social media marketing campaigns, perk programs, submissions, and analytics. Supports Bearer token and API key authentication.",
    url: "https://socialperks.app/api/v1/docs",
    documentation: "https://socialperks.app/api/v1/docs",
    termsOfService: "https://socialperks.app/terms",
    provider: {
      "@type": "Organization",
      name: "Social Perks",
      url: "https://socialperks.app",
    },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: "https://socialperks.app/api/v1",
      serviceType: "REST API",
    },
  };
}

// ─── Breadcrumb ──────────────────────────────────────────────────────────────

/**
 * Schema.org BreadcrumbList for navigation context.
 *
 * @param items - Array of {name, url} breadcrumb items, in order.
 */
export function getBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ─── Campaign ────────────────────────────────────────────────────────────────

/**
 * Schema.org Offer/Product schema for an individual campaign.
 *
 * Maps campaign data to a structured offer that search engines
 * and AI agents can parse to understand campaign details.
 *
 * @param campaign - Campaign data to generate schema for.
 */
export function getCampaignSchema(campaign: CampaignSchemaInput) {
  const baseUrl = "https://socialperks.app";

  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: campaign.name,
    description: campaign.description,
    url: campaign.url || `${baseUrl}/campaign/${campaign.id}`,
    category: campaign.category || "Marketing Campaign",
    offeredBy: {
      "@type": "Organization",
      name: "Social Perks",
      url: baseUrl,
    },
    price: campaign.discountType === "dollar" ? campaign.discountValue : 0,
    priceCurrency: "USD",
    discount:
      campaign.discountType === "percent"
        ? `${campaign.discountValue}%`
        : campaign.discountType === "dollar"
          ? `$${campaign.discountValue}`
          : `${campaign.discountValue}`,
    availability: "https://schema.org/InStock",
    validFrom: new Date().toISOString(),
  };
}

// ─── Combined Schema for Layout ──────────────────────────────────────────────

/**
 * Returns the combined structured data array for the root layout.
 * Includes Organization + SoftwareApplication + WebAPI schemas.
 */
export function getRootSchemas() {
  return [
    getOrganizationSchema(),
    getSoftwareApplicationSchema(),
    getWebAPISchema(),
  ];
}
