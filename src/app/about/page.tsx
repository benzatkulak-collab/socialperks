import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Social Perks",
  description:
    "Learn about Social Perks, our mission to turn customers into marketing teams, and the people behind the platform.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Nav */}
      <header className="border-b border-brand-border/50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Back to home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-cyan/10">
              <span className="font-heading text-lg text-brand-cyan">S</span>
            </div>
            <span className="font-heading text-xl italic text-brand-white">
              Social Perks
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-brand-muted transition-colors hover:text-brand-text"
          >
            &larr; Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
        {/* Hero */}
        <section>
          <h1 className="font-heading text-3xl italic text-brand-white sm:text-4xl">
            About Social Perks
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-brand-dim">
            We believe every business deserves a marketing team. Social Perks
            turns your happiest customers into advocates by rewarding them for
            the thing they already do — sharing what they love.
          </p>
        </section>

        {/* Mission */}
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold text-brand-text">
            Our Mission
          </h2>
          <div className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6">
            <p className="text-sm leading-relaxed text-brand-dim">
              Word-of-mouth has always been the most powerful form of marketing,
              but until now only big brands with big budgets could harness it at
              scale. Social Perks levels the playing field. Whether you run a
              neighborhood yoga studio or a national franchise, our platform
              makes it simple to create campaigns that reward customers for
              posts, reviews, shares, and referrals across 15 social platforms.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-brand-dim">
              We handle the complexity — FTC compliance, fraud detection,
              analytics, influencer matching — so you can focus on what you do
              best: running your business.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="mt-14">
          <h2 className="mb-6 text-lg font-semibold text-brand-text">
            What We Stand For
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Authenticity First",
                description:
                  "Real people sharing real experiences. Our fraud detection and FTC compliance engines ensure every piece of content is genuine and transparent.",
                color: "border-l-brand-cyan",
              },
              {
                title: "Built for Everyone",
                description:
                  "From mom-and-pop shops to enterprise brands, we design for accessibility. Simple enough for your first campaign, powerful enough for your thousandth.",
                color: "border-l-brand-green",
              },
              {
                title: "Fair Value Exchange",
                description:
                  "Customers get rewarded for their genuine advocacy. Businesses get authentic marketing. Influencers get fair compensation. Everyone wins.",
                color: "border-l-brand-amber",
              },
              {
                title: "Privacy by Design",
                description:
                  "We collect only what we need, encrypt everything, and give you full control over your data. Your trust is our most important feature.",
                color: "border-l-brand-purple",
              },
            ].map((value) => (
              <div
                key={value.title}
                className={`rounded-lg border border-brand-border/50 border-l-2 ${value.color} bg-brand-surface/20 p-5`}
              >
                <h3 className="mb-2 font-semibold text-brand-text">
                  {value.title}
                </h3>
                <p className="text-sm leading-relaxed text-brand-muted">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* By the Numbers */}
        <section className="mt-14">
          <h2 className="mb-6 text-lg font-semibold text-brand-text">
            By the Numbers
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { stat: "15", label: "Social Platforms" },
              { stat: "107", label: "Marketing Actions" },
              { stat: "5", label: "Campaign Tiers" },
              { stat: "14", label: "Backend Engines" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-4 text-center"
              >
                <p className="font-mono text-2xl font-semibold text-brand-cyan">
                  {item.stat}
                </p>
                <p className="mt-1 text-xs text-brand-muted">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold text-brand-text">
            The Team
          </h2>
          <div className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6">
            <p className="text-sm leading-relaxed text-brand-dim">
              Social Perks is built by a small, focused team of engineers,
              designers, and marketers who believe that authentic word-of-mouth
              should be accessible to every business. We are based in San
              Francisco and work remotely across time zones.
            </p>
            <p className="mt-4 text-sm text-brand-muted">
              Interested in joining?{" "}
              <a
                href="mailto:careers@socialperks.io"
                className="text-brand-cyan underline underline-offset-2 transition-colors hover:text-brand-cyan/80"
              >
                Get in touch
              </a>
              .
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold text-brand-text">
            Contact Us
          </h2>
          <div className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6 text-sm text-brand-muted">
            <p>Social Perks, Inc.</p>
            <p>San Francisco, CA</p>
            <p className="mt-2">
              General:{" "}
              <a
                href="mailto:hello@socialperks.io"
                className="text-brand-cyan underline underline-offset-2"
              >
                hello@socialperks.io
              </a>
            </p>
            <p>
              Press:{" "}
              <a
                href="mailto:press@socialperks.io"
                className="text-brand-cyan underline underline-offset-2"
              >
                press@socialperks.io
              </a>
            </p>
            <p>
              Support:{" "}
              <a
                href="mailto:support@socialperks.io"
                className="text-brand-cyan underline underline-offset-2"
              >
                support@socialperks.io
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
