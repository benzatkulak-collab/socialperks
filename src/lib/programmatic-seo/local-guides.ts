// ---------------------------------------------------------------------------
// Local marketing guides
// ---------------------------------------------------------------------------
//
// Long-form playbooks rendered at /local-guide/[topic]. Each guide is
// content-rich enough to stand on its own as a programmatic-SEO landing
// page — opinionated steps, common pitfalls, industries it works best
// for, and links to free Social Perks tools.

export interface LocalGuideStep {
  title: string;
  body: string;
}

export interface LocalGuideTool {
  href: string;
  name: string;
  blurb: string;
}

export interface LocalGuideIndustry {
  slug: string;
  name: string;
  why: string;
}

export interface LocalGuide {
  slug: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  schema: "HowTo" | "Article";
  whyItMatters: string[];
  steps: LocalGuideStep[];
  pitfalls: string[];
  tools: LocalGuideTool[];
  industries: LocalGuideIndustry[];
  closing: string;
}

// ---------------------------------------------------------------------------
// Shared tool & industry references (reused across guides)
// ---------------------------------------------------------------------------

const TOOL_REVIEW_EMAIL: LocalGuideTool = {
  href: "/tools/review-email-generator",
  name: "Review email generator",
  blurb: "Free templates that customers actually open and act on.",
};

const TOOL_SMS_REVIEW: LocalGuideTool = {
  href: "/tools/sms-review-templates",
  name: "SMS review templates",
  blurb: "Two-tap review requests that lift response rates 3x.",
};

const TOOL_QR: LocalGuideTool = {
  href: "/tools/qr-code-generator",
  name: "QR code generator",
  blurb: "Branded QR codes that route customers straight to your review form.",
};

const TOOL_UTM: LocalGuideTool = {
  href: "/tools/utm-link-generator",
  name: "UTM link generator",
  blurb: "Track which channel drives every customer with zero guesswork.",
};

const TOOL_INSTA_CAPTION: LocalGuideTool = {
  href: "/tools/instagram-caption-generator",
  name: "Instagram caption generator",
  blurb: "Captions written for local business — concise, on-brand, on-trend.",
};

const TOOL_HASHTAGS: LocalGuideTool = {
  href: "/tools/hashtag-generator",
  name: "Hashtag generator",
  blurb: "Location and niche hashtags that pair with your captions.",
};

const IND_COFFEE: LocalGuideIndustry = {
  slug: "coffee-shop",
  name: "Coffee shop",
  why: "High footfall, easy to ask at the register, instant review-for-perk loop.",
};

const IND_SALON: LocalGuideIndustry = {
  slug: "salon",
  name: "Salon & spa",
  why: "Long appointments give time for a thoughtful ask and a great photo.",
};

const IND_RESTAURANT: LocalGuideIndustry = {
  slug: "restaurant",
  name: "Restaurant",
  why: "Tableside SMS at the right moment is the highest-converting review channel.",
};

const IND_FITNESS: LocalGuideIndustry = {
  slug: "fitness-studio",
  name: "Fitness studio",
  why: "Members are bought-in; small perks unlock huge social reach.",
};

const IND_DENTAL: LocalGuideIndustry = {
  slug: "dental",
  name: "Dental practice",
  why: "Reviews and referrals are the #1 driver of new patients.",
};

const IND_AUTO: LocalGuideIndustry = {
  slug: "auto-shop",
  name: "Auto shop",
  why: "Trust is everything — fresh reviews close the deal before the phone rings.",
};

// ---------------------------------------------------------------------------
// Guides
// ---------------------------------------------------------------------------

export const LOCAL_GUIDES: LocalGuide[] = [
  {
    slug: "get-more-google-reviews",
    h1: "How to get more Google reviews for your local business",
    metaTitle: "How to Get More Google Reviews (Local Business Playbook)",
    metaDescription:
      "A step-by-step playbook for small businesses to consistently earn more 5-star Google reviews — without bribing customers or breaking policy.",
    intro:
      "Google reviews are the single biggest factor in whether a nearby customer chooses you over the competitor down the street. This playbook covers the timing, scripts, and tools that turn happy customers into reliable five-star reviewers — without violating Google's policies.",
    schema: "HowTo",
    whyItMatters: [
      "88% of consumers trust online reviews as much as personal recommendations.",
      "Businesses with 50+ recent reviews convert 270% better than those with under 10.",
      "Recency matters more than quantity — Google weights reviews from the last 90 days.",
      "Every review adds local SEO signal: keywords, frequency, response activity.",
    ],
    steps: [
      {
        title: "Claim and complete your Google Business Profile",
        body:
          "Verify ownership, fill out every field (hours, services, attributes, photos), and add a short review link. Incomplete profiles get 7x fewer review actions.",
      },
      {
        title: "Find the right moment to ask",
        body:
          "The best moment is right after a peak emotional high — a great meal, a finished haircut, a working car. Train staff to recognize it and ask in person.",
      },
      {
        title: "Hand off with a short, branded link",
        body:
          "Use a QR code at checkout and a follow-up SMS with a one-tap review link. Friction is the #1 reason reviews never get written.",
      },
      {
        title: "Offer a perk for the action, not the rating",
        body:
          "Google's policy bans paying for positive reviews. You can offer a small perk (a free drink, a discount) for leaving an honest review — regardless of rating.",
      },
      {
        title: "Respond to every review within 48 hours",
        body:
          "Public responses tell future customers (and Google's algorithm) you're engaged. Thank positive reviewers; address negative reviews with empathy and a fix.",
      },
      {
        title: "Measure and iterate weekly",
        body:
          "Track review velocity (reviews per week) and average rating. If volume drops, audit the ask — the script, the timing, or the staff member doing it.",
      },
    ],
    pitfalls: [
      "Asking for 5-star reviews specifically (Google can detect and remove them).",
      "Posting from store IPs or kiosks — Google flags clustered review patterns.",
      "Buying reviews from third-party services. Almost always detected, almost always punished.",
      "Forgetting to respond. Silent profiles look abandoned.",
    ],
    tools: [TOOL_REVIEW_EMAIL, TOOL_SMS_REVIEW, TOOL_QR, TOOL_UTM],
    industries: [IND_COFFEE, IND_SALON, IND_RESTAURANT, IND_DENTAL, IND_AUTO],
    closing:
      "Reviews compound. A consistent ask, a frictionless link, and a small perk for honest feedback can lift your weekly review count from 1 to 10+ — and rank you above every competitor in your zip code.",
  },
  {
    slug: "instagram-marketing-for-local-business",
    h1: "Instagram marketing for local businesses (without burning out)",
    metaTitle: "Instagram Marketing for Local Business: Practical Playbook",
    metaDescription:
      "Skip the influencer hype. A practical, sustainable Instagram playbook for local businesses — three posts a week, real customers, real results.",
    intro:
      "Most local-business Instagram advice is written for B2B SaaS or fashion brands. This is different: a sustainable rhythm built around customers you already serve, content you can shoot in five minutes, and tools that do the heavy lifting.",
    schema: "Article",
    whyItMatters: [
      "Instagram is the #2 platform (after Google) for discovering local businesses under 35.",
      "Geotagged posts get 79% higher engagement than ungeotagged.",
      "User-generated content converts 4x better than branded content.",
      "Reels reach 2-3x more non-followers than feed posts — free distribution.",
    ],
    steps: [
      {
        title: "Set a sustainable cadence: 3 posts, 5 stories a week",
        body:
          "Burnout kills more local accounts than bad content. Commit to a cadence you can hit during a slow week. Anything more is upside.",
      },
      {
        title: "Build a content menu of 5 repeatable formats",
        body:
          "Behind-the-scenes, customer spotlights, product close-ups, team intros, before/afters. Rotate. Don't reinvent — your audience hasn't seen last month's post.",
      },
      {
        title: "Turn every transaction into a content moment",
        body:
          "Offer a small perk (10% off, a free add-on) for customers who tag you. You get authentic content, they get a perk, both of you get reach.",
      },
      {
        title: "Geotag every post and story",
        body:
          "Your neighborhood, not just your city. Hyperlocal tags get found by people 1 block away who are deciding where to eat.",
      },
      {
        title: "Comment first, post second",
        body:
          "30 minutes of genuine comments on nearby business accounts builds more reach than another post. Algorithm rewards activity.",
      },
    ],
    pitfalls: [
      "Trying to be a 'brand' instead of a place. Local businesses win with personality, not polish.",
      "Outsourcing without a brief. Generic agency content reads as generic.",
      "Chasing follower counts. 300 nearby followers > 3,000 distant ones.",
      "Skipping captions. Captions are where SEO and personality live.",
    ],
    tools: [TOOL_INSTA_CAPTION, TOOL_HASHTAGS, TOOL_QR, TOOL_UTM],
    industries: [IND_COFFEE, IND_SALON, IND_RESTAURANT, IND_FITNESS],
    closing:
      "Instagram for local business is a long game played with short content. Pick a cadence, build the menu, reward customers who post, and stay consistent. The compounding starts at month three.",
  },
  {
    slug: "referral-program-for-small-business",
    h1: "How to run a referral program that actually works",
    metaTitle: "Referral Program for Small Business: Step-by-Step Playbook",
    metaDescription:
      "A practical, low-cost referral program design for small businesses — what to reward, how to track it, and the scripts that get customers talking.",
    intro:
      "Referrals are the highest-converting, lowest-cost channel in local business. The hard part isn't paying for them — it's making them easy to give. This playbook shows you how.",
    schema: "HowTo",
    whyItMatters: [
      "Referred customers have 16% higher LTV than other channels.",
      "Word-of-mouth drives 5x more sales than paid ads in local categories.",
      "92% of consumers trust referrals from people they know.",
      "Most small businesses 'have' a referral program but never run it actively.",
    ],
    steps: [
      {
        title: "Pick a reward worth talking about",
        body:
          "$5 off rarely moves anyone. A free service, a meaningful upgrade, or a real cash credit ($25+) makes the share worth the social cost.",
      },
      {
        title: "Reward both sides",
        body:
          "Double-sided programs convert 3-4x better than one-sided. The friend gets a discount; the referrer gets credit. Both feel good.",
      },
      {
        title: "Make sharing one tap",
        body:
          "A pre-filled SMS or a personal link is the only way. 'Tell your friends' as a sentence on a flyer is not a program.",
      },
      {
        title: "Train staff to mention it at the right moment",
        body:
          "Right after a great experience — at checkout, post-service. Not in emails the customer ignored.",
      },
      {
        title: "Show the leaderboard",
        body:
          "A simple wall-mounted (or email-based) shout-out for top referrers turns a transactional program into a community moment.",
      },
    ],
    pitfalls: [
      "Tiny rewards. If it's not exciting, no one shares.",
      "Manual tracking. Spreadsheets break by month three.",
      "Only rewarding the referrer. The friend has to feel welcomed.",
      "Never mentioning the program. Customers don't read your menu twice.",
    ],
    tools: [TOOL_SMS_REVIEW, TOOL_UTM, TOOL_QR, TOOL_REVIEW_EMAIL],
    industries: [IND_SALON, IND_FITNESS, IND_DENTAL, IND_RESTAURANT],
    closing:
      "A referral program is a small habit, not a launch. Pick a real reward, make it one tap, mention it at the moment of delight, and watch your best customers become your best marketers.",
  },
  {
    slug: "loyalty-program-without-an-app",
    h1: "How to run a loyalty program without building an app",
    metaTitle: "Loyalty Program Without an App: Local Business Guide",
    metaDescription:
      "Skip the $20k custom app. A practical loyalty playbook for local business using QR codes, SMS, and perks — set up in an afternoon.",
    intro:
      "Loyalty doesn't need an app. It needs a memorable reward, a low-friction way to track visits, and a moment of recognition. Here's how to build one in an afternoon.",
    schema: "HowTo",
    whyItMatters: [
      "Repeat customers spend 67% more than first-timers.",
      "5% increase in retention can lift profit 25-95%.",
      "App-based loyalty programs see <8% sustained usage. Lightweight programs see 40%+.",
      "Punch cards still work — they're just dressed up with QR codes now.",
    ],
    steps: [
      {
        title: "Define the goal: visits, spend, or referrals",
        body:
          "Each requires a different mechanic. Visit-based works for coffee shops; spend-based for retail; referral-based for services.",
      },
      {
        title: "Pick a reward customers actually want",
        body:
          "Free item beats discount. Surprise upgrade beats predictable reward. Birthday perk beats none.",
      },
      {
        title: "Use a QR code, not an app",
        body:
          "A QR at the register tied to phone number is enough. No download, no friction, no $20k bill.",
      },
      {
        title: "Send the milestone notification",
        body:
          "'You're one visit from a free coffee' is the single highest-converting message a local business can send.",
      },
      {
        title: "Surprise top members",
        body:
          "Recognize your top 10 customers each month with something unannounced. Loyalty is emotional, not transactional.",
      },
    ],
    pitfalls: [
      "Building an app. Don't.",
      "Forgetting the milestone notification. The reminder is the program.",
      "Rewards too far away. 10-stamp cards see 60% drop-off by stamp 4.",
      "No data export. You should own the customer list, not the loyalty vendor.",
    ],
    tools: [TOOL_QR, TOOL_SMS_REVIEW, TOOL_UTM, TOOL_REVIEW_EMAIL],
    industries: [IND_COFFEE, IND_RESTAURANT, IND_SALON, IND_FITNESS],
    closing:
      "Loyalty is a tiny daily habit on the customer's side and a tiny daily habit on yours. Pick the mechanic, set the reward, send the milestone, and don't build an app.",
  },
  {
    slug: "local-seo-checklist",
    h1: "The 12-step local SEO checklist for small business",
    metaTitle: "Local SEO Checklist: 12 Steps for Small Business",
    metaDescription:
      "A no-fluff local SEO checklist for small business owners. Twelve concrete steps you can complete in a weekend to rank higher in your zip code.",
    intro:
      "You don't need an agency to rank in the Google Map Pack. You need consistency on twelve specific signals. Here they are, in order of impact.",
    schema: "HowTo",
    whyItMatters: [
      "46% of all Google searches have local intent.",
      "78% of local mobile searches result in an offline purchase within 24 hours.",
      "Top 3 Map Pack results capture 75% of all clicks.",
      "Most local competitors are doing only 3-4 of these 12 steps.",
    ],
    steps: [
      {
        title: "Claim and verify your Google Business Profile",
        body: "Step zero. Until you've verified, nothing else moves the needle.",
      },
      {
        title: "Make NAP (Name, Address, Phone) consistent everywhere",
        body:
          "Same exact format across Google, Yelp, Apple Maps, Facebook, your site. Inconsistency is a top-3 ranking killer.",
      },
      {
        title: "Pick the most specific primary category",
        body: "'Italian restaurant' beats 'restaurant.' 'Pediatric dentist' beats 'dentist.' Specificity wins.",
      },
      {
        title: "Add 25+ photos, refresh monthly",
        body: "Profiles with 100+ photos see 520% more calls than those with <10.",
      },
      {
        title: "Build a steady review pace",
        body: "Recency is weighted heavily. A profile with 5 reviews this month outranks one with 100 from 2 years ago.",
      },
      {
        title: "Respond to every review",
        body: "Engagement is a ranking signal. Public responses also serve as keyword-rich content.",
      },
      {
        title: "Post weekly on your Google profile",
        body: "Google Posts are an underused free real-estate. Weekly cadence keeps the listing 'fresh.'",
      },
      {
        title: "Build local citations on the top 10 directories",
        body: "Yelp, BBB, YellowPages, Foursquare, Apple Maps, Bing Places, plus 4 niche ones for your category.",
      },
      {
        title: "Embed a Google Map on your contact page",
        body: "Tiny technical signal that helps Google associate your domain with your physical location.",
      },
      {
        title: "Use structured data (LocalBusiness schema)",
        body: "Adds the price range, hours, and rating to your search snippet. Most small sites skip this.",
      },
      {
        title: "Earn a few local backlinks",
        body: "A chamber-of-commerce link, a local news mention, a partner site. Quality beats quantity.",
      },
      {
        title: "Track Map Pack rank weekly",
        body: "Free rank trackers exist. Without measurement you can't tell if any of this is working.",
      },
    ],
    pitfalls: [
      "Buying citation services that spam low-quality directories.",
      "Stuffing your business name with keywords. Google removes listings for this.",
      "Ignoring negative reviews. They tank rank if unanswered.",
      "Setting it up and walking away. Local SEO is a maintenance loop, not a launch.",
    ],
    tools: [TOOL_REVIEW_EMAIL, TOOL_QR, TOOL_UTM, TOOL_SMS_REVIEW],
    industries: [IND_RESTAURANT, IND_SALON, IND_DENTAL, IND_AUTO, IND_COFFEE],
    closing:
      "Local SEO is twelve small jobs done consistently. Most competitors do four of them. Doing eight puts you in the top three.",
  },
  {
    slug: "user-generated-content-playbook",
    h1: "The user-generated content playbook for local business",
    metaTitle: "User-Generated Content Playbook for Local Business",
    metaDescription:
      "Turn customers into your content team. A practical UGC playbook for local businesses — perks, prompts, and rights, made simple.",
    intro:
      "UGC outperforms branded content by every measurable metric — engagement, conversion, recall. The only barrier is getting it consistently. This playbook fixes that.",
    schema: "Article",
    whyItMatters: [
      "UGC converts 4x better than branded content.",
      "79% of consumers say UGC heavily influences purchase decisions.",
      "Each UGC post saves ~$50 in content production cost.",
      "UGC builds a backlog you can reshare for months.",
    ],
    steps: [
      {
        title: "Make the perk worth posting for",
        body:
          "A free side or a $5 discount won't unlock the phone. A free entrée, a free service, or a $25 credit will.",
      },
      {
        title: "Give customers a specific prompt",
        body:
          "'Post a picture' gets nothing. 'Snap your latte, tag us, get a free pastry tomorrow' gets dozens.",
      },
      {
        title: "Use a branded hashtag they can remember",
        body:
          "Short, one or two words, ideally a pun. Print it on receipts, table tents, and packaging.",
      },
      {
        title: "Get rights once, reuse forever",
        body:
          "A simple terms-acceptance step when claiming the perk grants you reshare rights. Saves you from chasing DMs.",
      },
      {
        title: "Reshare within 48 hours",
        body:
          "Tagged customers expect a reshare. Fast resharing is the strongest social proof that the program is real.",
      },
    ],
    pitfalls: [
      "Stealing UGC without permission. Brand-killer.",
      "Reposting once a month. Cadence matters.",
      "Demanding 5-star captions. Lets you ignore real feedback.",
      "Not crediting the creator. Always tag.",
    ],
    tools: [TOOL_INSTA_CAPTION, TOOL_HASHTAGS, TOOL_QR, TOOL_UTM],
    industries: [IND_COFFEE, IND_SALON, IND_RESTAURANT, IND_FITNESS],
    closing:
      "UGC isn't free — you pay for it in perks. But the rate is unbeatable: a $5 reward for a piece of content that beats $500 of agency work. Build the loop, run it weekly, and stop writing captions yourself.",
  },
  {
    slug: "qr-code-marketing-ideas",
    h1: "QR code marketing ideas that actually convert",
    metaTitle: "QR Code Marketing Ideas: 10 Plays That Convert",
    metaDescription:
      "Ten high-converting QR code ideas for local business — from review requests to loyalty signups. Free templates and tracking included.",
    intro:
      "QR codes survived 2020 and became a permanent part of local marketing. Used well, they're the bridge between a real-world moment and a measurable digital action. Used badly, they're stickers no one scans.",
    schema: "Article",
    whyItMatters: [
      "QR code scans grew 433% from 2020 to 2024 — they're not going away.",
      "Average QR campaign sees a 5-15% scan rate, far higher than email click-through.",
      "Each scan is trackable: source, time, location, conversion.",
      "Zero printing cost beyond paper — and the design can change without reprinting.",
    ],
    steps: [
      {
        title: "Review request at the register",
        body: "The fastest path from happy moment to written review. Branded QR + one-tap link.",
      },
      {
        title: "Loyalty signup on the table tent",
        body: "Capture phone numbers without an app. Use a perk-on-signup to drive enrollment.",
      },
      {
        title: "Menu / service list QR",
        body: "A dynamic QR lets you update the menu without reprinting. Bonus: track which item gets viewed most.",
      },
      {
        title: "Tag-us-for-a-perk QR",
        body: "On packaging, table tents, or receipts. Drives UGC at near-zero cost.",
      },
      {
        title: "Newsletter signup with a freebie",
        body: "QR on the receipt → freebie this week → email this month. Slow funnel, high LTV.",
      },
      {
        title: "Referral link as a QR",
        body: "A customer hands their phone to a friend; friend scans; both get credit. Frictionless.",
      },
      {
        title: "After-hours service request",
        body: "Window-mounted QR for callers after closing. Turns 'sorry we're closed' into a captured lead.",
      },
      {
        title: "Event/promo landing pages",
        body: "Print one QR for the campaign, track scans separately, retire when done.",
      },
      {
        title: "Staff training cards",
        body: "Internal QR → standard operating procedures, refresher videos, weekly memo.",
      },
      {
        title: "WiFi password sharing",
        body: "Get the customer's eye on a QR every visit. Pair with a soft CTA below.",
      },
    ],
    pitfalls: [
      "Static QR codes for dynamic content — you can't change them.",
      "No tracking. Use UTM parameters on every link.",
      "Tiny QR codes. Minimum 1.5\" printed.",
      "No call to action. 'Scan me' is not a reason to scan.",
    ],
    tools: [TOOL_QR, TOOL_UTM, TOOL_REVIEW_EMAIL, TOOL_SMS_REVIEW],
    industries: [IND_RESTAURANT, IND_COFFEE, IND_SALON, IND_AUTO, IND_FITNESS],
    closing:
      "A good QR code campaign feels like serendipity to the customer and a spreadsheet to you. Pick three of these plays, print them this week, and track what converts.",
  },
  {
    slug: "sms-marketing-for-local-business",
    h1: "SMS marketing for local business (without being spammy)",
    metaTitle: "SMS Marketing for Local Business: Practical Guide",
    metaDescription:
      "How to run an SMS marketing program for local business that customers actually appreciate. Opt-in, frequency, copy, and compliance — covered.",
    intro:
      "SMS open rates are 98%. Email is 20%. The catch is that customers will unsubscribe — or report you as spam — the moment you abuse the channel. Done right, SMS is the highest-ROI channel a local business has.",
    schema: "Article",
    whyItMatters: [
      "SMS open rates: 98%. Email: 20%. Push: 5%.",
      "Average SMS response time: 90 seconds.",
      "Customers prefer SMS for appointment reminders by 4:1 over email.",
      "Compliance (TCPA, A2P 10DLC) is non-negotiable. Get it right or pay $500/violation.",
    ],
    steps: [
      {
        title: "Get explicit opt-in",
        body:
          "A keyword to a short code, a checkbox at checkout, a QR with consent language. No assumed opt-in, ever.",
      },
      {
        title: "Pick a cadence and stick to it",
        body:
          "Two messages a month for transactional/promotional. Five a week for time-sensitive (appointments, alerts).",
      },
      {
        title: "Write like a person",
        body:
          "'Hey! Quick reminder — we have 2 spots open tomorrow at 3 and 5. Reply Y to grab one.' Not corporate-speak.",
      },
      {
        title: "Always include an opt-out",
        body: "'Reply STOP to opt out.' Required by law, and a good faith signal.",
      },
      {
        title: "Segment by behavior",
        body:
          "Last visit, total spend, type of service. Personalized SMS outperforms broadcast by 3-5x.",
      },
    ],
    pitfalls: [
      "Buying lists. Illegal and ineffective.",
      "Sending at 8am or 10pm. 10am-12pm and 5-7pm are your windows.",
      "No double opt-in. One typo and you're spamming the wrong number.",
      "Using SMS for things SMS isn't good for (long updates, marketing essays).",
    ],
    tools: [TOOL_SMS_REVIEW, TOOL_REVIEW_EMAIL, TOOL_QR, TOOL_UTM],
    industries: [IND_SALON, IND_RESTAURANT, IND_DENTAL, IND_FITNESS, IND_AUTO],
    closing:
      "SMS is the most intimate channel you have. Used sparingly, it builds loyalty. Used carelessly, it burns trust permanently. Get consent, keep cadence tight, write like a human.",
  },
];

export const LOCAL_GUIDE_MAP: Map<string, LocalGuide> = new Map(
  LOCAL_GUIDES.map((g) => [g.slug, g]),
);

export function getLocalGuideBySlug(slug: string): LocalGuide | undefined {
  return LOCAL_GUIDE_MAP.get(slug);
}
