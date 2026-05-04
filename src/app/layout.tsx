import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SWRegister } from "@/components/shared/sw-register";
import { OfflineIndicator } from "@/components/shared/offline-indicator";
import { TrackingPixels } from "@/components/shared/tracking-pixels";
import "./globals.css";

// metadataBase prefers an explicit NEXT_PUBLIC_SITE_URL env var so OG image
// URLs resolve correctly on whatever host you're actually deployed to
// (vercel.app preview, custom domain, local dev). Falls back to the
// canonical socialperks.io for the configured prod domain.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Social Perks — Turn Customers Into Your Marketing Team",
  description:
    "Independent coffee shops: turn regulars into your marketing team. Offer a perk, they post on Instagram, TikTok or Facebook. You get real word-of-mouth — not ads.",
  keywords: [
    "social media marketing for coffee shops",
    "coffee shop marketing",
    "small business marketing",
    "customer referrals",
    "instagram marketing for cafes",
    "local business marketing",
    "word of mouth marketing",
    "customer perks",
  ],
  openGraph: {
    title: "Social Perks — Turn Coffee Shop Regulars Into Marketing",
    description:
      "Offer a perk. Customers post on Instagram, TikTok, Facebook. You get real word-of-mouth — not ads.",
    type: "website",
    siteName: "Social Perks",
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Social Perks — Turn customers into your marketing team",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@socialperks",
    title: "Social Perks",
    description: "Turn customers into your marketing team. Start free.",
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    // SVG favicon doubles as the apple-touch source. iOS will scale it
    // and fall back gracefully. A bespoke 180×180 PNG can be added at
    // /public/apple-touch-icon.png to override.
    apple: [{ url: "/favicon.svg" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0C0F1A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Social Perks",
              applicationCategory: "BusinessApplication",
              description: "Turn customers into your marketing team. Offer perks in exchange for social media posts, reviews, and shares.",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-brand-bg text-brand-text font-body antialiased selection:bg-brand-cyan/20 selection:text-brand-white">
        <SWRegister />
        {children}
        <OfflineIndicator />
        <Analytics />
        <TrackingPixels />
      </body>
    </html>
  );
}
