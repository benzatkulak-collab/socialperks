import type { Metadata } from "next";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { Testimonials } from "@/components/landing/testimonials";
import { PricingTable } from "@/components/landing/pricing-table";
import { AiHero } from "@/components/landing/ai/ai-hero";
import { AiHowItWorks } from "@/components/landing/ai/ai-how-it-works";
import { AiCapabilities } from "@/components/landing/ai/ai-capabilities";
import { AiComparison } from "@/components/landing/ai/ai-comparison";
import { AiFaq } from "@/components/landing/ai/ai-faq";
import { AiFinalCta } from "@/components/landing/ai/ai-final-cta";

export const metadata: Metadata = {
  title: "AI Marketing Manager for Small Business · Social Perks",
  description:
    "Your AI marketing manager works 24/7. Connects to Instagram, Google, and TikTok. Runs review campaigns, manages influencers, sends perks. All on autopilot.",
  openGraph: {
    title: "Your AI marketing manager works while you sleep",
    description:
      "Runs review campaigns, manages influencers, sends perks — all on autopilot.",
    url: "https://socialperks.onrender.com/ai",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function AiLandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden scroll-smooth">
      <Nav />
      <main id="main-content">
        <AiHero />
        <AiHowItWorks />
        <AiCapabilities />
        <AiComparison />
        <Testimonials />
        <AiFaq />
        <PricingTable />
        <AiFinalCta />
      </main>
      <Footer />
    </div>
  );
}
