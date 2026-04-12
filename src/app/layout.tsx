import type { Metadata, Viewport } from "next";
import { SWRegister } from "@/components/shared/sw-register";
import { OfflineIndicator } from "@/components/shared/offline-indicator";
import { SkipLinks } from "@/components/shared/skip-links";
import { getRootSchemas } from "@/lib/seo/json-ld";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://socialperks.io"),
  title: "Social Perks — Turn Customers Into Your Marketing Team",
  description:
    "Offer perks. Customers post, review, and share. You grow. From neighborhood coffee shops to national brands. 25 platforms, 125 marketing actions, one simple dashboard.",
  keywords: [
    "social media marketing",
    "customer referrals",
    "review generation",
    "local business marketing",
    "influencer platform",
    "word of mouth marketing",
    "customer perks",
    "loyalty marketing",
  ],
  openGraph: {
    title: "Social Perks — Turn Customers Into Your Marketing Team",
    description:
      "Offer perks. Customers post, review, and share. You grow. Works for any business.",
    type: "website",
    siteName: "Social Perks",
    url: "https://socialperks.io",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Social Perks",
    description: "Turn customers into your marketing team. Start free.",
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
      </body>
    </html>
  );
}
