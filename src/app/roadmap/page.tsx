import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Roadmap · Social Perks",
  description:
    "What we're building now, next, and later. Public roadmap for Social Perks — the AI marketing platform for small business.",
  alternates: { canonical: "https://socialperks.app/roadmap" },
  openGraph: {
    title: "Social Perks Roadmap",
    description: "What we're building now, next, and later.",
    url: "https://socialperks.app/roadmap",
    siteName: "Social Perks",
    type: "website",
  },
};

interface RoadmapItem {
  title: string;
  description: string;
  target: string;
  votes: number;
}

const NOW: RoadmapItem[] = [
  {
    title: "AI Campaign Agent v2",
    description:
      "Full marketing plan in under 60 seconds — perk structure, copy across 25 platforms, posting schedule, and follower-tier bonuses. Now with multi-step reasoning for complex campaigns.",
    target: "May 2026",
    votes: 312,
  },
  {
    title: "Shopify deep integration",
    description:
      "Two-way sync for orders, customers, and discount codes. Auto-trigger perk campaigns on first purchase, second purchase, or 90-day repeat windows.",
    target: "May 2026",
    votes: 268,
  },
  {
    title: "TikTok Shop attribution",
    description:
      "Native TikTok Shop tracking for perk-for-post campaigns. Link customer posts to closed sales without manual UTM gymnastics.",
    target: "May 2026",
    votes: 197,
  },
  {
    title: "AI submission review (v2)",
    description:
      "Auto-approve, auto-reject, or escalate customer submissions in seconds using a vision + text reasoning pipeline. Hand-review queue down 80%.",
    target: "May 2026",
    votes: 184,
  },
  {
    title: "Spanish UI localization",
    description:
      "Full Spanish localization for customer-facing perk pages and business dashboard. English, Spanish, and Portuguese live by end of quarter.",
    target: "May 2026",
    votes: 142,
  },
  {
    title: "Google Business Profile auto-post",
    description:
      "Auto-publish weekly Google Business Profile posts when a campaign launches. Keeps your map-pack ranking fresh without you remembering to do it.",
    target: "May 2026",
    votes: 128,
  },
];

const NEXT: RoadmapItem[] = [
  {
    title: "Influencer marketplace v2",
    description:
      "Two-sided marketplace where local micro-influencers can apply directly to your campaigns. Skip the cold outreach.",
    target: "Jun 2026",
    votes: 421,
  },
  {
    title: "Native YouTube Shorts perks",
    description:
      "First-class support for YouTube Shorts as a perk action — including the FTC disclosure handling and watch-time-based payout tiers.",
    target: "Jun 2026",
    votes: 289,
  },
  {
    title: "Square and Toast POS sync",
    description:
      "Trigger perks at the moment of payment. New customer? Send a review request. Repeat customer? Send a loyalty bonus.",
    target: "Jul 2026",
    votes: 256,
  },
  {
    title: "AI image generation for campaigns",
    description:
      "Generate on-brand campaign creative directly inside Social Perks. Pulls your brand colors, logo, and prior asset library.",
    target: "Jul 2026",
    votes: 211,
  },
  {
    title: "Multi-location dashboards",
    description:
      "Native multi-location rollups for franchises and chains — see performance by location, run national campaigns, and let local managers tune local perks.",
    target: "Jul 2026",
    votes: 178,
  },
  {
    title: "SMS-first onboarding flow",
    description:
      "New customers can enroll in perk programs by texting a short code — no app download, no email signup. Designed for in-store conversion.",
    target: "Aug 2026",
    votes: 152,
  },
  {
    title: "Real-time fraud monitoring",
    description:
      "Live signals for content theft, fake follower bases, and submission gaming. Flag and block bad actors before perks pay out.",
    target: "Aug 2026",
    votes: 134,
  },
];

const LATER: RoadmapItem[] = [
  {
    title: "AI Marketing Manager (autonomous mode)",
    description:
      "Set a monthly marketing budget and goal. The AI runs the campaigns, manages the influencers, approves submissions, and reports weekly. You review and adjust.",
    target: "Q4 2026",
    votes: 587,
  },
  {
    title: "Native iOS and Android apps",
    description:
      "Full native apps for business owners and for customers — including offline submission queue, push notifications, and biometric auth.",
    target: "Q4 2026",
    votes: 412,
  },
  {
    title: "WhatsApp Business integration",
    description:
      "Send perk codes, reminders, and program enrollment through WhatsApp. Critical for LATAM and EMEA markets.",
    target: "Q4 2026",
    votes: 298,
  },
  {
    title: "Public influencer exchange",
    description:
      "A live marketplace where businesses bid on micro-influencer attention by category, geography, and audience profile. Like an ad exchange, for humans.",
    target: "Q4 2026",
    votes: 264,
  },
  {
    title: "Vector-search customer matching",
    description:
      "Match each customer to the perk most likely to convert them based on their content history, follower graph, and prior engagement.",
    target: "Q1 2027",
    votes: 198,
  },
  {
    title: "White-label for agencies",
    description:
      "Run Social Perks under your own agency brand for multiple clients. Centralized billing, multi-tenant dashboards, role-based access.",
    target: "Q1 2027",
    votes: 167,
  },
  {
    title: "On-device LLM submission review",
    description:
      "Run the submission-review pipeline locally on edge devices for businesses with strict data-residency requirements.",
    target: "Q2 2027",
    votes: 89,
  },
];

function Card({ item }: { item: RoadmapItem }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/20 hover:bg-white/[0.04]">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="font-mono uppercase tracking-wider text-brand-text/50">
          {item.target}
        </span>
        <span className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-brand-text/60">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
          {item.votes} votes
        </span>
      </div>
      <h3 className="mb-2 font-medium text-brand-white">{item.title}</h3>
      <p className="text-sm leading-relaxed text-brand-text/70">
        {item.description}
      </p>
    </div>
  );
}

function Column({
  label,
  accent,
  items,
}: {
  label: string;
  accent: string;
  items: RoadmapItem[];
}) {
  return (
    <div>
      <div
        className={`mb-4 inline-flex items-center gap-2 rounded-full border ${accent} px-3 py-1 text-xs uppercase tracking-wider`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {label}
        <span className="text-brand-text/50">({items.length})</span>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.title} item={item} />
        ))}
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <main id="main-content" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <header className="mb-12 text-center">
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            Public roadmap
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-text/80">
            Transparent view of what we&apos;re building. Now, next, and later —
            with target months and community vote counts. Subject to change as
            we learn.
          </p>
          <p className="mt-3 text-sm text-brand-text/50">
            Last updated May 2026 · 20 items · 5,381 votes
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          <Column
            label="Now"
            accent="border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan"
            items={NOW}
          />
          <Column
            label="Next"
            accent="border-amber-400/40 bg-amber-400/10 text-amber-300"
            items={NEXT}
          />
          <Column
            label="Later"
            accent="border-white/20 bg-white/5 text-brand-text/70"
            items={LATER}
          />
        </div>

        <section className="mt-20 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 text-center md:p-12">
          <h2 className="font-serif text-3xl italic text-brand-white">
            Want a feature?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-text/80">
            Tell us what would actually move the needle for your business.
            We&apos;ll read every email, and the ones that come up repeatedly
            get bumped up the roadmap.
          </p>
          <a
            href="mailto:hi@socialperks.app?subject=Roadmap%20request"
            className="mt-6 inline-block rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
          >
            hi@socialperks.app
          </a>
        </section>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-sm text-brand-text/60">
          <Link href="/changelog" className="hover:text-brand-cyan">
            View changelog →
          </Link>
          <span>·</span>
          <Link href="/ai" className="hover:text-brand-cyan">
            Try Social Perks free →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
