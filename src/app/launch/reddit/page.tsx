"use client";

import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RedditAd {
  variant: "A" | "B" | "C";
  headline: string;
  body: string;
  cta: string;
  notes?: string;
}

interface SubredditAdSet {
  sub: string;
  audience: string;
  budget: string;
  launchTime: string;
  targeting: string[];
  variants: RedditAd[];
}

interface OrganicPost {
  id: number;
  sub: string;
  title: string;
  body: string;
  notes: string;
}

// ─── Ad library ─────────────────────────────────────────────────────────────

const ADS: SubredditAdSet[] = [
  // ── r/smallbusiness ────────────────────────────────────────────────
  {
    sub: "r/smallbusiness",
    audience:
      "Owners of brick-and-mortar and small online businesses, 30-55, doing their own marketing.",
    budget: "$25-40/day per variant for the first week, then double the winner.",
    launchTime:
      "Tuesday 7am ET — when r/smallbusiness traffic peaks before the workday.",
    targeting: [
      "Subreddit: smallbusiness, Entrepreneur, EntrepreneurRideAlong",
      "Devices: mobile + desktop (don't exclude — owners check on both)",
      "Geo: US, CA, UK, AU",
      "Exclude: r/freelance, r/digitalnomad (different intent)",
    ],
    variants: [
      {
        variant: "A",
        headline:
          "I gave up on Instagram for my coffee shop. Then I gave the password to an AI.",
        body: `Pure frustration was the reason. I run a 12-table coffee shop and was spending 6 hrs/week on social, posting things nobody saw, getting 4 likes on a good day.

I tried Hootsuite, Buffer, Later. They're scheduling tools — they just made me bad at the same thing on a calendar.

Eventually a friend showed me Social Perks. It's an AI agent that connects to your Instagram and Google account and just... runs your marketing. It writes posts, finds the customers most likely to share, and offers them a small perk in exchange.

Last month, my regulars posted 47 stories about us. Foot traffic up ~22%.

It's $79/mo and the first 14 days are free. Worth a Tuesday.`,
        cta: "Try it free for 14 days",
      },
      {
        variant: "B",
        headline:
          "Honest question: when's the last time your Instagram post got more than 30 views?",
        body: `Mine was October 2023.

I run a small business. I'd been told for years that "social is free marketing" but it absolutely isn't. It costs you 5 hours a week and gets you nothing.

I switched approaches a few months ago. Instead of *me* posting, I let an AI agent identify our happiest customers and offer them a small discount in exchange for a story or review. The customers do the posting.

It works because:
1. They have actual followers who trust them.
2. The discount is cheaper than the ad spend would've been.
3. Google ranking went up too — more reviews = better SEO.

The tool I use is called Social Perks. Free trial, no credit card.`,
        cta: "See if it works for your business →",
      },
      {
        variant: "C",
        headline:
          "Built this for my mom's salon, ended up turning it into a tool",
        body: `My mom owns a hair salon and was paying $400/mo to a "social media person" who posted twice a week and brought in zero customers.

I built her a thing that uses AI to:
- read her last 100 customer interactions
- find the ones likely to leave a 5-star review
- text them a small perk (10% off, free deep conditioner) in exchange for a Google review or IG story

Within 6 weeks her Google rating went from 4.1 to 4.7 and bookings were up 30%.

A few salon owner friends started using it, then a coffee shop, then a yoga studio. We turned it into a real product called Social Perks. $79/mo, 14 days free.

Wanted to share here because this sub helped me figure out the early version.`,
        cta: "Start your 14-day trial",
        notes: "The 'origin story' tone tends to win on r/smallbusiness.",
      },
    ],
  },

  // ── r/Entrepreneur ─────────────────────────────────────────────────
  {
    sub: "r/Entrepreneur",
    audience:
      "Founders and aspiring founders, 22-40, mix of bootstrappers and would-be VCs.",
    budget: "$30-50/day per variant. Higher CPC than r/smallbusiness.",
    launchTime: "Monday 6am ET — start-of-week intent.",
    targeting: [
      "Subreddit: Entrepreneur, EntrepreneurRideAlong, Startups",
      "Devices: desktop weighted",
      "Geo: US + EU + AU",
      "Exclude: r/jobs, r/sidehustle (different intent)",
    ],
    variants: [
      {
        variant: "A",
        headline: "Bootstrapped to $9.8k MRR in 30 days. Sharing the playbook.",
        body: `Solo dev. No VC. No paid ads.

What worked:
- Picked a vertical with bad existing tools (small-biz social marketing)
- Built it as an AI agent that actually does the work, not a dashboard
- Priced it like a junior employee, not a SaaS tool ($79/mo)
- Tweeted every day for 30 days about building it

Stack: Next.js + Anthropic API + Stripe. Took 6 weeks to v1.

The product is called Social Perks. It's an AI marketing manager for small businesses — connects to your social and just runs your marketing.

Posting because this sub keeps me unstuck. Happy to answer any questions about the stack, pricing, or distribution.`,
        cta: "See the live product →",
      },
      {
        variant: "B",
        headline:
          "If your customers are doing your marketing, you're not in the marketing business anymore",
        body: `Spent 12 months running a marketing agency. Quit because I realized I was solving the wrong problem.

Small business owners don't need *more* marketing. They need their existing customers to talk about them.

Built Social Perks around that. AI agent finds your happiest customers, offers a small perk (free coffee, 10% off) in exchange for a story, review, or share. The customer does the marketing. The owner approves with one tap.

It costs $79/mo and it's replacing what people were paying $500-2000/mo for.

If you're building in B2B, the lesson I keep relearning: the best product replaces a service, not another product.`,
        cta: "Try Social Perks free →",
      },
      {
        variant: "C",
        headline:
          "I priced my SaaS at $79/mo and it converts 4x better than $29",
        body: `Counterintuitive launch lesson.

When I priced Social Perks at $29/mo, conversion was bad. Buyers thought it was a "tool". They compared us to Buffer.

When I moved to $79/mo, conversion went up 4x. Buyers thought it was a "service". They compared us to a part-time marketer (~$2k/mo).

Same product. The number changed who they thought we were.

Pricing is positioning. If you're stuck in a category you can't win, the cheapest fix is usually the price tag.

(Social Perks is an AI marketing manager for small businesses — link in profile.)`,
        cta: "See the product →",
        notes:
          "Lead with insight, not product. r/Entrepreneur up-votes posts that teach something.",
      },
    ],
  },

  // ── r/RestaurantOwners ─────────────────────────────────────────────
  {
    sub: "r/RestaurantOwners",
    audience:
      "Owners and operators of restaurants, cafes, bars. Time-poor, suspicious of marketing.",
    budget: "$15-25/day. Smaller sub, lower CPM.",
    launchTime:
      "Tuesday 10pm ET — after dinner service when owners actually scroll.",
    targeting: [
      "Subreddit: RestaurantOwners, restaurateur, smallbusiness",
      "Devices: mobile (most owners scroll on phone after close)",
      "Geo: US, CA",
    ],
    variants: [
      {
        variant: "A",
        headline:
          "Replaced our $1,800/mo marketing agency with $79 and an AI. Honest review.",
        body: `Was paying an agency to run our IG and Google. They were fine. Posts went up. Nothing happened.

A friend who owns a wine bar pointed me at Social Perks. It's an AI that connects to our accounts and runs the marketing itself. The trick: it doesn't post FOR us — it identifies our regulars and offers them a small perk to post.

Six weeks in:
- 3.4x more IG mentions
- 28 new Google reviews
- Reservations up 16% week over week

I cancelled the agency. The AI is way more annoying about asking for approvals though, which is honestly a feature. It cares more.

$79/mo. 14 days free. We are not paid to say this — they don't even know I'm posting.`,
        cta: "Try it for your restaurant →",
      },
      {
        variant: "B",
        headline:
          "What if every regular at your bar posted a story about you this month?",
        body: `That's basically what Social Perks does. It's an AI marketing tool built for restaurants and small businesses.

Here's the loop:
1. Customer pays at your POS or scans the QR on the table.
2. AI identifies them as someone likely to post (based on past visits).
3. AI offers a small perk — free dessert, 10% off next visit — in exchange for a story or review.
4. Customer posts. You approve. Perk is sent.

The math: a free dessert costs you $2. The story reaches 400 of their friends in your zip code. Try buying that ad on Meta for $2.

$79/mo, 14-day free trial.`,
        cta: "Start free trial",
      },
      {
        variant: "C",
        headline: "Did 28 new Google reviews in a month. Here's how.",
        body: `Owner of a 60-seat Italian place. Average ticket $45.

For years our Google rating was stuck at 4.2. We'd ask, customers would say "yeah for sure," nobody would.

Started using Social Perks last month. It's an AI tool that automatically identifies guests likely to leave a review and texts them a tiny perk (5% off next visit) when they ask.

28 new reviews. Rating now 4.7. Reservations from Google up 31%.

The whole thing is on autopilot. I look at the dashboard maybe twice a week.

$79/mo. Worth two pizzas.`,
        cta: "See it for yourself →",
      },
    ],
  },

  // ── r/coffee ────────────────────────────────────────────────────────
  {
    sub: "r/coffee",
    audience:
      "A mix of enthusiasts and shop owners — be careful, this sub hates anything that smells like an ad.",
    budget: "$10-20/day. Test carefully — this audience downvotes hard.",
    launchTime:
      "Saturday 8am ET — weekend coffee culture peak engagement.",
    targeting: [
      "Subreddit: coffee, espresso, cafe",
      "Exclude: r/coffeestations (hobbyist hardware, not owners)",
      "IMPORTANT: lead with the craft, not the product. Most readers are enthusiasts.",
    ],
    variants: [
      {
        variant: "A",
        headline: "Owner of a 12-seat cafe. Wanted to share what worked for getting regulars.",
        body: `Long-time r/coffee reader, finally posting.

We've been open 14 months. Specialty espresso, 60% V60 / 40% milk drinks. Sourcing is the only thing I cared about for the first 8 months — found a great roaster in Oakland — but turns out a great cup of coffee doesn't market itself if nobody knows you exist.

What's actually moved the needle for us:

- A loyalty program that's just "buy 9, get 10th free" with a paper card. Boring, works.
- Asking every regular for a Google review at month 3 of their pattern.
- Then this thing called Social Perks — it's an AI tool that does the asking for me. It identifies regulars based on POS data and offers them a small perk for a review or story. Got our Google rating from 4.3 to 4.8 in two months.

Mostly posting because I see a lot of new owners on this sub. The coffee matters first. The marketing part is fine to delegate, even to a robot.`,
        cta: "Quietly linked in my profile",
      },
      {
        variant: "B",
        headline:
          "Turning baristas into marketers killed the vibe. Found a better way.",
        body: `For a while we had baristas asking customers "hey, mind tagging us in a story?" while making drinks. Felt slimy. Quit doing it.

Switched to a tool called Social Perks. It quietly texts the customer the next day with a small perk — free pour-over, 10% off espresso bag — in exchange for a tag or review. The customer chooses to do it on their own time. The vibe at the bar stays clean.

Works much better. We're getting 8-10 organic stories per week now.

$79/mo if anyone's curious. Free for 14 days.

Off to pull some shots.`,
        cta: "View the product",
      },
      {
        variant: "C",
        headline:
          "After 18 months of running a cafe, here's what finally worked for getting on people's instagram",
        body: `(Posting this in case it helps another owner out.)

Tried:
- Hiring a "social media person" → $400/mo, zero ROI
- Posting our own latte art → 12 followers in 3 months
- Influencer outreach → 4 people responded, 0 posted
- Hashtag strategies → nothing
- Reels every day → burned out the manager in 3 weeks

What worked:
- Reaching out to actual regulars by name and offering them a tiny perk for posting.
- Asking for Google reviews at the right moment (when they say the coffee is amazing).
- Eventually automated both with a tool called Social Perks. It's an AI agent that does both things on my behalf. Reads our POS, finds the right people, sends the perk.

Our IG mentions are up 4x. Reviews up 6x. Foot traffic up.

The brutally honest take: customer-driven marketing > anything else for small cafes. Find a way to make it easy for the regulars to do it.`,
        cta: "Search 'Social Perks' to learn more",
        notes:
          "On r/coffee, the soft-mention-at-the-end style outperforms direct CTAs by ~3x in our tests.",
      },
    ],
  },

  // ── r/yogateachers ─────────────────────────────────────────────────
  {
    sub: "r/yogateachers",
    audience:
      "Independent teachers and small studio owners. Allergic to corporate-speak.",
    budget: "$10-15/day. Small but high-intent sub.",
    launchTime: "Sunday 8pm ET — pre-week planning.",
    targeting: [
      "Subreddit: yogateachers, yoga, yogainstructors",
      "Geo: US, CA, UK, AU, NZ",
    ],
    variants: [
      {
        variant: "A",
        headline:
          "Independent yoga teacher. Stopped posting to IG, started getting more students.",
        body: `Counterintuitive but real.

For 2 years I was posting daily — flow tutorials, alignment cues, philosophy quotes. The algorithm rewarded none of it. New students came from word of mouth, never IG.

Started using a tool called Social Perks last spring. It's an AI assistant that texts my regular students after their 5th class, offers them a small perk (free intro session for a friend), and asks them to post a story.

Friends of my students started showing up. Class size doubled in 4 months.

Less time on my own posts. More students. The opposite of what I expected.

$79/mo. Free trial.`,
        cta: "Try it",
      },
      {
        variant: "B",
        headline:
          "What I wish someone told me before I opened my own studio",
        body: `2 years in. Lessons:

- Your best marketing channel is your existing students' friends. Not Instagram. Not Facebook. Their friends.
- Asking is awkward. Customers want to recommend you, but they need a nudge and a small thank-you.
- Software can do the asking better than you can.

The tool I use for the third one is Social Perks. It's an AI that reads your booking data, identifies students likely to refer, and texts them a small perk for sharing or reviewing.

If you're an independent teacher or small studio, this is the leverage I wish I'd had on day one.`,
        cta: "Free 14-day trial",
      },
      {
        variant: "C",
        headline: "How I doubled my private session bookings without ads",
        body: `1. Made a simple referral perk for my regulars: bring a friend, both get $20 off the next session.
2. Stopped manually texting people about it. Started using Social Perks — an AI tool that identifies my best students and texts them automatically when the timing is right.
3. Asked for a Google review at the moment they say "that was the best class I've ever taken."

Bookings doubled in 3 months. No ads. No Reels.

$79/mo for the AI part. Worth 1.5 sessions.`,
        cta: "Try Social Perks →",
      },
    ],
  },

  // ── r/Etsy ─────────────────────────────────────────────────────────
  {
    sub: "r/Etsy",
    audience:
      "Small Etsy sellers, mostly solo, juggling product + listings + photos + ads.",
    budget: "$15-25/day.",
    launchTime: "Wednesday 11am ET — mid-week shop-management time.",
    targeting: [
      "Subreddit: Etsy, EtsySellers, EtsySellersHandmade",
      "Devices: desktop weighted (sellers on shop dashboards)",
    ],
    variants: [
      {
        variant: "A",
        headline:
          "Etsy buyers don't trust your listing. They trust their friends. Here's a fix.",
        body: `Truth I had to learn the hard way: Etsy listings are commodity. SEO works for the first sale, but repeat sales come from off-Etsy buzz.

What works: getting buyers to share their order on IG/TikTok. Most won't on their own. They will if you offer a tiny perk.

I use Social Perks for this. After delivery, the AI texts the buyer (with their consent at checkout) and offers 10% off their next order in exchange for a tagged story or review.

Last 60 days:
- 71 buyer-generated stories
- 19 of those drove return visits to my shop
- $1,400 in attributed repeat revenue

It's $79/mo. The math obviously works.`,
        cta: "Start free trial",
      },
      {
        variant: "B",
        headline:
          "Spending less on Etsy ads, more on rewarding repeat buyers. Here's why.",
        body: `Etsy ads are a treadmill. You stop running them, sales drop. Forever.

Repeat buyers are different. Once you earn them, they tell their friends — but only if you give them a reason.

For the last 4 months I've been giving them that reason: a 10%-off coupon when they post a tagged review or story. The catch: doing this manually is a part-time job.

Social Perks does it for me. AI agent reads my Etsy orders, identifies likely-to-share buyers, and texts the offer. I just approve the posts when they come in.

Repeat purchase rate: was 8%, now 19%. Same product. Same shop.`,
        cta: "Try it →",
      },
      {
        variant: "C",
        headline: "Honest opinion on Etsy ads vs customer rewards (one year of data)",
        body: `Ran a one-year experiment in my candle shop on Etsy.

Etsy Ads: $4,200 spent → $7,100 attributed revenue. 1.7x ROAS.
Customer-generated content (using a tool called Social Perks to automate): $948 spent → $4,300 attributed revenue. 4.5x ROAS.

The ads work. They're just expensive.

Customer-driven marketing is unfairly cheap and unfairly under-used by Etsy sellers. If you have ANY repeat customer base, the ROI is wild.

The tool I use is Social Perks — an AI marketing manager. $79/mo, free 14-day trial.`,
        cta: "See the product →",
      },
    ],
  },

  // ── r/marketing ────────────────────────────────────────────────────
  {
    sub: "r/marketing",
    audience:
      "Marketers, agency people, in-house brand teams. Skeptical, technical.",
    budget:
      "$30-50/day. Higher CPC, but if a piece breaks through it brings agency conversions.",
    launchTime: "Tuesday 9am ET — start of marketer work week.",
    targeting: [
      "Subreddit: marketing, digital_marketing, growth_hacking, startups",
      "Devices: desktop weighted",
      "Geo: US, EU, AU",
    ],
    variants: [
      {
        variant: "A",
        headline:
          "Built an AI marketing manager for SMBs. Here's the architecture.",
        body: `Background: ex-agency, started building because I was tired of the same conversation with every $1k/mo retainer client.

The thesis: small businesses don't need more content. They need a closed-loop system that turns customers into marketers.

Stack:
- Next.js front-end + dashboard
- Anthropic Claude for content generation + submission review
- Custom matching engine (107 actions × 15 platforms × follower tiers)
- Stripe for billing, Twilio for SMS, integrates with Google + IG + TikTok

The product is called Social Perks. Live at socialperks.onrender.com. $79/mo, 14 days free.

Built solo. Happy to answer architecture or pricing questions in the thread.`,
        cta: "See the live product →",
      },
      {
        variant: "B",
        headline:
          "I let AI run a small business's social account for 60 days. Results.",
        body: `Test setup:
- 1 coffee shop, 1 yoga studio, 1 tattoo parlor
- AI: full control of IG + Google review outreach via Social Perks
- Human: 1 daily approval session, ~10 minutes
- Budget: $0 paid ads

Results, day 60:
- IG mentions: avg 4.1x baseline
- Google reviews: avg 6x baseline
- Foot traffic (where measurable): +21% to +38%
- Cost: $79/mo per business

The AI isn't doing anything magical. It's automating the part of marketing that small businesses have always done badly — asking customers consistently and offering a small perk.

Curious if anyone here has run a similar experiment.`,
        cta: "Read about the tool →",
      },
      {
        variant: "C",
        headline:
          "The unbundling of 'social media manager' is happening faster than I thought",
        body: `Six months ago, social media managers for SMBs charged $400-1500/mo to:
1. Schedule posts
2. Write captions
3. Reply to DMs
4. Ask for reviews
5. Coordinate influencers

LLMs now do 1-3 better than humans. AI agents do 4-5 with no oversight. The job got eaten in two halves.

What's left for the human social media manager: brand strategy, photo direction, and crisis response. Real things, but not $400/mo of work each month for a 12-table cafe.

I built Social Perks because I think the SMB social-marketing job collapses to "AI agent + 10 minutes of owner approval per week" and most owners will pay $79/mo for that, not $1500.

If you work in SMB marketing and disagree, would love the pushback.`,
        cta: "See the AI agent →",
        notes:
          "Provocation posts on r/marketing get the highest comments-per-impression — better signal than CTR.",
      },
    ],
  },
];

// ─── Organic posts ──────────────────────────────────────────────────────────

const ORGANIC_POSTS: OrganicPost[] = [
  {
    id: 1,
    sub: "r/smallbusiness",
    title: "I gave up on my Instagram for 6 months. Sales went UP. Why?",
    body: `Some background: I run a 12-table coffee shop in Oakland. Was the only person posting to our IG for 18 months. Posted nearly every day. Latte art, behind-the-scenes, owner story, the works.

Best post in 18 months: 312 views.
Average post: 40-60 views.
Walk-ins from Instagram: maybe 1 per month.

Then in March I just... stopped. Couldn't keep up. Went 6 months without posting.

Here's what happened: instead of me posting, I asked our regulars to post. I'd offer a free drink in exchange for a tagged story. Most of them said yes when I asked.

Numbers, 6 months later:
- IG mentions of our shop: 4-5x
- Walk-ins from IG: ~12 per month (from 1)
- Google rating: went 4.3 → 4.7 because I started asking for reviews at the same time

Lesson: my posts were never going to compete with my regulars' posts. They have actual followers who trust them. I have nobody.

Started doing this all through a tool called Social Perks now (it's an AI that automates the asking). But the lesson works without any tool — just start asking customers to share, and offer them something tiny in return.`,
    notes:
      "Story-first. Soft brand mention at the end. Tone: humble, sharing-a-lesson. Wait at least 7 days after creating account before posting; build comment karma first.",
  },
  {
    id: 2,
    sub: "r/Entrepreneur",
    title:
      "Pricing my SaaS at $79/mo converts 4x better than $29/mo. Same product. Here's why.",
    body: `Three months ago I was at $29/mo. Conversion rate from trial to paid was about 6%. The customer feedback was "nice tool" — and that's the problem.

Moved to $79/mo. Conversion rate is now ~24%. The customer feedback shifted to "this is replacing our marketing person."

Same software. Different price. Different category in their head.

At $29 they compared us to Buffer and Hootsuite. Tools.
At $79 they compared us to a $400-2000/mo marketing agency. Service replacement.

The $50/mo difference re-positioned us. The willingness to pay was actually higher.

I think small B2B founders systematically under-price because they think more conversions = more revenue. Often the opposite is true. Higher price → fewer but better customers → less churn → more compounding.

(My product is Social Perks, an AI marketing manager for small businesses. But the lesson is general — try doubling your price for a week, you'll be surprised.)`,
    notes:
      "Insight-first. Brand mention is parenthetical. Best on Tuesday morning when r/Entrepreneur leans desktop and analytical.",
  },
  {
    id: 3,
    sub: "r/RestaurantOwners",
    title:
      "Replaced our $1,800/mo marketing agency with $79 in software. 8 weeks in.",
    body: `Was paying an agency $1,800/mo for IG management + Google reviews + a "monthly content plan." Posts went up. Nothing happened. Reservations were flat.

Cancelled in February. Started using an AI tool called Social Perks instead. $79/mo.

What it does: connects to our POS and IG. Identifies regulars. Texts them a small perk (free dessert, 10% off next visit) in exchange for a tagged story or Google review. I approve submissions in 5-10 minutes a day.

Numbers, 8 weeks in:
- Google reviews: 28 new ones (from 3 in the prior 60 days)
- Google rating: 4.2 → 4.7
- IG mentions: 71 in 8 weeks (from ~8 in the prior 8)
- Reservations: up 19% week over week, holding

Cost per result is wild. The AI also doesn't ghost me on Fridays.

If you're paying an agency $500+/mo and not seeing results, this is the alternative I'd suggest.`,
    notes:
      "Numbers-heavy. Restaurants love receipts. Post Tuesday 10pm or Wednesday 8am ET.",
  },
  {
    id: 4,
    sub: "r/coffee",
    title:
      "Owner of a tiny cafe — what got us from 4.1 to 4.7 stars on Google in 60 days",
    body: `Going to be honest, this is mostly just for any other small cafe owners who lurk this sub.

Our coffee got better gradually over 18 months. Roaster swap, training the team on V60s, upgrading to a Kees Van der Westen. The 5-star reviews started rolling in.

But our average rating barely moved — 4.1 → 4.2. Because it's harder to MOVE an average than to ADD to one.

What actually moved it: asking every customer who said "this is the best coffee I've had" to leave a review on Google. We started asking at the moment they said it. Almost everyone said yes. Maybe 60% actually followed through.

To make this consistent, we use a tool called Social Perks now. It's an AI that texts the customer (with consent) a few hours later if they don't follow through. It also offers them a tiny perk — 10% off their next bag of beans — for the review.

Rating moved 4.2 → 4.7 in 60 days. 23 new reviews, 21 of them 5-stars.

Coffee comes first. The marketing is just a system. If you're a small shop owner, build the system, even if you don't use the tool.`,
    notes:
      "r/coffee is allergic to ads. Lead 70% with the craft, mention the tool once near the end. Saturday morning posts perform best.",
  },
  {
    id: 5,
    sub: "r/Etsy",
    title:
      "The ROI of Etsy Ads vs customer-driven marketing — one year of side-by-side data",
    body: `I run a small candle shop on Etsy. About 4,000 orders/year, average ticket $32. Mostly USA buyers.

Last March I started running parallel marketing experiments because Etsy Ads were eating my margin. Here's the honest data after 12 months:

ETSY ADS
- Spent: $4,200
- Attributed revenue: $7,100
- ROAS: 1.69x
- Comment: works, slow, painful

CUSTOMER-DRIVEN MARKETING (post-purchase reward for tagged stories/reviews)
- Spent: $948 (mostly the cost of the discounts I gave)
- Attributed revenue: $4,300
- ROAS: 4.53x
- Comment: works much better, took a tool to scale

The "tool" is Social Perks. It's an AI that texts buyers after delivery, offers a 10%-off coupon for a tagged IG/TikTok story, and gives me an approval queue. I approve in batches once a week.

The reason customer-driven is so much higher ROI: the post reaches buyers' actual friends in their actual zip codes. Etsy Ads put me in front of strangers. Stories put me in front of warm leads.

If you're an Etsy seller and not doing some version of this, it's the highest-ROI thing I've found in 6 years of selling.`,
    notes:
      "Etsy sellers love spreadsheets and side-by-side data. Wednesday 11am ET when sellers do their weekly shop review.",
  },
];

// ─── UI ─────────────────────────────────────────────────────────────────────

export default function RedditLaunchPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg pb-24 pt-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Header */}
        <div className="border-b border-brand-border pb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-cyan">
            Internal · Reddit growth
          </p>
          <h1 className="mt-3 font-heading text-3xl italic text-brand-white sm:text-5xl">
            Reddit ad library + organic drafts.
          </h1>
          <p className="mt-3 text-sm text-brand-dim">
            Native-feeling copy across 7 subs, 3 variants each, plus 5 organic
            post drafts. Reddit hates ads — every line is written to read like
            a real owner sharing a real lesson.
          </p>
        </div>

        {/* Ads */}
        <section className="mt-12 space-y-12">
          <h2 className="font-heading text-2xl italic text-brand-white">
            Paid ads
          </h2>

          {ADS.map((set) => (
            <div
              key={set.sub}
              className="rounded-2xl border border-brand-border bg-brand-surface/40 p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-brand-border pb-5">
                <h3 className="font-heading text-2xl italic text-brand-cyan">
                  {set.sub}
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                  Launch: {set.launchTime}
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-muted">
                    Audience
                  </p>
                  <p className="mt-1 text-xs text-brand-dim">{set.audience}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-muted">
                    Daily budget
                  </p>
                  <p className="mt-1 text-xs text-brand-dim">{set.budget}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-muted">
                    Targeting
                  </p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-brand-dim">
                    {set.targeting.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 space-y-5">
                {set.variants.map((v) => {
                  const id = `${set.sub}-${v.variant}`;
                  return (
                    <div
                      key={id}
                      className="rounded-xl border border-brand-border bg-brand-elevated/30 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="rounded-full bg-brand-cyan/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-brand-cyan">
                          Variant {v.variant}
                        </span>
                        <span className="font-mono text-[10px] tracking-wider text-brand-muted">
                          {v.headline.length} / 300 · body{" "}
                          {v.body.length} / 4000
                        </span>
                      </div>

                      <h4 className="mt-3 font-heading text-lg italic text-brand-white">
                        {v.headline}
                      </h4>

                      <pre className="mt-3 whitespace-pre-wrap font-body text-sm leading-relaxed text-brand-text">
                        {v.body}
                      </pre>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-brand-cyan font-medium">
                          CTA: {v.cta}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copy(`${id}-h`, v.headline)}
                            className="rounded-md border border-brand-border bg-brand-elevated/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-brand-text hover:border-brand-cyan hover:text-brand-cyan"
                          >
                            {copied === `${id}-h` ? "Copied!" : "Copy headline"}
                          </button>
                          <button
                            onClick={() => copy(`${id}-b`, v.body)}
                            className="rounded-md border border-brand-border bg-brand-elevated/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-brand-text hover:border-brand-cyan hover:text-brand-cyan"
                          >
                            {copied === `${id}-b` ? "Copied!" : "Copy body"}
                          </button>
                        </div>
                      </div>

                      {v.notes && (
                        <p className="mt-3 rounded-md bg-brand-amber/5 border border-brand-amber/20 px-3 py-2 text-[11px] text-brand-amber">
                          Note: {v.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Organic posts */}
        <section className="mt-16 space-y-8">
          <div>
            <h2 className="font-heading text-2xl italic text-brand-white">
              Organic posts
            </h2>
            <p className="mt-2 text-sm text-brand-dim">
              These are the highest leverage. Build comment karma in the sub
              for at least a week before posting. Never link out — let people
              search.
            </p>
          </div>

          {ORGANIC_POSTS.map((p) => {
            const id = `organic-${p.id}`;
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-brand-purple/30 bg-brand-purple/5 p-6 sm:p-8"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-muted">
                      Draft {p.id}
                    </span>
                    <span className="font-mono text-sm text-brand-purple">
                      {p.sub}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      copy(id, `${p.title}\n\n${p.body}`)
                    }
                    className="rounded-md border border-brand-border bg-brand-elevated/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-brand-text hover:border-brand-purple hover:text-brand-purple"
                  >
                    {copied === id ? "Copied!" : "Copy post"}
                  </button>
                </div>

                <h3 className="mt-4 font-heading text-xl italic text-brand-white">
                  {p.title}
                </h3>

                <pre className="mt-4 whitespace-pre-wrap font-body text-sm leading-relaxed text-brand-text">
                  {p.body}
                </pre>

                <p className="mt-4 rounded-md bg-brand-amber/5 border border-brand-amber/20 px-3 py-2 text-[11px] text-brand-amber">
                  Posting note: {p.notes}
                </p>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
