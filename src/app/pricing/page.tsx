import type { Metadata } from "next";
import { PricingSection } from "@/components/landing/pricing-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { SITE_URL, ogImages } from "@/lib/seo";
import { PLANS } from "@/lib/billing/store";
import { safeJsonForScript } from "@/lib/security/json-ld";

export const metadata: Metadata = {
  title: "Pricing — Social Perks",
  description:
    "Start free. Most businesses stay on Free or Pro. No contracts, cancel anytime. Plans from $0 to custom enterprise.",
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    images: ogImages(),
    title: "Pricing — Social Perks",
    description: "Simple, transparent pricing. Start free, upgrade when you need to.",
  },
};

// Product + Offer structured data. The highest commercial-intent page
// previously carried NO Product/Offer schema, so an AI answer engine asked
// "how much does Social Perks cost?" had nothing machine-readable to cite and
// would guess or omit us. Prices are sourced from the billing PLANS constant
// (the single source of truth), so the schema can never drift from what a
// customer is actually charged.
const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Social Perks",
  description:
    "Turn customers into your marketing team — offer perks in exchange for social posts, reviews, and shares, with FTC compliance built in.",
  brand: { "@type": "Brand", name: "Social Perks" },
  url: `${SITE_URL}/pricing`,
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/pricing`,
    },
    ...(["starter", "professional", "enterprise"] as const).map((key) => ({
      "@type": "Offer",
      name: PLANS[key].name,
      price: String(PLANS[key].monthlyPrice),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/pricing`,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: String(PLANS[key].monthlyPrice),
        priceCurrency: "USD",
        billingDuration: "P1M",
        unitText: "MONTH",
      },
    })),
  ],
};

export default function PricingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(pricingJsonLd) }}
      />
      <Nav />
      <div className="pt-16">
        <PricingSection headingLevel="h1" />
      </div>
      <CtaSection />
      <Footer />
    </div>
  );
}
