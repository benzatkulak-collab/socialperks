import Link from "next/link";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { AudienceSections } from "@/components/landing/audience-sections";
import { PlatformShowcase } from "@/components/landing/platform-showcase";
import { SocialProof } from "@/components/landing/social-proof";
import { PricingSection } from "@/components/landing/pricing-section";
import { CtaSection } from "@/components/landing/cta-section";
import { ClaudeDesktopInstall } from "@/components/agent/claude-desktop-install";
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

      {/* Developer / agent strip — small, scoped to the developer
          audience. Doesn't compete with the small-business CTAs
          above. Compact variant + a follow-up link to /agents for
          anyone who wants the full developer surface. */}
      <section
        id="install"
        className="relative bg-brand-bg py-12 sm:py-16"
        aria-labelledby="install-heading"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
                For developers + AI agents
              </p>
              <h2 id="install-heading" className="font-heading text-xl italic text-brand-white sm:text-2xl mt-1">
                Build with Social Perks
              </h2>
            </div>
            <Link
              href="/agents"
              className="text-sm text-brand-cyan hover:text-brand-white underline-offset-4 hover:underline transition-colors whitespace-nowrap"
            >
              MCP docs + API →
            </Link>
          </div>
          <ClaudeDesktopInstall variant="compact" />
        </div>
      </section>

      <PricingSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
