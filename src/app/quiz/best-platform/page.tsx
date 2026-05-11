"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

type BusinessType =
  | "Restaurant"
  | "Coffee Shop"
  | "Yoga Studio"
  | "Salon"
  | "Gym"
  | "Retail Boutique"
  | "Service Business"
  | "B2B Service"
  | "E-commerce"
  | "Food Truck"
  | "Bakery"
  | "Med Spa"
  | "Florist"
  | "Tattoo Shop"
  | "Photographer";

type AgeBand = "18-24" | "25-34" | "35-44" | "45-54" | "55+";
type Location = "Local only" | "Regional" | "National";
type Sells = "Physical product" | "Service" | "Food/beverage" | "Experience";
type Budget = "Under $100/mo" | "$100-500" | "$500-2000" | "$2000+";

type Answers = {
  type: BusinessType;
  age: AgeBand;
  location: Location;
  sells: Sells;
  budget: Budget;
};

type Platform =
  | "Instagram"
  | "TikTok"
  | "Google Business Profile"
  | "Facebook"
  | "Pinterest"
  | "LinkedIn"
  | "YouTube"
  | "X/Twitter"
  | "Reddit";

type Recommendation = {
  platform: Platform;
  why: string;
  firstAction: string;
  score: number;
};

const BUSINESS_TYPES: BusinessType[] = [
  "Restaurant",
  "Coffee Shop",
  "Yoga Studio",
  "Salon",
  "Gym",
  "Retail Boutique",
  "Service Business",
  "B2B Service",
  "E-commerce",
  "Food Truck",
  "Bakery",
  "Med Spa",
  "Florist",
  "Tattoo Shop",
  "Photographer",
];

const VISUAL_TYPES = new Set<BusinessType>([
  "Restaurant",
  "Coffee Shop",
  "Yoga Studio",
  "Salon",
  "Retail Boutique",
  "Food Truck",
  "Bakery",
  "Med Spa",
  "Florist",
  "Tattoo Shop",
  "Photographer",
]);

const LOCAL_TYPES = new Set<BusinessType>([
  "Restaurant",
  "Coffee Shop",
  "Yoga Studio",
  "Salon",
  "Gym",
  "Food Truck",
  "Bakery",
  "Med Spa",
  "Florist",
  "Tattoo Shop",
  "Service Business",
]);

const PLATFORM_FIRST_ACTION: Record<Platform, string> = {
  Instagram: "Post 3 high-quality photos per week and turn on auto-DM perks via Social Perks.",
  TikTok: "Film 1 short behind-the-scenes clip per day — consistency beats production.",
  "Google Business Profile": "Claim your listing, add 10 photos, and ask 5 happy customers for reviews this week.",
  Facebook: "Set up a Facebook page + Events for any in-person promotions and reward shares.",
  Pinterest: "Pin 10 vertical product/lifestyle images linking back to your booking or product page.",
  LinkedIn: "Publish 1 thought-leadership post per week and reward customer reposts with a perk.",
  YouTube: "Upload one 5-minute educational video per week and embed it on your site.",
  "X/Twitter": "Reply to 10 industry conversations per day and reward customers who quote-tweet you.",
  Reddit: "Find 3 niche subreddits and become a helpful regular before promoting anything.",
};

export function recommendPlatforms(answers: Answers): Recommendation[] {
  const scores: Record<Platform, number> = {
    Instagram: 0,
    TikTok: 0,
    "Google Business Profile": 0,
    Facebook: 0,
    Pinterest: 0,
    LinkedIn: 0,
    YouTube: 0,
    "X/Twitter": 0,
    Reddit: 0,
  };
  const reasons: Partial<Record<Platform, string[]>> = {};

  function bump(p: Platform, n: number, reason: string) {
    scores[p] += n;
    if (!reasons[p]) reasons[p] = [];
    reasons[p]!.push(reason);
  }

  const isVisual = VISUAL_TYPES.has(answers.type);
  const isLocal = answers.location === "Local only" || LOCAL_TYPES.has(answers.type);
  const isB2B = answers.type === "B2B Service";
  const young = answers.age === "18-24" || answers.age === "25-34";
  const older = answers.age === "45-54" || answers.age === "55+";

  if (isVisual && young) {
    bump("Instagram", 4, "your audience is young and visual");
    bump("TikTok", 4, "short-form video reaches 18-34 audiences fastest");
    bump("Pinterest", 2, "visual product discovery for younger shoppers");
  }
  if (answers.sells === "Physical product") {
    bump("Instagram", 2, "shoppable posts move physical product");
    bump("Pinterest", 2, "Pinterest drives high purchase intent for products");
  }
  if (answers.sells === "Food/beverage") {
    bump("Instagram", 2, "food photography performs exceptionally well here");
    bump("TikTok", 1, "food content goes viral on TikTok");
  }
  if (answers.sells === "Service" && isLocal) {
    bump("Google Business Profile", 5, "service + local means Google reviews drive your bookings");
    bump("Facebook", 3, "local communities still live on Facebook");
    bump("Instagram", 2, "Instagram showcases your work and credibility");
  }
  if (isB2B) {
    bump("LinkedIn", 5, "B2B decision makers are on LinkedIn");
    bump("X/Twitter", 3, "B2B thought leadership thrives on X");
    bump("YouTube", 2, "long-form video builds B2B authority");
  }
  if (older) {
    bump("Facebook", 4, "35+ audiences are most active on Facebook");
    bump("Google Business Profile", 3, "older customers search Google first");
    bump("Instagram", 1, "Instagram is now strong across 35-54 too");
  }
  if (answers.sells === "Experience") {
    bump("Instagram", 2, "experiences sell through aspirational visuals");
    bump("TikTok", 1, "experiences are highly shareable on TikTok");
  }
  if (answers.budget === "$2000+") {
    // All platforms become viable — give a small global bump to anything not yet scored.
    (Object.keys(scores) as Platform[]).forEach((p) => {
      if (scores[p] === 0) {
        bump(p, 1, "your budget supports testing multiple platforms");
      }
    });
  }
  if (answers.budget === "Under $100/mo") {
    bump("Google Business Profile", 3, "Google reviews are free and high-leverage");
    bump("Instagram", 2, "organic Instagram is free and effective");
  }

  // Niche / hobby leaning categories.
  if (answers.type === "Tattoo Shop" || answers.type === "Photographer") {
    bump("Reddit", 2, "niche communities live on Reddit");
    bump("Pinterest", 2, "portfolio-driven categories perform well on Pinterest");
  }

  // Always ensure Instagram and Google Business are at least considered for local businesses.
  if (isLocal) {
    bump("Google Business Profile", 2, "local discovery still starts on Google Maps");
    bump("Instagram", 1, "locals expect you to have an Instagram");
  }

  const ranked = (Object.keys(scores) as Platform[])
    .filter((p) => scores[p] > 0)
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, 3)
    .map((p) => ({
      platform: p,
      why: reasons[p]?.[0] || "matches your business profile",
      firstAction: PLATFORM_FIRST_ACTION[p],
      score: scores[p],
    }));

  return ranked;
}

export default function BestPlatformPage() {
  const [answers, setAnswers] = useState<Answers>({
    type: "Restaurant",
    age: "25-34",
    location: "Local only",
    sells: "Food/beverage",
    budget: "$100-500",
  });
  const [results, setResults] = useState<Recommendation[] | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResults(recommendPlatforms(answers));
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-heading italic text-5xl mb-3">Best Platform Recommender</h1>
        <p className="text-lg text-gray-300 mb-10">
          Stop guessing where to post. Answer 5 questions, get your top 3 platforms.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-2">Business type</label>
            <select
              id="type"
              value={answers.type}
              onChange={(e) => setAnswers({ ...answers, type: e.target.value as BusinessType })}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <Radios
            label="Target customer age"
            name="age"
            value={answers.age}
            options={["18-24", "25-34", "35-44", "45-54", "55+"]}
            onChange={(v) => setAnswers({ ...answers, age: v as AgeBand })}
          />

          <Radios
            label="Customer location"
            name="location"
            value={answers.location}
            options={["Local only", "Regional", "National"]}
            onChange={(v) => setAnswers({ ...answers, location: v as Location })}
          />

          <Radios
            label="What you sell"
            name="sells"
            value={answers.sells}
            options={["Physical product", "Service", "Food/beverage", "Experience"]}
            onChange={(v) => setAnswers({ ...answers, sells: v as Sells })}
          />

          <Radios
            label="Marketing budget"
            name="budget"
            value={answers.budget}
            options={["Under $100/mo", "$100-500", "$500-2000", "$2000+"]}
            onChange={(v) => setAnswers({ ...answers, budget: v as Budget })}
          />

          <button
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-medium py-3 rounded-lg transition"
          >
            Get my top 3 platforms
          </button>
        </form>

        {results && (
          <section className="mt-10 space-y-4">
            <h2 className="font-heading italic text-3xl">Your top platforms</h2>
            {results.length === 0 && (
              <p className="text-gray-400">No strong match found — try adjusting your answers.</p>
            )}
            {results.map((r, i) => (
              <div key={r.platform} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-mono text-cyan-400 text-2xl">#{i + 1}</span>
                  <h3 className="text-2xl font-medium">{r.platform}</h3>
                </div>
                <p className="text-gray-300 mb-3">Why: {r.why}.</p>
                <p className="text-sm text-green-300">
                  <span className="uppercase tracking-wide text-xs text-gray-400 mr-2">First action</span>
                  {r.firstAction}
                </p>
              </div>
            ))}

            <Link
              href="/ai"
              className="inline-block mt-4 bg-cyan-500 hover:bg-cyan-400 text-white px-6 py-3 rounded-lg font-medium"
            >
              Run campaigns on all your top platforms automatically →
            </Link>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Radios({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="block text-sm font-medium mb-2">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label
            key={opt}
            className={`cursor-pointer px-3 py-2 rounded-lg border text-sm transition ${
              value === opt
                ? "bg-cyan-500/20 border-cyan-500 text-cyan-100"
                : "bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="sr-only"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}
