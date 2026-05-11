import type { Metadata } from "next";
import Link from "next/link";
import {
  OUTREACH_TEMPLATES,
  OUTREACH_BY_CATEGORY,
  OUTREACH_BY_CHANNEL,
  OUTREACH_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  CHANNEL_LABELS,
  type OutreachChannel,
} from "@/lib/outreach/data";

export const metadata: Metadata = {
  title:
    "Cold Outreach Scripts: Free DM, Email & SMS Templates for Small Business Owners",
  description:
    "30 proven cold outreach templates — influencer DMs, customer follow-ups, review requests, partnership pitches, and winback sequences. Copy, paste, send. Free.",
  keywords: [
    "cold email template",
    "influencer outreach script",
    "DM script for influencers",
    "review request template",
    "customer follow-up email",
    "small business outreach",
    "cold pitch template",
    "winback email",
    "partnership email template",
  ],
  alternates: { canonical: "/outreach" },
  openGraph: {
    title: "Free Cold Outreach Scripts for Small Business Owners",
    description:
      "30 tested DM, email, and SMS templates across 6 channels — built for owners who don't have a marketing team.",
    type: "website",
  },
};

const CHANNEL_ORDER: OutreachChannel[] = [
  "email",
  "instagram-dm",
  "tiktok-dm",
  "linkedin-dm",
  "sms",
  "text",
];

export default function OutreachIndexPage() {
  const total = OUTREACH_TEMPLATES.length;

  return (
    <div className="min-h-screen bg-[#0C0F1A] text-white">
      <section className="border-b border-white/10 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-400">
            Outreach Library · {total} Templates
          </p>
          <h1 className="mt-4 font-serif text-4xl italic leading-tight md:text-6xl">
            Free outreach scripts for small business owners.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/70">
            Copy. Paste. Send. 30 cold outreach templates across DMs, email, and
            SMS — every one written for the kinds of conversations small
            business owners actually have, not the ones marketing agencies
            invent.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#by-category"
              className="rounded-md bg-cyan-400 px-5 py-3 font-medium text-[#0C0F1A] hover:bg-cyan-300"
            >
              Browse by category
            </Link>
            <Link
              href="#by-channel"
              className="rounded-md border border-white/20 px-5 py-3 font-medium text-white hover:border-white/40"
            >
              Browse by channel
            </Link>
          </div>
        </div>
      </section>

      <section id="by-category" className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-serif text-3xl italic">By category</h2>
          <p className="mt-3 text-white/60">
            Pick the situation you're in. We'll show you which templates are
            built for it.
          </p>

          <div className="mt-10 space-y-12">
            {OUTREACH_CATEGORIES.map((category) => {
              const templates = OUTREACH_BY_CATEGORY[category] ?? [];
              return (
                <div key={category}>
                  <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <Link
                        href={`/outreach/category/${category}`}
                        className="font-serif text-2xl italic hover:text-cyan-300"
                      >
                        {CATEGORY_LABELS[category]}
                      </Link>
                      <p className="mt-1 max-w-2xl text-sm text-white/60">
                        {CATEGORY_DESCRIPTIONS[category]}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-white/40">
                      {templates.length} template{templates.length !== 1 && "s"}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {templates.map((t) => (
                      <Link
                        key={t.slug}
                        href={`/outreach/${t.slug}`}
                        className="group rounded-lg border border-white/10 bg-white/5 p-5 transition hover:border-cyan-400/40 hover:bg-white/10"
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                            {CHANNEL_LABELS[t.channel]}
                          </span>
                        </div>
                        <h3 className="mt-3 font-serif text-lg italic group-hover:text-cyan-300">
                          {t.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm text-white/60">
                          {t.goal}
                        </p>
                        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-white/40">
                          {t.successRate}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="by-channel"
        className="border-t border-white/10 bg-white/[0.02] px-6 py-16"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="font-serif text-3xl italic">By channel</h2>
          <p className="mt-3 text-white/60">
            Same templates, sorted by where you're going to send them.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {CHANNEL_ORDER.map((channel) => {
              const templates = OUTREACH_BY_CHANNEL[channel] ?? [];
              if (templates.length === 0) return null;
              return (
                <div
                  key={channel}
                  className="rounded-lg border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl italic">
                      {CHANNEL_LABELS[channel]}
                    </h3>
                    <span className="font-mono text-xs text-white/40">
                      {templates.length}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {templates.map((t) => (
                      <li key={t.slug}>
                        <Link
                          href={`/outreach/${t.slug}`}
                          className="text-sm text-white/80 hover:text-cyan-300"
                        >
                          → {t.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-3xl italic md:text-4xl">
            Stop drafting outreach by hand.
          </h2>
          <p className="mt-4 text-white/70">
            Social Perks automates your influencer outreach, customer
            follow-ups, and review requests — using templates like these,
            personalized per recipient, sent at the right time.
          </p>
          <Link
            href="/ai"
            className="mt-8 inline-block rounded-md bg-cyan-400 px-6 py-3 font-medium text-[#0C0F1A] hover:bg-cyan-300"
          >
            Automate outreach with Social Perks →
          </Link>
        </div>
      </section>
    </div>
  );
}
