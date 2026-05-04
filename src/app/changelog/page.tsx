import type { Metadata } from "next";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Changelog — Social Perks",
  description: "Recent updates to Social Perks.",
  alternates: { canonical: "/changelog" },
};

interface Entry {
  date: string;
  title: string;
  body: string[];
}

// Update this list when you ship something user-visible. Newest first.
const ENTRIES: Entry[] = [
  {
    date: "2026-05-04",
    title: "Compliance gate, real OAuth, end-to-end Stripe",
    body: [
      "Added a hard compliance gate so the platform can no longer launch incentivized review campaigns for Google, Yelp, or Tripadvisor.",
      "OAuth callbacks now exchange the authorization code for a real access token (Instagram, TikTok, Facebook). Previously every callback returned a hardcoded mock.",
      "Stripe checkout, webhook, and subscription management wired end-to-end. Live, test, and demo modes are now distinct and labeled.",
      "Waitlist form on every industry page; 6-question pricing FAQ with FAQPage schema; sitemap, robots, OG image, 404/500 pages.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />

      <main id="main-content" className="mx-auto max-w-3xl px-4 pt-32 pb-20 sm:px-6 lg:px-8 sm:pt-40 sm:pb-28">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
          Changelog
        </p>
        <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
          What&apos;s new
        </h1>
        <p className="mt-4 text-base text-brand-dim">
          Every meaningful change we ship lands here.
        </p>

        <ol className="mt-12 space-y-12">
          {ENTRIES.map((entry) => (
            <li key={entry.date} className="border-l-2 border-brand-cyan/40 pl-6">
              <p className="font-mono text-xs text-brand-muted">{entry.date}</p>
              <h2 className="mt-1 font-heading text-2xl italic text-brand-white">
                {entry.title}
              </h2>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-brand-dim sm:text-base">
                {entry.body.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-brand-cyan" aria-hidden="true">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </main>

      <Footer />
    </div>
  );
}
