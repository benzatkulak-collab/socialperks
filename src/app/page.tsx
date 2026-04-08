import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { AudienceSections } from "@/components/landing/audience-sections";
import { PlatformShowcase } from "@/components/landing/platform-showcase";
import { SocialProof } from "@/components/landing/social-proof";
import { PricingSection } from "@/components/landing/pricing-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <Hero />
      <PlatformShowcase />
      <HowItWorks />
      <AudienceSections />
      <SocialProof />
      <PricingSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
