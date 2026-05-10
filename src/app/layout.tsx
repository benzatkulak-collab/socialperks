import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { SWRegister } from "@/components/shared/sw-register";
import { OfflineIndicator } from "@/components/shared/offline-indicator";
import { SkipLinks } from "@/components/shared/skip-links";
import { getRootSchemas } from "@/lib/seo/json-ld";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://socialperks.io"),
  title: "Social Perks — AI Marketing for Small Business",
  description:
    "AI marketing manager for small business. Customers post, review, and share for perks. 25 platforms, 125 actions, one dashboard. Free 14 days.",
  keywords: [
    "AI marketing",
    "small business marketing",
    "social media marketing",
    "customer referrals",
    "review generation",
    "local business marketing",
    "influencer platform",
    "word of mouth marketing",
    "customer perks",
    "loyalty marketing",
  ],
  alternates: {
    canonical: "https://socialperks.io",
  },
  openGraph: {
    title: "Social Perks — AI Marketing for Small Business",
    description:
      "AI marketing manager for small business owners. Turn customers into your marketing team.",
    type: "website",
    siteName: "Social Perks",
    url: "https://socialperks.io",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Social Perks — AI marketing for small business",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Social Perks — AI Marketing for Small Business",
    description: "AI marketing manager for small business. Start free.",
    images: ["/og-image.png"],
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
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Social Perks",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#22D3EE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {getRootSchemas().map((schema, i) => (
          <script
            key={`ld-json-${i}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body className="min-h-screen bg-brand-bg text-brand-text font-body antialiased selection:bg-brand-cyan/20 selection:text-brand-white">
        <SkipLinks />
        <SWRegister />
        {children}
        <OfflineIndicator />
        {plausibleDomain && (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
