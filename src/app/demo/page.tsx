import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { DemoSandbox } from "./demo-sandbox";

export const metadata: Metadata = {
  title: "Try the demo — Social Perks",
  description:
    "Build a customer-rewards campaign in 60 seconds. Pick a perk, see the QR poster, watch the SMS that goes out. No signup. No credit card.",
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "Try Social Perks — interactive demo",
    description:
      "60-second walkthrough of the QR-on-the-cup customer-marketing flywheel. No signup required.",
  },
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />
      <main id="main-content" className="mx-auto max-w-4xl px-4 pt-32 pb-20 sm:px-6 lg:px-8 sm:pt-40 sm:pb-28">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
          Interactive demo
        </p>
        <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
          See the flywheel before you sign up.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-brand-dim sm:text-lg">
          Pick a business type, choose a perk, get the printable QR poster, and
          watch what the post-purchase SMS would look like. No account, no
          credit card, no email — this whole page is a sandbox.
        </p>

        <DemoSandbox />

        <div className="mt-12 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/5 p-6 text-center sm:p-8">
          <h2 className="font-heading text-2xl italic text-brand-white">
            Like what you see?
          </h2>
          <p className="mt-3 text-sm text-brand-dim max-w-md mx-auto">
            Make it real. First campaign is free forever. 5-minute setup.
          </p>
          <Link
            href="/dashboard#signup"
            className="mt-6 inline-block rounded-xl bg-brand-cyan px-6 py-3 font-body text-sm font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:-translate-y-0.5"
          >
            Print Your QR Code Free →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
