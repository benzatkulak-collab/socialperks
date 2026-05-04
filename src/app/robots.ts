import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // App + admin surfaces (auth-gated, no public content) and any
        // path that carries a one-time token in the URL — those must
        // never be indexed even if a user accidentally shares the link.
        disallow: [
          "/dashboard",
          "/api/",
          "/admin",
          "/c/",
          "/reset-password",
          "/confirm-reset",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
