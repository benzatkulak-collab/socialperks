export type AnswerItem = {
  slug: string;
  question: string;
  tldr: string;
  detailed: string[];
  mistakes: [string, string, string];
  doInstead: [string, string];
};

export const ANSWERS: AnswerItem[] = [
  {
    slug: "how-much-does-marketing-cost-for-small-business",
    question: "How much does marketing cost for a small business?",
    tldr: "Most small businesses spend 7-12% of revenue on marketing. A typical local business with $300K revenue spends $1,750-$3,000 per month. Customer-marketing platforms cost $49-$299/month and replace most paid ads.",
    detailed: [
      "The SBA recommends 7-8% of gross revenue for established businesses and 12-20% for new businesses.",
      "Paid ads (Google, Meta) average $1,000-$5,000/month for local businesses.",
      "Local SEO and content marketing: $500-$2,500/month.",
      "Customer-marketing software (referrals, reviews, loyalty): $49-$299/month.",
      "Influencer collabs: $50-$500 per post for nano/micro creators.",
    ],
    mistakes: [
      "Spending only on paid ads and ignoring earned media.",
      "Not tracking which channel actually drives revenue.",
      "Cutting marketing first when revenue dips.",
    ],
    doInstead: [
      "Allocate 60% to channels that compound over time (SEO, customer marketing, referrals) and 40% to immediate-response channels (paid ads, promotions).",
      "Measure cost per acquired customer for each channel monthly and double down on whichever beats your average customer lifetime value.",
    ],
  },
  {
    slug: "how-to-respond-to-a-bad-google-review",
    question: "How do I respond to a bad Google review?",
    tldr: "Respond within 24 hours, publicly, with empathy. Apologize, address the specific issue, and move detailed resolution offline. Never argue or blame the customer in the reply. A good response can turn a 1-star into a 4-star.",
    detailed: [
      "Acknowledge the customer's feelings in the first sentence.",
      "Mention a specific detail from their review so it does not sound canned.",
      "Apologize without admitting legal liability ('I am sorry your visit fell short').",
      "Offer a direct contact (manager email or phone) to resolve offline.",
      "End with an invitation to come back.",
    ],
    mistakes: [
      "Responding emotionally or defensively in the same hour you read it.",
      "Copy-pasting the same template across every negative review.",
      "Ignoring the review entirely (Google factors response rate into local ranking).",
    ],
    doInstead: [
      "Draft a response, wait two hours, then re-read it before posting. If it sounds defensive, soften the tone.",
      "Build a response framework: empathy line, specific detail, apology, offline offer, invitation. Every reply hits all five beats but the words change.",
    ],
  },
  {
    slug: "what-is-a-good-instagram-engagement-rate",
    question: "What is a good Instagram engagement rate?",
    tldr: "For small business accounts under 10K followers, 3-6% engagement is solid. Above 6% is excellent. Industry average is 0.6-1.4% for accounts over 100K followers. Calculate it: (likes + comments) / followers × 100.",
    detailed: [
      "Nano accounts (under 10K): 3-6% is typical, 7%+ is exceptional.",
      "Micro (10K-100K): 1.5-3% is healthy.",
      "Mid-tier (100K-1M): 0.8-1.5% is the norm.",
      "Macro (1M+): 0.5-1%.",
      "Reels engagement runs 2-3x higher than static posts.",
    ],
    mistakes: [
      "Comparing your rate to celebrity accounts with very different audiences.",
      "Buying followers (it tanks your engagement rate within weeks).",
      "Posting only when you have something to sell.",
    ],
    doInstead: [
      "Track engagement per post type weekly. If Reels outperform photos by 3x, shift your mix toward Reels.",
      "Focus on saves and shares, not just likes. Saves are the strongest signal to the algorithm and a far better predictor of growth.",
    ],
  },
  {
    slug: "how-often-should-i-post-on-instagram",
    question: "How often should I post on Instagram?",
    tldr: "For small businesses, 3-5 feed posts and 5-7 stories per week is the sweet spot. Reels: 3-4 per week. Quality beats quantity. Posting daily without a plan usually hurts engagement more than helps.",
    detailed: [
      "Feed posts: 3-5 per week (more than 7 dilutes reach per post).",
      "Reels: 3-4 per week (the strongest growth driver in 2026).",
      "Stories: daily if possible, batched in groups of 3-5.",
      "Best times: 11am-1pm and 7-9pm in your audience's timezone.",
      "Consistency matters more than frequency — pick a cadence you can sustain for 6 months.",
    ],
    mistakes: [
      "Posting daily for a week then disappearing for a month.",
      "Using the same content type every day (audience fatigue).",
      "Posting whenever you have time instead of when your audience is active.",
    ],
    doInstead: [
      "Batch-create 2 weeks of content in one 3-hour session, then schedule it. This is the only sustainable way to maintain cadence as a business owner.",
      "Use Instagram Insights to find the top 3 hours your audience is active. Post only in those windows for 30 days and compare reach to your previous month.",
    ],
  },
  {
    slug: "how-many-hashtags-should-i-use-on-instagram",
    question: "How many hashtags should I use on Instagram?",
    tldr: "Instagram now recommends 3-5 highly relevant hashtags per post. The old advice of 30 is outdated and can actually limit your reach in 2026. Mix one branded, two niche, and two broader tags.",
    detailed: [
      "3-5 hashtags is Instagram's official recommendation as of late 2024.",
      "Use one branded hashtag (your business name or campaign).",
      "Use two niche tags (under 500K posts) where you can actually rank.",
      "Use two broader tags (1M-5M posts) for occasional discovery.",
      "Place hashtags in the caption, not the first comment.",
    ],
    mistakes: [
      "Using 30 generic hashtags like #love #photooftheday.",
      "Reusing the exact same hashtag set on every post (looks spammy to the algorithm).",
      "Targeting only mega-popular tags where your post is buried in 60 seconds.",
    ],
    doInstead: [
      "Build 4-5 hashtag sets specific to your content categories (product, behind-the-scenes, customer feature, etc.) and rotate them.",
      "Find niche hashtags by checking what your top 10 competitors use, then filter to tags with 50K-500K posts.",
    ],
  },
  {
    slug: "how-to-track-marketing-roi",
    question: "How do I track marketing ROI?",
    tldr: "ROI = (revenue from marketing - marketing cost) / marketing cost × 100. Track it by channel using UTM codes, unique promo codes per campaign, and a simple spreadsheet. Most small businesses skip this and have no idea what works.",
    detailed: [
      "Tag every link with UTM parameters (source, medium, campaign).",
      "Give each channel a unique promo code (IG10, FB10, EMAIL10).",
      "Track first-touch and last-touch attribution monthly.",
      "Compare cost per customer acquired to average customer lifetime value.",
      "Set a 90-day measurement window — most channels need that long to show real signal.",
    ],
    mistakes: [
      "Looking only at vanity metrics (likes, impressions) instead of revenue.",
      "Attributing every sale to the last touchpoint and ignoring discovery channels.",
      "Switching channels every 30 days before they have time to work.",
    ],
    doInstead: [
      "Build one spreadsheet with channels as rows and spend/leads/customers/revenue as columns. Update it monthly. This single habit puts you ahead of 90% of small businesses.",
      "Use a customer-marketing platform that auto-tags referrals and attributes revenue back to the source customer. Manual attribution falls apart past 10 campaigns.",
    ],
  },
  {
    slug: "what-marketing-channels-have-the-highest-roi",
    question: "What marketing channels have the highest ROI?",
    tldr: "For small businesses: email marketing ($36 per $1 spent), customer referrals ($25 per $1), SEO ($22 per $1), and customer-marketing platforms ($20+ per $1) consistently top the list. Paid ads average $2-4 per $1.",
    detailed: [
      "Email marketing: 3,600% ROI on average (DMA 2024 data).",
      "Referral programs: 2,500% ROI when properly incentivized.",
      "SEO/content: 2,200% ROI but takes 6-12 months to compound.",
      "Customer reviews and UGC: 2,000% ROI for local businesses.",
      "Paid social: 200-400% ROI when well-targeted.",
    ],
    mistakes: [
      "Starting with the hardest channel (paid ads) before building owned channels.",
      "Ignoring email because 'no one reads email' (data says otherwise).",
      "Treating referrals as something that happens naturally instead of running a program.",
    ],
    doInstead: [
      "Build the compounding channels first (email, SEO, referrals) and use paid ads to accelerate them, not replace them. The owned channels keep working when you stop spending.",
      "Run a structured customer-marketing program where existing customers earn perks for reviews, referrals, and social posts. ROI compounds with every new customer added.",
    ],
  },
  {
    slug: "how-do-i-find-customers-online",
    question: "How do I find customers online?",
    tldr: "Show up where they search (Google, Maps), where they ask (Reddit, Facebook groups), and where they hang out (Instagram, TikTok). Local businesses should start with Google Business Profile, then build from there.",
    detailed: [
      "Google Business Profile: claim and optimize it (50% of local discoveries).",
      "Local SEO: rank for '[service] near me' and '[service] in [city]'.",
      "Social media: pick 1-2 platforms your customers actually use.",
      "Customer referrals: existing customers are your cheapest acquisition channel.",
      "Community presence: local Facebook groups, Reddit, Nextdoor.",
    ],
    mistakes: [
      "Trying to be on every platform at once.",
      "Buying email lists or follower packages.",
      "Posting promotional content only and ignoring community engagement.",
    ],
    doInstead: [
      "Pick the single channel where your top 10 customers found you, and pour 70% of your effort there for 90 days before adding a second channel.",
      "Turn your existing customers into your discovery engine. Word-of-mouth, online reviews, and social posts from real customers convert at 5-10x the rate of paid ads.",
    ],
  },
  {
    slug: "what-is-conversion-rate-optimization",
    question: "What is conversion rate optimization?",
    tldr: "Conversion rate optimization (CRO) is the practice of improving the percentage of visitors who take a desired action (buy, sign up, book). For most small businesses, the average website converts at 2-3%. CRO can double that without spending more on traffic.",
    detailed: [
      "Conversion rate = conversions / total visitors × 100.",
      "Average across industries: 2-3%. Top performers: 5-10%.",
      "Highest-impact CRO levers: clear value proposition, social proof, fewer form fields, faster page speed.",
      "Test one variable at a time using A/B tests.",
      "Mobile conversion is usually 30-50% lower than desktop — fix that first.",
    ],
    mistakes: [
      "Testing too many variables at once with too little traffic.",
      "Optimizing for clicks instead of revenue per visitor.",
      "Ignoring the post-click experience (slow site, confusing checkout).",
    ],
    doInstead: [
      "Start with qualitative research. Watch 10 users navigate your site (use a tool like Hotjar) before you change a single button color.",
      "Focus the first round of CRO on social proof: customer photos, reviews, real testimonials. This single change typically lifts conversion 15-30% for small businesses.",
    ],
  },
  {
    slug: "how-much-do-influencers-charge",
    question: "How much do influencers charge?",
    tldr: "Nano (1K-10K followers): $50-$250 per post. Micro (10K-100K): $250-$1,500. Mid-tier (100K-500K): $1,500-$5,000. Many local nano-influencers will work for free product or a perk worth $50-$100.",
    detailed: [
      "Nano (1K-10K): $50-$250 per Instagram post, $100-$400 per Reel.",
      "Micro (10K-100K): $250-$1,500 per post.",
      "Mid-tier (100K-500K): $1,500-$5,000 per post.",
      "Macro (500K-1M): $5,000-$10,000+ per post.",
      "TikTok rates run 20-40% higher than Instagram for the same tier.",
    ],
    mistakes: [
      "Paying mid-tier rates for nano-level engagement.",
      "Hiring one mega-influencer instead of 20 nano-influencers.",
      "Skipping the contract and FTC disclosure clauses.",
    ],
    doInstead: [
      "Build a roster of 10-20 nano-influencers who genuinely use your product. Their conversion rates beat macro-influencers by 4-5x for local businesses.",
      "Offer a perk-based collaboration (free product plus a percentage discount) instead of cash. Most nano creators prefer this and it removes the awkward rate negotiation.",
    ],
  },
  {
    slug: "what-is-a-good-conversion-rate-for-a-website",
    question: "What is a good conversion rate for a website?",
    tldr: "The average website conversion rate is 2-3%. E-commerce averages 2.5%, lead-gen sites 3-5%, SaaS landing pages 7%+. Anything above 5% for a small business site is strong. Below 1% means there is a problem.",
    detailed: [
      "E-commerce: 2.5% average, 5%+ is top quartile.",
      "Local services (lead form): 3-5% average.",
      "SaaS landing pages: 7-10% average.",
      "B2B lead-gen: 1-2% to a contact form, 5-10% to a free resource download.",
      "Mobile conversion typically lags desktop by 30-50%.",
    ],
    mistakes: [
      "Tracking conversion rate without segmenting by traffic source.",
      "Ignoring micro-conversions (email signup, add-to-cart).",
      "Comparing your rate to another industry's benchmark.",
    ],
    doInstead: [
      "Segment your conversion rate by source. Organic search converts at 4x the rate of cold paid social for most businesses — your blended number hides this.",
      "Set up funnel analytics (Google Analytics 4 or Plausible) so you see where visitors drop off. Optimizing the worst step usually unlocks the biggest gain.",
    ],
  },
  {
    slug: "how-do-i-get-more-google-reviews",
    question: "How do I get more Google reviews?",
    tldr: "Ask at the moment of peak satisfaction, make it one click via a short link or QR code, and follow up once via email or SMS. Businesses that ask in person see 30-50% review rates. Businesses that don't ask see 1-3%.",
    detailed: [
      "Generate a short review link from your Google Business Profile.",
      "Print a QR code on receipts, table tents, or business cards.",
      "Send a follow-up SMS or email 1-2 days after the transaction.",
      "Train every front-line employee to ask in person.",
      "Never offer cash or discounts for reviews — Google bans this.",
    ],
    mistakes: [
      "Asking for reviews from unhappy or neutral customers.",
      "Offering a discount in exchange (violates Google policy).",
      "Asking in a way that sounds desperate or transactional.",
    ],
    doInstead: [
      "Identify the moment of peak satisfaction (after a great meal, after a successful service) and ask right then. Timing is everything.",
      "Run a perk-based program where customers earn a non-monetary thank-you (a feature on your social, a hand-written note) for sharing experiences — this complies with Google policy and builds genuine advocacy.",
    ],
  },
  {
    slug: "what-is-the-difference-between-marketing-and-advertising",
    question: "What is the difference between marketing and advertising?",
    tldr: "Marketing is the entire strategy of attracting and keeping customers (research, positioning, pricing, distribution, communication). Advertising is one tactic within marketing — paid messages to reach an audience. All advertising is marketing, but not all marketing is advertising.",
    detailed: [
      "Marketing covers the 4 Ps: product, price, place, promotion.",
      "Advertising sits inside the 'promotion' bucket.",
      "Other marketing activities: SEO, email, content, PR, referrals, customer experience.",
      "Advertising is usually paid; marketing includes free and earned media.",
      "Strategic marketing decisions (positioning, pricing) often matter more than ad spend.",
    ],
    mistakes: [
      "Treating 'marketing' as a synonym for 'running ads'.",
      "Skipping strategy and jumping straight to tactics.",
      "Cutting brand-building marketing and keeping only performance ads.",
    ],
    doInstead: [
      "Define your marketing strategy first (who, what, why) before choosing any tactic. A clear positioning makes every ad dollar work harder.",
      "Mix brand-building (60%) and direct response (40%). Pure performance marketing burns out audiences fast and erodes margins.",
    ],
  },
  {
    slug: "how-do-i-build-a-customer-loyalty-program",
    question: "How do I build a customer loyalty program?",
    tldr: "Decide what action to reward (purchases, referrals, reviews, social posts), pick a reward type (points, perks, tiers), set the redemption math, and pick software. Simpler programs outperform complex ones. Start with 1-2 actions.",
    detailed: [
      "Step 1: Define the desired customer behavior.",
      "Step 2: Choose a reward structure (points-based, perk-based, or tiered).",
      "Step 3: Set the value math (e.g., $1 spent = 1 point, 100 points = $5 off).",
      "Step 4: Pick a platform that fits your scale.",
      "Step 5: Launch with a clear in-store and online communication plan.",
    ],
    mistakes: [
      "Making the program too complicated for customers to understand in 10 seconds.",
      "Setting reward thresholds so high that no one redeems.",
      "Not tracking the impact on repeat purchase rate.",
    ],
    doInstead: [
      "Start with a single behavior (e.g., visits) and a single perk (e.g., 10th visit free). Measure for 90 days, then layer in additional behaviors.",
      "Move beyond points. Modern loyalty rewards customers for sharing, reviewing, and referring — not just spending. This drives both repeat business and new customer acquisition.",
    ],
  },
  {
    slug: "what-is-user-generated-content",
    question: "What is user-generated content?",
    tldr: "User-generated content (UGC) is any photo, video, review, or post created by your customers about your brand — not by you or paid creators. UGC converts 4-7x better than brand-made content because it's authentic.",
    detailed: [
      "Forms: customer photos, reviews, video testimonials, social posts.",
      "92% of consumers trust UGC more than branded ads.",
      "UGC-driven ads have 4x higher click-through rates.",
      "Average cost: 50-90% less than producing original content.",
      "Best uses: ads, product pages, social proof on landing pages.",
    ],
    mistakes: [
      "Reposting without permission (legal and platform-policy risk).",
      "Treating UGC as a one-off campaign instead of an ongoing system.",
      "Editing or watermarking UGC so heavily it loses authenticity.",
    ],
    doInstead: [
      "Build a permanent UGC pipeline. Every customer interaction should include an invitation to share, with explicit rights granted upfront.",
      "Run a structured perk program that rewards customers for posting and tagging your brand. This generates a steady stream of high-quality, rights-cleared UGC.",
    ],
  },
  {
    slug: "how-do-i-grow-my-instagram-following",
    question: "How do I grow my Instagram following?",
    tldr: "Post Reels 3-4x per week, collaborate with other accounts, engage in your niche daily, and use a clear content pillar strategy. Organic growth of 5-10% per month is realistic for a focused account. Buying followers always backfires.",
    detailed: [
      "Reels are the #1 growth lever in 2026 — prioritize them.",
      "Use the 'Collab' feature with niche partners to double reach instantly.",
      "Spend 20 minutes per day engaging on accounts in your niche.",
      "Define 3-4 content pillars and rotate through them.",
      "Track follower growth rate weekly, not follower count.",
    ],
    mistakes: [
      "Buying followers (your engagement rate tanks within a week).",
      "Posting only product photos with no story or personality.",
      "Engagement pods (Instagram detects and demotes accounts using them).",
    ],
    doInstead: [
      "Pick 3 content pillars (e.g., behind-the-scenes, tips, customer features) and post a Reel for each one weekly. The format consistency trains the algorithm to send you the right audience.",
      "Turn customers into a content engine. A program that rewards customers for tagging you in posts generates dozens of authentic mentions per month and recurring growth.",
    ],
  },
  {
    slug: "what-is-the-best-time-to-post-on-instagram",
    question: "What is the best time to post on Instagram?",
    tldr: "The best universal times are 11am-1pm and 7-9pm in your audience's timezone. But the only time that matters is when your specific audience is active. Check Instagram Insights → Audience → Most Active Times.",
    detailed: [
      "Universal best times: 11am-1pm and 7-9pm weekdays.",
      "Worst times: 3am-6am and during major sporting events.",
      "B2B accounts: 9-11am and 1-3pm weekdays.",
      "Local consumer businesses: evenings and weekends.",
      "Always check Insights for your actual audience activity.",
    ],
    mistakes: [
      "Using a generic 'best times' chart from a blog post instead of your Insights.",
      "Posting whenever you finish editing instead of scheduling.",
      "Ignoring time zones if your audience is spread across regions.",
    ],
    doInstead: [
      "Open Instagram Insights, find your top 3 active hours, and only post in those windows for 30 days. Compare reach to your previous month.",
      "Use a scheduler (Later, Buffer, or Meta's native tool) to batch a week of posts on Sunday so you never miss your optimal windows.",
    ],
  },
  {
    slug: "how-much-should-i-spend-on-facebook-ads",
    question: "How much should I spend on Facebook ads?",
    tldr: "Start with $20-$50/day for 14 days to gather data. Most small businesses end up spending $500-$3,000/month on Meta ads. Below $300/month rarely produces useful learnings. Scale only what's profitable.",
    detailed: [
      "Minimum viable test budget: $20/day × 14 days = $280.",
      "Typical small business spend: $500-$3,000/month.",
      "Cost per click averages $0.50-$2.50 for local businesses.",
      "Cost per lead: $5-$30 for service businesses.",
      "Never scale a campaign by more than 20% per week (resets learning phase).",
    ],
    mistakes: [
      "Boosting posts instead of running structured campaigns from Ads Manager.",
      "Killing ads at day 3 before the learning phase completes.",
      "Targeting too broadly or too narrowly without testing.",
    ],
    doInstead: [
      "Set up the campaign in Ads Manager (not boost). Use a clear objective (purchases, leads) and let it run untouched for 7-14 days.",
      "Pair paid ads with a customer-marketing program. Ads bring in cold traffic; customer marketing converts that traffic into long-term advocates at a fraction of the cost.",
    ],
  },
  {
    slug: "how-do-i-write-a-marketing-plan",
    question: "How do I write a marketing plan?",
    tldr: "A simple one-page marketing plan covers: (1) target customer, (2) positioning, (3) goals, (4) channels, (5) budget, (6) timeline, (7) metrics. Most small businesses overcomplicate this — keep it short enough to fit on one page.",
    detailed: [
      "Target customer: who, what they want, what problem you solve.",
      "Positioning: one sentence on why you're different.",
      "Goals: 2-3 specific, measurable outcomes for the year.",
      "Channels: 2-3 marketing channels you'll prioritize.",
      "Budget and timeline: monthly allocations and quarterly milestones.",
    ],
    mistakes: [
      "Writing a 40-page plan no one will ever read again.",
      "Listing every channel instead of picking 2-3 to focus on.",
      "Setting vague goals like 'grow social media'.",
    ],
    doInstead: [
      "Use the one-page format. If you can't fit it on one page, you don't have a plan — you have a wish list.",
      "Review the plan monthly and revise quarterly. A marketing plan is a living document, not a one-time exercise.",
    ],
  },
  {
    slug: "what-is-email-marketing",
    question: "What is email marketing?",
    tldr: "Email marketing is sending promotional or transactional messages to a list of subscribers who opted in. It returns $36 for every $1 spent on average, making it the highest-ROI channel for most small businesses.",
    detailed: [
      "Average ROI: $36 per $1 spent (DMA 2024).",
      "Average open rate: 21-25% across industries.",
      "Best types: welcome series, abandoned cart, post-purchase, weekly newsletter.",
      "Best tools: Klaviyo (e-commerce), ConvertKit (creators), Mailchimp (general).",
      "Build the list with a strong lead magnet, not just 'subscribe to our newsletter'.",
    ],
    mistakes: [
      "Buying or scraping email lists (kills deliverability).",
      "Sending only promotions and no value content.",
      "Ignoring segmentation and blasting the same message to everyone.",
    ],
    doInstead: [
      "Start with three core flows: welcome (5 emails), post-purchase (3 emails), winback (3 emails). These will drive 40-60% of total email revenue.",
      "Segment your list by behavior, not demographics. A customer who bought in the last 30 days deserves a very different email than someone who hasn't opened in 6 months.",
    ],
  },
  {
    slug: "how-do-i-get-more-website-traffic",
    question: "How do I get more website traffic?",
    tldr: "Pick one traffic source (SEO, social, email, or paid) and focus 80% of effort there for 90 days. Most small businesses get under 5,000 monthly visitors because they spread thin across 5 channels.",
    detailed: [
      "SEO: long-term compounding, takes 6-12 months to ramp.",
      "Social: faster signal, requires consistent content.",
      "Email: highest ROI but only for existing audience.",
      "Paid: fastest results but stops when you stop spending.",
      "Referrals: lowest cost, requires existing customer base.",
    ],
    mistakes: [
      "Doing a little of everything and seeing no compounding effect.",
      "Chasing viral hits instead of building a content system.",
      "Ignoring SEO because it's slow (the businesses that started 2 years ago are now winning).",
    ],
    doInstead: [
      "Audit your last 12 months of traffic. Whichever channel drove the most quality traffic — double down on that for the next 90 days.",
      "Combine SEO and customer marketing. Customer-generated content (reviews, stories, social mentions) creates fresh, indexable content that compounds organic traffic.",
    ],
  },
  {
    slug: "what-is-content-marketing",
    question: "What is content marketing?",
    tldr: "Content marketing is creating and publishing valuable, relevant content (blogs, videos, podcasts, social posts) to attract and retain a defined audience. It builds trust over time and generates 3x more leads than paid ads at 62% lower cost.",
    detailed: [
      "Forms: blog posts, videos, podcasts, social posts, email newsletters, ebooks.",
      "Generates 3x leads at 62% lower cost than paid (Content Marketing Institute).",
      "Compounds over time — old content keeps driving traffic for years.",
      "Best for: building authority, SEO, audience trust.",
      "Time to results: 6-12 months for SEO content, faster for social.",
    ],
    mistakes: [
      "Writing about what you want to talk about instead of what your audience searches for.",
      "Quitting at month 4 before compounding kicks in.",
      "Treating each post as a one-off instead of building a cluster around a topic.",
    ],
    doInstead: [
      "Pick 3-5 topic clusters relevant to your audience and publish consistently in each. Topical depth beats breadth for SEO and authority.",
      "Repurpose every piece of content into 4-5 formats (blog → video → 3 social posts → email). One piece of work = a week of content.",
    ],
  },
  {
    slug: "how-do-influencer-marketing-campaigns-work",
    question: "How do influencer marketing campaigns work?",
    tldr: "You partner with creators whose audience matches yours. They post about your product on their channel. You compensate with cash, free product, or a perk. Average campaign delivers $5.78 for every $1 spent.",
    detailed: [
      "Step 1: Define audience and find creators whose followers match.",
      "Step 2: Reach out with a clear brief and compensation offer.",
      "Step 3: Sign a contract covering deliverables, rights, FTC disclosure.",
      "Step 4: Creator produces and publishes the content.",
      "Step 5: Track results (engagement, click-through, sales) and amplify what works.",
    ],
    mistakes: [
      "Picking creators based on follower count instead of audience fit.",
      "Skipping the contract and FTC disclosure (legal risk).",
      "Measuring only vanity metrics and ignoring sales attribution.",
    ],
    doInstead: [
      "Build a roster of 10-20 nano-influencers (1K-10K followers) who already use your product. They convert 4-5x better than larger creators.",
      "Use a structured platform that automates discovery, contracts, payment, and tracking. Manually managing 20 creators in spreadsheets falls apart quickly.",
    ],
  },
  {
    slug: "what-is-local-seo",
    question: "What is local SEO?",
    tldr: "Local SEO is the practice of optimizing your online presence to appear in 'near me' searches and Google Maps results. The top 3 ranking factors are: Google Business Profile completeness, review quantity and quality, and citations across the web.",
    detailed: [
      "Google Business Profile is the #1 lever — fill out every field.",
      "Reviews: aim for 100+ with a 4.5+ average within your first year.",
      "Citations: be listed on Yelp, Apple Maps, Bing Places, and 20+ local directories.",
      "On-page: include city and neighborhood names naturally.",
      "Track rankings for '[service] in [city]' and '[service] near me' monthly.",
    ],
    mistakes: [
      "Leaving your Google Business Profile half-filled.",
      "Inconsistent name, address, phone across listings.",
      "Ignoring reviews (the strongest local ranking signal).",
    ],
    doInstead: [
      "Audit your top 10 local competitors. Replicate every category, photo type, and post they use on their Google Business Profile.",
      "Build a steady review pipeline — 5-10 new reviews per month consistently beats 50 reviews in one month and silence after.",
    ],
  },
  {
    slug: "how-much-does-it-cost-to-build-a-website",
    question: "How much does it cost to build a website for a small business?",
    tldr: "DIY (Squarespace, Wix): $20-$50/month. Freelancer-built custom site: $1,500-$8,000 one-time. Agency-built: $10,000-$50,000+. For most small businesses, a $25/month Squarespace site is more than enough.",
    detailed: [
      "DIY platforms (Squarespace, Wix, Shopify): $20-$50/month, build in a weekend.",
      "Template-based with a freelancer: $1,500-$3,500 one-time.",
      "Custom design + dev: $5,000-$15,000.",
      "Agency project: $15,000-$50,000+.",
      "Ongoing: hosting ($10-$30/month), domain ($15/year), maintenance ($50-$200/month).",
    ],
    mistakes: [
      "Spending $20,000 on a custom site before validating any marketing channel.",
      "Skipping mobile optimization (60-70% of traffic).",
      "Forgetting to plan ongoing maintenance and content.",
    ],
    doInstead: [
      "Start with a $25/month Squarespace site and 6-10 pages. Validate your business and traffic channels first. Upgrade to custom only after $10K+/month in revenue.",
      "Invest the savings into customer marketing instead. A simple site plus a strong referral and review system outperforms a fancy site with no acquisition strategy.",
    ],
  },
  {
    slug: "what-is-a-marketing-funnel",
    question: "What is a marketing funnel?",
    tldr: "A marketing funnel is the journey a customer takes from first hearing about you to becoming a loyal advocate. Classic stages: Awareness → Interest → Desire → Action → Retention. Each stage needs different content and tactics.",
    detailed: [
      "Awareness: SEO, social, paid ads, PR.",
      "Interest: blog content, email signup, free resources.",
      "Desire: case studies, reviews, demos, comparison pages.",
      "Action: clear CTAs, frictionless checkout, urgency.",
      "Retention/advocacy: onboarding, loyalty programs, referrals.",
    ],
    mistakes: [
      "Focusing all effort on the top of the funnel and ignoring retention.",
      "Using the same content for every funnel stage.",
      "Measuring only the final purchase and not micro-conversions.",
    ],
    doInstead: [
      "Map your funnel and the metric for each stage. Most small businesses have a glaring weak spot — usually retention. Fix that first.",
      "Invest in the bottom of the funnel (retention and advocacy). A customer who refers two friends is worth 4-5x a one-time buyer, and customer-marketing platforms make this measurable.",
    ],
  },
  {
    slug: "how-do-i-measure-brand-awareness",
    question: "How do I measure brand awareness?",
    tldr: "Track direct traffic, branded search volume, social mentions, share of voice in your category, and unaided recall surveys. For small businesses, branded search volume and direct traffic growth are the most practical signals.",
    detailed: [
      "Branded search: 'social perks' or '[your business name]' in Google Search Console.",
      "Direct traffic: people typing your URL directly.",
      "Social mentions: track via Google Alerts, Mention, or Brand24.",
      "Survey-based: 'have you heard of [your brand]?' to a sample audience.",
      "Share of voice: your mentions vs. competitors in your category.",
    ],
    mistakes: [
      "Treating impressions as awareness (impressions ≠ recall).",
      "Ignoring branded search because it's 'small' (it grows the fastest as you scale).",
      "Not setting a baseline before running awareness campaigns.",
    ],
    doInstead: [
      "Set a baseline this month: branded search volume, direct traffic, social mention count. Then track those three numbers every month.",
      "Drive awareness through earned media (customer posts, reviews, press) instead of only paid impressions. Earned media compounds; paid stops the moment you stop spending.",
    ],
  },
  {
    slug: "what-is-affiliate-marketing",
    question: "What is affiliate marketing?",
    tldr: "Affiliate marketing pays partners a commission for every customer they refer to your business. Commissions typically range from 5-30%. It's like a referral program with a structured payout system, often used by e-commerce and SaaS.",
    detailed: [
      "Affiliates promote your product via blog, social, email, or YouTube.",
      "They get a unique tracking link.",
      "You pay a commission when their link drives a sale.",
      "Average commission: 5-15% (physical goods), 20-30% (digital/SaaS).",
      "Best platforms: Impact, Refersion, ShareASale, PartnerStack.",
    ],
    mistakes: [
      "Setting commissions too low to attract serious affiliates.",
      "Not vetting affiliates (some use spammy tactics that hurt your brand).",
      "Ignoring the program once it's launched.",
    ],
    doInstead: [
      "Start with a small group of hand-picked affiliates (5-10) before opening a public program. Quality compounds; spammy affiliates damage your domain reputation.",
      "Combine affiliate with customer referrals. Affiliates drive top-of-funnel; customer referrals close at much higher rates because of pre-existing trust.",
    ],
  },
  {
    slug: "how-do-i-do-keyword-research",
    question: "How do I do keyword research?",
    tldr: "List 20-30 seed keywords your customers might search. Use Google Keyword Planner, Ahrefs, or Ubersuggest to find search volume and competition. Target a mix of high-intent low-volume and broader awareness keywords.",
    detailed: [
      "Step 1: Brainstorm 20-30 seed terms.",
      "Step 2: Expand each in a keyword tool to find variants.",
      "Step 3: Filter by search volume (50+/month) and intent.",
      "Step 4: Group keywords into topical clusters.",
      "Step 5: Map each cluster to a target page on your site.",
    ],
    mistakes: [
      "Going after only high-volume keywords (too competitive).",
      "Ignoring long-tail keywords (where small businesses actually win).",
      "Not matching keyword intent to the right page type.",
    ],
    doInstead: [
      "Focus on long-tail keywords with clear intent. '[Service] in [city]' or 'best [product] for [use case]' converts at 5-10x the rate of broad terms.",
      "Build topical clusters. Ten pages covering different angles of one topic rank better than one page trying to cover everything.",
    ],
  },
  {
    slug: "what-is-the-best-social-media-platform-for-small-business",
    question: "What is the best social media platform for a small business?",
    tldr: "It depends on your audience: Instagram for visual products and local businesses, Facebook for older demographics and groups, TikTok for under-35, LinkedIn for B2B. Pick the ONE where your customers spend the most time.",
    detailed: [
      "Instagram: visual products, local, food, fashion, fitness.",
      "Facebook: 35+ demographic, community groups, events.",
      "TikTok: under-35, viral discovery, trending content.",
      "LinkedIn: B2B, professional services, thought leadership.",
      "YouTube: long-form how-to content, evergreen SEO traffic.",
    ],
    mistakes: [
      "Being on 5 platforms with mediocre content.",
      "Picking a platform based on what you like instead of where your audience is.",
      "Treating every platform the same — content needs to be native to each.",
    ],
    doInstead: [
      "Ask 10 of your best customers which platforms they use daily. Pick the top one and commit for 6 months before adding a second.",
      "Build a content system on your primary platform first. Once it's working, repurpose to a second platform without doubling your workload.",
    ],
  },
  {
    slug: "how-do-i-promote-my-business-on-instagram",
    question: "How do I promote my business on Instagram?",
    tldr: "Optimize your bio with a clear value prop and CTA, post 3-5 Reels per week, use 3-5 niche hashtags, engage daily for 20 minutes, and turn customers into UGC contributors. Avoid running Boosts — use Ads Manager instead.",
    detailed: [
      "Bio: clear value prop, location, link in bio with multiple destinations.",
      "Content mix: 60% Reels, 30% feed posts, 10% Stories highlights.",
      "Hashtags: 3-5 niche tags per post, rotate sets.",
      "Engagement: 20 min/day on accounts in your niche.",
      "Paid: skip Boosts, use Meta Ads Manager for proper targeting.",
    ],
    mistakes: [
      "Posting only product photos with no story.",
      "Using the same caption template every time.",
      "Buying followers or engagement (instantly detected).",
    ],
    doInstead: [
      "Build 3 content pillars (e.g., behind-the-scenes, tips, customer features) and post a Reel for each weekly. Consistency trains the algorithm.",
      "Reward customers with a perk for tagging you in posts. UGC gives you free content and converts 4-7x better than brand-made posts.",
    ],
  },
  {
    slug: "what-is-a-good-cac-for-small-business",
    question: "What is a good customer acquisition cost for a small business?",
    tldr: "Aim for CAC less than one-third of customer lifetime value (LTV:CAC ratio of 3:1 or better). For local businesses, $25-$75 per new customer is healthy. SaaS averages $150-$500. If CAC > LTV, you're losing money on every customer.",
    detailed: [
      "Local services: $25-$75 per customer is healthy.",
      "E-commerce: 15-25% of average order value.",
      "SaaS: $150-$500, payback in under 12 months.",
      "B2B services: $500-$2,000 per client.",
      "Target ratio: LTV:CAC of 3:1 or better.",
    ],
    mistakes: [
      "Calculating CAC without including labor and software costs.",
      "Ignoring LTV and only focusing on CAC.",
      "Scaling channels that have CAC > LTV.",
    ],
    doInstead: [
      "Calculate CAC by channel monthly. The blended number hides where you're winning and losing.",
      "Lower CAC by leaning on referrals and customer marketing. Referred customers cost 60-80% less than paid-acquisition customers and have 25% higher LTV.",
    ],
  },
  {
    slug: "how-do-i-build-an-email-list",
    question: "How do I build an email list?",
    tldr: "Offer a clear lead magnet (discount, guide, tool) in exchange for an email. Promote it everywhere: website, social, in-store, checkout. Most small businesses can add 100-500 emails per month with a good lead magnet and consistent promotion.",
    detailed: [
      "Lead magnets: 10-15% discount, downloadable guide, free template, quiz.",
      "Placement: site header, exit-intent popup, footer, social bio, business card.",
      "In-store: tablet at checkout, receipt prompt.",
      "Welcome series: 5 emails over 14 days to convert subscriber → customer.",
      "Compliance: clear opt-in language and easy unsubscribe.",
    ],
    mistakes: [
      "Buying or scraping lists (kills deliverability and is illegal in many places).",
      "Generic 'subscribe to our newsletter' with no value offer.",
      "Not having a welcome sequence to convert new subscribers.",
    ],
    doInstead: [
      "Make your lead magnet specific to your top customer's pain point. 'Get 10% off' is fine; 'The 5 yoga poses for back pain' converts 3-4x better for a yoga studio.",
      "Convert in-person customers to email subscribers. Every receipt, table tent, or check-out flow should include the offer.",
    ],
  },
  {
    slug: "what-is-search-engine-optimization",
    question: "What is search engine optimization?",
    tldr: "SEO is the practice of improving your website to rank higher in Google search results. The three pillars are: technical (site speed, crawlability), on-page (content, keywords), and off-page (backlinks, citations). Results take 6-12 months but compound for years.",
    detailed: [
      "Technical SEO: site speed, mobile, indexing, schema markup.",
      "On-page SEO: content quality, keyword targeting, headers, meta tags.",
      "Off-page SEO: backlinks, citations, brand mentions.",
      "Local SEO: Google Business Profile, reviews, local citations.",
      "Time to results: 3-6 months for low-competition terms, 12+ months for competitive.",
    ],
    mistakes: [
      "Keyword stuffing or thin content that doesn't answer the question.",
      "Buying backlinks (Google penalizes this).",
      "Quitting at month 4 before SEO starts compounding.",
    ],
    doInstead: [
      "Build topical depth around 3-5 core topics. Ten high-quality pages on one topic outrank one comprehensive page.",
      "Earn backlinks through valuable content, customer stories, and PR. One link from a respected local site outweighs 50 from low-quality directories.",
    ],
  },
  {
    slug: "how-do-i-track-where-customers-come-from",
    question: "How do I track where my customers come from?",
    tldr: "Use UTM codes on every link, unique promo codes per channel, ask in checkout ('How did you hear about us?'), and review Google Analytics monthly. Most small businesses have no attribution system — fixing this is one of the highest-leverage activities.",
    detailed: [
      "UTM codes: tag every link with source, medium, and campaign.",
      "Promo codes: unique code per channel (IG10, FB10, EMAIL10).",
      "Checkout survey: 'How did you hear about us?' with 5-7 options.",
      "Google Analytics 4: traffic source reports.",
      "Customer-marketing platforms: auto-attribute referrals.",
    ],
    mistakes: [
      "Trusting Google Analytics alone (misses offline and word-of-mouth).",
      "Asking 'how did you hear about us' as a free-text field (impossible to analyze).",
      "Tracking only last-touch attribution.",
    ],
    doInstead: [
      "Combine multiple attribution methods. Each catches different sources. UTM + promo codes + checkout survey covers 90% of attribution gaps.",
      "Use a customer-marketing platform that auto-attributes referrals back to the source customer. This captures the word-of-mouth signal Google Analytics never sees.",
    ],
  },
  {
    slug: "what-is-the-difference-between-seo-and-sem",
    question: "What is the difference between SEO and SEM?",
    tldr: "SEO is organic (unpaid) search optimization. SEM (search engine marketing) typically refers to paid search ads (Google Ads). Sometimes SEM is used as an umbrella term that includes both. Pay for SEM for speed; invest in SEO for compounding.",
    detailed: [
      "SEO: organic rankings, free clicks, takes months to ramp.",
      "SEM/PPC: paid ads, instant traffic, stops when budget stops.",
      "Best practice: use SEM to test which keywords drive revenue, then build SEO content around the winners.",
      "Average CPC: $1-$4 for local businesses, $10-$100+ for competitive B2B/legal.",
      "Long-term: SEO beats SEM on cost per click by 10-50x.",
    ],
    mistakes: [
      "Choosing one and ignoring the other (they work better together).",
      "Pausing SEM ads at the first sign of trouble before learning is complete.",
      "Building SEO content for high-volume keywords that don't convert.",
    ],
    doInstead: [
      "Run SEM as a market research engine first. The keywords that drive paid conversions are the same ones you should target with SEO.",
      "Allocate 70% to SEO long-term and 30% to SEM. As SEO compounds, you can ratchet down paid spend on the same keywords.",
    ],
  },
  {
    slug: "how-do-i-write-a-good-call-to-action",
    question: "How do I write a good call to action?",
    tldr: "Use action verbs, be specific, focus on the customer benefit, create urgency where genuine, and test against 'Submit' or 'Click here' (which always lose). 'Start my free trial' beats 'Sign up' by 30-50% in most tests.",
    detailed: [
      "Use action verbs: Start, Get, Claim, Try, Build, Save.",
      "Be specific: 'Get my free quote' beats 'Submit'.",
      "Use first person: 'Start my trial' beats 'Start your trial' in many tests.",
      "Add urgency only when real: 'Save 20% today' (if today is genuinely the deadline).",
      "Match the CTA to the funnel stage (top-of-funnel: 'Learn more'; bottom: 'Buy now').",
    ],
    mistakes: [
      "Generic CTAs like 'Submit', 'Click here', 'Continue'.",
      "Putting only one CTA when the visitor might need two paths.",
      "Burying the CTA below the fold on a long page.",
    ],
    doInstead: [
      "A/B test CTA copy on your highest-traffic page. A 15% lift on the primary CTA often outperforms a 6-month redesign.",
      "Match CTA language to customer intent. A first-time visitor sees 'Learn more'; a returning visitor sees 'Start free trial'. Same page, different CTA.",
    ],
  },
  {
    slug: "what-is-a-landing-page",
    question: "What is a landing page?",
    tldr: "A landing page is a standalone web page built around a single goal: get the visitor to take one specific action (sign up, buy, book). Unlike a homepage, it has minimal navigation and removes everything that doesn't drive the action.",
    detailed: [
      "Single purpose: one offer, one CTA, no navigation distractions.",
      "Best for: ad campaigns, lead magnets, product launches.",
      "Average conversion: 5-10% (vs. 2-3% for a homepage).",
      "Key elements: headline, subhead, social proof, benefits, CTA.",
      "Common tools: Unbounce, Instapage, ConvertKit, Carrd, Webflow.",
    ],
    mistakes: [
      "Adding navigation and links that distract from the CTA.",
      "Writing about your company instead of the customer's problem.",
      "Skipping social proof (reviews, logos, testimonials).",
    ],
    doInstead: [
      "Strip away everything that doesn't support the single CTA. Every element should either build trust, explain value, or drive action.",
      "Add real social proof above the fold. Customer photos, video testimonials, and review counts lift conversion 20-40% on most landing pages.",
    ],
  },
  {
    slug: "how-do-i-build-a-brand",
    question: "How do I build a brand?",
    tldr: "Define your purpose, audience, personality, and visual identity. Then show up consistently everywhere with the same voice and look. Brand is the gap between what you say and what customers experience — close that gap.",
    detailed: [
      "Step 1: Define purpose (why you exist beyond making money).",
      "Step 2: Define audience (who you're for and who you're not).",
      "Step 3: Define personality (3-5 adjectives describing your voice).",
      "Step 4: Build visual identity (logo, colors, typography, photography style).",
      "Step 5: Document everything in a brand guide so it stays consistent.",
    ],
    mistakes: [
      "Treating brand as just a logo.",
      "Being inconsistent across channels (one voice on Instagram, another in email).",
      "Copying competitor branding instead of differentiating.",
    ],
    doInstead: [
      "Pick three specific words that describe your brand voice ('warm, witty, no-nonsense'). Use them as a checklist before publishing anything.",
      "Let customers shape your brand. UGC, reviews, and customer stories communicate authenticity faster than any logo or tagline.",
    ],
  },
  {
    slug: "what-is-customer-lifetime-value",
    question: "What is customer lifetime value?",
    tldr: "Customer lifetime value (LTV or CLV) is the total revenue you expect from a customer over their entire relationship with you. Formula: average order value × purchase frequency × customer lifespan. Knowing LTV lets you set CAC budgets correctly.",
    detailed: [
      "Formula: LTV = AOV × purchase frequency per year × average customer lifespan in years.",
      "Example: $50 AOV × 6 purchases/year × 3 years = $900 LTV.",
      "Healthy ratio: LTV:CAC of 3:1 or better.",
      "Levers to increase LTV: bigger orders, more frequency, longer retention.",
      "Most underrated lever: retention (a 5% retention boost can lift profit 25-95%).",
    ],
    mistakes: [
      "Not calculating LTV at all (most small businesses don't).",
      "Treating all customers as one segment instead of by cohort.",
      "Focusing only on acquisition and ignoring retention.",
    ],
    doInstead: [
      "Calculate LTV by customer segment (new vs. returning, channel of acquisition). The variation is usually huge and informs where to focus.",
      "Invest in retention and advocacy. A customer-marketing program that drives repeat purchases and referrals is the single highest-leverage way to grow LTV.",
    ],
  },
  {
    slug: "how-do-i-get-started-with-tiktok-for-business",
    question: "How do I get started with TikTok for business?",
    tldr: "Switch to a Business account, post 1-2 short videos daily for 30 days, lean into trends with your unique angle, and use 3-5 niche hashtags. TikTok rewards consistency more than quality — perfectionism kills accounts.",
    detailed: [
      "Switch your account to TikTok Business (free, unlocks analytics).",
      "Post 1-2 videos per day for 30 days minimum.",
      "Use trending sounds — they 2-3x your reach.",
      "Hook in first 3 seconds (TikTok skips fast).",
      "Engage with comments within the first hour.",
    ],
    mistakes: [
      "Over-producing content (TikTok rewards raw, authentic video).",
      "Quitting after 2 weeks because views are low (it takes 30+ days).",
      "Cross-posting Instagram Reels with the watermark (algorithm demotes them).",
    ],
    doInstead: [
      "Post your first 30 videos as fast and rough as possible. Volume teaches you what works. Once you have data, refine.",
      "Build a small library of trending hooks for your niche. Open the app daily, identify a trend, adapt it to your business in under an hour.",
    ],
  },
  {
    slug: "what-is-retargeting",
    question: "What is retargeting?",
    tldr: "Retargeting (or remarketing) shows ads to people who already visited your site or interacted with your brand. It converts at 5-10x the rate of cold ads because the audience already knows you. Best ROI on Meta and Google ads.",
    detailed: [
      "Pixel-based: ads served via tracking pixel (Meta, Google).",
      "List-based: upload customer emails and serve ads to them.",
      "Average CPC: 30-50% lower than cold traffic.",
      "Average conversion: 5-10x higher than cold ads.",
      "Best use: cart abandonment, returning visitor offers, lapsed customer winback.",
    ],
    mistakes: [
      "Showing the same ad for weeks (audience fatigue).",
      "Not excluding people who already converted.",
      "Setting the retargeting window too short (7 days) or too long (180 days).",
    ],
    doInstead: [
      "Build a 3-step retargeting funnel: day 1-7 (cart abandoners), day 8-30 (browsers), day 31-90 (lapsed visitors). Different message at each step.",
      "Combine retargeting with email and SMS. A multi-channel sequence converts the same audience at 2-3x the rate of retargeting alone.",
    ],
  },
  {
    slug: "how-much-should-i-charge-for-my-product",
    question: "How much should I charge for my product?",
    tldr: "Use a mix of three methods: cost-plus (cost + margin), value-based (what it's worth to the customer), and competitive (what similar products charge). For most small businesses, value-based pricing beats cost-plus by 30-100%.",
    detailed: [
      "Cost-plus: total cost × (1 + desired margin %).",
      "Value-based: anchor on the value the customer gets, not your cost.",
      "Competitive: benchmark against 5-10 similar products.",
      "Psychological pricing: $19 outperforms $20 in tests.",
      "Tiered pricing: 3 tiers, with the middle option designed to be the most-chosen.",
    ],
    mistakes: [
      "Pricing on cost alone (leaves money on the table).",
      "Racing to the bottom on price (attracts the worst customers).",
      "Never testing price changes.",
    ],
    doInstead: [
      "Test a 10% price increase on new customers. Most small businesses are underpricing — the customers who push back are usually not your best ones anyway.",
      "Offer 3 tiers instead of 1 price. The 3-tier structure shifts most buyers to the middle option, often 30-50% above your previous single price.",
    ],
  },
  {
    slug: "how-do-i-create-a-referral-program",
    question: "How do I create a referral program?",
    tldr: "Decide the incentive (cash, discount, free product), set up tracking (unique link or code per customer), and promote it everywhere (email, receipts, social, in-store). Programs that reward both the referrer AND the new customer convert 2x better.",
    detailed: [
      "Decide on a 'give-get' structure (both parties get a reward).",
      "Set the reward at 10-20% of average order value.",
      "Use a platform that auto-tracks (ReferralCandy, Friendbuy, or built into customer-marketing platforms).",
      "Promote on the post-purchase page, in welcome emails, on receipts, in-store.",
      "Track: referral rate (% of customers who refer), conversion rate of referred visits.",
    ],
    mistakes: [
      "Hiding the program in a footer link no one finds.",
      "Setting rewards too small to motivate sharing.",
      "Manual tracking that breaks past 50 customers.",
    ],
    doInstead: [
      "Promote the referral program at the moment of peak satisfaction (after purchase, after a great service). Timing drives 5-10x more shares.",
      "Make the referrer feel like a hero, not just a discount-getter. Recognition, status, and exclusive perks often beat cash rewards.",
    ],
  },
  {
    slug: "what-is-the-best-day-to-send-marketing-emails",
    question: "What is the best day to send marketing emails?",
    tldr: "Tuesday and Thursday have the highest open rates (25-27%) across most industries. Worst: Saturday and Sunday for B2B; opposite for consumer e-commerce, which performs well on weekends. Test your specific list — averages lie.",
    detailed: [
      "B2B: Tuesday-Thursday, 9-11am performs best.",
      "B2C/e-commerce: Wednesday and Sunday evening.",
      "Restaurants: Thursday-Friday (planning weekend).",
      "Fitness/wellness: Sunday-Monday morning.",
      "Always run a 4-week test on your specific audience.",
    ],
    mistakes: [
      "Using a generic 'best day' chart instead of testing.",
      "Sending at the exact top of the hour (inbox is most crowded).",
      "Sending the same campaign type on the same day forever (audience fatigue).",
    ],
    doInstead: [
      "Send the same campaign on two different days over 4 weeks. Compare open and click rates. Pick the winner and lock it in.",
      "Segment by behavior, not just day. A buyer in the last 7 days gets a different cadence than someone who hasn't opened in 60 days.",
    ],
  },
  {
    slug: "how-do-i-create-a-content-calendar",
    question: "How do I create a content calendar?",
    tldr: "Pick 3-5 content pillars, decide cadence per channel, batch-create content monthly, and use a single tool (Notion, Trello, or a Google Sheet) to plan 4-8 weeks ahead. Most small businesses fail at content because they wing it daily.",
    detailed: [
      "Step 1: Define 3-5 content pillars (e.g., behind-the-scenes, customer features, tips, products, community).",
      "Step 2: Decide cadence (e.g., 3 Reels, 2 feed posts, 5 stories per week).",
      "Step 3: Plan 4 weeks of topics tied to your pillars.",
      "Step 4: Batch-create in one 3-hour session.",
      "Step 5: Schedule via Meta Business Suite, Later, or Buffer.",
    ],
    mistakes: [
      "Planning content week-by-week and burning out by month 2.",
      "Posting only product content (no story, no community).",
      "Not repurposing content across channels.",
    ],
    doInstead: [
      "Batch-create one month of content in a single 3-hour session. Schedule everything. Spend the rest of the month on engagement, not creation.",
      "Repurpose every piece across formats. One blog post = 4 social posts + 1 email + 1 short video. Multiplies your effective output by 5x.",
    ],
  },
  {
    slug: "what-is-a-good-cost-per-click",
    question: "What is a good cost per click for ads?",
    tldr: "Google Ads averages $1-$4 for most local businesses, $5-$20 for competitive industries (legal, insurance, finance). Meta ads average $0.50-$2.50. Target a CPC where (1 / conversion rate) × CPC < customer LTV / 3.",
    detailed: [
      "Google Search: $1-$4 (typical small business), up to $50-$200 (legal, insurance).",
      "Meta (Facebook/Instagram): $0.50-$2.50.",
      "TikTok: $0.50-$1.50 currently.",
      "LinkedIn: $5-$15 (B2B).",
      "YouTube: $0.10-$0.30 per view.",
    ],
    mistakes: [
      "Optimizing for low CPC instead of low cost per conversion.",
      "Ignoring quality score (Google) or relevance score (Meta).",
      "Bidding too low and getting no impressions.",
    ],
    doInstead: [
      "Track cost per conversion, not cost per click. A $4 CPC that converts at 10% is cheaper than a $1 CPC that converts at 1%.",
      "Improve ad relevance (quality score) by tightening audience-message match. A 1-point quality score increase typically cuts CPC by 16%.",
    ],
  },
  {
    slug: "how-do-i-rank-higher-on-google-maps",
    question: "How do I rank higher on Google Maps?",
    tldr: "Three factors dominate: complete Google Business Profile, recent quality reviews, and citations across the web with consistent name/address/phone. Add at least one Google Post per week and respond to every review within 24 hours.",
    detailed: [
      "Complete every field in your Google Business Profile (10 photos minimum).",
      "Get 5-10 new reviews per month consistently.",
      "Maintain a 4.5+ average rating.",
      "Build citations on Yelp, Apple Maps, Bing Places, and 20+ local directories.",
      "Post a Google Post (offer, update, event) at least weekly.",
    ],
    mistakes: [
      "Inconsistent business name, address, or phone across listings.",
      "Ignoring reviews (no response = lower ranking).",
      "Stuffing keywords in your business name (Google penalizes this).",
    ],
    doInstead: [
      "Audit your name/address/phone across the top 50 directories using Moz Local or BrightLocal. Inconsistencies kill rankings.",
      "Build a steady review pipeline — 5-10 new genuine reviews per month signals freshness and beats one big burst of 50.",
    ],
  },
  {
    slug: "what-is-the-difference-between-b2b-and-b2c-marketing",
    question: "What is the difference between B2B and B2C marketing?",
    tldr: "B2B targets businesses (longer sales cycles, multiple decision-makers, higher ticket sizes). B2C targets consumers (shorter cycles, emotional triggers, lower ticket sizes). B2B focuses on ROI and logic; B2C on identity and emotion.",
    detailed: [
      "B2B sales cycle: 3-12 months. B2C: minutes to days.",
      "B2B decision-makers: 5-10 people. B2C: usually 1-2.",
      "B2B channels: LinkedIn, email, content, webinars.",
      "B2C channels: Instagram, TikTok, paid social, influencer.",
      "B2B content: data, case studies, ROI calculators. B2C: lifestyle, identity, social proof.",
    ],
    mistakes: [
      "Copying B2C tactics for B2B (or vice versa).",
      "Ignoring emotion in B2B (humans still buy from humans).",
      "Ignoring logic in B2C (price comparison and reviews still matter).",
    ],
    doInstead: [
      "Map your buyer journey by stage. B2B: awareness → research → comparison → decision. B2C: awareness → consideration → purchase. Each stage needs different content.",
      "For B2B, build thought leadership content. For B2C, build social proof. Both end up in the same place: trust before purchase.",
    ],
  },
  {
    slug: "how-do-i-handle-negative-reviews-online",
    question: "How do I handle negative reviews online?",
    tldr: "Respond within 24 hours, publicly and professionally. Acknowledge the issue, apologize without admitting legal liability, offer to resolve offline, and thank them for the feedback. Never delete or argue. A great response often turns the reviewer into a fan.",
    detailed: [
      "Step 1: Pause and re-read 2 hours later before responding.",
      "Step 2: Lead with empathy in the first sentence.",
      "Step 3: Mention a specific detail so it doesn't sound canned.",
      "Step 4: Offer a direct contact (manager email or phone) for offline resolution.",
      "Step 5: Follow up after resolution and ask if they'd update the review.",
    ],
    mistakes: [
      "Replying defensively in the heat of the moment.",
      "Copy-pasting the same template every time.",
      "Asking the reviewer to delete the review (looks shady).",
    ],
    doInstead: [
      "Build a response framework: empathy line → specific detail → apology → offline offer → invitation. Hit all five beats every time, change the wording.",
      "Drown out negatives with a steady flow of positives. The best response to a 1-star review is 50 new 5-star reviews in the next 90 days — and that comes from a structured customer-marketing program.",
    ],
  },
];

export const ANSWER_SLUGS = ANSWERS.map((a) => a.slug);
