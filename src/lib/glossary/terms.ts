// Glossary entries for /glossary/[term] pages.
// Each entry is 600–1000 words of original definition-style content
// intended to rank for "what is X" informational queries.

export interface GlossaryTerm {
  slug: string;
  term: string;
  shortTitle: string;
  abbreviation?: string;
  category: string;
  definition: string;
  whyItMatters: string;
  examples: { title: string; body: string }[];
  howToUse: string[];
  relatedSlugs: string[];
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    slug: "user-generated-content",
    term: "User-Generated Content (UGC)",
    shortTitle: "User-Generated Content",
    abbreviation: "UGC",
    category: "Content",
    definition:
      "User-generated content is any media — photos, videos, reviews, social posts, blog comments, unboxing clips — created by real people rather than by a brand. It includes both content a customer makes voluntarily (a happy review, a TikTok of their new haircut) and content they create in response to a structured prompt or perk program. UGC is distinct from influencer content, which is paid or sponsored; UGC is unpaid (or perk-incentivized) and originates with everyday customers.",
    whyItMatters:
      "UGC outperforms brand-made content on almost every meaningful metric. Studies from Nielsen, Stackla, and others put trust in UGC at 80–90% versus 35–50% for branded ads. Click-through rates on social ads featuring real customer photos run 2–5x higher than the same ad with a studio shot. For small businesses, UGC solves the two hardest content problems at once: it scales (because customers produce it for you) and it converts (because prospects believe other customers). It also fuels local SEO — Google rewards Business Profiles that show fresh photos and reviews, and most of those come from customers, not from the owner.",
    examples: [
      {
        title: "A salon's Instagram tag wall",
        body: "A hair salon offers $10 off the next visit for any client who posts their new look on Instagram and tags the salon. Over a quarter they collect 180 tagged posts. The salon reposts the best 12 a month, embeds the wall on their booking page, and uses three for a paid Instagram ad campaign that runs at one-third the cost-per-click of their previous brand-only ads.",
      },
      {
        title: "A coffee shop's Google review program",
        body: "A coffee shop emails every customer who pays with a loyalty card the day after their visit, asking for a Google review in exchange for a free drink redeemed on the next order. In six months they go from 47 Google reviews at 4.2 stars to 312 at 4.7 stars and start ranking #1 in their neighborhood for 'coffee shop near me.'",
      },
      {
        title: "A DTC skincare brand's TikTok bank",
        body: "A skincare brand runs a perk program where customers who film a 30-second 'first impression' TikTok using the product earn a free refill. In a year they collect 1,400 videos, use them on the product page, and run the top performers as Spark Ads — cutting customer acquisition cost by 38%.",
      },
    ],
    howToUse: [
      "Make asking part of the transaction — after a purchase, after a service, after a meal. The moment matters more than the channel.",
      "Offer a clear, small perk in exchange — a discount, freebie, or loyalty point. Cash payouts are not required and often work worse.",
      "Always include the FTC-required disclosure (#ad or #sponsored) when a perk is exchanged for a post.",
      "Recycle UGC across channels — product pages, paid ads, email, in-store screens. One good piece of UGC has 5–10 lives.",
      "Track which UGC actually converts. Treat the top-performing pieces as creatives you license and re-run, not as one-time posts.",
    ],
    relatedSlugs: [
      "influencer-marketing",
      "social-proof",
      "ftc-disclosure",
      "review-marketing",
    ],
  },
  {
    slug: "influencer-marketing",
    term: "Influencer Marketing",
    shortTitle: "Influencer Marketing",
    category: "Channels",
    definition:
      "Influencer marketing is the practice of paying or compensating individuals with engaged social media followings to promote a product, service, or brand to their audience. The 'influencer' can be anyone from a mega-celebrity with millions of followers to a nano-influencer with a few hundred engaged neighbors. Compensation can be cash, free product, affiliate commission, or — increasingly — a structured perk like a discount or VIP access. The defining trait is the transaction: the creator is promoting because of an arrangement with the brand, which is what triggers FTC disclosure rules.",
    whyItMatters:
      "Influencer marketing is now one of the largest and fastest-growing advertising channels — global spend crossed $32B in 2024 and continues to climb double digits a year. For small businesses, the practical relevance isn't celebrity partnerships; it's the long-tail of micro- and nano-influencers whose followers actually trust them. A local fitness instructor with 4,000 engaged Instagram followers can drive more leads to a gym than a billboard. The economics also work — micro-influencer posts often cost 5–20% of equivalent paid social ads and convert better because the audience treats it as a personal recommendation rather than an ad.",
    examples: [
      {
        title: "Restaurant + local foodie",
        body: "A neighborhood restaurant invites a local foodie with 8,000 Instagram followers for a free tasting in exchange for a feed post and three stories. The post drives 64 reservations over two weeks at a total cost of one comped meal — roughly $90 in food cost — for a customer acquisition cost of about $1.40.",
      },
      {
        title: "Skincare brand + nano-influencer program",
        body: "A DTC skincare brand recruits 200 nano-influencers (500–5,000 followers each) and ships them a free product in exchange for an honest review post. About 140 post; the brand sees a 14% lift in branded search and a 9% sales lift in the following 30 days.",
      },
      {
        title: "B2B SaaS + LinkedIn micro-influencer",
        body: "A B2B SaaS company partners with a LinkedIn micro-influencer (12,000 followers in their ICP) for a sponsored thread. The thread drives 320 trial signups at $80 cost-per-trial, well below their paid-search average of $215.",
      },
    ],
    howToUse: [
      "Start with nano- and micro-influencers (under 50,000 followers) — they have higher engagement rates and lower costs than mega-influencers.",
      "Pay in product or perks for nano tier, mixed cash and product for micro tier, and cash for anything larger. Match compensation to the influencer's leverage.",
      "Always require the FTC-mandated #ad or #sponsored disclosure. Non-disclosure is a federal compliance risk for both you and the influencer.",
      "Track UTM links and unique discount codes per influencer so you can measure ROI, not just impressions.",
      "Treat the best-performing influencers like ongoing partners, not one-off transactions. Repeat collaborations consistently outperform first-touch ones.",
    ],
    relatedSlugs: [
      "micro-influencer",
      "nano-influencer",
      "ftc-disclosure",
      "brand-ambassador",
    ],
  },
  {
    slug: "micro-influencer",
    term: "Micro-Influencer",
    shortTitle: "Micro-Influencer",
    category: "People",
    definition:
      "A micro-influencer is a social media creator with roughly 10,000 to 100,000 followers in a specific niche or geography. The threshold isn't strict — some industry definitions use 5k–50k or 10k–250k — but the underlying idea is a creator who is large enough to have real reach, but small enough that their audience treats them as a trusted niche voice rather than a celebrity. Micro-influencers typically have engagement rates of 3–8% (compared to 1–2% for macro-influencers), which means their followers actually see and act on their posts.",
    whyItMatters:
      "Micro-influencers are the most cost-effective influencer tier for small and growing businesses. A single post from a relevant micro-influencer regularly outperforms a five-figure deal with a celebrity for any business that isn't pursuing pure mass awareness. The math: if a micro-influencer has 30,000 followers at 5% engagement, roughly 1,500 people see and engage with the post — and because they self-selected to follow this person, they're a more qualified audience than any cold paid impression. For local businesses, the equivalent is finding the micro-influencers in your city or category and building durable relationships with three to ten of them.",
    examples: [
      {
        title: "Boutique gym + fitness micro",
        body: "A boutique gym partners with a local fitness micro-influencer (45,000 Instagram followers, 6% engagement). One sponsored post + three stories generates 87 trial bookings at a $25 cost-per-acquisition. The same gym's Meta paid ads run $180 CPA.",
      },
      {
        title: "Coffee brand + 20 micros",
        body: "A specialty coffee brand sends free product to 20 coffee-focused micro-influencers (15k–60k followers each). Eighteen post. Revenue attributable to the program in the first 30 days is $42,000 at a total program cost of $4,800 in product and management.",
      },
      {
        title: "Local realtor + lifestyle micro",
        body: "A real estate agent in Austin partners with an Austin lifestyle micro-influencer (28k followers) on a 'best neighborhoods for young families' post. The post drives 14 buyer-side consultations over 60 days, two of which close — generating $34,000 in commission for the cost of a $500 sponsorship.",
      },
    ],
    howToUse: [
      "Search by hashtag and geography on Instagram and TikTok to find micro-influencers whose audience matches yours.",
      "Vet engagement quality — comments should be real and topical, not generic emojis from suspicious accounts.",
      "Offer product, an experience, or a flat fee. Most micros charge $200–$2,000 per post depending on niche and engagement.",
      "Always include FTC disclosure. Don't skip it, even when the influencer asks you to — it protects both of you.",
      "Build a recurring program with three to ten relevant micros rather than chasing one-off partnerships.",
    ],
    relatedSlugs: [
      "nano-influencer",
      "influencer-marketing",
      "engagement-rate",
      "brand-ambassador",
    ],
  },
  {
    slug: "nano-influencer",
    term: "Nano-Influencer",
    shortTitle: "Nano-Influencer",
    category: "People",
    definition:
      "A nano-influencer is a social media creator with roughly 1,000 to 10,000 followers. They aren't full-time creators — they're enthusiasts, hobbyists, local personalities, and engaged community members whose followers are mostly people they actually know. Nano-influencers typically have the highest engagement rates of any tier (often 7–15%) because their audience is small enough to be genuinely close. They almost never charge cash; they accept free product, experiences, or small perks in exchange for posts.",
    whyItMatters:
      "Nano-influencers are the most authentic and most scalable tier of influencer marketing, especially for local and growing businesses. A program of 50 nano-influencers can outperform a single $10,000 macro-influencer partnership on both reach and conversion — because each nano-influencer's audience treats the post like a personal recommendation from a friend. Most of your existing happy customers are, technically, nano-influencers. The opportunity for small businesses is to formalize that — turn the customer who already loves you into a nano-influencer with a structured perk program.",
    examples: [
      {
        title: "Restaurant ambassador program",
        body: "A restaurant identifies 30 regulars who are active on Instagram and have 1,000–5,000 followers each. They invite them to a 'tasting club' that offers a free monthly meal in exchange for one tagged post per month. Over a year the program generates 360 organic posts, drives an estimated 2,400 new visits, and costs roughly $14,000 in food.",
      },
      {
        title: "DTC apparel seeding",
        body: "An apparel brand ships free product to 500 nano-influencers across six categories. About 360 post. Spend is $36,000 in product cost; tracked revenue at 14 days is $94,000 with a long tail beyond.",
      },
      {
        title: "Dental office referral program",
        body: "A dental office offers each new patient a free whitening session if they post a 60-second review on Instagram. Of 240 new patients in a year, 88 complete the post. Each post generates an average of 4 inbound inquiries — 350 total — and the program effectively eliminates the office's paid advertising budget.",
      },
    ],
    howToUse: [
      "Look first inside your existing customer base. Your happiest customers with 1,000–10,000 followers are the highest-value nano-influencers you'll ever find.",
      "Offer a real perk — free product, free service, an experience, or a meaningful discount. The perk should be worth more than the time it takes to post.",
      "Make the post easy. Provide a few caption suggestions, the right hashtag, and a clear tag — don't make the nano-influencer do creative work.",
      "Require FTC disclosure on every post. Provide the exact hashtag.",
      "Treat it as a program, not a one-off. Run it monthly or quarterly so nano-influencers know when to expect a perk.",
    ],
    relatedSlugs: [
      "micro-influencer",
      "brand-ambassador",
      "user-generated-content",
      "word-of-mouth-marketing",
    ],
  },
  {
    slug: "referral-marketing",
    term: "Referral Marketing",
    shortTitle: "Referral Marketing",
    category: "Channels",
    definition:
      "Referral marketing is the structured practice of incentivizing existing customers to recommend your business to new customers. It differs from organic word-of-mouth by being intentional — there's a defined reward (a discount, a credit, a perk, a cash payment) that triggers when a referred customer takes a specified action like signing up, making a purchase, or visiting. Referral marketing can be one-sided (only the referrer gets a reward) or double-sided (both the referrer and the new customer get a reward, which generally performs better).",
    whyItMatters:
      "Referred customers consistently outperform every other acquisition channel on every important metric: they have lower acquisition costs, higher conversion rates, higher first-order values, higher retention, and significantly higher lifetime values. Wharton research has measured referred customers as 16–25% more valuable than non-referred customers over their lifetime. For small businesses with tight ad budgets, formalizing referrals can effectively replace paid acquisition.",
    examples: [
      {
        title: "SaaS double-sided credit",
        body: "A SaaS company gives the referrer and the new customer $50 of platform credit when the new customer subscribes. Over 12 months the program generates 28% of all new signups at a blended CAC of $34, compared to $214 from paid search.",
      },
      {
        title: "Salon 'bring a friend' perk",
        body: "A salon offers a free deep-conditioning treatment to any client who brings a friend for their first appointment, with $20 off for the friend. About 14% of clients participate; the salon adds 180 new clients in a year at near-zero marketing cost.",
      },
      {
        title: "Meal delivery viral loop",
        body: "A meal-delivery startup runs a referral program where the referrer earns one free week per friend who signs up. Three months in, 41% of new customers are coming through referrals, and the viral coefficient briefly exceeds 1.0.",
      },
    ],
    howToUse: [
      "Make the reward meaningful but proportional. The reward should feel worth the effort but shouldn't exceed the customer's expected lifetime value.",
      "Use double-sided rewards when possible — they perform 30–50% better than one-sided programs.",
      "Make sharing one tap. A copyable referral link, a built-in SMS share, or a QR code beats anything that requires customers to type.",
      "Trigger the reward on a high-confidence event (first paid purchase, second visit) rather than signup alone to avoid gaming.",
      "Measure the viral coefficient (referrals per customer × conversion rate) and re-tune perks every quarter.",
    ],
    relatedSlugs: [
      "word-of-mouth-marketing",
      "customer-loyalty-program",
      "viral-coefficient",
      "customer-acquisition-cost",
    ],
  },
  {
    slug: "word-of-mouth-marketing",
    term: "Word-of-Mouth Marketing",
    shortTitle: "Word-of-Mouth Marketing",
    category: "Channels",
    definition:
      "Word-of-mouth marketing (WOMM) is the deliberate effort to encourage customers to talk about your brand, product, or service to other people — in person, on social media, in reviews, in DMs, anywhere. Organic word-of-mouth happens naturally whenever a product genuinely delights or disappoints; WOMM is the structured practice of generating, accelerating, and measuring it. It overlaps with referral marketing, UGC, and reviews but is broader — it's the umbrella term for everything that gets customers talking.",
    whyItMatters:
      "Word-of-mouth is the most trusted form of marketing by every survey ever conducted. Nielsen consistently finds 88–92% of consumers trust recommendations from people they know, versus 30–40% for any form of paid advertising. For most local businesses, word-of-mouth is already the #1 source of new customers — it just happens invisibly and unmeasured. Formalizing it through structured perks, review programs, and shareable moments is one of the highest-leverage things a small business can do.",
    examples: [
      {
        title: "Restaurant 'free dessert for a tag'",
        body: "A restaurant offers a free dessert to anyone who posts an Instagram story tagging them during their meal. Over 18 months, 4,200 tagged stories drive an estimated 30,000+ impressions per month at zero ad spend.",
      },
      {
        title: "Boutique 'tell a friend' card",
        body: "A boutique includes a 'tell a friend' card in every shopping bag offering $15 off for both parties. Twelve percent of customers redeem the card with a new shopper — that's effectively a 12% organic-referral rate baked into every purchase.",
      },
      {
        title: "B2B SaaS community evangelism",
        body: "A B2B SaaS company invests heavily in a customer community, recognizing power users with public badges and early access. Of all new pipeline, 38% is sourced from community-driven word-of-mouth — without a single referral fee paid.",
      },
    ],
    howToUse: [
      "Identify your already-happy customers — your NPS promoters and your most-frequent buyers. They're already talking; help them do it more.",
      "Give people a reason to share — a small perk, a shareable moment, or an unexpectedly delightful experience.",
      "Make sharing frictionless — pre-written captions, QR codes, share buttons, and clear tags.",
      "Recognize and reward repeat talkers. Public recognition often beats private cash.",
      "Measure word-of-mouth deliberately: track tagged posts, referral codes, and the share-of-new-customers-attributable-to-existing-customers metric over time.",
    ],
    relatedSlugs: [
      "referral-marketing",
      "net-promoter-score",
      "social-proof",
      "user-generated-content",
    ],
  },
  {
    slug: "customer-loyalty-program",
    term: "Customer Loyalty Program",
    shortTitle: "Customer Loyalty Program",
    category: "Programs",
    definition:
      "A customer loyalty program is a structured rewards system that incentivizes repeat business from existing customers. The classic model is a points program — earn points per dollar, redeem points for discounts or free products — but modern loyalty programs span tiered perks (silver/gold/platinum), paid memberships (Amazon Prime, REI Co-op), action-based programs (earn rewards for posts, reviews, referrals), and experiential perks (early access, exclusive events). The unifying mechanic is: do more business with us, and you get something extra in return.",
    whyItMatters:
      "Acquiring a new customer costs 5–25x more than retaining an existing one, depending on the source you trust. Increasing customer retention by 5% can lift profitability by 25–95% according to Bain & Company's classic study. Loyalty programs are one of the most reliable ways to operationalize retention — they create a measurable reason for customers to come back, and they generate first-party data about who your best customers are. For small businesses, even a simple program (a 10-stamp punch card, a birthday perk) materially shifts repeat rates.",
    examples: [
      {
        title: "Coffee shop punch card → digital",
        body: "A coffee shop replaces its paper punch card with a digital one (10 drinks = 1 free). Average visit frequency among enrolled members rises from 1.4 to 2.3 visits per month within 90 days, and member revenue is 67% higher than non-member revenue per capita.",
      },
      {
        title: "DTC tiered program",
        body: "A DTC skincare brand launches a three-tier loyalty program: Bronze (basic earning), Silver ($300 spent), Gold ($1,000 spent). Gold members get early access to launches and a free annual product. Lifetime value of Gold members is 3.2x the non-member average.",
      },
      {
        title: "Action-based perk program",
        body: "A restaurant runs a program where customers earn points for visits, reviews, social tags, and referrals. Top members earn enough points for a free monthly dinner. The program drives a 41% increase in 60-day repeat visit rate.",
      },
    ],
    howToUse: [
      "Keep the math simple. If customers can't explain the program in one sentence, redemption rates will be low.",
      "Reward more than just purchases. Points for reviews, posts, and referrals turn loyalty into a marketing engine.",
      "Tier the program so your top 10% of customers get something the rest don't — exclusivity drives behavior.",
      "Track participation by cohort, not just total enrollment. Active members are the metric that matters.",
      "Re-engage lapsed members with a targeted offer. A loyalty program is also a list of your best leads.",
    ],
    relatedSlugs: [
      "customer-lifetime-value",
      "referral-marketing",
      "net-promoter-score",
      "cohort-analysis",
    ],
  },
  {
    slug: "google-business-profile",
    term: "Google Business Profile",
    shortTitle: "Google Business Profile",
    category: "Local SEO",
    definition:
      "Google Business Profile (formerly Google My Business) is the free Google product that lets a business manage its presence across Google Search, Google Maps, and Google Shopping. It includes the business name, hours, phone, website, photos, posts, services, products, Q&A, and — most importantly — reviews. For local businesses, the Google Business Profile is the single most important digital asset they own, because it's what Google uses to populate the local 'map pack' and the knowledge panel for branded searches.",
    whyItMatters:
      "Roughly half of all Google searches have local intent. For 'X near me' queries, Google almost exclusively shows results from Google Business Profiles in the map pack — the three results above the standard organic listings. A well-optimized profile with regular updates, photos, and reviews can drive more traffic to a local business than every other channel combined. A neglected profile loses business invisibly every day.",
    examples: [
      {
        title: "Local plumber's quarterly photo refresh",
        body: "A local plumber commits to uploading five new photos a month — completed jobs, team shots, before/afters. After six months, Google Business Profile views are up 280%, calls are up 140%, and the business consistently appears in the top three local results.",
      },
      {
        title: "Restaurant review velocity",
        body: "A restaurant goes from 80 reviews at 4.1 stars to 340 reviews at 4.6 stars over a year by texting every dine-in guest a review link. Map pack rankings for 'best [cuisine] near me' move from page two to position one.",
      },
      {
        title: "Service-area business hours fix",
        body: "An HVAC company discovers their listed hours don't match reality. After correcting them and posting weekly updates, lead volume from Google increases 56% in the next 90 days.",
      },
    ],
    howToUse: [
      "Claim and verify your profile. If you haven't, you're invisible to half your potential customers.",
      "Fill out every field. Hours, services, attributes, products, photos — Google rewards completeness with visibility.",
      "Ask every happy customer for a review. Reviews are the single biggest ranking signal for local search.",
      "Post weekly. Use the Posts feature for offers, events, and updates — fresh activity signals relevance.",
      "Respond to every review, positive or negative. Response rate is itself a ranking signal.",
    ],
    relatedSlugs: [
      "local-seo",
      "review-marketing",
      "social-proof",
      "earned-media",
    ],
  },
  {
    slug: "local-seo",
    term: "Local SEO",
    shortTitle: "Local SEO",
    category: "Local SEO",
    definition:
      "Local SEO is the practice of optimizing a business's online presence to rank for geographically-relevant searches — searches with explicit local intent ('plumber in Austin', 'best tacos near me') and searches Google interprets as local. It draws on the same general SEO disciplines (technical site health, content, backlinks) but emphasizes three local-specific signals: Google Business Profile quality, citations across local directories (Yelp, Apple Maps, BBB), and review quantity and freshness.",
    whyItMatters:
      "For any business with a physical location or a defined service area, local SEO is the single highest-ROI digital marketing investment. Ranking in the top three of the local 'map pack' generates an order of magnitude more clicks than ranking on page one of standard organic results. And unlike paid ads, those clicks don't stop when you stop spending.",
    examples: [
      {
        title: "Dental practice map pack move",
        body: "A dental practice invests three months in review velocity, Google Business Profile completeness, and a few neighborhood-specific landing pages. They move from rank 12 to rank 2 in the map pack for 'dentist near me' in their area. New-patient calls double.",
      },
      {
        title: "Restaurant + Yelp + TripAdvisor consistency",
        body: "A restaurant audits its name, address, and phone (NAP) across 30 local directories and finds inconsistencies in 14 of them. After fixing the citations, their map pack rank for 'best brunch [city]' improves four positions.",
      },
      {
        title: "Service-area business neighborhood pages",
        body: "A roofing company creates 12 neighborhood-specific landing pages — each with local case studies and photos. Organic traffic for hyperlocal queries triples in six months.",
      },
    ],
    howToUse: [
      "Start with Google Business Profile. Claim it, fill it completely, and keep it active.",
      "Audit your NAP (name, address, phone) consistency across every directory you appear in.",
      "Build a review-collection habit — every customer, every time, ideally the same day as the transaction.",
      "Create location-specific content. A neighborhood page beats a generic services page every time.",
      "Earn local backlinks — sponsorships, chamber of commerce listings, local press, community events.",
    ],
    relatedSlugs: [
      "google-business-profile",
      "review-marketing",
      "social-proof",
      "earned-media",
    ],
  },
  {
    slug: "review-marketing",
    term: "Review Marketing",
    shortTitle: "Review Marketing",
    category: "Channels",
    definition:
      "Review marketing is the deliberate practice of generating, managing, and promoting customer reviews across the platforms that matter for your business — Google, Yelp, TripAdvisor, Facebook, industry-specific sites (Avvo for lawyers, Zocdoc for healthcare, G2 for B2B SaaS). It's both an SEO discipline (more and better reviews = higher rankings) and a conversion discipline (visible reviews on product pages and landing pages lift conversion 20–40%).",
    whyItMatters:
      "Roughly 90% of consumers read reviews before visiting a local business, and 80% trust online reviews as much as a personal recommendation. For most small businesses, reviews are the single biggest determinant of whether a stranger becomes a customer. They're also the highest-ranked signal for local SEO. A business with 200 reviews at 4.7 stars will out-rank and out-convert a competing business with 30 reviews at 4.4 stars almost every time.",
    examples: [
      {
        title: "Auto repair shop review velocity",
        body: "An auto repair shop trains its service writers to send a one-tap review link to every customer after a job. They go from 6 reviews a month to 50 in 90 days. Lead volume from Google Maps doubles.",
      },
      {
        title: "DTC product page review widget",
        body: "A DTC brand adds a photo-review widget to its product pages. Conversion rate on PDPs with 25+ reviews rises 34% versus PDPs with under 10 reviews. They prioritize seeding reviews on the slowest-converting products.",
      },
      {
        title: "Lawyer Avvo profile",
        body: "A solo-practice lawyer invests in collecting reviews on Avvo and on Google. Within a year, their Avvo profile rank moves to the top three for their practice area in their city, generating 60% of new client inquiries.",
      },
    ],
    howToUse: [
      "Ask every customer, every time — ideally within 24 hours of the transaction while the experience is fresh.",
      "Make the link one tap. Don't tell people to 'search for us on Google' — send a direct review URL.",
      "Respond to every review, especially negative ones. Public, professional responses convert browsers into customers.",
      "Encourage photo reviews — they convert better than text-only and boost SEO more.",
      "Never offer cash or significant rewards in exchange for reviews — it violates platform policies and FTC guidelines. Offer the experience that earns the review.",
    ],
    relatedSlugs: [
      "google-business-profile",
      "local-seo",
      "social-proof",
      "user-generated-content",
    ],
  },
  {
    slug: "social-proof",
    term: "Social Proof",
    shortTitle: "Social Proof",
    category: "Psychology",
    definition:
      "Social proof is the psychological phenomenon where people assume the actions of others are correct in a given situation, especially when they're uncertain. In marketing, social proof is anything that shows other people have already chosen, used, and approved of a product or service — reviews, star ratings, testimonials, customer counts, logos of well-known clients, real-time activity ('27 people are viewing this'), influencer endorsements, and earned media mentions. The term was coined by psychologist Robert Cialdini in his 1984 book Influence.",
    whyItMatters:
      "Social proof is one of the most consistently measured conversion levers in all of marketing. Adding visible reviews to a product page typically lifts conversion 15–35%. Showing a customer count, a 'trusted by' logo row, or a real testimonial reduces decision friction. For small and new businesses with low brand awareness, social proof is the single most important way to overcome the trust deficit a stranger has on first visit.",
    examples: [
      {
        title: "Landing page testimonial section",
        body: "A SaaS company adds three customer quotes with real names, photos, and company logos to its pricing page. Trial-signup conversion lifts from 3.2% to 4.7% — a 47% relative gain — over a four-week A/B test.",
      },
      {
        title: "Restaurant Instagram tag wall",
        body: "A restaurant embeds a wall of tagged Instagram photos on its booking page. Reservation conversion rises 22%, especially for first-time visitors.",
      },
      {
        title: "B2B logo bar",
        body: "A B2B startup adds a 'Trusted by' row of 8 customer logos to the top of its homepage. Demo-request conversion lifts 31% in the first month after launch.",
      },
    ],
    howToUse: [
      "Put social proof above the fold — most visitors decide whether to keep reading in the first eight seconds.",
      "Use specific numbers when possible. '4,200 small businesses' beats 'thousands of small businesses.'",
      "Mix types — reviews, logos, testimonials, real-time activity. Different visitors trust different signals.",
      "Refresh constantly. Old testimonials and stale review counts work against you.",
      "Pair social proof with a clear next action. Trust without a CTA leaves conversions on the table.",
    ],
    relatedSlugs: [
      "review-marketing",
      "user-generated-content",
      "earned-media",
      "conversion-rate",
    ],
  },
  {
    slug: "ftc-disclosure",
    term: "FTC Disclosure",
    shortTitle: "FTC Disclosure",
    category: "Compliance",
    definition:
      "FTC disclosure refers to the U.S. Federal Trade Commission's rules requiring that any material connection between a brand and an endorser be clearly and conspicuously disclosed to the audience. A 'material connection' includes payment, free product, discounts, sweepstakes entries, employment, family relationships, or any other arrangement that could affect the credibility of the endorsement. The required disclosure is typically expressed as #ad or #sponsored at the top of a post, before the 'see more' cutoff on platforms that truncate captions.",
    whyItMatters:
      "FTC enforcement against brands and creators is real and accelerating. Penalties can include consent orders, fines, and required corrective disclosures. Beyond the legal risk, non-disclosure is a trust risk — audiences that discover undisclosed sponsorship lose trust in both the brand and the creator. For small businesses running any kind of influencer or perk-for-post program, FTC disclosure is non-negotiable. Most modern UGC and influencer platforms auto-inject the required disclosure as a feature.",
    examples: [
      {
        title: "Influencer #ad on a TikTok",
        body: "A creator posts a TikTok promoting a skincare brand they received free product from. The required disclosure is #ad in the first line of the caption — not buried at the bottom, not hidden behind 'see more.'",
      },
      {
        title: "Perk-for-post program disclosure",
        body: "A restaurant offers a free dessert in exchange for an Instagram story tagging them. Even though the value is small, FTC rules apply: the story should include #ad or 'thanks to [restaurant] for the free dessert.'",
      },
      {
        title: "Employee-created content",
        body: "An employee posts a glowing review of their employer's product. The required disclosure is something like 'I work at [company]' — the employment relationship is itself a material connection.",
      },
    ],
    howToUse: [
      "Use #ad or #sponsored at the start of every promoted post. 'Thank you' alone is not sufficient.",
      "Make the disclosure visible without expanding the caption. If it gets truncated, it's not adequate.",
      "Match the disclosure to the platform — Instagram, TikTok, YouTube, and X each have specific guidance.",
      "Apply the rule even for small perks. There's no minimum threshold.",
      "Use a platform that auto-injects the disclosure. It removes the compliance burden from the creator and the brand.",
    ],
    relatedSlugs: [
      "influencer-marketing",
      "user-generated-content",
      "brand-ambassador",
      "earned-media",
    ],
  },
  {
    slug: "brand-ambassador",
    term: "Brand Ambassador",
    shortTitle: "Brand Ambassador",
    category: "People",
    definition:
      "A brand ambassador is a long-term advocate for a brand — usually a customer, employee, or hand-selected creator — who consistently represents the brand to their audience across multiple posts, events, or interactions. The distinction from an influencer is duration and depth: an influencer post is typically transactional, while an ambassador relationship spans months or years and involves a deeper alignment with the brand. Ambassadors may receive product, perks, commission, exclusive access, or a flat retainer.",
    whyItMatters:
      "Ambassadors generate the most credible kind of marketing content because the audience perceives a long-term relationship rather than a paid placement. They also amortize: each individual post may underperform a one-off influencer drop, but the cumulative effect of an ambassador program — dozens of mentions over a year, plus the network effects of an ambassador's audience knowing them as 'the [brand] person' — typically delivers stronger ROI than equivalent influencer spend. For small businesses, an ambassador program is the most natural extension of an already-happy customer base.",
    examples: [
      {
        title: "Yoga studio teacher ambassadors",
        body: "A yoga studio recruits 12 of its instructors as brand ambassadors, each posting twice a month and earning free studio access plus a small commission for new student signups. The program drives 38% of new students in its first year.",
      },
      {
        title: "DTC fitness apparel program",
        body: "A fitness apparel brand runs a 200-person ambassador program of nano- and micro-influencers, each receiving quarterly product drops and a 15% commission code. Ambassador-attributed revenue grows from 4% to 22% of total over 18 months.",
      },
      {
        title: "Local coffee shop regulars",
        body: "A coffee shop quietly recognizes 25 of its most-frequent regulars as 'tasting club' members — free monthly drinks in exchange for occasional social mentions. The program is invisible to outsiders, but the 25 members account for an estimated 30% of word-of-mouth-attributed new customers.",
      },
    ],
    howToUse: [
      "Recruit from your existing customers first. The best ambassadors already love you.",
      "Define expectations clearly — posts per month, tag requirements, FTC disclosure — but keep the volume reasonable.",
      "Mix perks: free product, exclusive access, status (a tier or title), and optionally cash commission. Status often matters more than money.",
      "Recognize ambassadors publicly. Featured posts, name shoutouts, and 'ambassador of the month' programs reinforce status.",
      "Track each ambassador's contribution. Renew the relationship with the top half; reset or rotate the bottom half.",
    ],
    relatedSlugs: [
      "influencer-marketing",
      "nano-influencer",
      "customer-loyalty-program",
      "ftc-disclosure",
    ],
  },
  {
    slug: "affiliate-marketing",
    term: "Affiliate Marketing",
    shortTitle: "Affiliate Marketing",
    category: "Channels",
    definition:
      "Affiliate marketing is a performance-based channel where third parties (affiliates) earn a commission for driving a measurable result — typically a sale, but sometimes a lead or a sign-up — for an advertiser. Affiliates promote the advertiser through their own content (blog posts, YouTube videos, email lists, social media), and they're paid only when their referrals convert. Tracking is done through unique referral links, coupon codes, or post-purchase attribution.",
    whyItMatters:
      "Affiliate marketing is performance-pure: you only pay when a sale happens. For small businesses and growing brands, it's a way to access distribution you couldn't afford on a fixed-fee basis. Major affiliate-driven categories — finance, software, fitness, fashion — see 15–30% of revenue come through affiliate channels at established brands. The category includes everything from a single blogger with an affiliate link to a network like ShareASale or Impact connecting brands with thousands of publishers.",
    examples: [
      {
        title: "SaaS affiliate program",
        body: "A SaaS company pays a 25% recurring commission to affiliates for the first 12 months of a referred customer's subscription. After two years, 18% of new MRR comes through 80 active affiliates, with the top 10 driving 60% of that.",
      },
      {
        title: "DTC affiliate code",
        body: "A DTC brand runs an affiliate program where each affiliate gets a unique discount code that gives 10% off to customers and 10% commission to the affiliate. They onboard 400 affiliates in a year, of whom 90 drive measurable revenue.",
      },
      {
        title: "Review-site affiliate",
        body: "A B2B SaaS startup partners with three category review sites that earn $50 per qualified lead. The review-site channel generates 30% of pipeline in year one, replacing two paid-search campaigns.",
      },
    ],
    howToUse: [
      "Start with affiliate-friendly commission rates: 15–30% for digital products, 5–15% for physical, $20–$100 flat for leads. Adjust based on margin and CAC.",
      "Use a real attribution tool (Refersion, Impact, PartnerStack, or a built-in referral product) rather than spreadsheets.",
      "Give affiliates real assets — banners, copy, swipe files, demo videos. The easier you make it to promote, the more they'll promote.",
      "Vet affiliates. A few high-quality affiliates beat hundreds of low-effort ones.",
      "Require disclosure of the affiliate relationship per FTC guidelines on every promotional post.",
    ],
    relatedSlugs: [
      "referral-marketing",
      "customer-acquisition-cost",
      "ftc-disclosure",
      "attribution-tracking",
    ],
  },
  {
    slug: "conversion-rate",
    term: "Conversion Rate",
    shortTitle: "Conversion Rate",
    category: "Metrics",
    definition:
      "Conversion rate is the percentage of users who take a defined desired action out of the total who had the opportunity. It's expressed as a ratio: conversions divided by total visitors (or sessions, or users, depending on the context). The 'conversion' can be any action you care about — a purchase, a signup, a demo request, a download, an email open, a click — but the metric only makes sense when both numerator and denominator refer to the same population.",
    whyItMatters:
      "Conversion rate is one of the few metrics that ties marketing effort directly to business outcomes. Doubling your conversion rate is mathematically equivalent to halving your acquisition cost — and it usually requires fewer resources than acquiring more traffic. Improvements to conversion rate also compound: a 20% lift in homepage CVR compounds against a 20% lift in checkout CVR. For small businesses, conversion rate is often the most cost-effective place to invest before scaling paid acquisition.",
    examples: [
      {
        title: "DTC product page review widget",
        body: "A DTC brand adds a review widget to product pages. PDP conversion rises from 2.4% to 3.1% — a 29% relative lift — adding roughly $80,000 in annual revenue at no incremental cost.",
      },
      {
        title: "SaaS signup form simplification",
        body: "A SaaS company removes three fields from its signup form. Trial-signup conversion goes from 14% to 22% on the same traffic — a 57% lift — without changing anything else.",
      },
      {
        title: "Local service checkout flow",
        body: "A local cleaning service replaces its 'request a quote' form with an instant-booking widget. Booking conversion triples; revenue per visitor lifts 2.1x.",
      },
    ],
    howToUse: [
      "Define the conversion explicitly. Different teams will measure 'conversion' differently — be specific.",
      "Track conversion rate by source, device, and segment. A blended number hides the real variation.",
      "Test one thing at a time. A/B testing isolates effects; throwing in five changes at once teaches you nothing.",
      "Prioritize tests by expected impact and cost — high-traffic, high-intent pages first.",
      "Track conversion rate over time, not just point-in-time. Seasonality, traffic mix, and inventory all move it.",
    ],
    relatedSlugs: [
      "customer-acquisition-cost",
      "engagement-rate",
      "cohort-analysis",
      "social-proof",
    ],
  },
  {
    slug: "customer-acquisition-cost",
    term: "Customer Acquisition Cost (CAC)",
    shortTitle: "Customer Acquisition Cost",
    abbreviation: "CAC",
    category: "Metrics",
    definition:
      "Customer Acquisition Cost is the total amount a business spends to acquire a single new customer, calculated by dividing the sum of all marketing and sales costs over a period by the number of new customers acquired in that same period. A complete CAC includes ad spend, sales team salaries, marketing software, agency fees, and content production — anything that demonstrably contributes to acquiring a customer. The number is usually most useful when compared against customer lifetime value (LTV).",
    whyItMatters:
      "CAC is one of the two numbers — alongside LTV — that determines whether a business model works. A SaaS rule of thumb is LTV ≥ 3x CAC, and CAC payback ≤ 12 months. For small businesses, CAC is the single most direct measure of marketing efficiency. Trends matter even more than the absolute number: rising CAC over time is one of the earliest signs of channel saturation or market shifts.",
    examples: [
      {
        title: "DTC paid-search CAC vs referral CAC",
        body: "A DTC brand tracks CAC by channel: paid search runs $58, paid social $42, referral $9. They shift budget toward referral and email, dropping blended CAC from $46 to $29 over six months.",
      },
      {
        title: "SaaS CAC payback math",
        body: "A SaaS company has a CAC of $1,800 and ARPU of $250/mo. CAC payback is roughly 7 months at 100% gross margin — healthy. Adding 20% to ad spend with the same conversion rate would push payback past 9 months, the threshold for slowing growth.",
      },
      {
        title: "Local service neighborhood CAC",
        body: "A local plumbing company finds CAC varies from $45 in one neighborhood to $180 in another. They concentrate marketing on the lower-CAC areas, doubling efficient revenue.",
      },
    ],
    howToUse: [
      "Calculate CAC honestly. Include all marketing and sales costs — not just paid media.",
      "Segment CAC by channel and by customer cohort. Blended CAC hides the bad channels behind the good ones.",
      "Pair CAC with LTV. CAC by itself is meaningless if you don't know what a customer is worth.",
      "Track CAC payback period, not just the ratio. Long payback periods strangle cash flow.",
      "Be skeptical of last-touch attribution. CAC that ignores upper-funnel content typically overstates paid-channel performance.",
    ],
    relatedSlugs: [
      "customer-lifetime-value",
      "conversion-rate",
      "attribution-tracking",
      "cohort-analysis",
    ],
  },
  {
    slug: "customer-lifetime-value",
    term: "Customer Lifetime Value (LTV)",
    shortTitle: "Customer Lifetime Value",
    abbreviation: "LTV",
    category: "Metrics",
    definition:
      "Customer Lifetime Value is the total revenue (or, more rigorously, gross profit) a business can expect from a single customer over the duration of their relationship. It's calculated as average order value × purchase frequency × average customer lifespan — or, more accurately, by tracking actual cohort revenue over time. LTV is fundamental to deciding how much you can profitably spend to acquire a customer and to identifying which customer segments are worth investing in retaining.",
    whyItMatters:
      "LTV is what makes a marketing budget defensible. If a customer is worth $500 over their lifetime and you can acquire them for $80, you have a business; if a customer is worth $50 and you spend $80 to acquire them, you don't. For small businesses, LTV is also the lens that justifies spending on retention. A loyalty program that increases purchase frequency by 20% can lift LTV more than any acquisition campaign and often costs less to run.",
    examples: [
      {
        title: "DTC LTV by cohort",
        body: "A DTC brand finds first-purchase LTV of $42, while customers who make a second purchase have an LTV of $190. They invest heavily in second-purchase email automation, lifting blended LTV 31% in a year.",
      },
      {
        title: "Salon LTV math",
        body: "A salon's average customer visits every 6 weeks at $85, for 2.4 years on average. LTV is about $1,750. The owner is willing to spend up to $200 to acquire a new client and still have a 3:1 LTV:CAC ratio.",
      },
      {
        title: "SaaS expansion LTV",
        body: "A SaaS company finds 40% of customers expand to a higher tier within 18 months. Expansion revenue adds 60% to LTV, fundamentally changing the CAC budget the company can afford.",
      },
    ],
    howToUse: [
      "Use gross margin LTV, not just revenue LTV. Margin is what funds growth.",
      "Track LTV by cohort. Newer cohorts often have different LTV characteristics than older ones.",
      "Build LTV models that include expansion, referrals, and retention separately — each is a different lever.",
      "Use LTV to set max-allowable CAC by channel and segment.",
      "Prioritize retention investments that lift LTV; they usually have higher ROI than equivalent acquisition spend.",
    ],
    relatedSlugs: [
      "customer-acquisition-cost",
      "customer-loyalty-program",
      "cohort-analysis",
      "net-promoter-score",
    ],
  },
  {
    slug: "engagement-rate",
    term: "Engagement Rate",
    shortTitle: "Engagement Rate",
    category: "Metrics",
    definition:
      "Engagement rate is the percentage of an audience that interacts with a piece of content — through likes, comments, shares, saves, clicks, or replies — out of the total audience that could have seen it. The exact formula varies by platform and use case: 'engagement rate by reach' (engagements / reach) is the most common for social posts; 'engagement rate by followers' (engagements / followers) is common for influencer evaluation; and platform-specific composite metrics exist for Instagram, TikTok, and LinkedIn.",
    whyItMatters:
      "Engagement rate is the cleanest indicator of whether content actually resonates with an audience. Reach without engagement is dead-air impressions; engagement is the signal that content is doing what content is supposed to do — earn attention. For brands evaluating influencers, engagement rate is a far better predictor of conversion than follower count. For brands evaluating their own organic content, engagement rate trends signal whether the content strategy is working.",
    examples: [
      {
        title: "Influencer ER vetting",
        body: "A brand evaluates two micro-influencers with similar follower counts. One has a 6% engagement rate, the other 1.2%. Despite identical reach on paper, the 6% influencer drives 4.7x more clicks per post for the same fee.",
      },
      {
        title: "Brand organic ER lift",
        body: "A brand shifts from product photos to behind-the-scenes Reels. Engagement rate goes from 1.4% to 4.1% over three months, with a corresponding lift in tagged-post UGC.",
      },
      {
        title: "B2B LinkedIn ER",
        body: "A B2B SaaS company A/B tests text-only vs. carousel posts on LinkedIn. Carousels engage 3x better; the team shifts the editorial calendar accordingly.",
      },
    ],
    howToUse: [
      "Track engagement rate by post format. Reels, carousels, single images, and text-only all behave differently.",
      "Vet influencers by engagement, not just follower count. Aim for 3%+ for micro-influencers, 5%+ for nano.",
      "Watch engagement rate trends, not single posts. One viral post is variance; a sustained lift is signal.",
      "Separate vanity engagements (likes) from valuable ones (saves, shares, comments).",
      "Compare your engagement rate to your category benchmarks, not to brands in unrelated industries.",
    ],
    relatedSlugs: [
      "micro-influencer",
      "nano-influencer",
      "reach",
      "impression",
    ],
  },
  {
    slug: "impression",
    term: "Impression",
    shortTitle: "Impression",
    category: "Metrics",
    definition:
      "An impression is a single instance of a piece of content being displayed to a viewer. The user doesn't have to interact with the content — they just have to have had the opportunity to see it. Impressions are a measure of how many times content was shown, not how many unique people saw it (that's reach). The exact definition varies slightly by platform — Instagram and Facebook count an impression each time content appears in feed, even if the same user sees it twice.",
    whyItMatters:
      "Impressions are the broadest measure of visibility. They tell you how much exposure a campaign generated. But impressions alone are a vanity metric — they're easy to inflate and don't predict business outcomes by themselves. The right way to use impressions is as a baseline denominator: impressions explain engagement rate, click-through rate, and cost-per-thousand (CPM), which are the actually useful metrics.",
    examples: [
      {
        title: "Awareness campaign impressions",
        body: "A regional brand runs an awareness-focused Instagram Reels campaign. The campaign delivers 8.4M impressions at a CPM of $4.20. Brand-search lift in the target geography is 18% over the eight-week campaign.",
      },
      {
        title: "Influencer post impression delivery",
        body: "A micro-influencer guarantees 'at least 25k impressions' on a sponsored Reel. They deliver 32k impressions and the brand sees 1,400 link clicks — a 4.4% click-through rate.",
      },
      {
        title: "Search ad impression share",
        body: "A small business notices its search-ad impression share is only 38% — competitors are showing up for the same queries. Increasing budget and bid caps lifts impression share to 71% and doubles conversions.",
      },
    ],
    howToUse: [
      "Treat impressions as a denominator, not a goal. The metrics that matter divide something by impressions.",
      "Distinguish between impressions and reach. Impressions count repeats; reach is unique people.",
      "Track CPM (cost per thousand impressions) for paid channels — it's the best like-for-like cross-platform cost metric.",
      "Watch impression share in paid search — it tells you how much of available demand you're capturing.",
      "Don't celebrate impression milestones in isolation. A million impressions that drive zero clicks is not a win.",
    ],
    relatedSlugs: [
      "reach",
      "engagement-rate",
      "conversion-rate",
      "paid-media",
    ],
  },
  {
    slug: "reach",
    term: "Reach",
    shortTitle: "Reach",
    category: "Metrics",
    definition:
      "Reach is the total number of unique users who saw a piece of content at least once during a defined period. Unlike impressions, which count every display, reach counts each viewer only once — so 100 impressions delivered to 60 unique people is a reach of 60. Reach can be 'organic reach' (unique people who saw the content without paid promotion), 'paid reach' (unique people who saw it via paid distribution), or 'total reach' (the deduplicated sum).",
    whyItMatters:
      "Reach is the cleanest measure of audience scale — it tells you how many distinct people you actually got in front of. For brand awareness campaigns, reach is often the primary KPI alongside frequency (the average number of times each person saw the content). For local businesses, organic reach within a defined geography is one of the most useful metrics there is, because it answers: how many of the people who could become customers actually saw us?",
    examples: [
      {
        title: "Local restaurant tagged-post reach",
        body: "A restaurant tracks the reach of UGC posts where customers tagged them. Over a year, tagged UGC reached an estimated 240,000 unique local accounts — multiples of the restaurant's own organic reach.",
      },
      {
        title: "Brand campaign reach vs frequency",
        body: "A regional brand campaign delivers 4.2M reach with an average frequency of 3.1. The team decides next quarter's campaign should optimize for higher reach at lower frequency to expand awareness.",
      },
      {
        title: "Influencer reach overlap",
        body: "A brand partners with three influencers in the same niche and discovers 35% audience overlap. They diversify their next round of partnerships to expand unique reach.",
      },
    ],
    howToUse: [
      "Distinguish reach from impressions. They're different metrics that answer different questions.",
      "Watch frequency. Too low and the message doesn't stick; too high and you're wasting budget on the same people.",
      "Track reach by geography for local campaigns. Local reach is a far better KPI than national reach for most small businesses.",
      "Compute audience overlap between paid and organic channels — duplicative reach is duplicative cost.",
      "Use reach as input to brand-lift studies, not as the brand-lift study itself.",
    ],
    relatedSlugs: [
      "impression",
      "engagement-rate",
      "paid-media",
      "earned-media",
    ],
  },
  {
    slug: "hashtag-strategy",
    term: "Hashtag Strategy",
    shortTitle: "Hashtag Strategy",
    category: "Channels",
    definition:
      "A hashtag strategy is a deliberate plan for which hashtags to use on social posts to maximize discovery, audience targeting, and content categorization. A good hashtag strategy mixes broad/high-volume hashtags (for reach), niche/medium-volume hashtags (for relevance), and branded hashtags (for ownership and UGC aggregation). It also accounts for platform-specific behavior — Instagram, TikTok, and LinkedIn each treat hashtags very differently.",
    whyItMatters:
      "Hashtags are one of the few free distribution levers left on social media. Used well, they expand reach to non-followers, recruit relevant audiences, and aggregate UGC under a single discoverable tag. Used badly — too many, too generic, or unrelated — they hurt rather than help. For small businesses, a thoughtful branded hashtag also creates a free archive of customer content.",
    examples: [
      {
        title: "Local cafe branded hashtag",
        body: "A cafe launches #BrewedAtAuroraCafe and prints it on every cup sleeve. Over a year, 4,300 customer posts use the hashtag, creating a free, searchable wall of UGC.",
      },
      {
        title: "Tiered Instagram strategy",
        body: "A wellness brand uses a 'tiered' hashtag mix: 3 broad (#wellness), 4 medium (#womenswellness), 3 niche (#postpartumwellness). Their average post reaches 40% more non-followers than when they used only broad tags.",
      },
      {
        title: "TikTok discovery hashtags",
        body: "A creator-focused brand discovers that adding #SmallBusinessTikTok and #TikTokMadeMeBuyIt lifts their average video views from 2,000 to 8,000.",
      },
    ],
    howToUse: [
      "Mix volumes: 1–2 broad, 3–5 medium, 2–3 niche. Avoid maxing out the platform's hashtag limit.",
      "Build and consistently use one branded hashtag. Make it short, memorable, and owned by you.",
      "Research what works in your category. Don't guess — look at what your competitors and your niche's top performers use.",
      "Rotate hashtag sets. Reusing identical hashtags on every post can reduce reach over time.",
      "Audit performance monthly. Drop hashtags that aren't driving discovery; add new ones that emerge in your niche.",
    ],
    relatedSlugs: [
      "engagement-rate",
      "reach",
      "user-generated-content",
      "content-calendar",
    ],
  },
  {
    slug: "content-calendar",
    term: "Content Calendar",
    shortTitle: "Content Calendar",
    category: "Operations",
    definition:
      "A content calendar is a planning document — typically a spreadsheet, Notion database, or dedicated tool — that schedules upcoming social, blog, email, and ad content across channels, dates, and themes. It includes the planned content, the channel, the publish date, the responsible owner, the status (drafted, scheduled, published), and often the campaign or theme tag. A good content calendar makes content production predictable and prevents the all-too-common situation where teams scramble for what to post the morning of.",
    whyItMatters:
      "Consistency beats virality for almost every small business. A content calendar is the operational layer that makes consistent publishing possible. It also enables theming — campaigns that span multiple channels and weeks rather than disconnected one-offs. For solo operators and small teams, the calendar is often the single highest-leverage marketing tool there is, because it shifts content from a daily decision to a planned execution.",
    examples: [
      {
        title: "Salon monthly calendar",
        body: "A salon plans a content calendar with three Instagram posts a week, two Reels, one Story series, and a monthly email — all themed around that month's promo. Booking volume becomes more predictable; ad creative reuses calendar content.",
      },
      {
        title: "DTC launch calendar",
        body: "A DTC brand builds a six-week launch calendar with weekly hero content, daily supporting posts, two email touchpoints, and three influencer drops. The launch generates 4x their previous best month.",
      },
      {
        title: "B2B SaaS thought-leadership calendar",
        body: "A B2B SaaS company schedules one long-form blog, three LinkedIn posts, and one newsletter per week, all tied to a quarterly theme. Inbound lead volume rises 60% over the quarter.",
      },
    ],
    howToUse: [
      "Plan at least 30 days ahead. Two weeks isn't enough buffer; three months is unsustainable without dedicated capacity.",
      "Theme by week or campaign. Themed content reads as intentional and performs better than random posts.",
      "Include channel, format, owner, status, and link-to-asset in every row.",
      "Build templates for recurring content types so producing each post is mostly fill-in-the-blank.",
      "Review what worked monthly. Re-run the best performers; cut the formats that consistently miss.",
    ],
    relatedSlugs: [
      "hashtag-strategy",
      "engagement-rate",
      "owned-media",
      "email-drip-campaign",
    ],
  },
  {
    slug: "attribution-tracking",
    term: "Attribution Tracking",
    shortTitle: "Attribution Tracking",
    category: "Metrics",
    definition:
      "Attribution tracking is the practice of measuring which marketing touchpoints contributed to a conversion. The simplest model — last-touch attribution — credits 100% of the conversion to the final channel the customer interacted with. More sophisticated models include first-touch, linear (equal credit across touchpoints), time-decay, position-based, and data-driven attribution (where an algorithm assigns weights based on observed contribution). Tracking is typically implemented via UTM parameters, pixels, server-side events, and unique discount codes or referral links.",
    whyItMatters:
      "Without attribution, every marketing dollar looks the same. With attribution, you can see which channels actually drive customers — and which ones are coasting on credit they don't deserve. For small businesses, even imperfect attribution (a UTM scheme plus unique discount codes) is dramatically better than no attribution. It's the difference between guessing and knowing where your customers come from.",
    examples: [
      {
        title: "DTC last-touch vs first-touch shift",
        body: "A DTC brand running last-touch attribution sees paid search as their top channel. Switching to first-touch attribution reveals that TikTok content is initiating most customer journeys; search is closing them. They re-allocate budget accordingly.",
      },
      {
        title: "Local service UTM tagging",
        body: "A local services business adds UTM parameters to every link they put online. Within 90 days they discover that 28% of their 'paid Google traffic' was actually direct traffic mis-attributed by their analytics setup.",
      },
      {
        title: "Influencer attribution code",
        body: "A brand gives every influencer a unique discount code and a personal UTM link. They learn that two of their twelve influencers drive 70% of program revenue — and end the other ten partnerships.",
      },
    ],
    howToUse: [
      "Adopt a consistent UTM scheme. Standardize source/medium/campaign across every link.",
      "Use unique discount codes for offline channels (radio, print, influencer) where pixels can't track.",
      "Pick an attribution model and stick with it long enough to learn — switching models constantly muddles the data.",
      "Cross-reference paid platform reporting with your own analytics. They almost never agree; the truth is usually in between.",
      "For small businesses, last-touch plus first-touch attribution is enough to make better decisions than 80% of competitors.",
    ],
    relatedSlugs: [
      "conversion-rate",
      "customer-acquisition-cost",
      "cohort-analysis",
      "paid-media",
    ],
  },
  {
    slug: "cohort-analysis",
    term: "Cohort Analysis",
    shortTitle: "Cohort Analysis",
    category: "Metrics",
    definition:
      "Cohort analysis is the practice of grouping customers by a shared characteristic — typically their acquisition date or acquisition channel — and tracking that group's behavior over time. Instead of looking at all customers as a single blended population, cohort analysis isolates how each cohort retains, spends, and churns. The most common visualization is a retention curve: percentage of each cohort still active in week 1, week 4, week 12, etc.",
    whyItMatters:
      "Cohort analysis is the single most useful tool for understanding whether a business is actually getting better. Blended metrics (overall retention, blended LTV) can stay flat or improve even when newer cohorts are deteriorating, because older, healthier cohorts mask the trend. Cohort analysis exposes that. It's also how to evaluate whether a product or marketing change is working — if the post-change cohort retains better than the pre-change cohort at the same week, the change is helping.",
    examples: [
      {
        title: "SaaS retention regression",
        body: "A SaaS company sees blended retention holding steady. Cohort analysis reveals that each new monthly cohort is retaining 2–3% worse than the prior one — a quiet regression that older cohorts were hiding. They identify and fix an onboarding bottleneck.",
      },
      {
        title: "DTC repeat-purchase cohorts",
        body: "A DTC brand cohorts customers by acquisition channel. Facebook-acquired customers have a 12% second-purchase rate; influencer-acquired customers have a 31% rate. They re-weight their acquisition spend.",
      },
      {
        title: "Local gym member cohorts",
        body: "A gym tracks 12-month retention by membership type. Annual prepaid members retain 78% at 12 months; month-to-month members retain 31%. They incentivize the annual plan and see a 40% lift in expected LTV.",
      },
    ],
    howToUse: [
      "Cohort by acquisition month at minimum. That's the baseline view every business should have.",
      "Add channel cohorts — different acquisition sources almost always produce different retention curves.",
      "Watch the slope, not just the level. A flat retention curve at any level is gold; a declining curve is a warning.",
      "Compare pre/post-change cohorts to measure whether interventions are working.",
      "Use cohort LTV, not blended LTV, to set CAC targets.",
    ],
    relatedSlugs: [
      "customer-lifetime-value",
      "customer-acquisition-cost",
      "conversion-rate",
      "net-promoter-score",
    ],
  },
  {
    slug: "net-promoter-score",
    term: "Net Promoter Score (NPS)",
    shortTitle: "Net Promoter Score",
    abbreviation: "NPS",
    category: "Metrics",
    definition:
      "Net Promoter Score is a customer satisfaction metric calculated from a single survey question: 'On a scale of 0–10, how likely are you to recommend us to a friend or colleague?' Respondents scoring 9–10 are 'promoters,' 7–8 are 'passives,' and 0–6 are 'detractors.' NPS is the percentage of promoters minus the percentage of detractors, expressed as a number from -100 to +100. The metric was developed by Fred Reichheld and Bain & Company in 2003.",
    whyItMatters:
      "NPS is widely used precisely because it's simple. A single question, a single score, comparable across companies and over time. It correlates — imperfectly but meaningfully — with retention, referral rates, and growth. For small businesses, it's a way to take the temperature of the customer base quickly and identify which customers might be willing to refer, review, or advocate. The follow-up question ('what's the most important reason for your score?') often produces more useful insight than the score itself.",
    examples: [
      {
        title: "SaaS NPS-to-referral pipeline",
        body: "A SaaS company sends an NPS survey 45 days after signup. Promoters automatically get a follow-up email inviting them to a referral program; detractors get routed to customer success. Referral signups triple.",
      },
      {
        title: "Restaurant NPS by location",
        body: "A multi-location restaurant tracks NPS by location. One location consistently scores 30 points below the others. A site visit reveals service issues; a six-week training program lifts the score and revenue.",
      },
      {
        title: "DTC NPS as cohort filter",
        body: "A DTC brand correlates NPS at month one with two-year retention. Customers scoring 9–10 retain at 71%; customers scoring 0–6 retain at 22%. They use early NPS as a churn-risk signal.",
      },
    ],
    howToUse: [
      "Ask at the right moment — after value has been delivered but not so late that recall has faded.",
      "Track the score, but pay more attention to the qualitative follow-up. The 'why' is more actionable than the number.",
      "Route promoters into referral and review programs automatically.",
      "Route detractors to customer success or a recovery offer. Don't ignore them.",
      "Watch NPS by cohort and segment, not just blended. The trend matters more than the point-in-time number.",
    ],
    relatedSlugs: [
      "customer-loyalty-program",
      "referral-marketing",
      "cohort-analysis",
      "word-of-mouth-marketing",
    ],
  },
  {
    slug: "viral-coefficient",
    term: "Viral Coefficient",
    shortTitle: "Viral Coefficient",
    category: "Metrics",
    definition:
      "The viral coefficient (also called the K-factor) measures how many new users each existing user generates through referrals or shares. It's calculated as: average number of invites sent per user × conversion rate of those invites. A K-factor of 1.0 means each user generates one new user, which produces flat (non-viral) growth. A K-factor above 1.0 means each cohort is larger than the last — exponential viral growth. Most real products have a K-factor well below 1.0, but even 0.2–0.4 meaningfully reduces effective acquisition cost.",
    whyItMatters:
      "Few products achieve sustained viral coefficients above 1.0, but every product can move the needle on K-factor with deliberate design. Even moving from 0.1 to 0.3 multiplies organic acquisition 3x. For small businesses, structured referral programs are the most reliable way to lift K-factor. The math is forgiving — a modest improvement, sustained over time, compounds into a meaningful share of new customers.",
    examples: [
      {
        title: "Meal delivery K-factor spike",
        body: "A meal-delivery startup runs a referral promo that briefly pushes their K-factor above 1.0. They sustain it at 0.4 long-term, which means roughly a third of new customers come for free.",
      },
      {
        title: "SaaS referral coefficient",
        body: "A SaaS company measures their referral K-factor at 0.18 — modest but meaningful. They estimate the program saves $400k/year in equivalent paid acquisition.",
      },
      {
        title: "Local business viral loop",
        body: "A salon's 'bring a friend' program runs at an implied K-factor of about 0.14 — small but compounding. Over three years, the program is responsible for an estimated 22% of new clients.",
      },
    ],
    howToUse: [
      "Measure your K-factor explicitly. Most businesses have a coefficient but don't know it.",
      "Tweak the invite mechanics — making invites one-tap can double sent volume.",
      "Tweak the reward — double-sided incentives typically convert better than one-sided.",
      "Track K-factor by cohort. New cohorts may behave very differently from older ones.",
      "Pair K-factor with CAC math — even modest viral coefficients can change which paid channels are profitable.",
    ],
    relatedSlugs: [
      "referral-marketing",
      "customer-acquisition-cost",
      "word-of-mouth-marketing",
      "cohort-analysis",
    ],
  },
  {
    slug: "earned-media",
    term: "Earned Media",
    shortTitle: "Earned Media",
    category: "Channels",
    definition:
      "Earned media is any publicity a brand receives that it didn't pay for and doesn't directly control. It includes press coverage, organic social mentions, customer reviews, UGC, podcast features, blog references, and word-of-mouth — anything where a third party voluntarily talks about the brand. It's distinct from paid media (where you buy distribution) and owned media (where you control the channel). The terms together form the classic 'paid, owned, earned' triad.",
    whyItMatters:
      "Earned media is the most credible kind of marketing because the audience knows the brand didn't pay for it. A magazine feature, a viral TikTok from a real customer, or a five-star Google review carries more weight than any ad. For small businesses, earned media is often the most cost-effective channel — and it compounds, because each new piece of earned media improves the discovery surface area of the brand.",
    examples: [
      {
        title: "Restaurant local press feature",
        body: "A restaurant lands a feature in a local food publication. The article drives 8,400 unique visitors to the website in the first week, more than three months of paid social would have at the restaurant's normal budget.",
      },
      {
        title: "Viral TikTok lift",
        body: "A creator's organic TikTok about a small-batch coffee brand racks up 2.1M views in 48 hours. The brand's website traffic spikes 14x; revenue triples for two weeks.",
      },
      {
        title: "Industry award mention",
        body: "A small SaaS company wins a category award from an analyst firm. The press release and analyst coverage drive 230 demo requests over the following 60 days at zero direct cost.",
              },
    ],
    howToUse: [
      "Pitch local press deliberately. A short, well-targeted email to the right reporter often works.",
      "Create earned-media moments — events, anniversaries, milestones, partnerships — that give press a reason to cover you.",
      "Engineer remarkable customer experiences worth talking about. Earned media is downstream of the product.",
      "Encourage UGC with structured perk programs. Every customer post is a piece of earned media.",
      "Track earned media as a category — mentions per month, sentiment, reach — not just one-off hits.",
    ],
    relatedSlugs: [
      "owned-media",
      "paid-media",
      "user-generated-content",
      "social-proof",
    ],
  },
  {
    slug: "paid-media",
    term: "Paid Media",
    shortTitle: "Paid Media",
    category: "Channels",
    definition:
      "Paid media is any marketing distribution a brand pays for directly: search ads, social ads, display ads, sponsored content, paid influencer partnerships, podcast ads, billboards, print ads, TV spots. The defining trait is that the brand pays a third party for access to that party's audience. Paid media is fast, predictable, and scalable — but it stops the moment you stop paying, which is its key constraint relative to earned and owned media.",
    whyItMatters:
      "Paid media is essential for most growing businesses because it's the only channel that can be turned on quickly and scaled predictably. The trade-off is that it has no compounding effect — every impression costs the same as the last one. Smart businesses use paid media to amplify earned and owned media: take the best UGC and run it as a Spark Ad, take the best blog post and promote it on LinkedIn, take the best customer testimonial and put it on a billboard.",
    examples: [
      {
        title: "DTC paid social ladder",
        body: "A DTC brand starts with $500/day on Meta. The campaign is profitable, so they scale to $2,000/day. CAC stays stable until day 18, when audience saturation drives it up 25%. They expand to TikTok and Pinterest to maintain efficiency.",
      },
      {
        title: "Local services paid search",
        body: "A local plumber runs Google Search Ads with a $50/day budget targeting 'plumber [city]' queries. Average CAC is $42 against an average job value of $380 — a 9x ROAS.",
      },
      {
        title: "Paid amplification of UGC",
        body: "A skincare brand identifies their three top-performing organic UGC TikToks and runs them as Spark Ads. The Spark Ads outperform their custom creative by 60% on click-through rate.",
      },
    ],
    howToUse: [
      "Don't start with paid media before you have a working organic motion. Paid amplifies what works; it doesn't fix what doesn't.",
      "Track CAC payback by channel. Cheap impressions aren't cheap if they don't convert.",
      "Use earned-media content (UGC, real testimonials) as paid creative. It almost always outperforms studio-shot brand content.",
      "Test small, learn fast, scale what works. Big up-front budgets without test results are the biggest source of wasted paid spend.",
      "Diversify channels. Single-platform dependence is single-platform risk.",
    ],
    relatedSlugs: [
      "earned-media",
      "owned-media",
      "customer-acquisition-cost",
      "attribution-tracking",
    ],
  },
  {
    slug: "owned-media",
    term: "Owned Media",
    shortTitle: "Owned Media",
    category: "Channels",
    definition:
      "Owned media is any channel a brand fully controls and doesn't rent: its website, blog, email list, SMS list, app, podcast, owned social accounts (with the caveat that social platforms can change rules), and any content distributed through those channels. The defining trait is that the brand sets the rules, owns the audience relationship, and isn't subject to algorithmic changes from a third party. Email is the canonical owned-media channel because the relationship exists outside any platform's control.",
    whyItMatters:
      "Owned media compounds over time the way paid media doesn't. A blog post you publish today can still drive traffic ten years from now. An email list you build never expires (within reason). For small businesses, owned media is the long-term moat against paid acquisition cost inflation and platform-policy risk. The business that has built a strong owned-media audience can ride out paid ad cost spikes and platform changes; the business that depends purely on paid media can't.",
    examples: [
      {
        title: "DTC email list compounding",
        body: "A DTC brand grows its email list from 4,000 to 38,000 subscribers over two years. Email-driven revenue grows from 4% of total to 22%, and that channel has near-zero variable cost per send.",
      },
      {
        title: "SaaS blog SEO compounding",
        body: "A SaaS company invests in 100 high-quality blog posts over 18 months. Organic search traffic grows from 3k/month to 80k/month. The blog now drives 40% of new trial signups at zero ongoing variable cost.",
      },
      {
        title: "Local salon SMS list",
        body: "A salon builds an opt-in SMS list of 1,400 clients. A single appointment-reminder + last-minute-availability automation drives 22% of all bookings.",
      },
    ],
    howToUse: [
      "Build your email and SMS lists every chance you get. They're the only channels you fully own.",
      "Invest in SEO content with long shelf life. Evergreen content compounds.",
      "Don't depend on a single social platform. Use it for distribution, but route audience back to owned channels.",
      "Track owned-media revenue contribution. It's almost always higher-margin than paid media revenue.",
      "Treat owned media as a long-term asset, not a short-term campaign.",
    ],
    relatedSlugs: [
      "earned-media",
      "paid-media",
      "email-drip-campaign",
      "content-calendar",
    ],
  },
  {
    slug: "email-drip-campaign",
    term: "Email Drip Campaign",
    shortTitle: "Email Drip Campaign",
    category: "Channels",
    definition:
      "An email drip campaign is a pre-scheduled sequence of emails sent automatically to a subscriber over time, triggered by an action (signup, purchase, abandoned cart) or a date (anniversary, birthday). Unlike one-off broadcasts, drips run on autopilot — once configured, they keep delivering relevant content to each new subscriber at the right moment in their journey. Drip campaigns are the workhorse of modern email marketing.",
    whyItMatters:
      "Drip campaigns scale revenue without scaling effort. A well-designed welcome drip might run for three years before it needs material updating — and during that time, it converts a measurable percentage of new subscribers into customers, repeat purchasers, or upsells. For small businesses, drips are one of the highest-ROI marketing investments because the cost is upfront and the return is continuous.",
    examples: [
      {
        title: "DTC welcome drip",
        body: "A DTC brand builds a 5-email welcome series: brand story, top-rated product, social proof, exclusive discount, urgency. The drip converts 18% of new subscribers within 14 days. It runs unattended for two years before requiring a refresh.",
      },
      {
        title: "SaaS onboarding drip",
        body: "A SaaS company sends a 7-day onboarding drip with one feature highlight per day. Customers who open at least 4 of the 7 emails are 3x more likely to convert from trial to paid.",
      },
      {
        title: "Salon birthday drip",
        body: "A salon sends a 3-email birthday sequence: 30 days before (early-bird discount), 7 days before (reminder), birthday day (final offer). The drip drives 14% of monthly bookings.",
      },
    ],
    howToUse: [
      "Pick a trigger and a goal. A drip without a clear goal is a newsletter pretending to be automation.",
      "Map the customer journey. Each email in the drip should move the recipient one step closer to the goal.",
      "Personalize where it matters. Name, segment, recent behavior — not faked personalization that backfires.",
      "Test cadence. Daily for high-intent moments (onboarding), weekly or monthly for low-intent (re-engagement).",
      "Refresh quarterly. Drips degrade as products, pricing, and offers evolve.",
    ],
    relatedSlugs: [
      "owned-media",
      "content-calendar",
      "conversion-rate",
      "customer-lifetime-value",
    ],
  },
];

export function getTerm(slug: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.slug === slug);
}

export function getRelatedTerms(slugs: string[]): GlossaryTerm[] {
  return slugs
    .map((s) => getTerm(s))
    .filter((t): t is GlossaryTerm => Boolean(t));
}
