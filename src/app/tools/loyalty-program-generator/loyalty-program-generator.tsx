"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const BUSINESS_TYPES = [
  "Coffee shop",
  "Restaurant",
  "Bar / pub",
  "Bakery",
  "Salon",
  "Barber shop",
  "Spa",
  "Gym / fitness studio",
  "Yoga studio",
  "Boutique retail",
  "Bookstore",
  "Pet store",
  "Florist",
  "Auto detailer",
  "Car wash",
  "Dental practice",
  "Veterinary clinic",
  "Tattoo studio",
  "Dry cleaner",
  "Ice cream shop",
] as const;

type Goal = "visits" | "spend" | "referrals";

const GOALS: { value: Goal; label: string; emoji: string }[] = [
  { value: "visits", label: "More visits", emoji: "🔁" },
  { value: "spend", label: "Higher spend", emoji: "💰" },
  { value: "referrals", label: "More referrals", emoji: "📣" },
];

interface ProgramIdea {
  name: string;
  hook: string;
  structure: string[];
  reward: string;
  pro: string;
}

function generateIdeas(
  businessType: string,
  offering: string,
  goal: Goal,
): ProgramIdea[] {
  const item = offering.trim() || "your product";
  const biz = businessType.toLowerCase();

  const visitIdeas: ProgramIdea[] = [
    {
      name: "Punch Card 2.0",
      hook: "The classic — but digital, so they can't lose it.",
      structure: [
        "Buy 9 of any item, get the 10th free",
        "Track via phone number or QR scan",
        "Auto-text them when they're 1 away",
      ],
      reward: `1 free ${item} after 9 visits`,
      pro: "Works in any category. The 'one away' nudge drives ~30% more redemptions.",
    },
    {
      name: "Streak Club",
      hook: "Reward consecutive weeks, not just total visits.",
      structure: [
        "Visit at least once per week to keep your streak",
        "Week 4 streak: 15% off",
        "Week 8 streak: free upgrade or premium item",
      ],
      reward: "Tiered perks at 4, 8, and 12 weeks",
      pro: `Great for ${biz} — turns occasional customers into weekly regulars.`,
    },
    {
      name: "Comeback Bonus",
      hook: "Win back lapsed customers who haven't visited in 30+ days.",
      structure: [
        "Auto-detect customers gone 30+ days",
        "Text them a 'we miss you' offer",
        "20% off their next visit, valid 7 days",
      ],
      reward: "20% off comeback visit",
      pro: "Cheapest customer to reactivate is one who already loves you.",
    },
    {
      name: "Happy-Hour Loyalty",
      hook: "Reward visits during your slow hours.",
      structure: [
        "Visit Mon–Wed before 4pm: double points",
        "10 off-peak visits = a free signature item",
        "Show your phone at checkout to claim",
      ],
      reward: `Free signature ${item} after 10 off-peak visits`,
      pro: "Smooths out your traffic without discounting peak hours.",
    },
    {
      name: "Birthday + Half-Birthday",
      hook: "Two reasons a year to get them in the door.",
      structure: [
        "Free item or treat on their birthday week",
        "Half-birthday: 25% off everything",
        "Captures email/phone at signup",
      ],
      reward: `Free ${item} + half-birthday discount`,
      pro: "Birthday redemptions average 2–3x normal ticket size.",
    },
  ];

  const spendIdeas: ProgramIdea[] = [
    {
      name: "Tiered Status",
      hook: "Bronze → Silver → Gold based on annual spend.",
      structure: [
        "$0–$200: Bronze (5% off)",
        "$200–$500: Silver (10% off + free shipping/delivery)",
        "$500+: Gold (15% off + early access to new items)",
      ],
      reward: "Permanent discounts that grow with spend",
      pro: "Status motivates +25% spend lift in the bracket below the next tier.",
    },
    {
      name: "Spend & Save",
      hook: "Spend more in one visit, save more.",
      structure: [
        "Spend $25, save $3",
        "Spend $50, save $8",
        "Spend $100, save $20",
      ],
      reward: "Stackable visit-level discounts",
      pro: `Pushes ${biz} customers to add the extra item at checkout.`,
    },
    {
      name: "Premium Bundle Unlock",
      hook: `Unlock your premium ${item} once they hit a spend threshold.`,
      structure: [
        "Spend $150 lifetime to unlock premium tier access",
        "Premium-only items, special hours, or VIP events",
        "Status resets every 12 months",
      ],
      reward: "Exclusive product/service access",
      pro: "Scarcity + status drives the highest LTV customers.",
    },
    {
      name: "Cashback Wallet",
      hook: "Every dollar spent earns a percentage back to spend later.",
      structure: [
        "Earn 5% back on every purchase",
        "Cashback lives in their wallet for 90 days",
        "Bonus: 2x cashback on first purchase of the month",
      ],
      reward: "5% cashback wallet credit",
      pro: "Forces a return visit to redeem — boosts repeat rate.",
    },
    {
      name: "Add-On Multiplier",
      hook: "Reward bigger baskets, not just bigger bills.",
      structure: [
        "Buy 2 items: 5% off",
        "Buy 3 items: 10% off",
        "Buy 4+ items: 15% off + free add-on",
      ],
      reward: "Basket-size discount + bonus item",
      pro: "Average ticket goes up without touching your prices.",
    },
  ];

  const referralIdeas: ProgramIdea[] = [
    {
      name: "Give-Get",
      hook: "Friend gets $10 off, you get $10 off.",
      structure: [
        "Customer shares a unique referral link",
        "Friend gets $10 off first purchase",
        "Customer gets $10 credit when friend redeems",
      ],
      reward: "$10 credit each side",
      pro: "Industry standard. Works in every category, especially services.",
    },
    {
      name: "Review for Reward",
      hook: `Honest Google review = a perk on their next ${item}.`,
      structure: [
        "Customer leaves a Google or Yelp review",
        "Auto-verified via Social Perks",
        "Gets 15% off or a free add-on next visit",
      ],
      reward: "15% off or bonus item",
      pro: "FTC-compliant when you reward for honest reviews — not just 5-stars.",
    },
    {
      name: "Tag-to-Win",
      hook: "Customer posts on Instagram tagging you, enters a monthly draw.",
      structure: [
        "Tag your handle in a story or post",
        "Each tag = one entry into the monthly draw",
        "Winner gets a $100 gift card or premium experience",
      ],
      reward: "Monthly $100 prize",
      pro: `Cheapest UGC engine for ${biz} — one prize, dozens of posts.`,
    },
    {
      name: "Bring-a-Friend Bonus",
      hook: "Walk in with a new face, both get rewarded same visit.",
      structure: [
        "Existing customer brings a friend",
        "Both get 20% off their order",
        "Friend gets a free perk on visit #2",
      ],
      reward: "20% off + return-visit perk",
      pro: "Service businesses (salons, gyms) see 40%+ conversion on the friend.",
    },
    {
      name: "Influencer-Lite",
      hook: "Turn your top 5% of customers into micro-ambassadors.",
      structure: [
        "Identify top spenders + most-active reviewers",
        "Invite them to a private 'ambassador' tier",
        "They get free items quarterly in exchange for posts",
      ],
      reward: "Free product/service in exchange for content",
      pro: "Authentic content from real customers outperforms paid ads 3:1.",
    },
  ];

  if (goal === "visits") return visitIdeas;
  if (goal === "spend") return spendIdeas;
  return referralIdeas;
}

export function LoyaltyProgramGenerator() {
  const [businessType, setBusinessType] = useState<string>(BUSINESS_TYPES[0]);
  const [offering, setOffering] = useState<string>("");
  const [goal, setGoal] = useState<Goal>("visits");
  const [generated, setGenerated] = useState<boolean>(false);

  const ideas = useMemo(
    () => generateIdeas(businessType, offering, goal),
    [businessType, offering, goal],
  );

  return (
    <section className="pb-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Form */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                Business type
              </span>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-3 text-base text-brand-white focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                What you sell or offer
              </span>
              <input
                type="text"
                value={offering}
                onChange={(e) => setOffering(e.target.value)}
                placeholder="e.g. cold brew, haircuts, sourdough"
                className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-3 text-base text-brand-white placeholder-brand-muted focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              />
            </label>
          </div>

          <div className="mt-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
              Customer goal
            </span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {GOALS.map((g) => {
                const active = goal === g.value;
                return (
                  <button
                    key={g.value}
                    onClick={() => setGoal(g.value)}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                      active
                        ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                        : "border-brand-border bg-brand-bg/50 text-brand-text hover:border-brand-subtle"
                    }`}
                  >
                    <span className="mr-1.5" aria-hidden="true">
                      {g.emoji}
                    </span>
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setGenerated(true)}
            className="mt-6 w-full rounded-lg bg-brand-cyan px-4 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20"
          >
            Generate 5 program ideas →
          </button>
        </div>

        {/* Ideas */}
        {generated ? (
          <div className="mt-8 space-y-4">
            <h2 className="font-heading text-2xl italic text-brand-white">
              5 ideas for your {businessType.toLowerCase()}
            </h2>
            {ideas.map((idea, i) => (
              <div
                key={idea.name}
                className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6 transition-all hover:border-brand-cyan/30"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-cyan/30 bg-brand-cyan/10 font-mono text-xs text-brand-cyan">
                    {i + 1}
                  </span>
                  <h3 className="font-heading text-xl italic text-brand-white">
                    {idea.name}
                  </h3>
                </div>
                <p className="mt-3 text-sm text-brand-dim">{idea.hook}</p>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                      How it works
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {idea.structure.map((s, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-2 text-sm text-brand-text"
                        >
                          <span
                            className="mt-1.5 h-1 w-1 flex-none rounded-full bg-brand-cyan"
                            aria-hidden="true"
                          />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                      Reward
                    </div>
                    <div className="mt-2 rounded-lg border border-brand-green/30 bg-brand-green/10 p-3 text-sm text-brand-green">
                      {idea.reward}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-brand-border/60 bg-brand-bg/40 p-3 text-xs text-brand-dim">
                  <span className="font-mono uppercase tracking-[0.12em] text-brand-amber">
                    Pro tip
                  </span>{" "}
                  · {idea.pro}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* CTA */}
        <div className="mt-10 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-green/10 via-brand-surface/50 to-brand-cyan/10 p-8 text-center sm:p-10">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Run these programs on autopilot with Social Perks
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-dim sm:text-base">
            Pick an idea, plug it into Social Perks, and the system tracks
            visits, spend, referrals, and rewards automatically.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/ai"
              className="w-full rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20 sm:w-auto"
            >
              Launch a program →
            </Link>
            <Link
              href="/pricing"
              className="w-full rounded-xl border border-brand-border bg-brand-surface/50 px-7 py-3 text-sm font-medium text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-surface sm:w-auto"
            >
              See pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
