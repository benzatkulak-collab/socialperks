import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  LOCAL_NICHES,
  LOCAL_CITIES,
  LOCAL_OUTCOMES,
  getNiche,
  getCity,
  getOutcome,
} from "@/lib/local-niche/data";

// ISR: prebuild only the top combinations to keep build memory manageable.
// Long-tail slugs render on-demand on first request, then cache for 24h.
export const dynamicParams = true;
export const revalidate = 86400;

interface PageProps {
  params: Promise<{ niche: string; city: string; outcome: string }>;
}

export async function generateStaticParams() {
  // Top 8 niches × top 3 cities × top 5 outcomes = 120 (was 600)
  const topNiches = LOCAL_NICHES.slice(0, 8);
  const topCities = LOCAL_CITIES.slice(0, 3);
  const topOutcomes = LOCAL_OUTCOMES.slice(0, 5);
  const params: { niche: string; city: string; outcome: string }[] = [];
  for (const n of topNiches) {
    for (const c of topCities) {
      for (const o of topOutcomes) {
        params.push({ niche: n.slug, city: c.slug, outcome: o.slug });
      }
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { niche, city, outcome } = await params;
  const n = getNiche(niche);
  const c = getCity(city);
  const o = getOutcome(outcome);
  if (!n || !c || !o) return {};
  const title = `${o.name} for ${n.plural[0].toUpperCase() + n.plural.slice(1)} in ${c.name}, ${c.stateCode}`;
  const description = `How ${c.name} ${n.plural} can win with ${o.pretty.toLowerCase()} — 5 city-tailored tactics, common mistakes, and a sample campaign you can run in 14 days.`;
  return {
    title,
    description,
    alternates: {
      canonical: `/local-niche/${n.slug}/${c.slug}/${o.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { niche, city, outcome } = await params;
  const n = getNiche(niche);
  const c = getCity(city);
  const o = getOutcome(outcome);
  if (!n || !c || !o) notFound();

  const nichePlural = n.plural;
  const Plural = nichePlural[0].toUpperCase() + nichePlural.slice(1);
  const h1 = `${o.name} for ${Plural} in ${c.name}, ${c.stateCode}`;

  const otherOutcomes = LOCAL_OUTCOMES.filter((x) => x.slug !== o.slug);
  const otherCities = LOCAL_CITIES.filter((x) => x.slug !== c.slug).slice(0, 5);

  // City-specific reasons
  const reasons = [
    `${c.name}'s ${c.vibe} character means ${nichePlural} that ignore ${o.short} get out-competed by neighbors who post 3+ times per week.`,
    `Local discovery in ${c.name} runs through ${o.channel} — when your ${n.name} doesn't show up there, it effectively doesn't exist for new customers.`,
    `${n.audience} in ${c.name} expect ${o.benefit}; without a system, you're leaving repeat visits and referrals on the table every month.`,
  ];

  // 5 tactics tailored to city + niche + outcome
  const tactics = buildTactics(n.slug, c, o);

  // 3 mistakes
  const mistakes = [
    `Treating ${o.pretty} as a "when we have time" task instead of a weekly system — ${c.name} ${nichePlural} who win at this run it like a recurring shift.`,
    `Posting generic content that could be for any ${n.name} anywhere — ${c.name} customers want to see your neighborhood, your regulars, and your local references.`,
    `Tracking nothing. If you can't tell whether last month's ${o.short} effort drove a single new ${nichePlural === "dental practices" ? "patient" : "customer"}, you can't improve it.`,
  ];

  // Sample campaign
  const campaign = buildSampleCampaign(n, c, o);

  // Service JSON-LD
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${o.name} for ${n.plural} in ${c.name}`,
    serviceType: o.name,
    provider: {
      "@type": "Organization",
      name: "Social Perks",
      url: "https://socialperks.com",
    },
    areaServed: {
      "@type": "City",
      name: c.name,
      containedInPlace: {
        "@type": "State",
        name: c.state,
      },
    },
    audience: {
      "@type": "Audience",
      audienceType: n.plural,
    },
    description: `Marketing system for ${c.name} ${n.plural} to drive ${o.benefit}.`,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://socialperks.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Local marketing",
        item: "https://socialperks.com/local-niche",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: Plural,
        item: `https://socialperks.com/local-niche/${n.slug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: `${Plural} in ${c.name}`,
        item: `https://socialperks.com/local-niche/${n.slug}/${c.slug}`,
      },
      {
        "@type": "ListItem",
        position: 5,
        name: o.name,
        item: `https://socialperks.com/local-niche/${n.slug}/${c.slug}/${o.slug}`,
      },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <nav className="mb-8 text-xs text-white/50">
        <Link href="/local-niche" className="hover:text-white/80">
          Local marketing
        </Link>
        {" / "}
        <Link
          href={`/local-niche/${n.slug}`}
          className="hover:text-white/80"
        >
          {Plural}
        </Link>
        {" / "}
        <Link
          href={`/local-niche/${n.slug}/${c.slug}`}
          className="hover:text-white/80"
        >
          {c.name}
        </Link>
        {" / "}
        <span className="text-white/80">{o.name}</span>
      </nav>

      <header className="mb-12">
        <h1 className="font-serif text-5xl italic leading-tight mb-6">
          {h1}
        </h1>
        <p className="text-xl text-white/70 mb-8 leading-relaxed">
          {c.name} {nichePlural} can transform their {o.pretty} with the right
          system. Most don't have one — they post when they remember, ask for
          reviews when they think of it, and wonder why growth is flat. This
          page is the system.
        </p>
        <Link
          href="/?signup=1"
          className="inline-block bg-cyan-400 text-black font-medium px-6 py-3 rounded-md hover:bg-cyan-300 transition"
        >
          Start your 14-day free trial
        </Link>
      </header>

      <section className="mb-12">
        <h2 className="font-serif text-3xl italic mb-4">
          Why {o.pretty} matters for {nichePlural} in {c.name}
        </h2>
        <p className="text-white/70 mb-4 italic">{c.flavor}</p>
        <ul className="space-y-3 text-white/80">
          {reasons.map((r, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-cyan-400 font-mono text-sm pt-1">
                0{i + 1}
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="font-serif text-3xl italic mb-4">
          5 tactics tailored for {c.name} {nichePlural}
        </h2>
        <ol className="space-y-5 text-white/80">
          {tactics.map((t, i) => (
            <li key={i} className="border-l-2 border-cyan-400/50 pl-4">
              <div className="font-medium text-white mb-1">
                {i + 1}. {t.title}
              </div>
              <p className="text-white/70">{t.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-12">
        <h2 className="font-serif text-3xl italic mb-4">
          Common mistakes {c.name} {nichePlural} make
        </h2>
        <ul className="space-y-3 text-white/80">
          {mistakes.map((m, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-amber-400">✗</span>
              <span>{m}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12 border border-white/10 rounded-lg p-6 bg-white/[0.02]">
        <h2 className="font-serif text-3xl italic mb-4">
          Sample {o.pretty} campaign for a {c.name} {n.name}
        </h2>
        <div className="space-y-4 text-white/80">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
              Goal
            </div>
            <div>{campaign.goal}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
              The offer
            </div>
            <div>{campaign.offer}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
              The ask
            </div>
            <div>{campaign.ask}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
              Expected result (30 days)
            </div>
            <div>{campaign.result}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
              Why it works in {c.name}
            </div>
            <div>{campaign.why}</div>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-serif text-3xl italic mb-4">
          How Social Perks helps
        </h2>
        <p className="text-white/70 mb-3">
          Social Perks turns your existing customers into your marketing team.
          You set a perk ({n.avgTicket.includes("$") ? "for example, " : ""}
          something tied to your {n.name}'s average ticket of {n.avgTicket}),
          and customers earn it by posting, reviewing, or referring — exactly
          the actions that move the needle on {o.pretty} in a market like{" "}
          {c.name}.
        </p>
        <p className="text-white/70 mb-6">
          Every action is tracked, every perk is FTC-compliant, and the whole
          system runs in the background while you focus on running your{" "}
          {n.name}. No agency retainer. No content team to manage. Just a
          measurable lift in the {o.short} metrics that actually drive revenue.
        </p>
        <Link
          href="/?signup=1"
          className="inline-block bg-cyan-400 text-black font-medium px-6 py-3 rounded-md hover:bg-cyan-300 transition"
        >
          Start your 14-day free trial
        </Link>
      </section>

      <section className="grid md:grid-cols-2 gap-6 border-t border-white/10 pt-10">
        <div>
          <h3 className="text-sm uppercase tracking-wider text-white/50 mb-3">
            Other outcomes for {c.name} {nichePlural}
          </h3>
          <ul className="space-y-2">
            {otherOutcomes.map((x) => (
              <li key={x.slug}>
                <Link
                  href={`/local-niche/${n.slug}/${c.slug}/${x.slug}`}
                  className="text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  {x.name} for {nichePlural} in {c.name} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm uppercase tracking-wider text-white/50 mb-3">
            {o.name} for {nichePlural} in other cities
          </h3>
          <ul className="space-y-2">
            {otherCities.map((x) => (
              <li key={x.slug}>
                <Link
                  href={`/local-niche/${n.slug}/${x.slug}/${o.slug}`}
                  className="text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  {o.name} for {nichePlural} in {x.name} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

// ---- content builders ----

interface Tactic {
  title: string;
  body: string;
}

function buildTactics(
  nicheSlug: string,
  c: ReturnType<typeof getCity>,
  o: ReturnType<typeof getOutcome>,
): Tactic[] {
  if (!c || !o) return [];
  const city = c.name;

  // Outcome-specific tactics with city + niche flavor
  const base: Record<string, Tactic[]> = {
    "instagram-marketing": [
      {
        title: `Post 3 Reels per week using a "${city} regulars" hook`,
        body: `Film 15-second clips of named regulars saying one specific thing about your ${nicheName(nicheSlug)}. Tag their personal accounts and the neighborhood (e.g. #${city.replace(/\s+/g, "")}Eats, #${city.replace(/\s+/g, "")}Local). Local-tagged Reels get 4-7x more reach than untagged ones.`,
      },
      {
        title: `Geo-tag every post to the most specific ${city} neighborhood you can`,
        body: `"${city}" is too broad. Use the exact neighborhood, cross street, or landmark. Instagram's local discovery skews heavily toward hyper-specific tags, especially in a fragmented market like ${city}.`,
      },
      {
        title: `Build a Stories highlight called "${city} Loves Us"`,
        body: `Every time a customer tags you in a Story, repost into a permanent highlight. New profile visitors see social proof from people who look like them, in their own city, instantly.`,
      },
      {
        title: `Collaborate with 3 local micro-creators per quarter`,
        body: `Skip the 100K-follower influencers. Find 5-15K follower creators who already live in ${city} and post about ${nicheCategory(nicheSlug)}. A perk-based collab (free service in exchange for a Reel) costs $0 cash and outperforms paid ads in local conversion.`,
      },
      {
        title: `Run a "tag a friend" perk monthly`,
        body: `Post a single Reel each month with a clear ask: "Tag a ${city} friend who needs this." Reward both the tagger and the tagged friend with a small perk. Compounds organically, costs nothing if no one tags.`,
      },
    ],
    "google-reviews": [
      {
        title: `Build a review-request flow into your checkout or wrap-up`,
        body: `${city} customers won't leave a review unless asked within 24 hours of their visit. Text or email a one-tap Google review link after every transaction. Velocity (reviews per week) ranks higher than total count in the local map pack.`,
      },
      {
        title: `Reply to every review within 48 hours — even the 5-stars`,
        body: `Google's algorithm rewards engagement, and ${city} customers read responses before they read the reviews. A short, personal reply ("Thanks Sarah — see you Thursday!") signals an active, owner-operated ${nicheName(nicheSlug)}.`,
      },
      {
        title: `Stack ${city}-specific keywords into your replies`,
        body: `When you reply to reviews, naturally include neighborhood names, nearby landmarks, and what customers came in for. This is one of the strongest signals to Google for local pack ranking and it costs nothing.`,
      },
      {
        title: `Offer a small perk for any honest review (FTC-disclosed)`,
        body: `You cannot pay for positive reviews, but you can offer a small perk for any honest review. Frame it as "we'd love your feedback" and disclose the incentive in compliance with FTC guidelines. Velocity 2-3x within 60 days is typical.`,
      },
      {
        title: `Target 4+ photo-uploads per week from customers`,
        body: `Google heavily weights customer photos. Make it easy: a small in-store sign, a QR code, or a perk for "show us your photo." More photos = higher map pack ranking in ${city}'s competitive local search.`,
      },
    ],
    "tiktok-marketing": [
      {
        title: `Post 5 videos a week using the "${city} POV" format`,
        body: `TikTok's algorithm favors quantity over polish, especially for local businesses. "POV: you walked into the best ${nicheCategory(nicheSlug)} in ${city}" formatted videos with on-screen text and trending audio drive 10-20x the reach of static posts.`,
      },
      {
        title: `Use the "${city}" location tag on every single video`,
        body: `TikTok's local discovery is improving fast and the location tag is now a primary ranking signal. Combine with hashtags like #${city.replace(/\s+/g, "")}TikTok and #${city.replace(/\s+/g, "")}${nicheTag(nicheSlug)} for compounding reach.`,
      },
      {
        title: `Partner with one ${city} food/lifestyle creator per month`,
        body: `Local TikTok creators in the 10-50K range will trade content for a perk or experience. One viral video from a trusted local creator can drive more foot traffic than a month of organic posting.`,
      },
      {
        title: `Film behind-the-scenes content, not polished ads`,
        body: `TikTok rewards rawness. Show the morning prep, the bad days, the staff banter. ${city} viewers scroll past anything that looks like a commercial in under a second.`,
      },
      {
        title: `Reply to every comment in the first hour`,
        body: `Comment velocity in the first hour is one of TikTok's strongest ranking signals. Have a system: whoever's on shift watches comments for 60 minutes after a post drops and replies to all of them.`,
      },
    ],
    "referral-program": [
      {
        title: `Make the referral perk worth 1.5x the customer's average ticket`,
        body: `Anything less doesn't move the needle. For a ${city} ${nicheName(nicheSlug)} with a typical visit, a perk worth roughly 1.5x average ticket is the threshold where customers actively tell friends instead of waiting to be asked.`,
      },
      {
        title: `Track referrals to a specific person, not a code`,
        body: `${city} customers respond 3-4x better to "tell Maria I sent you" than to a discount code. The social accountability of a named referral converts dramatically better than transactional codes.`,
      },
      {
        title: `Reward both sides of every referral`,
        body: `One-sided referral programs underperform two-sided ones by 60-80%. The referrer should get something the moment their friend transacts — not a future credit, not a punch card, an immediate perk.`,
      },
      {
        title: `Ask for referrals at the peak moment, not at checkout`,
        body: `The best time to ask a ${city} customer for a referral is right after they've expressed delight — not when they're pulling out their wallet. Train staff to listen for the moment and ask in plain language.`,
      },
      {
        title: `Send a monthly "thank you" to your top 10 referrers`,
        body: `Your top referrers are doing free marketing worth thousands. Acknowledge them publicly (with permission) on social, send a small handwritten thank-you, or surprise them with a perk. This is how you turn customers into a sales team.`,
      },
    ],
    "customer-loyalty": [
      {
        title: `Build a perk ladder, not a flat punch card`,
        body: `${city} ${nicheCategory(nicheSlug)} customers respond to escalating rewards. Visit 3: small perk. Visit 6: better perk. Visit 12: VIP status with a real benefit. The ladder structure raises average lifetime value 30-50% over flat programs.`,
      },
      {
        title: `Surprise your top 20% of customers with unannounced perks`,
        body: `Unexpected perks generate 5-10x the word-of-mouth of advertised promotions. Identify your top 20% by visit frequency and surprise them quarterly. They'll talk about it to every ${city} friend they have.`,
      },
      {
        title: `Re-engage lapsed customers at the 30-day mark, not the 90-day mark`,
        body: `Most ${nicheCategory(nicheSlug)} wait until customers have churned to reach out. Send a soft "we miss you" perk at 30 days of inactivity — recovery rates are 4-5x higher than at 90 days when habits have fully reset.`,
      },
      {
        title: `Name your loyalty program something locally meaningful`,
        body: `"Rewards Program" is forgettable. "The ${c.name.split(/[\s-]/)[0]} Regulars" or a neighborhood-specific name gives customers something to identify with. Pride of membership drives retention.`,
      },
      {
        title: `Make your top tier feel exclusive, not just discounted`,
        body: `Loyalty isn't built on discounts — it's built on belonging. Your top tier should get access, early notice on new offerings, or a quarterly invite-only moment. ${c.name} customers spend more at places where they feel known.`,
      },
    ],
  };

  return base[o.slug] || [];
}

function nicheName(slug: string) {
  const n = LOCAL_NICHES.find((x) => x.slug === slug);
  return n?.name || "business";
}
function nicheCategory(slug: string) {
  const map: Record<string, string> = {
    "yoga-studios": "wellness",
    "coffee-shops": "coffee",
    restaurants: "food",
    salons: "beauty",
    gyms: "fitness",
    bakeries: "baked goods",
    boutiques: "retail fashion",
    "dental-practices": "dental care",
  };
  return map[slug] || "local";
}
function nicheTag(slug: string) {
  const map: Record<string, string> = {
    "yoga-studios": "Yoga",
    "coffee-shops": "Coffee",
    restaurants: "Eats",
    salons: "Hair",
    gyms: "Fitness",
    bakeries: "Bakery",
    boutiques: "Style",
    "dental-practices": "Dentist",
  };
  return map[slug] || "Local";
}

interface SampleCampaign {
  goal: string;
  offer: string;
  ask: string;
  result: string;
  why: string;
}

function buildSampleCampaign(
  n: NonNullable<ReturnType<typeof getNiche>>,
  c: NonNullable<ReturnType<typeof getCity>>,
  o: NonNullable<ReturnType<typeof getOutcome>>,
): SampleCampaign {
  const campaigns: Record<string, SampleCampaign> = {
    "instagram-marketing": {
      goal: `Add 500 net-new local Instagram followers and drive 40 first-time visits from social in 30 days.`,
      offer: `A perk worth roughly ${n.avgTicket.split(",")[0]} for every customer who posts a Reel or Story tagging the ${n.name} with a neighborhood hashtag.`,
      ask: `Post once. Tag the ${n.name}'s handle. Tag the neighborhood. Stay up for 24 hours minimum.`,
      result: `25-40 customer-generated posts, 500-1,200 new local followers, and an average of 30-50 new visits attributable to social tracking links.`,
      why: `${c.name}'s ${c.vibe} culture rewards UGC over polished brand content. Customer-generated Reels signal authenticity that paid ads can't match in this market.`,
    },
    "google-reviews": {
      goal: `Add 30 new 5-star Google reviews in 30 days and move into the top 3 local map pack for "${n.name} near me" in ${c.name}.`,
      offer: `A small perk (worth ~10-15% of ${n.avgTicket.split(",")[0]}) for any honest Google review, FTC-disclosed at the point of ask.`,
      ask: `One tap. The ${n.name}'s pre-filled Google review link goes out via SMS within 6 hours of every visit.`,
      result: `25-35 new reviews, 4.7+ average rating, and 40-60% increase in "directions" and "calls" actions on the Google Business Profile.`,
      why: `${c.name} customers research locally before visiting, and Google Business Profile traffic converts at 2-3x the rate of Instagram traffic for ${nicheCategory(n.slug)} searches.`,
    },
    "tiktok-marketing": {
      goal: `Land one TikTok with 50K+ views and drive 20+ first-time visits attributable to the platform in 30 days.`,
      offer: `Free service or product (worth ${n.avgTicket.split(",")[0]}) for one local creator + a recurring posting perk for staff who film 5+ videos per week.`,
      ask: `Staff films 5 short TikToks per week using the ${c.name} location tag. One paid creator collab per month.`,
      result: `20-25 videos posted, one likely viral hit (50K-500K views), and a measurable lift in Gen Z foot traffic.`,
      why: `${c.name}'s TikTok creator scene is dense enough that local discovery actually works — but only with consistent posting volume. One post a week won't break through.`,
    },
    "referral-program": {
      goal: `Generate 40 referred new customers in 30 days at a cost-per-acquisition under ${refCpa(n)}.`,
      offer: `Both the referrer and the new customer get a perk worth roughly ${n.avgTicket.split(",")[0]} on the new customer's first visit.`,
      ask: `Staff asks every happy customer: "Know anyone else in ${c.name} who'd love this? Tell them to mention your name."`,
      result: `30-50 referred visits, $0 in paid ad spend, and a measurable lift in repeat visit rate from the referrers themselves.`,
      why: `${c.name} is a ${c.vibe} market where personal referrals carry unusual weight. A named, two-sided referral system outperforms ads at a fraction of the cost.`,
    },
    "customer-loyalty": {
      goal: `Lift repeat visit rate by 25% and recover 30% of lapsed customers in 90 days.`,
      offer: `A tiered perk program: small perk at 3 visits, bigger perk at 6, VIP status at 12 with a meaningful benefit (early access, exclusive product, named recognition).`,
      ask: `Customers opt in once via SMS or in-person. Every visit auto-tracks. Re-engagement perk fires automatically at 30 days of inactivity.`,
      result: `Repeat visit rate up 20-30%, 15-25% of lapsed customers reactivate, and lifetime value per customer up 30-40% within one year.`,
      why: `${c.name} customers are loyalty-prone when they feel recognized — but they'll churn quickly if a competitor down the block makes a better effort. The ladder + surprise model is what creates real lock-in.`,
    },
  };
  return campaigns[o.slug];
}

function refCpa(n: NonNullable<ReturnType<typeof getNiche>>) {
  const map: Record<string, string> = {
    "yoga-studios": "$15",
    "coffee-shops": "$3",
    restaurants: "$12",
    salons: "$20",
    gyms: "$22",
    bakeries: "$5",
    boutiques: "$18",
    "dental-practices": "$45",
  };
  return map[n.slug] || "$15";
}
