import type { Metadata } from "next";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { CalculatorClient } from "./client";

export const metadata: Metadata = {
  title: "ROI calculator — Social Perks",
  description: "Estimate the cost-per-customer-post on Social Perks vs. paid Instagram ads. Type your numbers in.",
  alternates: { canonical: "/calculator" },
};

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />
      <main id="main-content" className="mx-auto max-w-2xl px-4 pt-32 pb-20 sm:px-6 lg:px-8 sm:pt-40 sm:pb-28">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">Calculator</p>
        <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
          What does this actually cost vs. paid ads?
        </h1>
        <p className="mt-4 text-base text-brand-dim sm:text-lg">
          Type your numbers in. We&apos;ll show the per-post and per-month
          cost on Social Perks vs. an Instagram-ads-equivalent reach buy.
        </p>
        <div className="mt-10">
          <CalculatorClient />
        </div>
      </main>
      <Footer />
    </div>
  );
}
