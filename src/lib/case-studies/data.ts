// Illustrative case studies for SEO/content marketing.
// These are aspirational composites based on real campaign patterns —
// they are intentionally not attributed to named customers.

export type CaseStudySection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type CaseStudy = {
  slug: string;
  h1: string;
  title: string;
  description: string;
  businessType: string;
  location: string;
  timePeriod: string;
  headlineResult: string;
  publishedAt: string;
  updatedAt?: string;
  hero: {
    label: string;
    stat: string;
    detail: string;
  }[];
  challenge: CaseStudySection;
  triedBefore: CaseStudySection;
  approach: CaseStudySection;
  results: CaseStudySection;
  lessons: { title: string; body: string }[];
  tryYourself: CaseStudySection;
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "how-cafe-luna-got-127-reviews-in-30-days",
    h1: "How Cafe Luna Got 127 Google Reviews In 30 Days",
    title: "How Cafe Luna Got 127 Google Reviews In 30 Days",
    description:
      "An Austin coffee shop turned every paying customer into a Google reviewer using a $2 perk and a QR code on the receipt — going from 84 reviews to 211 in one month.",
    businessType: "Independent coffee shop",
    location: "Austin, TX",
    timePeriod: "30 days",
    headlineResult: "127 new Google reviews in 30 days (4.9 average)",
    publishedAt: "2026-04-15",
    hero: [
      { label: "New reviews", stat: "127", detail: "in 30 days" },
      { label: "Average rating", stat: "4.9", detail: "of 5 stars" },
      { label: "Cost per review", stat: "$2.10", detail: "in perk redemption" },
      { label: "Map pack rank", stat: "#3 → #1", detail: "for 'coffee near me'" },
    ],
    challenge: {
      heading: "The challenge",
      paragraphs: [
        "An Austin coffee shop on a busy stretch of South Congress had been open for three years. The drinks were great, the regulars were loyal, and yet the Google Business Profile was stuck at 84 reviews — most of them from the first six months after opening. New reviews trickled in at maybe two or three a month.",
        "The owner kept seeing competitors with 400, 600, even 1,200 reviews show up above her in the local 'coffee near me' map pack. She knew her product was better. She also knew most customers walked out the door with a great experience and never thought about Google again. The gap between 'happy customer' and 'happy customer who leaves a review' was killing her foot traffic from search.",
      ],
    },
    triedBefore: {
      heading: "What they tried before",
      paragraphs: [
        "The owner had cycled through every common tactic small coffee shops use to chase reviews. None of them moved the needle.",
      ],
      bullets: [
        "A handwritten chalkboard sign at the register that said 'Loved your latte? Leave us a Google review!' — generated maybe one review a week and was easy to ignore.",
        "Manually emailing the rewards program list asking for reviews — felt awkward, opt-out rates spiked, and only 0.3% of recipients actually left a review.",
        "Asking baristas to verbally request reviews at handoff — staff hated it, customers found it pushy, and it slowed the line during morning rush.",
        "A NextDoor post offering a free pastry to anyone who reviewed — drove three reviews and a flood of comments asking if it was a bribe.",
      ],
    },
    approach: {
      heading: "How they used Social Perks",
      paragraphs: [
        "The owner built a single Google Reviews program in Social Perks: leave a verified review, get a $2 credit toward your next drink. The platform generated a printable QR code she taped to the back of every receipt and added to a small acrylic stand by the pickup counter.",
        "Customers scanned the QR with their phone, were walked through writing a Google review on the spot, and as soon as the review went live the system credited their account. The next time they ordered, the barista saw a 'PERK READY' badge in the POS and applied the discount automatically — no coupon codes, no manual lookup, no awkward verification.",
        "The FTC compliance disclosure was injected automatically by Social Perks at the bottom of the review prompt, so reviewers were transparent about getting a small thank-you, which kept Google's review policies and FTC guidelines satisfied.",
      ],
      bullets: [
        "Perk type: $2 credit toward next purchase (~one drink upgrade)",
        "Action required: verified Google review + photo optional",
        "Distribution: QR code on receipts and pickup-counter card",
        "Verification: automatic via Google Business Profile webhook",
        "Compliance: auto-injected FTC #ad disclosure language",
      ],
    },
    results: {
      heading: "Results",
      paragraphs: [
        "Within the first week the shop got 23 new reviews — more than the previous three months combined. By day 30 the total was 127 new reviews, pushing the Google Business Profile from 84 reviews to 211. Average rating rose from 4.6 to 4.9 because the perk attracted recently-served happy customers, not the long-tail of disappointed visitors who tend to self-select into reviewing.",
        "The map pack ranking for 'coffee near me' inside a 1.5-mile radius moved from position #3 to position #1 by the end of week three. Foot traffic from Google Maps directions, tracked through the GBP insights dashboard, increased 38% month-over-month. The total cost of the perk program was approximately $267 ($2.10 per redemption), which the owner described as 'the cheapest marketing I have ever spent money on'.",
      ],
      bullets: [
        "Reviews: 84 → 211 (+127) in 30 days",
        "Average rating: 4.6 → 4.9 stars",
        "Map pack rank for 'coffee near me': #3 → #1",
        "Direction requests from Google Maps: +38%",
        "Phone calls from GBP listing: +52%",
        "Total program cost: $267 (~$2.10 per review)",
      ],
    },
    lessons: [
      {
        title: "The point of contact matters more than the message",
        body: "Asking for reviews via email two days after a visit catches people in the wrong context. Asking with a QR code on the receipt — while the cup of coffee is still warm in their hand — converts 20x better. Meet customers in the moment of peak satisfaction.",
      },
      {
        title: "A small, immediate perk beats a big, future reward",
        body: "A $2 credit available on the next visit feels concrete and earned. A '$25 gift card raffle entry' feels speculative. Customers convert on the small certain reward at much higher rates.",
      },
      {
        title: "Automate the verification so staff are not the bottleneck",
        body: "If a barista has to manually check whether a review was posted, the program dies in the first week. Tying perk redemption to a real platform webhook means staff just see the badge and apply the discount — zero friction.",
      },
      {
        title: "Compliance disclosure does not hurt conversion",
        body: "Customers do not care that you disclosed you offered a small thank-you. They care that the offer is fair. A clear FTC notice actually built trust in the perk program rather than eroding it.",
      },
      {
        title: "Map pack ranking responds quickly to review velocity",
        body: "Google's local algorithm weights recent review velocity heavily. Going from 1 review per week to 30 per week was the single biggest factor in the map pack jump — even more than total review count.",
      },
    ],
    tryYourself: {
      heading: "Try it yourself",
      paragraphs: [
        "If you run a small coffee shop, restaurant, or any high-foot-traffic local business, this exact playbook works. The three things to copy: (1) a small perk under $5 that pays out on the next visit, (2) a QR code at the point of sale, and (3) automatic verification so your staff is not stuck checking review screenshots.",
        "Social Perks ships with a Google Reviews program template you can launch in about ten minutes. The platform handles compliance disclosure, verification through the Google Business Profile API, and POS integration so your team does not need to learn anything new.",
      ],
    },
  },
  {
    slug: "yoga-studio-fills-classes-using-instagram-perks",
    h1: "How A Brooklyn Yoga Studio Filled Every Class Using Instagram Perks",
    title: "How A Brooklyn Yoga Studio Filled Every Class Using Instagram Perks",
    description:
      "A Brooklyn yoga studio went from 38% class fill rate to 91% in 60 days by trading free classes for Instagram stories — adding 1,400 new local followers in the process.",
    businessType: "Boutique yoga studio",
    location: "Brooklyn, NY",
    timePeriod: "60 days",
    headlineResult: "Class fill rate from 38% to 91% in 60 days",
    publishedAt: "2026-04-08",
    hero: [
      { label: "Class fill rate", stat: "38% → 91%", detail: "in 60 days" },
      { label: "New IG followers", stat: "+1,420", detail: "all NYC-local" },
      { label: "New paying members", stat: "63", detail: "from IG attribution" },
      { label: "Cost per acquisition", stat: "$11", detail: "per new member" },
    ],
    challenge: {
      heading: "The challenge",
      paragraphs: [
        "A boutique yoga studio in Park Slope had a beautiful space, certified instructors, and a 12:1 average class ratio that left a lot of empty mats. Their average class fill rate was 38%, which meant most teachers were running classes for four or five students in a room built for fourteen.",
        "The owner had spent the last two years quietly burning cash on Instagram and Facebook ads. Cost per click had crept up, the audience kept overlapping with bigger studios, and the leads that did come in were mostly out-of-borough yoga shoppers who took one class on a discount and never came back.",
      ],
    },
    triedBefore: {
      heading: "What they tried before",
      paragraphs: [
        "The studio had tried just about every conventional growth tactic for a small fitness business.",
      ],
      bullets: [
        "Meta ads targeting Brooklyn women 25-45 interested in yoga — CAC of $84 and most leads ghosted after the intro offer.",
        "ClassPass — filled some classes but trained customers to never pay full price and devalued the membership tier.",
        "Posting their own Instagram content with branded hashtags — averaged 320 likes and almost zero new sign-ups.",
        "Asking instructors to invite friends with a referral discount — netted seven new members over six months.",
      ],
    },
    approach: {
      heading: "How they used Social Perks",
      paragraphs: [
        "The studio launched a single program: post an Instagram story tagging the studio after class, get a free class on your next visit. The perk was tracked through Social Perks' tag-detection system, which monitors mentions of the studio's handle and verifies the post is geotagged within Brooklyn.",
        "Members were given a card with a QR code at sign-in. After class they scanned it, posted a story to Instagram with the studio tag, and the next class on their account was credited as free. The studio cap was one free class per member per week — high enough to feel generous, low enough to protect margins.",
        "Because Instagram stories disappear after 24 hours, the verification webhook had to capture them in real-time — Social Perks handled this through the Instagram Graph API. The FTC #ad disclosure was auto-added to the story copy template the studio shared with members.",
      ],
      bullets: [
        "Perk: one free class per week (worth $32) per Instagram story",
        "Action required: tagged story posted within 24h of class",
        "Tier bonus: members with 2K+ followers got two free classes",
        "Verification: real-time Instagram Graph API tag detection",
      ],
    },
    results: {
      heading: "Results",
      paragraphs: [
        "By day 60 the studio's average class fill rate had gone from 38% to 91%. The main driver was hyper-local social proof — every story tagged the studio with a geotag, so anyone in Brooklyn following an existing member started seeing yoga classes from people in their actual neighborhood. The studio's Instagram account picked up 1,420 new followers over 60 days, almost all from NYC.",
        "More importantly, 63 of those new followers converted to paying intro packages. With the studio crediting an average of 0.8 free classes per member per week (most members did not post every visit), the all-in cost per new paying member came out to about $11 — versus $84 on Meta ads for a member who often did not stick.",
      ],
      bullets: [
        "Class fill rate: 38% → 91% (+53 percentage points)",
        "New Instagram followers: +1,420 (94% NYC-local)",
        "New paying members from IG attribution: 63",
        "Cost per acquisition: $11 (vs $84 on Meta ads)",
        "Member retention at 90 days: 71% (vs 22% from ClassPass)",
      ],
    },
    lessons: [
      {
        title: "Existing customers are your best content engine",
        body: "Your members already follow other locals who would love your studio. One tagged story from a happy member reaches a more relevant audience than 1,000 paid impressions to a cold lookalike.",
      },
      {
        title: "Geotagged user content beats branded content for local discovery",
        body: "Instagram's algorithm surfaces geotagged stories to nearby users. A member's story with your geotag will reach more locals than your own studio post will.",
      },
      {
        title: "Cap the perk to protect economics",
        body: "Without a one-per-week cap, the same five enthusiastic members will mint themselves free classes daily. A weekly cap rewards repeat behavior without becoming an unlimited subsidy.",
      },
      {
        title: "Tier the perk by influence so it scales",
        body: "Members with 2K+ local followers drive disproportionate signups. Bumping their reward to two free classes turned them into a self-organizing micro-influencer team.",
      },
      {
        title: "Verification automation is non-negotiable for stories",
        body: "Stories vanish in 24h. Manual verification is impossible at scale. The whole program only worked because tag detection was automated and instantaneous.",
      },
    ],
    tryYourself: {
      heading: "Try it yourself",
      paragraphs: [
        "Any class-based business — yoga, pilates, spin, climbing, dance, martial arts — can copy this template directly. The mechanics are simple: free class for a tagged story, weekly cap, verification through real Instagram API monitoring.",
        "The Social Perks Instagram Story program template includes the FTC disclosure language, the verification webhook, the tier-by-followers logic, and a templated card you can print and hand out at sign-in.",
      ],
    },
  },
  {
    slug: "restaurant-doubles-instagram-followers-in-60-days",
    h1: "How A Nashville Restaurant Doubled Its Instagram Followers In 60 Days",
    title: "How A Nashville Restaurant Doubled Its Instagram Followers In 60 Days",
    description:
      "A Nashville restaurant grew from 3,200 to 7,100 Instagram followers in 60 days by rewarding diners with $5 dessert credits for tagged posts — and watched reservation bookings double too.",
    businessType: "Casual full-service restaurant",
    location: "Nashville, TN",
    timePeriod: "60 days",
    headlineResult: "3,200 → 7,100 Instagram followers in 60 days",
    publishedAt: "2026-04-01",
    hero: [
      { label: "Instagram followers", stat: "3,200 → 7,100", detail: "+122%" },
      { label: "Tagged posts", stat: "847", detail: "in 60 days" },
      { label: "Reservations from IG", stat: "+102%", detail: "vs prior 60 days" },
      { label: "Cost per follower", stat: "$0.71", detail: "all-in" },
    ],
    challenge: {
      heading: "The challenge",
      paragraphs: [
        "A 90-seat Nashville restaurant in The Gulch had built a strong dinner crowd through word of mouth but had a flat Instagram following hovering around 3,200 for almost a year. Lunch service was the weak spot — half-empty most weekdays — and the owners knew Instagram was where Nashville food discovery happened.",
        "The challenge was not content quality. The kitchen team posted gorgeous plate shots multiple times a week. The challenge was distribution: their own posts kept landing in front of the same 3,200 people, while customers walked out of the restaurant having taken better photos than the kitchen ever could.",
      ],
    },
    triedBefore: {
      heading: "What they tried before",
      paragraphs: [
        "The owners had tried the standard restaurant Instagram playbook for two years with diminishing returns.",
      ],
      bullets: [
        "Hiring a part-time social media manager — $1,800/month for content that performed worse than the chef's casual phone shots.",
        "Paying local food influencers for sponsored posts — $400-800 each, with measurable lift on the day of post but no compounding follower growth.",
        "Hashtag research and aggressive use of #nashvilleeats — minor reach bumps, no sustained follower growth.",
        "Reels with trending audio — went viral once with 220K views but added only 80 followers and zero reservations.",
      ],
    },
    approach: {
      heading: "How they used Social Perks",
      paragraphs: [
        "The owners launched a 'Tag Us, Eat Free Dessert' program in Social Perks. Any diner who posted a feed photo or reel tagging the restaurant got a $5 dessert credit applied to their next visit. The program was promoted via a small card slipped into every check presenter and a soft mention from servers when delivering the bill.",
        "The Social Perks platform handled detection of tagged posts (both feed and reels) through the Instagram Graph API, verified the post was public and geotagged, and issued the dessert credit to the diner's profile automatically. When the diner returned, the POS recognized the credit and applied it at checkout.",
        "Because dessert credits are high-perceived-value but low-cost (a slice of pie costs about $1.40 in food cost), the unit economics worked out beautifully. The FTC disclosure was added to the post copy template the restaurant suggested but not required.",
      ],
      bullets: [
        "Perk: $5 dessert credit on next visit per tagged feed/reel post",
        "Cap: one credit per diner per week",
        "Tier bonus: diners with 5K+ followers got a free dessert outright",
        "Verification: Instagram Graph API tag detection (feed + reels)",
      ],
    },
    results: {
      heading: "Results",
      paragraphs: [
        "Over 60 days the restaurant generated 847 tagged posts on Instagram. Follower count went from 3,200 to 7,100, a 122% increase. The total estimated reach across all tagged posts was 412,000 impressions — most of them locally relevant, since diners' followers tended to also live in middle Tennessee.",
        "The downstream business impact was the bigger story. Reservations attributed to Instagram (asked at booking and confirmed via Resy referral source) went up 102% versus the prior 60-day window. Lunch bookings, the original weak spot, went from 31% capacity to 64% capacity. Total program cost was approximately $2,800 in dessert credits and $410 in actual food cost, versus an estimated $5,200 the restaurant would have spent on equivalent paid social.",
      ],
      bullets: [
        "Instagram followers: 3,200 → 7,100 (+122%)",
        "Tagged posts generated: 847 in 60 days",
        "Total estimated reach: 412,000 impressions (mostly local)",
        "Reservations from IG attribution: +102% MoM",
        "Lunch capacity: 31% → 64%",
        "Cost per follower: $0.71 all-in",
      ],
    },
    lessons: [
      {
        title: "Dessert is the perfect restaurant perk",
        body: "Dessert has high perceived value to the customer ($8-12 menu price) and low food cost to the operator ($1-2). No other perk has this asymmetry — and dessert credits get diners back in the door for a full visit.",
      },
      {
        title: "Reels and feed posts both count, do not pick one",
        body: "Some diners are reels people, some are feed people. Letting either format qualify doubles participation versus restricting to one.",
      },
      {
        title: "Servers should mention it casually, not pitch it",
        body: "A line of script ('we also have a thing where if you tag us you get free dessert next visit') in a friendly tone outperformed any printed sign or table tent. Make it feel like a hospitality favor, not a marketing ask.",
      },
      {
        title: "Local followers compound, viral followers do not",
        body: "The viral reel from the prior year added 80 followers but no business. The 847 tagged posts mostly reached local Nashvillians — fewer impressions, far higher conversion to reservations.",
      },
      {
        title: "Follower growth is a leading indicator, not the goal",
        body: "The owners initially measured success by follower count, but the real prize was the doubling of weekday reservations. Set the leading metric (follower growth) as the dial, but always tie back to revenue.",
      },
    ],
    tryYourself: {
      heading: "Try it yourself",
      paragraphs: [
        "Any restaurant with a dessert program can run this exact campaign. The Social Perks restaurant template ships with the dessert credit logic, Instagram tag detection, and POS integration for major systems including Toast, Square, and Resy.",
        "The single most important configuration choice is the per-week cap. One credit per diner per week prevents abuse without feeling stingy. Without it, the same dozen power-users will mint endless desserts.",
      ],
    },
  },
  {
    slug: "salon-books-fully-from-tiktok-discount-campaign",
    h1: "How A Los Angeles Salon Booked Solid From One TikTok Discount Campaign",
    title: "How A Los Angeles Salon Booked Solid From One TikTok Discount Campaign",
    description:
      "A West Hollywood salon ran a 'TikTok the transformation, get 20% off' campaign and went from 60% chair utilization to a 6-week waitlist in 90 days.",
    businessType: "Hair salon",
    location: "Los Angeles, CA",
    timePeriod: "90 days",
    headlineResult: "From 60% chair utilization to a 6-week waitlist in 90 days",
    publishedAt: "2026-03-25",
    hero: [
      { label: "Chair utilization", stat: "60% → 100%", detail: "in 90 days" },
      { label: "Waitlist", stat: "6 weeks", detail: "out by day 90" },
      { label: "TikTok views", stat: "1.8M", detail: "across client posts" },
      { label: "New clients", stat: "+184", detail: "from TikTok attribution" },
    ],
    challenge: {
      heading: "The challenge",
      paragraphs: [
        "A four-chair salon in West Hollywood had a small but loyal client base, beautifully edited Instagram content, and absolutely no presence on TikTok. The owner could see TikTok was where her ideal client (women 22-38, beauty-curious, Westside LA) actually discovered new salons in 2026, but every attempt to make studio TikTok content fell flat.",
        "Chair utilization sat at 60%, which meant two of four chairs were empty most weekdays. The salon was profitable but underutilized, and the owner knew that without a TikTok-driven inbound flow she was going to lose the next generation of clients to younger, more discoverable salons.",
      ],
    },
    triedBefore: {
      heading: "What they tried before",
      paragraphs: [
        "The owner had spent six months trying to crack TikTok herself, with very little to show for it.",
      ],
      bullets: [
        "Posting her own transformation videos with trending sounds — averaged 600 views and one new booking inquiry per month.",
        "Hiring a TikTok consultant for $2,500 to develop a content strategy — produced a 40-page deck and zero new clients.",
        "Running TikTok Spark Ads on her best-performing organic post — burned $1,800 with one tracked booking.",
        "Asking her stylists to post their own client work — only one of three actually did, and her account had 110 followers.",
      ],
    },
    approach: {
      heading: "How they used Social Perks",
      paragraphs: [
        "The owner launched a 'Show Off Your Hair' program: any client who posted a TikTok of their finished look (before/after, transition, or styling video) and tagged the salon got 20% off their next service. The Social Perks platform monitored tagged posts via the TikTok Creator Marketplace API and credited the discount to the client's profile automatically.",
        "The key insight was that clients were already filming their hair appointments — they were just posting to private stories, not public TikTok. The 20% discount was enough to push them over the edge to public posting. Stylists started suggesting good camera angles during the blowout. The salon kept a small ring light in the styling area that any client could borrow.",
        "Tier bonuses were aggressive: clients with 10K+ TikTok followers got 30% off, and clients with 50K+ got the entire next service comped. This built in a two-tier flywheel — small accounts drove volume of social proof, large accounts drove discovery.",
      ],
      bullets: [
        "Perk: 20% off next service per tagged TikTok post",
        "Tier bonus: 30% off (10K+ followers), free service (50K+)",
        "Verification: TikTok Creator Marketplace API tag detection",
        "Production support: ring light + suggested angles by stylist",
      ],
    },
    results: {
      heading: "Results",
      paragraphs: [
        "By day 90 the salon had a six-week waitlist for new clients, and existing clients were rebooking before they left the chair. Total TikTok views across client posts hit 1.8 million. The salon's own TikTok account, which had stagnated at 110 followers, grew to 14,200 by riding the wave of clients who all tagged the studio.",
        "Of the 184 new clients booked over the 90-day window, 71% credited TikTok as how they found the salon (asked at booking). The owner expanded from four chairs to six in month four, hired a junior stylist, and started a waitlist-only model where new clients had to book three weeks out. Total program cost was about $4,400 in discounts against $86,000 in attributable new client revenue.",
      ],
      bullets: [
        "Chair utilization: 60% → 100% (with waitlist)",
        "TikTok views (client posts): 1.8M",
        "Studio TikTok followers: 110 → 14,200",
        "New clients: 184 (71% credited TikTok)",
        "Attributable new revenue: ~$86,000 in 90 days",
        "Program cost: $4,400 (5.1% of revenue generated)",
      ],
    },
    lessons: [
      {
        title: "Clients are already filming, you just need to nudge",
        body: "The salon discovered clients were filming themselves on private stories. The 20% perk was the tiny push needed to convert private content into public, tagged content.",
      },
      {
        title: "TikTok works when the content is from real clients",
        body: "Brand-produced TikTok content from a salon owner reads as marketing. A client filming her own hair transformation reads as authentic. The algorithm and the audience both prefer the latter.",
      },
      {
        title: "Stack the tier bonus aggressively for top accounts",
        body: "Comping a $200 service for a client with 50K followers is the cheapest paid placement you will ever buy. Their organic post outperforms any sponsored equivalent and the cost-per-impression is essentially free.",
      },
      {
        title: "Production support raises participation rates",
        body: "A ring light in the salon and a stylist who knows the right angle removed every excuse for not filming. Participation went from 12% of clients to 38% once production support was added.",
      },
      {
        title: "Discount perks work when the next visit is high-value",
        body: "Salon services are $80-300. A 20% discount feels meaningful but does not break unit economics. The same approach would not work for a $4 coffee — there the perk has to be a future credit, not a percentage off.",
      },
    ],
    tryYourself: {
      heading: "Try it yourself",
      paragraphs: [
        "This template works for any service business with high-ticket, photogenic outputs: salons, barbers, nail studios, lash bars, tattoo shops, makeup artists, dental aesthetics. The Social Perks salon template ships with TikTok tag detection, tiered bonus logic, and a printable client card with the program rules.",
      ],
    },
  },
  {
    slug: "boutique-launches-influencer-program-without-budget",
    h1: "How A Portland Boutique Launched An Influencer Program Without A Budget",
    title: "How A Portland Boutique Launched An Influencer Program Without A Budget",
    description:
      "A Portland clothing boutique built a 47-creator local influencer program with zero cash up front by trading store credit for content — and tripled monthly revenue in 90 days.",
    businessType: "Independent clothing boutique",
    location: "Portland, OR",
    timePeriod: "90 days",
    headlineResult: "47 local creator partnerships and 3x revenue with zero cash spent",
    publishedAt: "2026-03-18",
    hero: [
      { label: "Creator partners", stat: "47", detail: "local Portland creators" },
      { label: "Revenue lift", stat: "3.1x", detail: "vs prior 90 days" },
      { label: "Cash spent on creators", stat: "$0", detail: "all credit-based" },
      { label: "Inventory turnover", stat: "2.4x faster", detail: "since program" },
    ],
    challenge: {
      heading: "The challenge",
      paragraphs: [
        "A small clothing boutique on NE Alberta in Portland had maybe $400 a month of marketing budget and a large competitor two blocks away with seemingly endless paid influencer partnerships. The owner watched local creators wear the competitor's clothes in every TikTok and Instagram post. She knew she needed an influencer program. She also knew she could not afford to pay anyone.",
        "Her existing clients included plenty of creator-types — she could see their follower counts when they tagged the boutique organically — but she had no system for converting that incidental tagging into intentional content production.",
      ],
    },
    triedBefore: {
      heading: "What they tried before",
      paragraphs: [
        "The owner had cycled through several attempts at building creator relationships, all of which dead-ended in budget conversations.",
      ],
      bullets: [
        "Cold-DMing local creators offering a free outfit for a post — most ignored it, two ghosted after taking the clothes.",
        "Posting in r/portland and r/PDX_FashionPolice asking for collab partners — drew dozens of replies but no quality content.",
        "Using a creator marketplace platform like Aspire — minimum spend was $500/month and creators wanted $200-1,500 cash per post.",
        "Hosting a 'creator night' at the store with free wine — got 12 attendees, two posts, no sustained partnerships.",
      ],
    },
    approach: {
      heading: "How they used Social Perks",
      paragraphs: [
        "The owner used Social Perks' creator program template to launch a tiered store-credit program. Any creator could enroll. They got a unique discount code to share, store credit for content they posted tagging the boutique, and tiered bonuses based on engagement (not just followers).",
        "The flywheel worked like this: a creator enrolled, the system gave them a $50 store credit to use immediately, they came in and picked an outfit, posted about it tagging the boutique, and earned $25 in credit per qualified post going forward. Higher-tier creators (those whose posts drove tracked store visits via QR or unique code) earned escalating credit per post.",
        "The boutique never wrote a single check. Creators got real value (clothes they wanted), the boutique got real content (tagged, geotagged, in real Portland settings), and the platform tracked attribution end-to-end so the owner knew which creators actually drove sales.",
      ],
      bullets: [
        "Perk: $50 enrollment credit + $25 per qualified post",
        "Tier bonuses: $50/post for creators driving store visits",
        "Currency: 100% store credit, never cash",
        "Attribution: unique discount codes per creator",
        "Verification: tagged Instagram posts and reels",
      ],
    },
    results: {
      heading: "Results",
      paragraphs: [
        "Within 90 days the boutique had enrolled 47 active local creators. Combined they generated 312 tagged posts and reels. The boutique's monthly revenue grew from approximately $14,000 to $43,000 — a 3.1x increase. Foot traffic, measured by door counter, increased 180%.",
        "The most important metric was inventory turnover: clothes that previously sat for 90+ days were turning in 35 days on average. The owner started using creator content as her own product photography, replacing $1,200/month in studio shoots with creator-generated photos that performed better online anyway. Total cash spent on the creator program: $0.",
      ],
      bullets: [
        "Creator partners enrolled: 47",
        "Tagged posts/reels generated: 312",
        "Monthly revenue: $14,000 → $43,000 (3.1x)",
        "Foot traffic increase: +180%",
        "Inventory turnover: 90 days → 35 days",
        "Cash spent on creator program: $0",
      ],
    },
    lessons: [
      {
        title: "Store credit is the perfect currency for retail creators",
        body: "Creators love clothes. Boutique owners have inventory. Store credit converts a high-margin asset (your inventory) into creator partnerships at the wholesale cost of goods, not the retail price the creator perceives.",
      },
      {
        title: "Open enrollment beats curated outreach",
        body: "Trying to identify the 'right' creators ahead of time is expensive and error-prone. Letting any creator enroll, then rewarding the ones who actually drive sales, surfaces the real influencers naturally.",
      },
      {
        title: "Tier bonuses on results, not on follower counts",
        body: "A creator with 80K followers may drive less revenue than one with 4K hyper-local followers. Tying tier bonuses to attributable store visits (via unique code) selects for value, not vanity.",
      },
      {
        title: "Creator content can replace product photography",
        body: "The boutique cancelled its monthly photo shoot. Creator-generated content was more authentic, performed better on social, and was free.",
      },
      {
        title: "FTC disclosure protects you when you scale",
        body: "With 47 creators all posting partnerships, FTC disclosure is no longer optional. Auto-injected #ad disclosure on every creator post kept the program compliant without the owner having to police it.",
      },
    ],
    tryYourself: {
      heading: "Try it yourself",
      paragraphs: [
        "Any retail business with photogenic inventory — clothing, accessories, beauty, home goods, plants — can launch a creator program on store credit alone. The Social Perks creator program template handles enrollment, unique code generation, post detection, and FTC disclosure automatically.",
        "The single most important rule: never pay cash for creator content if you can pay in product. Cash payments require contracts, taxes, and 1099s. Store credit is simple, scalable, and aligns the creator's incentive with your business.",
      ],
    },
  },
  {
    slug: "florist-uses-perks-to-3x-google-reviews",
    h1: "How A Seattle Florist Used Perks To 3x Their Google Reviews",
    title: "How A Seattle Florist Used Perks To 3x Their Google Reviews",
    description:
      "A Seattle florist tripled their Google review count in 45 days using a small flower-add-on perk — and started outranking three larger competitors in local search.",
    businessType: "Independent florist",
    location: "Seattle, WA",
    timePeriod: "45 days",
    headlineResult: "Google reviews tripled (62 → 198) in 45 days",
    publishedAt: "2026-03-11",
    hero: [
      { label: "Google reviews", stat: "62 → 198", detail: "in 45 days" },
      { label: "Map pack rank", stat: "#7 → #2", detail: "for 'florist near me'" },
      { label: "Average order value", stat: "+18%", detail: "from upsells" },
      { label: "Cost per review", stat: "$1.80", detail: "in stem cost" },
    ],
    challenge: {
      heading: "The challenge",
      paragraphs: [
        "A Seattle florist in Capitol Hill had a beautiful storefront, a strong wedding business, and a Google Business Profile with 62 reviews — most from 2022. New reviews trickled in at maybe two per month, almost exclusively from grateful wedding clients three weeks after the event.",
        "The owner's biggest revenue driver was walk-in and delivery orders, but those customers — busy people grabbing flowers for a dinner party or a sympathy bouquet — almost never thought to leave a review. The store sat at position #7 in Google's map pack for 'florist near me' in Capitol Hill, behind several larger floral chains with thousands of reviews each.",
      ],
    },
    triedBefore: {
      heading: "What they tried before",
      paragraphs: [
        "The owner had tried the standard small business review tactics with little success.",
      ],
      bullets: [
        "Including a 'please review us' card with every delivery — generated maybe one review every two weeks.",
        "Asking customers verbally at checkout — felt awkward and customers nodded politely but rarely followed through.",
        "Sending a 'how did we do?' email three days after purchase — open rate of 22%, review conversion of 0.4%.",
        "Offering a 10% off coupon for a review — drove a complaint to Yelp from one customer who felt it was 'pay for review'.",
      ],
    },
    approach: {
      heading: "How they used Social Perks",
      paragraphs: [
        "The owner launched a Google Reviews program in Social Perks with a clever twist: leave a verified review, get a free single stem add-on (rose, sunflower, or peony depending on season) on your next order. The perk's perceived value was high — a single stem retails for $4-6 — but the cost to the florist was about $1.80.",
        "Customers got a small printed card slipped into every wrapped bouquet with a QR code. Scanning walked them through writing a Google review on the spot. As soon as the review went live, Social Perks credited the perk to a profile tied to their phone number. On the next visit (or next delivery order, with a checkbox in the online cart), the system automatically added the free stem.",
        "The FTC compliance disclosure was injected automatically into the review prompt, which kept the program clean of any 'paying for reviews' issues. The perk was framed as a 'thank-you for your honest feedback' rather than a quid pro quo for a 5-star review.",
      ],
      bullets: [
        "Perk: free single stem add-on on next order",
        "Action required: verified Google review",
        "Distribution: printed card in every wrapped bouquet",
        "Verification: Google Business Profile webhook",
      ],
    },
    results: {
      heading: "Results",
      paragraphs: [
        "Over 45 days the florist's Google review count went from 62 to 198 — more than tripling. Average rating held steady at 4.8 stars (slight rise from 4.7), and the map pack rank for 'florist near me' in the Capitol Hill area moved from #7 to #2 by day 30 and held there.",
        "The unexpected bonus: customers who came back to redeem their free stem ended up adding more flowers to their order on average. AOV on perk-redemption visits was 18% higher than on regular visits, because once a customer was already in the store thinking about flowers, that single-stem credit turned into a small bouquet purchase.",
      ],
      bullets: [
        "Google reviews: 62 → 198 (+136 in 45 days)",
        "Average rating: 4.7 → 4.8 stars",
        "Map pack rank for 'florist near me': #7 → #2",
        "Average order value on redemption: +18%",
        "Direction requests from GBP: +52%",
        "Total program cost: ~$245 in stem cost",
      ],
    },
    lessons: [
      {
        title: "Add-ons are better perks than discounts for high-emotion purchases",
        body: "Flowers, like coffee or gifts, are an emotional purchase. A 10% discount feels transactional. A free single stem feels like a hospitality gift. Customers respond to the framing, not the dollar value.",
      },
      {
        title: "QR codes on physical product packaging convert best",
        body: "An email three days after purchase competes with hundreds of other inbox items. A card tucked into the bouquet, found at the moment of delivery, converts at 25-40x the rate.",
      },
      {
        title: "Disclosure framing matters — thank-you, not bribe",
        body: "The earlier '10% off for a review' attempt drew a complaint because it felt transactional. Framing the perk as a thank-you for honest feedback (and disclosing it via FTC language) made the same exchange feel natural.",
      },
      {
        title: "Perk redemption visits become upsell moments",
        body: "A customer in your store to redeem a free stem is a customer who is already buying flowers. Plan for the upsell — 18% higher AOV is real money over hundreds of visits.",
      },
      {
        title: "Map pack moves on review velocity, not just count",
        body: "Adding 136 reviews in 45 days mattered more to the algorithm than the absolute count of 198. The recency signal is heavily weighted.",
      },
    ],
    tryYourself: {
      heading: "Try it yourself",
      paragraphs: [
        "This 'free add-on for a review' template works for any business with a low-cost, high-perceived-value add-on item: florists (single stems), bakeries (cookies), coffee shops (croissants), restaurants (dessert), salons (deep conditioner). The Social Perks Google Reviews program template includes the FTC disclosure language and webhook integration.",
      ],
    },
  },
  {
    slug: "dental-practice-fills-schedule-with-referral-perks",
    h1: "How A Phoenix Dental Practice Filled Its Schedule With Referral Perks",
    title: "How A Phoenix Dental Practice Filled Its Schedule With Referral Perks",
    description:
      "A Phoenix dental practice eliminated its 11-day open schedule using a referral perk program — generating 89 new patients in 60 days at $14 in perk cost per acquisition.",
    businessType: "General dental practice",
    location: "Phoenix, AZ",
    timePeriod: "60 days",
    headlineResult: "89 new patients in 60 days, schedule fully booked",
    publishedAt: "2026-03-04",
    hero: [
      { label: "New patients", stat: "89", detail: "in 60 days" },
      { label: "Schedule openings", stat: "11 days → 0", detail: "by day 45" },
      { label: "Cost per acquisition", stat: "$14", detail: "in perk credit" },
      { label: "Lifetime value", stat: "$2,900+", detail: "per new patient" },
    ],
    challenge: {
      heading: "The challenge",
      paragraphs: [
        "A two-dentist practice in northeast Phoenix had a recurring scheduling problem: roughly 11 days of open appointment slots on the books at any given time. Cleanings, fillings, and check-ups were where the practice made most of its money, and unfilled slots represented thousands of dollars of lost revenue every week.",
        "Patient acquisition was expensive. The practice was running Google Ads for 'dentist near me' and 'dental cleaning Phoenix' at a cost per click of $9-14, and the cost per acquired patient came out to roughly $280. The owner-dentist knew that her existing patients were her best source of new ones, but her referral program was a sad printed card at the front desk that nobody read.",
      ],
    },
    triedBefore: {
      heading: "What they tried before",
      paragraphs: [
        "The practice had several conventional approaches in market with disappointing results.",
      ],
      bullets: [
        "Google Ads — $280 cost per acquired patient and increasingly competitive in Phoenix.",
        "A Yelp Ads spend of $850/month — drove three new patients across six months.",
        "A printed referral card offering '$25 off for you, $25 off for them' — generated maybe two referrals per month.",
        "An email to active patients asking for referrals — 0.6% conversion to actual new bookings.",
      ],
    },
    approach: {
      heading: "How they used Social Perks",
      paragraphs: [
        "The owner launched a referral perk program in Social Perks with a structure tuned for dental: refer a friend who books and completes a first appointment, both you and the friend get a $50 credit toward future services (cleanings, whitening, cosmetic work). The credit was tracked through unique referral codes generated automatically per patient.",
        "Patients accessed their referral code through a portal link sent via SMS after their last appointment, with simple share-via-text and share-via-email buttons. When a friend booked using the code and showed up to the appointment, both parties were credited automatically. The practice did not have to manually track anyone.",
        "The Social Perks program included automatic compliance with state dental practice referral regulations (which are stricter than general business referral rules) and routed the credit through the practice's existing scheduling and billing system rather than creating a parallel currency the staff would have to learn.",
      ],
      bullets: [
        "Perk: $50 credit for both referrer and new patient",
        "Trigger: new patient must complete first appointment",
        "Distribution: SMS link with share buttons after each appointment",
        "Compliance: state dental referral rule auto-injection",
      ],
    },
    results: {
      heading: "Results",
      paragraphs: [
        "Within 60 days the practice acquired 89 new patients via the referral program. The 11-day open schedule was eliminated by day 45, and the practice started a small waitlist for new-patient cleanings. Total perk cost was $1,250 (some referrals doubled-up because both parties were credited), translating to roughly $14 cost per acquired patient — versus $280 on Google Ads.",
        "The lifetime value calculation is what makes this story remarkable. A typical general dental patient at this practice is worth about $2,900 in lifetime revenue (cleanings every six months, the occasional filling or crown, plus any cosmetic work). Spending $14 to acquire a patient worth $2,900 is a return on investment that frankly should not be legal.",
      ],
      bullets: [
        "New patients in 60 days: 89",
        "Schedule openings: 11 days → 0 (waitlist by day 45)",
        "Cost per acquisition: $14 (vs $280 on Google Ads)",
        "Estimated lifetime value per new patient: ~$2,900",
        "Total program cost: $1,250",
        "Estimated lifetime revenue from new patients: ~$258,000",
      ],
    },
    lessons: [
      {
        title: "Healthcare services have insanely high LTV — perks should reflect that",
        body: "A $50 credit feels generous to a patient and trivial to the practice when the lifetime value is $2,900. Many healthcare practices under-perk because they do not run the LTV math.",
      },
      {
        title: "SMS is the right channel for healthcare referrals",
        body: "Patients open SMS at 98% rates. The share buttons in an SMS-delivered referral link make it trivial to forward to a friend in two taps.",
      },
      {
        title: "Both-sided perks convert way better than one-sided",
        body: "Earlier '$25 off for you, $25 off for them' had the right structure but not enough magnitude. Doubling the perk (and bundling with automatic delivery) tripled conversion.",
      },
      {
        title: "Trigger on appointment completion, not booking",
        body: "Crediting the perk on appointment completion (not booking) eliminated no-show abuse. A booked-but-no-show referral does not count.",
      },
      {
        title: "Compliance is non-negotiable in healthcare",
        body: "State dental boards have strict referral rules. Auto-injected compliance language and audit trails kept the program defensible.",
      },
    ],
    tryYourself: {
      heading: "Try it yourself",
      paragraphs: [
        "Healthcare practices — dental, optometry, dermatology, chiropractic, physical therapy, veterinary — can copy this template directly. The Social Perks healthcare referral template handles state-specific compliance, SMS delivery, and integration with major scheduling systems.",
      ],
    },
  },
  {
    slug: "food-truck-goes-viral-with-customer-content-rewards",
    h1: "How A Miami Food Truck Went Viral With Customer Content Rewards",
    title: "How A Miami Food Truck Went Viral With Customer Content Rewards",
    description:
      "A Miami food truck used a 'film us, get free tacos' perk program to generate 3.2 million TikTok views in 30 days — and started selling out every service in 90 minutes.",
    businessType: "Mobile food truck",
    location: "Miami, FL",
    timePeriod: "30 days",
    headlineResult: "3.2 million TikTok views and complete sellouts in 30 days",
    publishedAt: "2026-02-25",
    hero: [
      { label: "TikTok views", stat: "3.2M", detail: "in 30 days" },
      { label: "Sellout time", stat: "90 min", detail: "down from 4 hours" },
      { label: "Customer videos", stat: "412", detail: "tagged TikToks" },
      { label: "Cost per video", stat: "$2.40", detail: "in taco cost" },
    ],
    challenge: {
      heading: "The challenge",
      paragraphs: [
        "A Birria taco truck operating in Wynwood, Miami had built a small but loyal lunch crowd over six months. Service ran from 11am to 3pm and the truck typically sold out around 2:30pm — solid but not exceptional, and a long tail of weekday hours where the truck served maybe 6-8 customers an hour.",
        "The owner, who had a background in marketing, knew that food trucks in Miami live and die by TikTok. The truck's own TikTok had 230 followers and the owner had been posting content for months with almost no traction. Meanwhile, every viral Miami food truck moment seemed to come from a customer's video, not the operator's.",
      ],
    },
    triedBefore: {
      heading: "What they tried before",
      paragraphs: [
        "The owner had been grinding on TikTok personally for months with little to show for it.",
      ],
      bullets: [
        "Posting cinematic plate videos with trending audio — averaged 800 views per post.",
        "Filming the cheese pull on every taco — became a tired meme and stopped getting engagement.",
        "Posting at 'optimal' times based on TikTok analytics — minor improvement, no breakout.",
        "Paying a Miami food influencer $600 for a sponsored video — got 80K views and one busy day after.",
      ],
    },
    approach: {
      heading: "How they used Social Perks",
      paragraphs: [
        "The owner launched a 'Film Us, Eat Free' program: any customer who posted a tagged TikTok of their order (the cheese pull, the dipping, the first bite, anything) got a free taco on their next visit. The Social Perks platform monitored TikTok via the Creator Marketplace API and credited the perk automatically when a tagged video was detected.",
        "The truck added a small chalkboard sign with the QR code to enroll, and the cashier mentioned it at order pickup ('if you film and post a TikTok of your tacos, your next taco's on us'). Most customers were already filming their food anyway — the perk just gave them a reason to make the post public and tag the truck.",
        "Tier bonuses were generous: customers with 50K+ TikTok followers got a comped full meal. Customers with 250K+ got the meal plus a custom 'truck exclusive' off-menu item. This created a flywheel where mid-tier creators eagerly came by to get content.",
      ],
      bullets: [
        "Perk: free taco on next visit per tagged TikTok",
        "Tier bonus: free meal (50K+), exclusive off-menu (250K+)",
        "Distribution: chalkboard sign + cashier mention",
        "Verification: TikTok Creator Marketplace API",
      ],
    },
    results: {
      heading: "Results",
      paragraphs: [
        "In 30 days the truck generated 412 tagged TikToks from customers. Combined views hit 3.2 million. Two videos individually crossed 600K views, including one that hit 1.1M. The truck's own TikTok grew from 230 followers to 18,400 in the same window, simply by riding the wave of tagged customer content.",
        "The business impact was immediate and dramatic. The truck started selling out by 12:30pm, then 12:00pm, then by 11:30am — eventually averaging a 90-minute sellout from open. The owner expanded service hours to dinner three nights a week and started a Saturday-only second location. Total program cost was $988 in taco-give-aways against an estimated $24,000+ in incremental revenue.",
      ],
      bullets: [
        "Customer-generated TikToks: 412",
        "Combined TikTok views: 3.2M",
        "Studio TikTok followers: 230 → 18,400",
        "Sellout time: 4 hours → 90 minutes",
        "Service expansion: lunch only → lunch + 3 dinners + Saturday location",
        "Estimated incremental revenue: $24,000+ in 30 days",
      ],
    },
    lessons: [
      {
        title: "Food is the most TikTok-able category — let customers do the filming",
        body: "Food TikTok is dominated by customer POV content. A free taco is a tiny price to pay to put dozens of cameras in your customers' hands.",
      },
      {
        title: "Mid-tier creators (10K-50K) drive the most local revenue",
        body: "The 1.1M-view video was great PR, but the 25 mid-tier creator videos in the 20K-80K view range drove most of the actual incremental customers. Tier-bonus those creators specifically.",
      },
      {
        title: "Cashier scripts beat signage by 3-5x",
        body: "The chalkboard sign brought in some participation. The cashier's casual one-liner at order pickup brought in three to five times more.",
      },
      {
        title: "Off-menu exclusives are a trivial-cost super-perk",
        body: "Comping a 'truck exclusive' off-menu item for a 250K-follower creator costs the truck almost nothing but gives the creator content their own audience cannot get anywhere else. Massive perceived value.",
      },
      {
        title: "Your own studio account grows by riding the wave",
        body: "All those tagged customer videos pushed the truck's own TikTok handle to anyone who clicked through. 18,000 followers in 30 days, all from tagged content the truck did not produce.",
      },
    ],
    tryYourself: {
      heading: "Try it yourself",
      paragraphs: [
        "Any food-and-beverage operator with photogenic food can run this exact play: food trucks, taco shops, ice cream parlors, donut shops, ramen joints, anything visual. The Social Perks food and beverage template ships with TikTok and Instagram tag detection, tier-bonus logic, and an off-menu exclusive workflow for top-tier creators.",
      ],
    },
  },
];

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((c) => c.slug === slug);
}

export function getAllCaseStudySlugs(): string[] {
  return CASE_STUDIES.map((c) => c.slug);
}
