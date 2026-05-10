import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { ReviewRoiCalculator } from "./review-roi-calculator";

export const metadata: Metadata = {
  title: "Free Review ROI Calculator · Social Perks",
  description:
    "See exactly how much extra revenue you'd earn by improving your Google rating. Conservative numbers, instant results.",
  openGraph: {
    title: "Free Review ROI Calculator",
    description:
      "How much is a 4.5★ rating worth versus a 3.8★? Find out in seconds.",
    url: "https://socialperks.onrender.com/tools/review-roi-calculator",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function ReviewRoiCalculatorPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <Nav />
      <main id="main-content">
        <section className="relative pt-32 pb-12 sm:pt-40">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(251,191,36,0.05),transparent_60%)]"
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
              Review ROI{" "}
              <span className="bg-gradient-to-r from-brand-amber to-brand-cyan bg-clip-text text-transparent">
                Calculator
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              See how much extra revenue better Google reviews would actually
              put in your pocket. Conservative numbers, no fluff.
            </p>
          </div>
        </section>

        <ReviewRoiCalculator />

        <div className="h-16" />
      </main>
      <Footer />
    </div>
  );
}
