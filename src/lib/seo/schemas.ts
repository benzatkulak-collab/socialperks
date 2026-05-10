/**
 * Centralized JSON-LD schema helpers for Social Perks pages.
 * =============================================================
 *
 * Each helper returns a plain object suitable for serialization via
 * `JSON.stringify` inside a `<script type="application/ld+json">` tag.
 *
 * These helpers compose with — and never replace — the existing
 * generators in `./json-ld.ts`. They're a centralized utility for
 * common page-level schemas.
 *
 * References:
 * - https://schema.org/SoftwareApplication
 * - https://schema.org/WebPage
 * - https://schema.org/BreadcrumbList
 * - https://schema.org/FAQPage
 * - https://schema.org/Article
 * - https://schema.org/HowTo
 * - https://schema.org/Product
 * - https://schema.org/AggregateRating
 */

const DEFAULT_BASE_URL = "https://socialperks.io";

// ─── Shared types ────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FaqQuestion {
  question: string;
  answer: string;
}

export interface ArticleInput {
  title: string;
  description: string;
  url: string;
  author?: string;
  publishedAt: string; // ISO date
  updatedAt?: string; // ISO date
  image?: string;
  category?: string;
  keyword?: string;
}

export interface HowToStep {
  name: string;
  text: string;
  url?: string;
  image?: string;
}

export interface HowToInput {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string; // ISO 8601 duration, e.g. "PT15M"
  url?: string;
  image?: string;
}

export interface WebPageInput {
  name: string;
  description: string;
  url: string;
  breadcrumbs?: BreadcrumbItem[];
  lastReviewed?: string;
  inLanguage?: string;
}

export interface ProductInput {
  name: string;
  description: string;
  url: string;
  image?: string;
  brand?: string;
  sku?: string;
  price?: number;
  priceCurrency?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  rating?: { value: number; count: number };
}

// ─── SoftwareApplication ─────────────────────────────────────────────────────

/**
 * Schema.org SoftwareApplication for the Social Perks platform.
 * Ready to inject into any page that wants a software-app rich result.
 */
export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Social Perks",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Marketing Platform",
    description:
      "AI marketing manager for small business. Customers post, review, and share for perks.",
    operatingSystem: "Web",
    url: DEFAULT_BASE_URL,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "0",
      highPrice: "299",
      offerCount: 3,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "412",
    },
  };
}

// ─── WebPage ─────────────────────────────────────────────────────────────────

export function webPageSchema(props: WebPageInput) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: props.name,
    description: props.description,
    url: props.url,
    inLanguage: props.inLanguage ?? "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: "Social Perks",
      url: DEFAULT_BASE_URL,
    },
  };

  if (props.lastReviewed) {
    schema.lastReviewed = props.lastReviewed;
  }
  if (props.breadcrumbs && props.breadcrumbs.length > 0) {
    schema.breadcrumb = breadcrumbListSchema(props.breadcrumbs);
  }

  return schema;
}

// ─── BreadcrumbList ──────────────────────────────────────────────────────────

export function breadcrumbListSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ─── FAQPage ─────────────────────────────────────────────────────────────────

export function faqPageSchema(questions: FaqQuestion[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
}

// ─── Article ─────────────────────────────────────────────────────────────────

export function articleSchema(post: ArticleInput) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    url: post.url,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      "@type": post.author ? "Person" : "Organization",
      name: post.author ?? "Social Perks",
    },
    publisher: {
      "@type": "Organization",
      name: "Social Perks",
      logo: {
        "@type": "ImageObject",
        url: `${DEFAULT_BASE_URL}/icon-192.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": post.url,
    },
  };

  if (post.image) schema.image = post.image;
  if (post.category) schema.articleSection = post.category;
  if (post.keyword) schema.keywords = post.keyword;

  return schema;
}

// ─── HowTo ───────────────────────────────────────────────────────────────────

export function howToSchema(input: HowToInput) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    step: input.steps.map((step, i) => {
      const node: Record<string, unknown> = {
        "@type": "HowToStep",
        position: i + 1,
        name: step.name,
        text: step.text,
      };
      if (step.url) node.url = step.url;
      if (step.image) node.image = step.image;
      return node;
    }),
  };

  if (input.totalTime) schema.totalTime = input.totalTime;
  if (input.url) schema.url = input.url;
  if (input.image) schema.image = input.image;

  return schema;
}

// ─── Product ─────────────────────────────────────────────────────────────────

export function productSchema(input: ProductInput) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url: input.url,
  };

  if (input.image) schema.image = input.image;
  if (input.brand) {
    schema.brand = {
      "@type": "Brand",
      name: input.brand,
    };
  }
  if (input.sku) schema.sku = input.sku;

  if (typeof input.price === "number") {
    schema.offers = {
      "@type": "Offer",
      price: input.price.toString(),
      priceCurrency: input.priceCurrency ?? "USD",
      availability: `https://schema.org/${input.availability ?? "InStock"}`,
      url: input.url,
    };
  }

  if (input.rating) {
    schema.aggregateRating = aggregateRatingSchema(
      input.rating.value,
      input.rating.count,
    );
  }

  return schema;
}

// ─── AggregateRating ─────────────────────────────────────────────────────────

export function aggregateRatingSchema(rating: number, count: number) {
  return {
    "@type": "AggregateRating",
    ratingValue: rating.toFixed(1),
    reviewCount: count.toString(),
    bestRating: "5",
    worstRating: "1",
  };
}
