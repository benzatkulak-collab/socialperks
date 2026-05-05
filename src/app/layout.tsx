import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SWRegister } from "@/components/shared/sw-register";
import { OfflineIndicator } from "@/components/shared/offline-indicator";
import { TrackingPixels } from "@/components/shared/tracking-pixels";
import { RefCapture } from "@/components/shared/ref-capture";
import { CookieBanner } from "@/components/shared/cookie-banner";
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
  title: "Social Perks — One QR Code. Hundreds of Customer-Made Ads.",
  description:
    "Print one QR code. Stick it on the cup. Customers scan, post about you, get a small perk. You get real customer-made ads — not paid creator junk.",
  keywords: [
    "qr code marketing",
    "customer marketing",
    "in-store marketing",
    "small business marketing",
    "user-generated content",
    "coffee shop marketing",
    "local business marketing",
    "word of mouth marketing",
    "customer perks",
  ],
  openGraph: {
    title: "Social Perks — One QR Code. Hundreds of Customer-Made Ads.",
    description:
      "Print one QR code. Customers scan, post, get a perk. You get real word-of-mouth seen by every friend they have.",
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
  // Icons are auto-emitted by Next.js from src/app/icon.svg and
  // src/app/apple-icon.svg. Avoiding a manual `icons` config here
  // prevents double-emission and the 404s Lighthouse used to flag
  // for browser-auto-requested apple-touch-icon variants.
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
        {/* AI/LLM crawler policy. We're explicitly open: every public
            page (especially /b/[slug]) is meant to be ingested and
            cited by AI search agents. This meta is paired with a
            permissive ai.txt at /public/ai.txt and explicit allows in
            robots.ts for GPTBot/ClaudeBot/PerplexityBot. */}
        <meta name="ai-content-policy" content="open" />
        <meta name="robots" content="index,follow,max-image-preview:large" />
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
        <RefCapture />
        {children}
        <OfflineIndicator />
        <CookieBanner />
        <Analytics />
        <TrackingPixels />
      </body>
    </html>
  );
}
