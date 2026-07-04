/**
 * Centralized SEO metadata builder.
 *
 * Two jobs, both learned from the audit:
 *  1. Always attach a real (PNG) OG image. Next.js merges `openGraph`
 *     shallowly across the layout→page chain: a page that sets its own
 *     `openGraph` object WITHOUT an `images` key silently discards the
 *     layout's inherited image, leaving a blank social card. Routing every
 *     page through buildMetadata() guarantees an explicit image survives.
 *  2. Always attach a self-referencing canonical, resolved against
 *     metadataBase, so query-param variants (utm/ref) don't fragment.
 */

import type { Metadata } from "next";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

/** Stable URL of the default branded OG card (PNG, 1200×630). */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/api/og/default`;

/** Build the `openGraph.images` array Next.js expects. */
export function ogImages(url: string = DEFAULT_OG_IMAGE, alt = "Social Perks") {
  return [{ url, width: 1200, height: 630, alt }];
}

export interface BuildMetadataOptions {
  title: string;
  description: string;
  /** Path beginning with "/" — becomes the canonical + og:url. */
  path: string;
  /** Absolute OG image URL. Defaults to the branded default card. */
  image?: string;
  type?: "website" | "article";
  /** Set true for auth-gated / thin pages that must not be indexed. */
  noindex?: boolean;
}

/**
 * Produce a complete, SEO-correct Metadata object: canonical + OpenGraph
 * (with image) + Twitter (with image), and optional noindex.
 */
export function buildMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  noindex = false,
}: BuildMetadataOptions): Metadata {
  const url = `${SITE_URL}${path}`;
  const img = image ?? DEFAULT_OG_IMAGE;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type,
      url,
      siteName: "Social Perks",
      images: ogImages(img),
    },
    twitter: {
      card: "summary_large_image",
      site: "@socialperks",
      title,
      description,
      images: [img],
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
