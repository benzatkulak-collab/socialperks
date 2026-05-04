import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { WaitlistForm } from "@/components/landing/waitlist-form";

export const metadata: Metadata = {
  title: "Case Studies — Social Perks",
  description:
    "Real results from coffee shops using Social Perks to turn customers into marketing.",
  alternates: { canonical: "/case-studies" },
};

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />

      <main id="main-content" className="mx-auto max-w-3xl px-4 pt-32 pb-20 sm:px-6 lg:px-8 sm:pt-40 sm:pb-28">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
          Case studies
        </p>
        <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
          Coming soon — and we&apos;re honest about why.
        </h1>
        <p className="mt-6 text-base leading-relaxed text-brand-dim sm:text-lg">
          Most software companies fake their case studies for the first year. We
          won&apos;t. We&apos;re onboarding the first 10 independent coffee shops
          right now, and once we have real revenue numbers, real photos, and
          real quotes — they&apos;ll go here.
        </p>
        <p className="mt-4 text-base leading-relaxed text-brand-dim sm:text-lg">
          Want to be one of the first ones featured? Drop your email below.
        </p>

        <div className="mt-10 rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-6 sm:p-8">
          <h2 className="font-heading text-2xl italic text-brand-white">
            Be a launch customer
          </h2>
          <p className="mt-2 text-sm text-brand-dim">
            We pick the shops we onboard by hand. If yours fits, your story will
            be the first one on this page.
          </p>
          <div className="mt-6">
            <WaitlistForm vertical="coffee_shops" />
          </div>
        </div>

        <p className="mt-12 text-sm text-brand-muted">
          In the meantime, here&apos;s how the system works:{" "}
          <Link href="/#how-it-works" className="text-brand-cyan hover:underline">
            See how it works →
          </Link>
        </p>
      </main>

      <Footer />
    </div>
  );
}
