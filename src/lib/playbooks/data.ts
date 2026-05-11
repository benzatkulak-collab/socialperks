// ---------------------------------------------------------------------------
// Industry × Campaign playbooks (10 industries × 10 campaign types = 100 pages)
// ---------------------------------------------------------------------------
//
// Used by /playbooks/[industry]/[campaign] routes to capture very specific
// long-tail searches like "instagram giveaway for restaurants" or
// "google review program for salons".

export interface Industry {
  slug: string;
  name: string;          // plural, lowercase "restaurants"
  singular: string;      // "restaurant"
  Name: string;          // "Restaurants"
  customer: string;      // what customers do — "diners", "members", "patients"
  product: string;       // "menu items", "classes", "treatments"
  hook: string;          // industry-specific marketing angle
  exampleCity: string;   // for fictional case study
  exampleName: string;   // fictional business name
  metric: string;        // primary KPI — "covers", "appointments", "memberships"
  avgTicket: string;     // typical ticket size
}

export const INDUSTRIES: Industry[] = [
  {
    slug: "restaurants",
    name: "restaurants",
    singular: "restaurant",
    Name: "Restaurants",
    customer: "diners",
    product: "menu items",
    hook: "food photography travels — every plate is a piece of content waiting to happen",
    exampleCity: "Austin",
    exampleName: "Lupe's Taqueria",
    metric: "covers",
    avgTicket: "$35 per cover",
  },
  {
    slug: "coffee-shops",
    name: "coffee shops",
    singular: "coffee shop",
    Name: "Coffee Shops",
    customer: "regulars",
    product: "drinks",
    hook: "your latte art and morning rush is endlessly shareable — daily ritual makes daily content",
    exampleCity: "Portland",
    exampleName: "Cedar & Crema",
    metric: "daily transactions",
    avgTicket: "$7 per visit",
  },
  {
    slug: "yoga-studios",
    name: "yoga studios",
    singular: "yoga studio",
    Name: "Yoga Studios",
    customer: "members",
    product: "classes and memberships",
    hook: "your community is already on Instagram — they post poses, mantras, and progress shots without prompting",
    exampleCity: "Denver",
    exampleName: "Still Point Yoga",
    metric: "new memberships",
    avgTicket: "$165 per month",
  },
  {
    slug: "salons",
    name: "salons",
    singular: "salon",
    Name: "Salons",
    customer: "clients",
    product: "services",
    hook: "before-and-afters are some of the highest-engagement content on the platform — your work IS the marketing",
    exampleCity: "Phoenix",
    exampleName: "Halo Salon",
    metric: "new bookings",
    avgTicket: "$120 per service",
  },
  {
    slug: "gyms",
    name: "gyms",
    singular: "gym",
    Name: "Gyms",
    customer: "members",
    product: "memberships",
    hook: "transformation stories drive sign-ups better than any ad — members will share their progress if you give them a reason",
    exampleCity: "Miami",
    exampleName: "Iron Cove Strength",
    metric: "new memberships",
    avgTicket: "$95 per month",
  },
  {
    slug: "boutiques",
    name: "boutiques",
    singular: "boutique",
    Name: "Boutiques",
    customer: "shoppers",
    product: "pieces",
    hook: "outfit posts and unboxings drive direct foot traffic to your storefront from people who would never otherwise have heard of you",
    exampleCity: "Nashville",
    exampleName: "Folk & Field",
    metric: "transactions",
    avgTicket: "$85 per transaction",
  },
  {
    slug: "dentists",
    name: "dental practices",
    singular: "dental practice",
    Name: "Dentists",
    customer: "patients",
    product: "appointments",
    hook: "trust is everything in dental — patient reviews and referrals outperform every other channel by 4-6x",
    exampleCity: "Charlotte",
    exampleName: "Bright Oak Dental",
    metric: "new patient appointments",
    avgTicket: "$450 per visit",
  },
  {
    slug: "bars",
    name: "bars",
    singular: "bar",
    Name: "Bars",
    customer: "regulars",
    product: "nights out",
    hook: "bars live and die on social proof — a busy Friday night photo brings next Friday's crowd",
    exampleCity: "Brooklyn",
    exampleName: "The Lantern Room",
    metric: "covers per night",
    avgTicket: "$48 per visit",
  },
  {
    slug: "bakeries",
    name: "bakeries",
    singular: "bakery",
    Name: "Bakeries",
    customer: "regulars",
    product: "baked goods",
    hook: "your pastries are some of the most photogenic content on the internet — leverage that with a real program",
    exampleCity: "San Francisco",
    exampleName: "Wildflour Bakehouse",
    metric: "daily transactions",
    avgTicket: "$18 per visit",
  },
  {
    slug: "med-spas",
    name: "med spas",
    singular: "med spa",
    Name: "Med Spas",
    customer: "clients",
    product: "treatments",
    hook: "results-driven before-and-afters and tasteful client testimonials drive a category where word-of-mouth is dominant",
    exampleCity: "Scottsdale",
    exampleName: "Lumen Med Spa",
    metric: "new consultations",
    avgTicket: "$650 per treatment",
  },
];

export interface Campaign {
  slug: string;
  name: string;          // "Instagram Giveaway"
  short: string;         // "instagram giveaway"
  goal: string;          // primary outcome
  description: string;
  whatItIs: string;
  perkExample: (i: Industry) => string;
  reasons: (i: Industry) => string[];   // 3 reasons specific to industry
  playbook: (i: Industry) => { title: string; body: string }[]; // 5 steps
  timeline: string;
  mistakes: string[];
  metaTitle: (i: Industry) => string;
  metaDesc: (i: Industry) => string;
}

const CAMPAIGNS_RAW: Campaign[] = [
  {
    slug: "instagram-giveaway",
    name: "Instagram Giveaway",
    short: "Instagram giveaway",
    goal: "follower growth and tagged content",
    description: "A time-bound prize-based Instagram contest that requires entrants to follow, tag, and share — converting passive scrollers into followers, tagged content, and walk-in customers.",
    whatItIs:
      "An Instagram giveaway is a structured contest where you offer a prize in exchange for entry actions that increase your reach: follow your account, tag friends, share to stories, or post with a hashtag. Run well, it's the fastest single tactic to add real local followers and generate UGC. Run poorly, it attracts giveaway-hunters who unfollow the second you announce a winner.",
    perkExample: (i) =>
      `A typical structure: grand prize is $200 of your ${i.product} (or one month of access). To enter, follow + tag two friends. Bonus entries for sharing to stories or a public reel. Anyone can enter. 500+ followers get one bonus entry. 10K+ get three bonus entries — this tilts your audience toward people whose content actually reaches their network.`,
    reasons: (i) => [
      `${i.Name} have visual products — your ${i.product} photograph well, and a tagged post lands in the feeds of every entrant's friends.`,
      `Most of your ${i.customer} live within 5 miles. A local-only giveaway means every entrant is a potential walk-in, not a random follower from across the country.`,
      `${i.hook.charAt(0).toUpperCase() + i.hook.slice(1)}, which means giveaway-tagged content keeps generating reach for weeks after the contest ends.`,
    ],
    playbook: (i) => [
      {
        title: "Pick a prize that's worth ~3x your average ticket",
        body: `For a ${i.singular} averaging ${i.avgTicket}, that's a $100–300 prize. Too small and nobody enters. Too large and you attract sweepstakes accounts. Make the prize specifically your product — a gift card to your ${i.singular}, not an iPad. You want winners who become customers, not flippers.`,
      },
      {
        title: "Set entry mechanics that compound reach",
        body: `Required: follow + tag two friends in a comment. Bonus entries: share to stories with a sticker tagging you, post a reel mentioning you. Each tag puts you in front of one new person; each story share puts you in front of 50–500. Three bonus entries for 10K+ followers — this is where Social Perks tier logic earns its keep.`,
      },
      {
        title: "Post the giveaway as a reel, not a static",
        body: `Reels get 3–5x the reach of feed posts in 2026. Show your ${i.product} on screen for the first 2 seconds. Overlay text: "$200 giveaway — rules in caption." Hook in the first 1.5 seconds is everything. Pin the reel to the top of your profile until the giveaway ends.`,
      },
      {
        title: "Run for exactly 7 days",
        body: `Shorter and people forget. Longer and momentum dies. Day 1 and day 7 will be 70% of entries. Mid-week, post a reminder story with a countdown sticker. The countdown sticker alone typically lifts last-day entries by 30%.`,
      },
      {
        title: "Announce winners with a follow-up reel — and convert non-winners",
        body: `Don't just tag the winner in a story. Make a 15-second reel: "Here's who won, and here's a consolation perk for everyone who entered — show this post for 15% off this week." Non-winners feeling robbed is the #1 reason giveaway followers churn. Give them a reason to stay and visit.`,
      },
    ],
    timeline:
      "Plan on 7 days for the contest, plus a 14-day momentum tail. Realistic results: 300–1,500 new local followers, 40–120 tagged comments, and 20–60% of non-winners redeeming a follow-up perk within two weeks. Compounding effect over 6 months: 1.5–3x your follower base if you run one giveaway per quarter.",
    mistakes: [
      "Picking a prize that isn't your product (an iPad attracts iPad hunters, not customers).",
      "Requiring 'tag 10 friends' — Instagram now suppresses spammy-feeling posts and follower quality drops sharply past 3 tags.",
      "Not requiring a follow as a baseline — you'll get tags but no follower growth.",
      "Going silent for the 7-day run. Post a story reminder every other day or your reach decays.",
    ],
    metaTitle: (i) =>
      `Instagram Giveaway for ${i.Name}: The Complete Playbook`,
    metaDesc: (i) =>
      `Run a profitable Instagram giveaway for ${i.name}. Prize structure, entry mechanics, 5-step playbook, timeline, and the mistakes that kill follower quality.`,
  },
  {
    slug: "google-review-program",
    name: "Google Review Program",
    short: "Google review program",
    goal: "more 4–5 star Google reviews",
    description: "A structured ask-and-incentivize program that turns satisfied customers into a steady drip of Google reviews — the single highest-ROI marketing channel for local businesses.",
    whatItIs:
      "A Google review program is a system — not a one-off ask — that captures reviews from customers at the moment of peak satisfaction. The mechanic is simple: timing, a frictionless link, and a small thank-you perk. Done consistently, it turns Google Business Profile into a 24/7 lead source that compounds for years.",
    perkExample: (i) =>
      `Standard structure: leave a verified review, get a small perk on your next visit (10% off, a free add-on, or a $5 credit). The perk should feel like a thank-you, not a bribe — never condition the perk on a star rating, only on the review existing. For ${i.name} averaging ${i.avgTicket}, a $5–15 credit is right.`,
    reasons: (i) => [
      `${i.Name} get found on Google Maps first. Star count is the #1 ranking factor in the local pack — every 10 reviews compounds your visibility for ${i.metric}.`,
      `Trust signals matter more for ${i.singular} categories than for almost any other industry. A 4.7-star average with 200 reviews converts at 2x the rate of a 4.9-star with 30.`,
      `${i.Name} have a clear "moment of peak satisfaction" — the moment they pay, walk out happy, and would say yes to anything. That moment is when you ask, not three days later by email.`,
    ],
    playbook: (i) => [
      {
        title: "Audit your Google Business Profile first",
        body: `Before you ask for a single review, fix the profile. Categories correct, hours updated, 20+ photos, your ${i.product} listed if applicable, Q&A section seeded with 5 common questions. A polished profile converts review-readers into ${i.customer} at 2–3x the rate of a sparse one.`,
      },
      {
        title: "Generate a short branded review link",
        body: `Your default Google review URL is hideous. Use the short link from your Google Business dashboard or set up something like reviews.your${i.singular}.com. Print it as a QR code on receipts, on the front of business cards, on table tents. Friction is the #1 reason customers don't leave reviews. Eliminate it.`,
      },
      {
        title: "Ask at the moment of peak satisfaction — never by email three days later",
        body: `For ${i.name}, that moment is at checkout, after compliments, or when you can see the customer is happy. Train every team member to ask: "Hey, would you mind leaving us a quick review? It really helps small ${i.name} like us — and we'll knock $X off your next visit as a thank-you." The verbal ask outperforms email 8:1.`,
      },
      {
        title: "Track and reward — never gate behind star rating",
        body: `Use Social Perks or a similar program to track the reward across customer visits. Critical: the perk triggers on a verified review existing, NOT on the star count. Conditioning rewards on a positive review is a violation of Google's policy and will get your profile flagged.`,
      },
      {
        title: "Respond to every review within 48 hours",
        body: `Every. Single. One. A thoughtful 2-sentence response to a 5-star review signals you care. A measured, non-defensive response to a 2-star signals professionalism. Profiles with 90%+ response rates rank higher and convert reading-customers into walking-in-${i.customer} at meaningfully higher rates.`,
      },
    ],
    timeline:
      "Weeks 1–2: profile cleanup and team training. Weeks 3–8: review velocity climbs from 0–2/month to 8–15/month. Months 3–6: you cross 100 reviews and Google starts surfacing you in the local pack for more keywords. Months 6–12: steady-state of 20–40 reviews per month and a measurable lift in ${i.metric}.",
    mistakes: [
      "Asking three days after the visit by email — open rates are sub-20% and conversion is sub-2%.",
      "Conditioning the reward on a 5-star rating (a Google policy violation that flags your profile).",
      "Ignoring or arguing with negative reviews. Response professionalism is itself a ranking signal.",
      "Buying reviews from a fake-review service. Google's algorithms catch this within 60–90 days and the penalty is severe.",
    ],
    metaTitle: (i) =>
      `Google Review Program for ${i.Name}: The Complete Playbook`,
    metaDesc: (i) =>
      `Build a Google review program for ${i.name}. Asking framework, reward structure, 5-step playbook, timeline, and the policy mistakes that get profiles flagged.`,
  },
  {
    slug: "tiktok-content-campaign",
    name: "TikTok Content Campaign",
    short: "TikTok content campaign",
    goal: "TikTok-native UGC and viral reach",
    description: "A creator-driven TikTok campaign that pays customers and micro-influencers for TikToks featuring your business — the fastest way to get into the For You feed for local search.",
    whatItIs:
      "A TikTok content campaign is a structured perk program where you compensate customers and small creators for making short-form videos featuring your business. Unlike a giveaway, the goal isn't entries — it's volume of organic, native-feeling content tagged to your location. TikTok rewards location-tagged content in the For You feed for users within a 5–25 mile radius.",
    perkExample: (i) =>
      `Tiered perk: anyone posting a TikTok tagged to your location gets a small perk on next visit ($10 credit). 500+ followers: 15% off. 2K+: free ${i.product}. 10K+: $100 of credit + a dedicated repost. The tiering rewards reach while keeping the bottom rung accessible to your existing ${i.customer}.`,
    reasons: (i) => [
      `${i.Name} are extremely TikTok-native — the platform's For You algorithm favors location-tagged content, and short-form video showcases ${i.product} better than a static image ever could.`,
      `${i.hook.charAt(0).toUpperCase() + i.hook.slice(1)}. TikTok's 60-second format is perfect for that.`,
      `TikTok delivers cheaper reach per impression than any other platform for ${i.singular} category — typically $0.20–$0.80 CPM organic, versus $4–12 paid on Meta.`,
    ],
    playbook: (i) => [
      {
        title: "Claim and optimize your TikTok business profile",
        body: `Set up TikTok for Business with your address, category, and hours. Pin three videos that show your best ${i.product}. The first 2 seconds of every pinned video should answer "what is this place" without any words. ${i.Name} that skip this step get 5x less reach when their tagged UGC arrives.`,
      },
      {
        title: "Define the hook, not the script",
        body: `Don't tell creators what to say. Tell them the hook to lead with: "POV: you walked into ${i.exampleName}" or "rating every ${i.product} at this place." Hooks travel; scripts feel like ads. Give creators 3–5 hook options and let them pick.`,
      },
      {
        title: "Seed with 5–10 micro-creators in your first month",
        body: `Find local TikTokers with 2K–25K followers in your city. DM them a free experience plus the perk structure. You want 5–10 in your first month — not 1 big one. Volume beats authority on TikTok because the For You algorithm samples broadly.`,
      },
      {
        title: "Reward speed-of-delivery with a posted-within-48-hours bonus",
        body: `TikTok content is most valuable in the 7 days after a visit. Add a 2x perk multiplier if the creator posts within 48 hours of the visit. This single mechanic typically lifts posting rate from 30% to 70%+.`,
      },
      {
        title: "Repost the best content to your own account with creator credit",
        body: `Get explicit permission, credit the creator on screen, and reshare 1–2 per week. Reposted UGC outperforms branded content by 4x on TikTok because the algorithm reads the original engagement signal. Your account becomes a hub for content about your ${i.singular}, not just from it.`,
      },
    ],
    timeline:
      "Month 1: 8–15 pieces of UGC. Months 2–3: the algorithm starts pushing your location to other locals via the For You page. Month 4+: organic reach compounds — typical small ${i.singular} sees 50K–500K monthly impressions on tagged content within 6 months.",
    mistakes: [
      "Writing the script for the creator. Inauthentic content gets suppressed.",
      "Only paying big creators. Five micro-creators outperform one mega-creator on TikTok almost every time.",
      "Requiring approval before posting. Creators won't work with you again and your turnaround time kills the algorithm boost.",
      "Not location-tagging. The For You algorithm uses location tags as a primary signal for local content distribution.",
    ],
    metaTitle: (i) =>
      `TikTok Content Campaign for ${i.Name}: The Complete Playbook`,
    metaDesc: (i) =>
      `Run a TikTok UGC campaign for ${i.name}. Creator tiers, hooks, repost strategy, and the For You algorithm signals that drive local reach.`,
  },
  {
    slug: "referral-program",
    name: "Referral Program",
    short: "referral program",
    goal: "customer-acquired new customers",
    description: "A two-sided perk program that rewards existing customers for bringing in new ones — the highest-LTV acquisition channel for any local business.",
    whatItIs:
      "A referral program is a structured two-sided perk: existing customer brings new customer, both get a reward. Unlike a giveaway, referrals scale linearly with your customer base — every new customer becomes a potential acquisition node. Referred customers also have a 4x higher LTV than ad-acquired customers because trust is pre-loaded.",
    perkExample: (i) =>
      `Two-sided structure: existing ${i.customer.replace(/s$/, "")} who refers a friend gets a 20% off perk. The friend gets a "first visit" perk of equivalent value. Both perks unlock only after the new customer's first transaction — this prevents fake referrals. For ${i.name} with ${i.avgTicket}, that's typically $15–25 per side.`,
    reasons: (i) => [
      `${i.Name} have high trust-driven conversion — a personal referral converts at 30–60% versus 1–3% for cold ads.`,
      `Your existing ${i.customer} talk about you anyway. A formal program just gives them a reason to attribute the conversion to themselves so you can reward it.`,
      `Referred ${i.customer} have 3–4x higher retention than ad-acquired ones — they came in pre-trusting you because someone they trust vouched.`,
    ],
    playbook: (i) => [
      {
        title: "Make every referral one tap to share",
        body: `Generate a unique referral link or code per customer. Make sharing one tap from a text message — "Try ${i.exampleName} — here's $X off your first ${i.product}." If sharing requires logging in, signing up, or filling a form, your referral rate drops 80%+. Friction kills referrals more than any other factor.`,
      },
      {
        title: "Reward the referrer at the moment the new customer transacts — not before",
        body: `Both rewards unlock the moment the new ${i.customer.replace(/s$/, "")} pays. This prevents gaming, but more importantly it teaches the referrer that the system works. The next referral comes 2x faster after the first reward lands.`,
      },
      {
        title: "Send a personal nudge after a great visit",
        body: `When a regular gives you a 5-star review or a compliment, the next day text them: "So glad you loved it. We just launched a referral perk — if you share your code with a friend, you both get $X off your next visit." 15–25% conversion rate on that ask. It works because timing is everything.`,
      },
      {
        title: "Stack on top of your other perks — don't compete with them",
        body: `Referral rewards should layer with loyalty, birthday perks, and giveaway prizes — not replace them. A ${i.customer.replace(/s$/, "")} who also referred two friends should feel like a VIP, not someone who has to choose which perk to use. Programs that allow stacking see 2–3x the referral rate.`,
      },
      {
        title: "Surface the leaderboard quietly",
        body: `Once a quarter, message your top 5 referrers: "You're in our top 5 referrers — thank you. Here's a special perk." Just a small, private acknowledgment. Public leaderboards feel gauche; private ones create deep loyalty. Top referrers often refer 10–20 customers per year if they feel seen.`,
      },
    ],
    timeline:
      "Month 1: 1–5% of customers refer someone. Month 3: that climbs to 5–10% as the program is publicized. Month 6: a mature referral program drives 15–30% of new ${i.customer}, and referred customers' LTV climbs 3–4x your ad-acquired baseline.",
    mistakes: [
      "Requiring sign-up before sharing. Customers won't make an account to refer a friend.",
      "Rewarding only the referrer or only the friend. Two-sided perks convert 5x better than one-sided.",
      "Paying out before the new customer transacts. You'll attract fraud and pay out for nothing.",
      "Not telling customers the program exists. The #1 reason referral programs underperform is silent launch.",
    ],
    metaTitle: (i) =>
      `Referral Program for ${i.Name}: The Complete Playbook`,
    metaDesc: (i) =>
      `Build a two-sided referral program for ${i.name}. Reward structure, timing, anti-fraud rules, and the conversion numbers you should expect.`,
  },
  {
    slug: "loyalty-program",
    name: "Loyalty Program",
    short: "loyalty program",
    goal: "visit frequency and retention",
    description: "A points-or-visits structured retention program that lifts visit frequency and LTV by 20–40% — the highest-impact retention lever for repeat-visit local businesses.",
    whatItIs:
      "A loyalty program tracks customer visits or spend and rewards milestones (e.g., 10 visits = free ${i.product}). Unlike acquisition campaigns, loyalty programs don't bring new customers — they make existing customers worth 1.3–1.8x more. For ${i.singular} categories with high repeat-visit potential, it's the single highest-ROI marketing investment.",
    perkExample: (i) =>
      `Two-tier structure: visit-based for entry (every 10 visits = 1 free ${i.product}), and spend-based for VIPs ($500 lifetime = unlock free birthday perk + priority booking + 10% off every visit). Tiered loyalty programs consistently outperform single-tier by 30–50% on retention.`,
    reasons: (i) => [
      `${i.Name} live and die on repeat ${i.customer}. A 5% lift in retention drives a 25–40% lift in profit because the marginal cost of a returning customer is zero.`,
      `Loyalty programs work especially well for ${i.singular} categories because the decision to visit is high-frequency and low-consideration — a small reward at the margin tips the scale.`,
      `Modern digital loyalty (no punch cards) gives you a customer email and visit history — data you can use to personalize future campaigns, birthday perks, and win-back offers.`,
    ],
    playbook: (i) => [
      {
        title: "Choose visits over points",
        body: `Points are confusing. "10 visits = free ${i.product}" is not. Visit-based programs have 2–3x higher engagement than points-based because customers can count. Save points for a VIP tier on top of the visit baseline.`,
      },
      {
        title: "Make enrollment one tap at checkout",
        body: `Enrollment friction is the #1 reason loyalty programs underperform. The customer hands over a phone number or scans a QR code at checkout — that's it. No app to download, no email verification. Programs requiring an app have a 5–15% enrollment rate; programs without have 50–80%.`,
      },
      {
        title: "Surface progress at every interaction",
        body: `"You're 3 visits away from a free ${i.product}" prints on the receipt, shows in their text confirmation, displays on their next visit. Visible progress is the dominant driver of return visits — invisible programs have 2x the dormancy.`,
      },
      {
        title: "Add a surprise unlock at 50% progress",
        body: `Halfway to the main reward, drop an unexpected small perk: "You're halfway — here's a free add-on this visit." Surprise rewards in the middle of a loyalty arc are 4x more effective at driving the next visit than rewards at the end.`,
      },
      {
        title: "Win-back inactive members after 60 days",
        body: `Anyone who hasn't visited in 60 days gets a text: "We miss you. Here's a free ${i.product} on us — no strings." Win-back perks reactivate 15–30% of dormant ${i.customer}. The other 70% you would have lost anyway — so the math always works.`,
      },
    ],
    timeline:
      "Month 1: enrollment ramps to 40–60% of ${i.customer}. Month 3: visit frequency lifts 10–20%. Month 6: lift stabilizes at 20–40% over baseline. Year 1+: program members spend 1.6–2x what non-members spend annually.",
    mistakes: [
      "Punch cards or paper systems. You lose all the data and can't run win-backs.",
      "Setting the reward threshold too high (e.g., 20 visits). 10 visits maximum or engagement collapses.",
      "Not surfacing progress between visits. Out of sight, out of mind.",
      "Treating all members the same. A 2-year regular and a first-month signup are different humans — tier them.",
    ],
    metaTitle: (i) =>
      `Loyalty Program for ${i.Name}: The Complete Playbook`,
    metaDesc: (i) =>
      `Design a profitable loyalty program for ${i.name}. Visit thresholds, tiering, win-back mechanics, and the retention numbers you should expect.`,
  },
  {
    slug: "ugc-campaign",
    name: "UGC Campaign",
    short: "UGC campaign",
    goal: "ongoing user-generated content",
    description: "A perk-based program that turns every customer into a content creator — generating a steady stream of authentic photos and videos featuring your business.",
    whatItIs:
      "A UGC campaign is an always-on perk program that rewards customers for posting about your business on any social platform. Unlike a one-time giveaway, UGC programs run continuously — every customer is a potential content node, and content compounds over months and years.",
    perkExample: (i) =>
      `Open structure: any post tagging your business, on any platform, earns the poster a small perk on their next visit (free ${i.product} or 15% off). Tier the perk by reach: 500+ followers = 1.5x perk, 10K+ = 3x perk + repost. For ${i.name} averaging ${i.avgTicket}, the perk cost is ~$5–15 per piece of content.`,
    reasons: (i) => [
      `${i.Name} produce ${i.product} that customers want to photograph anyway. ${i.hook.charAt(0).toUpperCase() + i.hook.slice(1)} — give them a reason to actually post.`,
      `UGC converts 5–8x better than branded content in ad creative tests. Every piece you collect is reusable in your own ads, your website, and your social.`,
      `One UGC piece per day adds up to 365 unique pieces of content per year — a content engine that's structurally cheaper than any agency or in-house team could produce.`,
    ],
    playbook: (i) => [
      {
        title: "Make the perk one tap to claim",
        body: `Customer posts, screenshots, shows it at next visit, gets perk. No approval queue, no review. Friction kills UGC programs faster than any other lever. The 30 seconds of staff time per claim is worth the content trade.`,
      },
      {
        title: "Define what 'counts' clearly",
        body: `Post tags your ${i.singular} (handle, location, or hashtag) on Instagram, TikTok, or Threads. Story posts count for 24 hours. Reposts of your own content don't count. Make this 3 lines on a tabletop sign — ambiguity kills participation.`,
      },
      {
        title: "Display 'as seen on' content prominently",
        body: `In-${i.singular} signage, on your website, on social — "Featured customer content." Customers see other customers' content getting featured and want to be next. Programs that surface UGC publicly get 3–5x more participation than silent ones.`,
      },
      {
        title: "Tier rewards by follower count and content quality",
        body: `Base tier for anyone. Bonus tier for 500+ followers. Premium tier for 10K+ (free ${i.product} + repost). Quality bonus for stand-out posts (you decide). Tiering keeps incentives aligned with content value.`,
      },
      {
        title: "Repost weekly on your own channels with credit",
        body: `One day per week, dedicate to community content. Repost 3–5 pieces with creator credit. This is two-way: it gives creators visible appreciation, and it makes your own social feed feel community-driven rather than promotional. Both lifts engagement 3–4x.`,
      },
    ],
    timeline:
      "Month 1: 5–15 pieces of UGC. Month 3: 30–80 pieces. Month 6+: steady-state of 1–3 pieces per day for a typical ${i.singular}. The compounding library of evergreen content becomes your single most valuable marketing asset.",
    mistakes: [
      "Approving every post before reward. The queue kills the program.",
      "Not crediting reposted creators. Once is forgivable, twice and you lose contributors.",
      "Letting the program go silent. Active management — surfacing, reposting, thanking — keeps the engine running.",
      "Confusing UGC with influencer marketing. UGC programs reward customers; influencer programs are negotiated separately.",
    ],
    metaTitle: (i) =>
      `UGC Campaign for ${i.Name}: The Complete Playbook`,
    metaDesc: (i) =>
      `Run a continuous UGC campaign for ${i.name}. Perk structure, content tiers, reposting strategy, and the content volume you should expect.`,
  },
  {
    slug: "influencer-partnership",
    name: "Influencer Partnership",
    short: "influencer partnership",
    goal: "credible reach via local creators",
    description: "A negotiated partnership with one or more local creators to produce high-quality content and drive direct customer flow — the right tool when you need reach with credibility.",
    whatItIs:
      "An influencer partnership is a formal arrangement with a creator (typically 5K–250K followers) to produce a defined deliverable — a reel, a story series, a visit feature — in exchange for compensation. Unlike UGC programs (open to all), partnerships are selective and produce higher-quality, more strategic content.",
    perkExample: (i) =>
      `Tiered partnership structure: micro creators (5K–25K) get a free experience + $100–250. Mid (25K–100K) get $400–1,200 + experience. Mega (100K+) get $2,000+ negotiated. For ${i.name} averaging ${i.avgTicket}, the right tier for most is micro — better ROI than chasing one big name.`,
    reasons: (i) => [
      `${i.Name} need credibility in addition to reach. A local creator vouching for you carries 10x more weight than a polished ad — especially in trust-driven categories like ${i.singular}.`,
      `Influencer partnerships produce reusable content. A well-shot reel by a creator is yours to license in ads, on your website, and across your own social for months.`,
      `Local creators have local audiences. A micro-creator with 12K followers in your city is worth 10x a mega-creator with 1M followers nationally for foot-traffic-driven ${i.singular} categories.`,
    ],
    playbook: (i) => [
      {
        title: "Define the deliverable before you reach out",
        body: `Don't DM a creator with "want to collaborate?" Define it: "I'd love a 30-second reel featuring 3 ${i.product}, posted within 7 days of your visit, with [handle] tagged. In exchange: free experience + $X." Specificity gets a 4x higher response rate than vague asks.`,
      },
      {
        title: "Vet for audience quality, not follower count",
        body: `Check engagement rate (3%+ is healthy), audience location (should match yours), and recent posts (real engagement, not bot-style). A 12K-follower creator with 800 likes per post is far better than a 100K-follower with 1,200.`,
      },
      {
        title: "Pay fairly and pay on time",
        body: `Micro-creators are professionals with overhead. Pay within 7 days of delivery. Word travels in creator circles — pay slowly and your future asks get ignored. Industry-standard rates: $100/10K followers for a reel, $25/10K for a story.`,
      },
      {
        title: "Always get usage rights in writing",
        body: `Standard usage: 60 days organic. Paid usage rights (running their content as ads): negotiate separately, typically +50–100% of base rate. Without explicit usage rights you can't legally run their content as ads.`,
      },
      {
        title: "Run quarterly, not constantly",
        body: `Three to five partnerships per quarter outperforms one continuous relationship. Variety in voices, audiences, and aesthetics gives the algorithm more diverse signal. And rotating creators keeps content fresh for both your audience and theirs.`,
      },
    ],
    timeline:
      "Outreach to delivery: 2–4 weeks per creator. Direct attribution (new ${i.customer} from creator content): 0–14 days post-publish. Brand lift and SEO halo: 30–90 days. ROI typically positive by day 30 for well-targeted micro-creator deals.",
    mistakes: [
      "Chasing follower count instead of engagement rate.",
      "Not getting usage rights — you can't run their content as an ad without them.",
      "Underpaying micro-creators. The market is real and word travels.",
      "Trying to script the content. Creators know their audience better than you do.",
    ],
    metaTitle: (i) =>
      `Influencer Partnership for ${i.Name}: The Complete Playbook`,
    metaDesc: (i) =>
      `Run an influencer partnership for ${i.name}. Creator tiering, pay rates, usage rights, and the deliverables that drive measurable ${i.metric}.`,
  },
  {
    slug: "birthday-perk-program",
    name: "Birthday Perk Program",
    short: "birthday perk program",
    goal: "personalized customer reactivation",
    description: "An automated birthday perk that drives a high-emotion, high-conversion customer visit every year — the highest-ROI single-touch email/SMS program in retail.",
    whatItIs:
      "A birthday perk program sends customers a free or discounted offer in the week of their birthday. The combination of personal-feeling timing and a clear redemption deadline drives 30–50% redemption rates — the highest of any automated marketing touch. It's a single-line program with enormous return.",
    perkExample: (i) =>
      `Standard structure: free ${i.product} on your birthday, valid for 14 days. No purchase required. Add a small upsell hook: "Bring a friend — they get 20% off their visit too." 70% of birthday redemptions bring a friend, turning a free ${i.product} into a 2x revenue event.`,
    reasons: (i) => [
      `${i.Name} are exactly the kind of business someone wants to visit on their birthday — celebratory, social, photographable. Your category is structurally well-suited.`,
      `A free ${i.product} has marginal cost typically $3–8 for ${i.name}, but generates a visit worth ${i.avgTicket} plus a 70% chance of a friend coming along. The math is one-sided.`,
      `Birthday perks generate disproportionate social content. Customers post their birthday visits — your ${i.singular} ends up in birthday-celebration stories and reels organically.`,
    ],
    playbook: (i) => [
      {
        title: "Collect birthdays at loyalty enrollment",
        body: `When customers enroll in your loyalty program, ask for month and day (not year — privacy concerns hurt sign-up rates). The month-and-day field has 80–90% completion when it's optional, less than 30% when you require year.`,
      },
      {
        title: "Send the perk 7 days before",
        body: `Texted offers 7 days out get planned around. Day-of offers get missed. Day-before offers feel like an afterthought. Seven days before, valid for 14 days through their birthday week.`,
      },
      {
        title: "Make the perk free, not discounted",
        body: `A free ${i.product} feels like a gift. 20% off feels like a coupon. The perceived value gap is enormous — free perks redeem at 30–50%, percentage discounts redeem at 8–15%. The marginal cost difference is small; the response difference is huge.`,
      },
      {
        title: "Add a friend hook",
        body: `"Bring a friend on your birthday — they get 20% off." This doubles your effective transaction size for the visit and acquires a new customer at near-zero marginal cost. Most birthday visits are social anyway — capture the social half.`,
      },
      {
        title: "Send a thank-you the week after",
        body: `After their birthday visit, send a thank-you with a 14-day-valid follow-up perk. Birthday customers return within 30 days at 2x the rate of non-birthday customers — capitalize on the momentum.`,
      },
    ],
    timeline:
      "Setup: 1 hour to wire up the automation. Month 1: 30–50% of birthdays in your file redeem. Year 1: every customer gets one birthday touch. Compounded effect: birthday-program customers retain 1.3–1.5x better than non-birthday customers.",
    mistakes: [
      "Asking for birth year — drops collection by 50–70%.",
      "Making the perk a percentage discount instead of a free item.",
      "Sending the perk day-of. Plan-around-able offers convert; surprise offers get missed.",
      "Not capturing the friend visit. 70% of birthday redemptions are social — capture them both.",
    ],
    metaTitle: (i) =>
      `Birthday Perk Program for ${i.Name}: The Complete Playbook`,
    metaDesc: (i) =>
      `Set up a birthday perk program for ${i.name}. Collection, timing, perk structure, and the redemption rates you should expect.`,
  },
  {
    slug: "check-in-rewards",
    name: "Check-in Rewards Program",
    short: "check-in rewards program",
    goal: "location-tagged social content + foot traffic",
    description: "A reward for customers who tag your location on Instagram, TikTok, or Google — converting social check-ins into content distribution and SEO signal.",
    whatItIs:
      "A check-in rewards program offers a small perk to customers who tag your location on social media or check in via Google. The mechanic is dirt simple: post tagged → show staff → get perk. The value is twofold: every check-in is a piece of distribution, and tagged content lifts your local SEO and discoverability.",
    perkExample: (i) =>
      `Standard structure: any tagged post on Instagram, TikTok, or a Google check-in earns the customer a small perk on the current visit (free add-on or 10% off). Maximum once per week per customer. For ${i.name} with ${i.avgTicket}, the cost per check-in is $3–8.`,
    reasons: (i) => [
      `${i.Name} are highly photographable — your customers were going to take a picture anyway. The perk just incentivizes the tag.`,
      `Location-tagged Instagram posts feed into the Instagram place page for your ${i.singular} — a discovery surface most owners don't realize exists or invest in.`,
      `Google check-ins boost your Google Maps prominence score, lifting your ranking in the local pack for your category keywords.`,
    ],
    playbook: (i) => [
      {
        title: "Decide which platforms count",
        body: `Recommended: Instagram location tag, TikTok location tag, Google check-in. Don't try to cover everything — three platforms is plenty. List the accepted check-ins on a tabletop sign.`,
      },
      {
        title: "Make claiming the perk frictionless",
        body: `Customer posts, shows staff the post live, perk is applied to current ticket. No screenshots required, no claim forms. The check-in itself is the verification.`,
      },
      {
        title: "Cap at once-per-week per customer",
        body: `Without a cap, regulars game the system daily. Once-per-week is generous enough to feel rewarding, restrictive enough to prevent abuse. Track via your loyalty program.`,
      },
      {
        title: "Display tagged content in-house",
        body: `Put a small monitor or framed prints showing recent tagged posts. Customers see other customers getting featured and check in more. Programs with visible content displays get 2–3x participation versus silent ones.`,
      },
      {
        title: "Boost the best check-ins from your own account",
        body: `Once a week, repost 1–2 of the best check-in posts to your own story. Free, evergreen distribution. Tag the creator. Reposts compound participation week over week.`,
      },
    ],
    timeline:
      "Week 1: 5–10 check-ins. Month 1: 30–80 check-ins. Month 3+: steady-state of 5–15 check-ins per day for a typical ${i.singular}. Your Instagram place page becomes a destination people scroll before visiting.",
    mistakes: [
      "Not capping. Regulars will check in daily and burn the program's economics.",
      "Requiring screenshots or forms. Friction kills check-in volume.",
      "Letting the visible content displays go stale. Refresh weekly or the program feels dead.",
      "Not specifying which check-ins count. Ambiguity slows staff and confuses customers.",
    ],
    metaTitle: (i) =>
      `Check-in Rewards Program for ${i.Name}: The Complete Playbook`,
    metaDesc: (i) =>
      `Run a check-in rewards program for ${i.name}. Platforms, perk caps, redemption mechanics, and the SEO/social lift you should expect.`,
  },
  {
    slug: "vip-customer-program",
    name: "VIP Customer Program",
    short: "VIP customer program",
    goal: "top-customer retention and word-of-mouth",
    description: "A tiered program that identifies your top 5–10% of customers and rewards them with exclusive access, perks, and recognition — driving outsized retention and referrals.",
    whatItIs:
      "A VIP program is a top-tier of your loyalty system that confers exclusive benefits to your highest-value customers. Unlike a giveaway or a one-shot promotion, VIPs are identified by behavior (spend, frequency, or tenure) and feel that they have status with you. That status is what drives extreme retention and referral.",
    perkExample: (i) =>
      `Three benefits define a good VIP tier: (1) exclusive access — a special ${i.product}, an early reservation window, or members-only hours. (2) recognition — staff knows them by name, they get a small unexpected perk each visit. (3) economic — 10% off every visit, free birthday ${i.product}, complimentary upgrades. The economic benefit matters least; access and recognition matter most.`,
    reasons: (i) => [
      `${i.Name} have classic Pareto economics: 20% of ${i.customer} drive 60–80% of revenue. Investing disproportionately in retaining the top 5–10% is the single highest-leverage move you can make.`,
      `VIPs are your loudest advocates. A recognized VIP refers 4–6x more new ${i.customer} per year than an average regular.`,
      `Recognition is structurally cheaper than acquisition. The marginal cost of remembering a VIP's name is zero; the marginal cost of acquiring a new customer is $40–200.`,
    ],
    playbook: (i) => [
      {
        title: "Define VIP by behavior, not by spend alone",
        body: `Best definition: spend AND frequency AND tenure. Examples: $1,000+ lifetime, OR 20+ visits per year, OR 2+ years as a ${i.customer.replace(/s$/, "")}. Pure-spend definitions miss your most loyal regulars; pure-frequency definitions miss your high-ticket clients.`,
      },
      {
        title: "Train staff to recognize VIPs visually or by name",
        body: `When a VIP walks in, staff should know. Use a flag in your POS or loyalty system. The single highest-impact VIP perk is being known. Most ${i.name} dramatically underinvest in this and overinvest in discounts.`,
      },
      {
        title: "Create one exclusive benefit per quarter",
        body: `Members-only ${i.product}, a private event, early access to a new offering. Exclusivity is the active ingredient. Discounts feel commercial; exclusive access feels like belonging.`,
      },
      {
        title: "Send a personal note quarterly",
        body: `A handwritten or hand-signed card from the owner once a quarter. "Thanks for being one of our best ${i.customer}. Here's a small thing on us." Net Promoter Score on VIPs who receive a handwritten note: typically 80+. NPS on those who don't: typically 40–60.`,
      },
      {
        title: "Quietly de-list VIPs who churn",
        body: `If a VIP hasn't visited in 4 months, that's a real problem. Trigger a personal call or text from the owner. VIP churn is recoverable 60% of the time if caught in the first 6 months — and uncoverable by month 12.`,
      },
    ],
    timeline:
      "Month 1: identify and flag 5–10% of customers as VIPs. Month 2: launch first exclusive benefit. Month 3+: VIP retention climbs to 90%+ year-over-year, and their referral rate climbs 3–5x baseline. Year 1: VIP cohort drives 2–3x its own size in new ${i.customer} via referrals.",
    mistakes: [
      "Defining VIPs by spend alone — you'll miss high-frequency loyalists.",
      "Loud public tiering. VIPs should feel exclusive, not gamified.",
      "All-discount benefits. Recognition and access matter more than 5% off.",
      "Not catching VIP churn early. Recovery rates collapse after month 6.",
    ],
    metaTitle: (i) =>
      `VIP Customer Program for ${i.Name}: The Complete Playbook`,
    metaDesc: (i) =>
      `Build a VIP program for ${i.name}. Identification rules, benefit design, recognition tactics, and the retention numbers you should expect.`,
  },
];

// Helper: substitute ${i.xxx} tokens that appear in literal strings inside
// timeline / whatItIs (some campaigns embed industry references in literal text).
function fillTemplate(text: string, i: Industry): string {
  return text.replace(/\$\{i\.(\w+)\}/g, (_, key) => {
    const v = (i as unknown as Record<string, string>)[key];
    return v ?? "";
  });
}

export const CAMPAIGNS: Campaign[] = CAMPAIGNS_RAW.map((c) => ({
  ...c,
  whatItIs: c.whatItIs,
  // We wrap timeline + whatItIs so they receive industry substitution at render
  timeline: c.timeline,
  perkExample: (i: Industry) => fillTemplate(c.perkExample(i), i),
  playbook: (i: Industry) =>
    c.playbook(i).map((s) => ({ title: s.title, body: fillTemplate(s.body, i) })),
}));

export function getIndustry(slug: string): Industry | undefined {
  return INDUSTRIES.find((i) => i.slug === slug);
}

export function getCampaign(slug: string): Campaign | undefined {
  return CAMPAIGNS.find((c) => c.slug === slug);
}

export function getOtherCampaigns(slug: string, count = 5): Campaign[] {
  return CAMPAIGNS.filter((c) => c.slug !== slug).slice(0, count);
}

export function getOtherIndustries(slug: string, count = 5): Industry[] {
  return INDUSTRIES.filter((i) => i.slug !== slug).slice(0, count);
}

export const INDUSTRY_SLUGS = INDUSTRIES.map((i) => i.slug);
export const CAMPAIGN_SLUGS = CAMPAIGNS.map((c) => c.slug);

export function getTimeline(c: Campaign, i: Industry): string {
  return fillTemplate(c.timeline, i);
}

export function getWhatItIs(c: Campaign, i: Industry): string {
  return fillTemplate(c.whatItIs, i);
}
