import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { CaptionTool } from "./caption-tool";

export const metadata: Metadata = {
  title: "Free Instagram Caption Generator for Small Business · Social Perks",
  description:
    "Generate 3 Instagram caption options with relevant hashtags. Choose your business type and vibe. Free, no signup, no AI key needed.",
  openGraph: {
    title: "Free Instagram Caption Generator for Small Business",
    description:
      "3 captions, relevant hashtags, your business type and vibe. Stop staring at the blinking cursor.",
    url: "https://socialperks.onrender.com/tools/instagram-caption-generator",
    siteName: "Social Perks",
    type: "website",
  },
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to generate Instagram captions for your small business",
  description:
    "Use the free Social Perks Instagram caption generator to produce three caption options with relevant hashtags for your business in under a minute.",
  totalTime: "PT1M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Pick your business type",
      text: "Choose the business category that matches your brand — coffee shop, restaurant, salon, boutique, fitness, or more.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Pick a vibe",
      text: "Select the tone you want — playful, professional, aspirational, or casual.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Generate captions",
      text: "Click generate to produce three caption options, each with relevant, narrow hashtags suited to your business and vibe.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Copy your favorite",
      text: "Copy the caption you like to your clipboard and paste it directly into Instagram. No signup required.",
    },
  ],
};

export default function InstagramCaptionGeneratorPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <Nav />
      <main id="main-content">
        <section className="relative pt-32 pb-12 sm:pt-40">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(52,211,153,0.05),transparent_60%)]"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <Link
              href="/tools"
              className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted transition-colors hover:text-brand-cyan"
            >
              ← All free tools
            </Link>
            <h1 className="mt-5 font-heading text-[clamp(2rem,4.5vw,3.5rem)] italic leading-[1.05] tracking-tight text-brand-white">
              Instagram Caption{" "}
              <span className="bg-gradient-to-r from-brand-green to-brand-cyan bg-clip-text text-transparent">
                Generator
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              Three caption options with relevant hashtags, tuned for your
              business type and vibe. No signup. No AI API. Just useful.
            </p>
          </div>
        </section>

        <CaptionTool />

        <div className="h-16" />
      </main>
      <Footer />
    </div>
  );
}
