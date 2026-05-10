import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { ReviewEmailTool } from "./review-email-tool";

export const metadata: Metadata = {
  title: "Free Google Review Email Generator · Social Perks",
  description:
    "Generate polite, effective emails asking customers for Google reviews. Pick a tone, fill in details, copy. Free, no signup.",
  openGraph: {
    title: "Free Google Review Email Generator",
    description:
      "Polite, effective Google review request emails in 3 tones. Copy and send.",
    url: "https://socialperks.onrender.com/tools/review-email-generator",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function ReviewEmailGeneratorPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <Nav />
      <main id="main-content">
        {/* Hero */}
        <section className="relative pt-32 pb-12 sm:pt-40">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.05),transparent_60%)]"
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
              Google Review{" "}
              <span className="bg-gradient-to-r from-brand-cyan to-brand-green bg-clip-text text-transparent">
                Email Generator
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              Polite, effective emails that actually get customers to leave
              reviews. Pick a tone, fill in a few details, copy and send.
            </p>
          </div>
        </section>

        <ReviewEmailTool />

        <div className="h-16" />
      </main>
      <Footer />
    </div>
  );
}
