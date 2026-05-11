import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  OUTREACH_BY_CATEGORY,
  OUTREACH_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  CHANNEL_LABELS,
  type OutreachCategory,
} from "@/lib/outreach/data";

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return OUTREACH_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category } = await params;
  if (!OUTREACH_CATEGORIES.includes(category as OutreachCategory)) {
    return { title: "Category not found" };
  }
  const cat = category as OutreachCategory;
  const title = `${CATEGORY_LABELS[cat]} Templates: Free Scripts for Small Businesses`;
  return {
    title,
    description: CATEGORY_DESCRIPTIONS[cat],
    alternates: { canonical: `/outreach/category/${cat}` },
    openGraph: { title, description: CATEGORY_DESCRIPTIONS[cat] },
  };
}

const CATEGORY_INTRO: Record<OutreachCategory, string> = {
  "influencer-outreach":
    "The mistake most small business owners make with influencer outreach: treating it like a media buy. Creators see hundreds of templated, transactional pitches a month, and they ignore almost all of them. The templates below are written to feel like messages from a person — not from a brand calendar — and they consistently outperform copy-pasted influencer scripts by 3-5x on reply rate.",
  "customer-followup":
    "A customer who has just bought from you is the easiest person in the world to delight, and the easiest to lose. These templates handle the post-purchase, first-time-buyer, abandoned-cart, and VIP outreach moments that compound into repeat business. Used together, they raise repeat-purchase rate by 15-30% in most small businesses.",
  "review-request":
    "Reviews are the highest-leverage marketing asset a local business owns. These templates handle the in-person ask, the SMS follow-up, the post-purchase email, and the repeat-customer ask — all calibrated for honesty, low friction, and high reply rate. Every one of them is engineered to give the customer an off-ramp so you intercept complaints privately before they become 1-star public reviews.",
  partnership:
    "Local partnerships are the most underused customer acquisition channel for small businesses. The other business has already paid the acquisition cost — you're just borrowing the trust. These templates open the partnership conversation without sounding like a corporate co-marketing pitch, which is what wins the meeting with the kind of neighborhood-owner who would otherwise ignore you.",
  "cold-pitch":
    "Cold outreach to journalists, podcasters, and B2B prospects almost always fails for the same reason: the first email feels like it was sent to 500 other recipients. The templates below are engineered to feel like the opposite — like the writer spent 20 minutes thinking specifically about the recipient. That single shift is the difference between 1% reply rates and 12% reply rates.",
  rebooking:
    "Lapsed customers are not lost customers — they're just busy customers. The templates here are the gentlest, highest-converting ways to surface back into their inbox: 30-day winbacks, birthday outreach, seasonal nudges, no-show recovery, and the rare handwritten-style note that brings back a long-gone VIP. None of them use guilt, urgency, or fake scarcity, because none of those tactics actually work on people who used to like you.",
};

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  if (!OUTREACH_CATEGORIES.includes(category as OutreachCategory)) {
    notFound();
  }
  const cat = category as OutreachCategory;
  const templates = OUTREACH_BY_CATEGORY[cat] ?? [];

  return (
    <div className="min-h-screen bg-[#0C0F1A] text-white">
      <section className="border-b border-white/10 px-6 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <nav className="mb-6 flex items-center gap-2 text-sm text-white/50">
            <Link href="/outreach" className="hover:text-white">
              Outreach
            </Link>
            <span>/</span>
            <span className="text-white/30">{CATEGORY_LABELS[cat]}</span>
          </nav>
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-400">
            {templates.length} Templates · Category
          </p>
          <h1 className="mt-4 font-serif text-4xl italic leading-tight md:text-5xl">
            {CATEGORY_LABELS[cat]} Templates
          </h1>
          <p className="mt-5 text-lg text-white/70">
            {CATEGORY_DESCRIPTIONS[cat]}
          </p>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <p className="text-white/80">{CATEGORY_INTRO[cat]}</p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((t) => (
              <Link
                key={t.slug}
                href={`/outreach/${t.slug}`}
                className="group flex flex-col rounded-lg border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/40 hover:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                    {CHANNEL_LABELS[t.channel]}
                  </span>
                </div>
                <h2 className="mt-3 font-serif text-xl italic group-hover:text-cyan-300">
                  {t.title}
                </h2>
                <p className="mt-2 flex-1 text-sm text-white/70">{t.goal}</p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-green-300">
                  {t.successRate}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.02] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-2xl italic">Browse other categories</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {OUTREACH_CATEGORIES.filter((c) => c !== cat).map((c) => (
              <Link
                key={c}
                href={`/outreach/category/${c}`}
                className="rounded-md border border-white/10 bg-white/5 p-4 hover:border-cyan-400/40"
              >
                <p className="font-serif italic">{CATEGORY_LABELS[c]}</p>
                <p className="mt-1 text-xs text-white/50">
                  {OUTREACH_BY_CATEGORY[c]?.length ?? 0} templates
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-2xl italic md:text-3xl">
            Automate outreach with Social Perks
          </h2>
          <p className="mt-4 text-white/70">
            All of these templates can be personalized, scheduled, and sent
            automatically through Social Perks.
          </p>
          <Link
            href="/ai"
            className="mt-6 inline-block rounded-md bg-cyan-400 px-6 py-3 font-medium text-[#0C0F1A] hover:bg-cyan-300"
          >
            See how it works →
          </Link>
        </div>
      </section>
    </div>
  );
}
