import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { UtmLinkGenerator } from "./utm-link-generator";

export const metadata: Metadata = {
  title: "Free UTM Link Generator · Social Perks",
  description:
    "Build properly-tagged UTM links for tracking marketing campaigns across Google Analytics, Meta, and beyond. Free, instant, no signup.",
  openGraph: {
    title: "Free UTM Link Generator",
    description:
      "Build properly-tagged UTM links in seconds. Tracks campaigns in Google Analytics, Meta, and any analytics tool.",
    url: "https://socialperks.onrender.com/tools/utm-link-generator",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function UtmLinkGeneratorPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <Nav />
      <main id="main-content">
        <section className="relative pt-32 pb-12 sm:pt-40">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.05),transparent_60%)]" aria-hidden="true" />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <Link href="/tools" className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted transition-colors hover:text-brand-cyan">
              ← All free tools
            </Link>
            <h1 className="mt-5 font-heading text-[clamp(2rem,4.5vw,3.5rem)] italic leading-[1.05] tracking-tight text-brand-white">
              UTM <span className="bg-gradient-to-r from-brand-cyan to-brand-green bg-clip-text text-transparent">Link Generator</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              Build trackable links for every campaign. Pick a source, fill in the campaign, copy the URL — your analytics will know exactly where each click came from.
            </p>
          </div>
        </section>
        <UtmLinkGenerator />
        <div className="h-16" />
      </main>
      <Footer />
    </div>
  );
}
