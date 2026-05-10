import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { SmsTool } from "./sms-tool";

export const metadata: Metadata = {
  title: "Free SMS Review Request Templates · Social Perks",
  description:
    "27 pre-written SMS templates for asking customers for reviews. Post-purchase, post-service, post-event, post-meal. All under 160 characters.",
  openGraph: {
    title: "Free SMS Review Request Templates",
    description:
      "27 pre-written SMS templates for asking for reviews. Copy and send.",
    url: "https://socialperks.onrender.com/tools/sms-review-templates",
    siteName: "Social Perks",
    type: "website",
  },
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to send a customer review request via SMS",
  description:
    "Use the free Social Perks SMS review templates to pick a pre-written, under-160-character message and send it to your customer in seconds.",
  totalTime: "PT30S",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Pick the occasion",
      text: "Choose the occasion that matches the customer interaction — post-purchase, post-service, post-event, or post-meal.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Browse templates",
      text: "Scroll through the 27 pre-written SMS templates, each under 160 characters and ready to send.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Customize the placeholders",
      text: "Replace placeholders like [Customer], [Business], and [Review Link] with your own details.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Copy and send",
      text: "Copy the final SMS to your clipboard and paste it into your messaging app or SMS marketing tool. No signup required.",
    },
  ],
};

export default function SmsReviewTemplatesPage() {
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
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(251,191,36,0.04),transparent_60%)]"
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
              Customer Review{" "}
              <span className="bg-gradient-to-r from-brand-amber to-brand-cyan bg-clip-text text-transparent">
                SMS Templates
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              27 pre-written SMS templates for asking customers for reviews.
              Sorted by occasion, all under 160 characters. Copy and send.
            </p>
          </div>
        </section>

        <SmsTool />

        <div className="h-16" />
      </main>
      <Footer />
    </div>
  );
}
