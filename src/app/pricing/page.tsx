import type { Metadata } from "next";
import { PricingSection } from "@/components/landing/pricing-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { SITE_URL, ogImages } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pricing — Social Perks",
  description:
    "Start free. Most businesses stay on Free or Pro. No contracts, cancel anytime. Free, $49 Starter, $99 Pro, $249 Enterprise — annual is 12 months for the price of 10.",
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    images: ogImages(),
    title: "Pricing — Social Perks",
    description: "Simple, transparent pricing. Start free, upgrade when you need to.",
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <div className="pt-16">
        <PricingSection headingLevel="h1" />
      </div>
      <CtaSection />
      <Footer />
    </div>
  );
}
