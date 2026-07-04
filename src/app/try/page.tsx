import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

// Demand-test landing page. NOINDEXED on purpose — this is a paid/community
// traffic test to measure willingness-to-pay (click-to-trial), not an organic
// SEO surface. Keep it off the sitemap and out of search results so it can't
// cannibalize the real marketing pages or muddy analytics.
export const metadata = buildMetadata({
  title: "Get customers posting about your shop — Social Perks",
  description:
    "Offer a perk, your customers post on Instagram & TikTok — with the FTC disclosure added automatically. $79/mo, 14-day free trial.",
  path: "/try",
  noindex: true,
});

// Single self-serve CTA target: the $79 flagship (Pro), 14-day trial via the
// normal signup → plan-intent → checkout path (so the webhook gets businessId
// and actually provisions). Matches pricing-section.tsx.
const TRIAL_HREF = "/dashboard#signup?plan=professional&period=monthly";

const STEPS = [
  {
    n: "1",
    title: "Pick a perk",
    body: "A free drink, 15% off, a pastry — whatever you'd happily trade for a post.",
  },
  {
    n: "2",
    title: "Your customer posts",
    body: "They share on Instagram or TikTok. We add the required FTC disclosure automatically and track who posted.",
  },
  {
    n: "3",
    title: "You approve, they get the perk",
    body: "One tap to verify. Real word-of-mouth from the people already in your shop — no ad spend.",
  },
];

export default function TryPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg text-brand-text">
      {/* Minimal header — logo only, no nav, to keep the page focused on the
          single conversion action. */}
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 pt-8 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-cyan text-brand-bg">
            <span className="text-sm font-bold">◆</span>
          </span>
          <span className="font-heading text-lg italic text-brand-white">Social Perks</span>
        </Link>
        <Link
          href={TRIAL_HREF}
          data-cta-source="try:header"
          data-plan="professional"
          className="rounded-lg border border-brand-border bg-brand-surface px-4 py-2 text-sm font-semibold text-brand-text transition-colors hover:border-brand-subtle hover:bg-brand-elevated"
        >
          Start free trial
        </Link>
      </header>

      {/* Hero */}
      <main id="main-content" className="mx-auto max-w-3xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-brand-cyan sm:text-xs">
          For cafes, salons &amp; local shops
        </p>
        <h1 className="font-heading text-[clamp(2rem,5vw,3.5rem)] italic leading-[1.1] text-brand-white">
          Turn the customers already in your shop into Instagram &amp; TikTok posts.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-dim sm:text-xl">
          Offer a small perk, your regulars post about you — and we add the FTC
          disclosure automatically so you stay on the right side of the rules.
          Real word-of-mouth, not ads.
        </p>

        {/* Offer + primary CTA */}
        <div className="mt-10 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/[0.04] p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-heading text-4xl text-brand-white sm:text-5xl">$79</span>
            <span className="text-brand-muted">/month</span>
            <span className="ml-1 rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-green">
              14-day free trial
            </span>
          </div>
          <p className="mt-2 text-sm text-brand-dim">
            Everything the $500/mo tools do for a coffee shop — the parts you
            actually need. Cancel anytime.
          </p>
          <Link
            href={TRIAL_HREF}
            data-cta-source="try:hero"
            data-plan="professional"
            className="mt-6 block w-full rounded-xl bg-brand-cyan py-4 text-center text-base font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:shadow-md hover:shadow-brand-cyan/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 sm:w-auto sm:px-10"
          >
            Start your free trial →
          </Link>
          <p className="mt-3 text-xs text-brand-muted">
            FTC-compliant disclosures built in · No Google-review rule-breaking · Cancel anytime
          </p>
        </div>

        {/* How it works */}
        <section className="mt-16">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">How it works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-cyan/10 font-mono text-sm text-brand-cyan">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold text-brand-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-dim">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The compliance hook — the real differentiator */}
        <section className="mt-14 rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-6 sm:p-8">
          <h2 className="font-heading text-xl italic text-brand-white sm:text-2xl">
            Why not just ask customers to post?
          </h2>
          <p className="mt-3 text-brand-dim leading-relaxed">
            The moment you tie a reward to a post, you&apos;re legally on the hook for
            an FTC disclosure — and offering perks for <em>Google reviews</em> can get
            your listing penalized. Social Perks handles the disclosure automatically
            and keeps you to the platforms where incentivized posts are actually
            allowed. Compliance is the product, not a footnote.
          </p>
        </section>

        {/* Closing CTA */}
        <div className="mt-16 text-center">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Your first customer post can go live this week.
          </h2>
          <Link
            href={TRIAL_HREF}
            data-cta-source="try:footer"
            data-plan="professional"
            className="mt-6 inline-block rounded-xl bg-brand-cyan px-10 py-4 text-base font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:shadow-md hover:shadow-brand-cyan/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50"
          >
            Start your 14-day free trial →
          </Link>
          <p className="mt-3 text-xs text-brand-muted">No long-term contract · Cancel anytime</p>
        </div>
      </main>

      <footer className="border-t border-brand-border/40 py-8 text-center text-xs text-brand-muted">
        <Link href="/" className="hover:text-brand-text">Social Perks</Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:text-brand-text">Privacy</Link>
        <span className="mx-2">·</span>
        <Link href="/terms" className="hover:text-brand-text">Terms</Link>
      </footer>
    </div>
  );
}
