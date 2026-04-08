import type { Metadata } from "next";
import { PricingSection } from "@/components/landing/pricing-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Pricing — Social Perks",
  description:
    "Start free. Most businesses stay on Free or Pro. No contracts, cancel anytime. Plans from $0 to custom enterprise.",
  openGraph: {
    title: "Pricing — Social Perks",
    description: "Simple, transparent pricing. Start free, upgrade when you need to.",
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <div className="pt-16">
        <PricingSection />
      </div>
      <CtaSection />
      <Footer />
    </div>
  );
}
