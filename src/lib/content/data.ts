export type ContentTopic = {
  slug: string;
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
};

export type ContentCategory = {
  slug: string;
  label: string;
  description: string;
  topics: ContentTopic[];
};

const reviewsTopics: ContentTopic[] = [
  {
    slug: "how-to-ask-for-reviews",
    title: "How to Ask for Reviews: A Practical Playbook",
    intro:
      "Reviews are the single highest-leverage marketing asset for a local or e-commerce business. Yet most businesses ask the wrong way, at the wrong time, and to the wrong people. This guide walks through the exact mechanics of asking for reviews that customers actually leave — including timing, channel, language, and follow-up. Done right, a structured review program turns 30-50% of happy customers into public advocates.",
    sections: [
      { heading: "Why timing matters more than copy", body: "The biggest factor in whether a customer leaves a review is when you ask. Ask at peak satisfaction — right after a great meal, a successful service, a delivered product. Wait 48 hours and conversion drops by 60%. Wait a week and it drops by 85%." },
      { heading: "Choose the right channel", body: "In-person asks convert at 30-50%, SMS at 10-20%, email at 5-10%. For service businesses, SMS sent 24 hours post-job is the sweet spot. For retail, in-person at checkout wins. For e-commerce, post-delivery email 7 days after the purchase." },
      { heading: "The one-sentence ask", body: "Skip the long pitch. 'Would you mind sharing a quick Google review? Here's the link.' Direct, low-friction, and respectful of the customer's time. The QR code or short link does the heavy lifting." },
      { heading: "Make it one click", body: "Generate a Google review short link from your Google Business Profile. Print it as a QR code on receipts, table tents, and business cards. Every extra click drops conversion by ~20%." },
      { heading: "Follow up exactly once", body: "If a customer doesn't leave a review within 5 days, send one gentle follow-up. Two follow-ups feels desperate; zero leaves money on the table." },
      { heading: "Reward without violating policy", body: "Never offer cash, discounts, or freebies in exchange for reviews — Google bans this. Instead, recognize reviewers publicly (feature their photo on social) or offer non-monetary thank-yous (handwritten note, surprise gift on next visit)." },
      { heading: "Tools to help", body: "Social Perks automates this entire flow — peak-moment SMS triggers, one-click review links, and per-customer tracking — without violating Google policy. Setup takes 15 minutes." },
      { heading: "Related topics", body: "See also: Review response templates, Handling negative reviews, Review incentive laws, Review display strategies, Review automation." },
    ],
  },
  {
    slug: "review-response-templates",
    title: "Review Response Templates That Work",
    intro:
      "Responding to reviews — positive and negative — is a public conversation. Future customers read your replies and judge your business by how you handle feedback. This guide provides battle-tested response templates for the 8 most common review scenarios, plus the framework to write your own.",
    sections: [
      { heading: "The 5-beat response framework", body: "Every great review reply hits five beats in order: empathy line, specific detail from the review, your name or role, offer to continue offline if needed, invitation to return. Vary the words; never skip a beat." },
      { heading: "Positive review template", body: "'Thank you so much, [name]! It made our day to hear you loved the [specific detail]. [Staff member] will be thrilled — I'll pass it on. Come back soon — we'd love to see you again.'" },
      { heading: "Negative review template", body: "'Hi [name], I'm so sorry your visit fell short of what we want for every guest. The [specific issue] is not the experience we aim to deliver. I'd love to make this right — please email me directly at [manager email]. — [Owner name]'" },
      { heading: "Neutral 3-star review template", body: "'Thank you for taking the time to share, [name]. We're glad you enjoyed [positive detail] but I'd love to understand what would have made this a 5-star experience. Please reach out — your feedback shapes how we improve.'" },
      { heading: "Fake or unfair review", body: "Stay professional. 'Hi [name], we don't have a record of this visit and would love to understand what happened. Please contact us directly so we can look into it.' Never accuse, even if you suspect fraud — other readers see your tone." },
      { heading: "Tools to help", body: "Social Perks surfaces every new review across Google, Yelp, and Facebook in one inbox, with AI-suggested replies in your brand voice. Approve, edit, or write from scratch in seconds." },
      { heading: "Related topics", body: "See also: How to ask for reviews, Handling negative reviews, Review display strategies, Fake review detection, Review automation." },
    ],
  },
  {
    slug: "handling-negative-reviews",
    title: "Handling Negative Reviews: A Step-by-Step System",
    intro:
      "A single negative review can sink a business — but only if handled poorly. Done well, a negative review and a thoughtful public response often convert into long-term loyalty from both the reviewer and future readers. This guide walks through the exact sequence to follow when a negative review lands.",
    sections: [
      { heading: "Step 1: Pause before responding", body: "Your first reaction is wrong. Wait at least 2 hours, ideally overnight, before drafting a response. The emotional gap between 'how dare they' and 'how can we make this right' usually takes an evening." },
      { heading: "Step 2: Verify the facts internally", body: "Before responding publicly, check internally: who served them, what happened, is the complaint accurate? You can't fix what you don't understand." },
      { heading: "Step 3: Respond publicly within 24 hours", body: "Acknowledge the feelings, mention a specific detail from the review, apologize without admitting legal liability, and offer to move detailed resolution offline." },
      { heading: "Step 4: Move it offline", body: "Provide a direct contact (manager email or phone). Do the real conversation in private. The public reply is for future readers; the private conversation is for the actual customer." },
      { heading: "Step 5: Resolve with generosity", body: "If the complaint is fair, make it more than right. A refund plus a sincere note and an invitation back often turns 1-star reviewers into 5-star evangelists." },
      { heading: "Step 6: Ask if they'd update the review", body: "After resolving the issue, gently ask if they'd consider updating their original review. Don't demand. Many will say yes." },
      { heading: "Step 7: Drown out negatives with positives", body: "The single best response to a 1-star review is 50 new 5-star reviews over the next 90 days. A structured review program makes this systematic." },
      { heading: "Tools to help", body: "Social Perks alerts you to every new review instantly via SMS, and provides response templates tuned to your brand voice. Most users respond within 4 hours instead of 4 days." },
      { heading: "Related topics", body: "See also: How to ask for reviews, Review response templates, Fake review detection, Review platforms compared, Review automation." },
    ],
  },
  {
    slug: "review-display-strategies",
    title: "Review Display Strategies for Maximum Conversion Lift",
    intro:
      "Collecting reviews is only half the value — displaying them well on your website, product pages, and ads is where the conversion lift actually shows up. Customer reviews placed strategically can lift conversion rates 20-40%. This guide covers the highest-impact placements and formats.",
    sections: [
      { heading: "Above-the-fold star rating", body: "Show your aggregate star rating (e.g., 4.8 stars from 312 reviews) prominently in your hero section. This single element typically lifts homepage conversion 15-25%." },
      { heading: "Product-page reviews", body: "Display 3-5 reviews directly on each product page, with the option to expand for more. Include photos when possible — photo reviews convert 4-7x better than text-only." },
      { heading: "Checkout-page social proof", body: "Add a single high-impact review or testimonial next to the 'Complete Purchase' button. This last-moment reassurance lifts checkout completion 10-20%." },
      { heading: "Ad creative", body: "Use real customer reviews and photos in paid ads. UGC-based ads outperform brand-shot ads by 4x on click-through rate at 30-50% lower cost per click." },
      { heading: "Email signature and footer", body: "Add a one-line review snippet plus star rating to every email signature. This subtle social proof compounds with every email sent." },
      { heading: "Tools to help", body: "Social Perks pulls verified reviews from Google, Yelp, and Facebook into a single feed you can embed on any site or product page with one snippet of code." },
      { heading: "Related topics", body: "See also: How to ask for reviews, Review response templates, Fake review detection, Review automation, Review platforms compared." },
    ],
  },
  {
    slug: "fake-review-detection",
    title: "Fake Review Detection: Spotting and Removing Them",
    intro:
      "Fake reviews — both negative attacks from competitors and inflated reviews from desperate businesses — pollute the local marketplace. Google and Yelp have detection algorithms, but they miss plenty. This guide covers how to spot fakes, how to report them, and how to protect your business from review fraud.",
    sections: [
      { heading: "Red flags in fake negative reviews", body: "Generic language with no specific details. Account with very few other reviews. Posted in a sudden burst with similar wording. Reviewer location far from your business. References to a service you don't offer." },
      { heading: "Red flags in fake positive reviews", body: "Overly enthusiastic language. Reviews posted in clusters. Same reviewer pattern across multiple businesses in the same industry. Reviews that read like marketing copy." },
      { heading: "How to report to Google", body: "From your Google Business Profile, click the review, then 'Report review'. Provide context. Google's response time is 3-14 days. Persistence matters — multiple legitimate reports often succeed where one fails." },
      { heading: "How to report to Yelp", body: "Click the flag icon on the review. Select 'Suspect terms of service violation'. Yelp's review filter is aggressive and often catches fakes automatically." },
      { heading: "When fakes can't be removed", body: "Drown them out. Run a structured program that generates 5-10 new genuine reviews per month. Within 90 days, the fake review is buried under fresh, authentic ones." },
      { heading: "Tools to help", body: "Social Perks flags suspicious review patterns automatically and helps generate a steady stream of authentic reviews that crowd out outliers." },
      { heading: "Related topics", body: "See also: Handling negative reviews, Review incentive laws, Review platforms compared, How to ask for reviews, Review automation." },
    ],
  },
  {
    slug: "review-incentive-laws",
    title: "Review Incentive Laws: What's Legal and What's Not",
    intro:
      "Offering customers a discount in exchange for a review feels innocent — and it can wreck your business. The FTC, Google, Yelp, and most platforms ban incentivized reviews. This guide covers what's legal, what's not, and how to drive review volume without crossing the line.",
    sections: [
      { heading: "What the FTC says", body: "Incentivized reviews must be disclosed clearly. If a reviewer received anything of value (free product, discount, gift), the review must state this conspicuously. Failure to disclose can result in fines up to $50,120 per violation." },
      { heading: "Google's policy", body: "Google explicitly prohibits incentivized reviews. A reviewer cannot receive any compensation or benefit in exchange for a review. Violations result in review removal and potentially business profile suspension." },
      { heading: "Yelp's policy", body: "Yelp prohibits soliciting reviews from customers in any form — including non-monetary asks. Their filter is aggressive and often hides reviews that appear to be solicited." },
      { heading: "What is legal", body: "Asking for an honest review without offering anything in exchange. Recognizing reviewers publicly (featuring on social, thank-you notes). Generic 'thank you for your feedback' gestures that aren't tied to a specific review outcome." },
      { heading: "Safe practices", body: "Build a program that rewards customers for general engagement (not specifically for reviews). 'Earn a perk for sharing your experience' is different from 'Get $5 off for a 5-star review' — the first is legal, the second is not." },
      { heading: "Tools to help", body: "Social Perks is designed to comply with Google, Yelp, and FTC policy. Customers are rewarded for activity broadly — never tied to specific review outcomes." },
      { heading: "Related topics", body: "See also: How to ask for reviews, Fake review detection, Review platforms compared, Review automation, Handling negative reviews." },
    ],
  },
  {
    slug: "review-platforms-compared",
    title: "Review Platforms Compared: Google, Yelp, Facebook, and Beyond",
    intro:
      "Where should you focus your review efforts? Google, Yelp, Facebook, TripAdvisor, and industry-specific platforms all matter — but not equally. This guide breaks down each major review platform by impact, audience, and effort required.",
    sections: [
      { heading: "Google Business Profile reviews", body: "The single most important platform for almost every local business. Google reviews directly impact local search ranking, Google Maps placement, and click-through rates. Aim for 100+ reviews and 4.5+ stars within year one." },
      { heading: "Yelp reviews", body: "Strong for restaurants, services, and consumer businesses in major US cities. Yelp's filter hides 'unverified' reviews aggressively, so focus on consistent, organic review velocity rather than bursts." },
      { heading: "Facebook reviews/recommendations", body: "Lower direct SEO impact but high trust factor with Facebook-active demographics. Particularly strong for local services targeting 40+ audiences." },
      { heading: "Industry-specific platforms", body: "TripAdvisor (hospitality), Healthgrades (medical), Avvo (legal), Zillow (real estate), Wedding Wire (weddings). Each industry has 1-2 dominant platforms that often outweigh Google." },
      { heading: "How to prioritize", body: "Google first, always. Then add the #1 industry-specific platform for your category. Yelp and Facebook are secondary for most businesses." },
      { heading: "Tools to help", body: "Social Perks consolidates reviews from all major platforms into a single inbox with platform-specific response workflows." },
      { heading: "Related topics", body: "See also: How to ask for reviews, Review response templates, Review display strategies, Review automation, Handling negative reviews." },
    ],
  },
  {
    slug: "review-automation",
    title: "Review Automation: Building a System That Runs Itself",
    intro:
      "Manually asking for reviews works for the first 50 customers. Past that, you need automation. This guide covers the architecture of an automated review program: triggers, timing, channels, follow-ups, and dashboards.",
    sections: [
      { heading: "The trigger event", body: "Define the moment that should fire a review ask: completed transaction, delivery confirmation, service completion, third visit, etc. The right trigger is the moment of peak satisfaction for your business." },
      { heading: "Timing windows", body: "Send the ask within 4-24 hours of the trigger event. Beyond 48 hours, conversion drops sharply. For service businesses, 24 hours; for retail, same day; for e-commerce, 7 days after delivery." },
      { heading: "Channel selection", body: "SMS for high-trust, immediate-response businesses (service, restaurant, salon). Email for e-commerce. In-person at checkout for retail with high transaction volume." },
      { heading: "Follow-up cadence", body: "One initial ask, one polite follow-up 5 days later, then stop. More follow-ups feel like spam and hurt your brand more than they help review count." },
      { heading: "Tracking and dashboards", body: "Measure: send volume, open/click rate, conversion to review, time-from-trigger-to-review. Compare across triggers and channels to optimize." },
      { heading: "Tools to help", body: "Social Perks ships with full review automation: trigger configuration, multi-channel delivery, A/B testing, and per-customer attribution. Most users see review volume double in 60 days after enabling automation." },
      { heading: "Related topics", body: "See also: How to ask for reviews, Review response templates, Review display strategies, Review platforms compared, Fake review detection." },
    ],
  },
];

const influencerTopics: ContentTopic[] = [
  {
    slug: "how-to-find-influencers",
    title: "How to Find the Right Influencers for Your Brand",
    intro: "Finding the right influencer isn't about follower count — it's about audience overlap, engagement quality, and authentic fit. This guide covers the discovery process from search to outreach.",
    sections: [
      { heading: "Start with audience match, not follower count", body: "Define your customer demographic in detail. Then find creators whose audience matches — not whose total reach is biggest. A nano with 5K perfectly-matched followers outperforms a macro with 500K random ones." },
      { heading: "Search strategies", body: "Use hashtags relevant to your niche on Instagram and TikTok. Check who your existing customers follow. Search 'best [your niche] creators on Instagram' on Google. Use platforms like Modash, Heepsy, or Aspire." },
      { heading: "Engagement quality check", body: "Look at comment quality, not just count. Real comments from real people are gold; emoji-only comments from suspicious accounts are warning signs. Calculate engagement rate: (likes + comments) / followers × 100." },
      { heading: "Authenticity signals", body: "Does the creator already mention products/businesses like yours organically? Do they only post sponsored content? Authentic creators mix paid and organic posts and clearly disclose paid partnerships." },
      { heading: "Build a roster, not a one-off", body: "Aim for 10-20 nano-influencers you work with repeatedly. Long-term relationships convert 3-5x better than one-off campaigns." },
      { heading: "Tools to help", body: "Social Perks includes an influencer discovery tool with audience-overlap scoring and pre-vetted nano-creator network." },
      { heading: "Related topics", body: "See also: Influencer outreach templates, Influencer rates 2026, Nano vs macro influencers, Influencer contracts, Influencer campaign measurement." },
    ],
  },
  {
    slug: "influencer-outreach-templates",
    title: "Influencer Outreach Templates That Get Responses",
    intro: "Most influencer outreach gets ignored because it reads like spam. This guide covers the exact structure of a high-response outreach message, with templates for different scenarios.",
    sections: [
      { heading: "The 4-part outreach structure", body: "1) Specific compliment that proves you've seen their work. 2) Why your brand fits their audience. 3) Clear offer (cash, product, perk). 4) Easy yes/no ask." },
      { heading: "Cold outreach template", body: "'Hi [name] — your recent post about [specific detail] really stood out. We make [product] and think your audience would love it. I'd like to send you one free plus a $200 collab fee for one post. Interested? Reply with a yes and I'll send details.'" },
      { heading: "Perk-based collab template", body: "'Hi [name] — we love how you talk about [niche]. We'd love to partner. Instead of a fee, we offer creators a generous perk program — free product plus a percentage on every sale your code drives. Worth a chat?'" },
      { heading: "Long-term partnership template", body: "'Hi [name] — we've worked with you twice and your content always converts. We'd like to make this official: monthly retainer of $X, [Y] posts per month, plus affiliate revenue share. Want to discuss?'" },
      { heading: "Follow-up cadence", body: "If no reply in 5 days, send one follow-up. Never more than two. Aggressive follow-ups burn bridges with the best creators." },
      { heading: "Tools to help", body: "Social Perks streamlines outreach, contracts, and payments in one platform — most users go from 'first message' to 'live campaign' in under 7 days." },
      { heading: "Related topics", body: "See also: How to find influencers, Influencer rates 2026, Influencer contracts, Influencer campaign measurement, Nano vs macro influencers." },
    ],
  },
  {
    slug: "influencer-rates-2026",
    title: "Influencer Rates 2026: What to Pay Creators",
    intro: "Influencer pricing has shifted dramatically. This guide breaks down current rates by tier, platform, and content type — with specific numbers based on real 2026 deal data.",
    sections: [
      { heading: "Nano (1K-10K followers)", body: "Instagram post: $50-$250. Instagram Reel: $100-$400. TikTok video: $75-$350. Story set: $25-$100. Many nano creators happily accept free product plus a perk in lieu of cash." },
      { heading: "Micro (10K-100K followers)", body: "Instagram post: $250-$1,500. Instagram Reel: $400-$2,000. TikTok video: $300-$1,500. Story set: $100-$500. Best ROI tier for most small businesses." },
      { heading: "Mid-tier (100K-500K followers)", body: "Instagram post: $1,500-$5,000. Instagram Reel: $2,000-$7,500. TikTok video: $1,500-$5,000. Story set: $500-$2,000." },
      { heading: "Macro (500K-1M followers)", body: "Instagram post: $5,000-$10,000. Instagram Reel: $7,500-$15,000. TikTok video: $5,000-$15,000." },
      { heading: "Platform multipliers", body: "TikTok rates run 20-40% higher than Instagram for equivalent reach. YouTube long-form: 5-10x the Instagram post rate. LinkedIn (B2B): 2-3x for equivalent reach." },
      { heading: "Tools to help", body: "Social Perks pricing oracle suggests competitive rates based on real-time data from thousands of deals." },
      { heading: "Related topics", body: "See also: How to find influencers, Influencer outreach templates, Nano vs macro influencers, Influencer contracts, Influencer campaign measurement." },
    ],
  },
  {
    slug: "nano-vs-macro-influencers",
    title: "Nano vs Macro Influencers: Which Converts Better?",
    intro: "The biggest names get headlines; the smallest creators get conversions. This guide breaks down nano (1K-10K), micro (10K-100K), mid-tier (100K-500K), and macro (500K+) by ROI, audience trust, and best-use scenarios.",
    sections: [
      { heading: "Engagement rates by tier", body: "Nano: 3-6%. Micro: 1.5-3%. Mid-tier: 0.8-1.5%. Macro: 0.5-1%. Engagement rate is the single best predictor of conversion." },
      { heading: "Conversion rates", body: "Nano-influencer campaigns convert at 4-7x the rate of macro campaigns for local businesses, and 2-4x for national brands. The trust-to-reach trade-off favors nano for most small businesses." },
      { heading: "Cost per converted customer", body: "Nano: $5-$30 per customer. Micro: $10-$50. Mid-tier: $30-$100. Macro: $50-$300+. Nano is almost always the best ROI tier." },
      { heading: "Best use of macro", body: "Brand awareness, launch buzz, PR moments. Don't expect direct conversion ROI from a single macro post." },
      { heading: "Best use of nano", body: "Direct response, local businesses, niche communities, ongoing UGC pipelines. The best small-business strategy is 20 nano partnerships, not one macro." },
      { heading: "Tools to help", body: "Social Perks helps you build and manage a roster of 20+ nano partnerships from one dashboard." },
      { heading: "Related topics", body: "See also: How to find influencers, Influencer rates 2026, Influencer outreach templates, Influencer contracts, Influencer campaign measurement." },
    ],
  },
  {
    slug: "influencer-contracts",
    title: "Influencer Contracts: What Every Brand Needs",
    intro: "A handshake deal with an influencer feels modern but creates real legal and operational risk. This guide covers the must-have clauses every influencer contract should include.",
    sections: [
      { heading: "Deliverables and timeline", body: "Specify exact content (1 Instagram Reel, 3 Stories, etc.), publication dates, and approval process. Vagueness kills campaigns." },
      { heading: "FTC disclosure requirements", body: "Mandate clear disclosure (#ad, #sponsored) at the top of every post. Failure to disclose creates FTC liability for both creator and brand." },
      { heading: "Content rights", body: "Specify usage rights — can you repost, run as paid ads, use on product pages? Default is one-time use; expanded rights cost more." },
      { heading: "Exclusivity", body: "If you don't want the creator promoting a direct competitor for 30-90 days, specify it. Without exclusivity language, you have none." },
      { heading: "Payment terms", body: "Net-30 is standard. Specify currency, payment method, and what triggers payment (publication date, not just contract signing)." },
      { heading: "Termination clauses", body: "What happens if either party breaches? What if the creator deletes the post early? Spell it out." },
      { heading: "Tools to help", body: "Social Perks ships with FTC-compliant contract templates, e-signature flow, and automated payment on deliverable approval." },
      { heading: "Related topics", body: "See also: How to find influencers, Influencer outreach templates, Influencer rates 2026, FTC compliance for creators, Influencer campaign measurement." },
    ],
  },
  {
    slug: "influencer-campaign-measurement",
    title: "Influencer Campaign Measurement: What to Track",
    intro: "Likes and impressions are vanity metrics. This guide covers the real numbers that tell you whether an influencer campaign worked — and how to track them.",
    sections: [
      { heading: "Engagement metrics", body: "Track likes, comments, saves, shares per post. Calculate engagement rate. Compare to creator's typical baseline — a campaign should match or beat their average." },
      { heading: "Traffic metrics", body: "Use unique UTM-tagged links per creator. Measure clicks to your site, time on site, pages viewed, bounce rate." },
      { heading: "Conversion metrics", body: "Unique promo codes per creator. Track conversion rate, average order value, and total revenue attributed to each creator." },
      { heading: "Audience growth", body: "Did your follower count grow during the campaign? How many of those new followers came from the creator's audience?" },
      { heading: "Cost per acquired customer", body: "Total cost (fee + product + management) divided by new customers acquired. Compare across creators and campaigns." },
      { heading: "Tools to help", body: "Social Perks measures all of the above automatically per creator, with weekly performance reports." },
      { heading: "Related topics", body: "See also: How to find influencers, Influencer outreach templates, Influencer rates 2026, Nano vs macro influencers, Influencer contracts." },
    ],
  },
  {
    slug: "ftc-compliance-for-creators",
    title: "FTC Compliance for Influencer Marketing",
    intro: "The FTC has cracked down on influencer marketing. Brands and creators both face liability for undisclosed paid posts. This guide covers exactly what the FTC requires.",
    sections: [
      { heading: "The core rule", body: "Any 'material connection' between brand and creator must be disclosed clearly and conspicuously. Material connection includes cash payments, free product, discounts, and family relationships." },
      { heading: "What 'conspicuously' means", body: "At the start of the caption, not buried at the bottom. In the video itself for spoken disclosures. In a clear hashtag like #ad or #sponsored — not #sp or #partner (the FTC has said these are too vague)." },
      { heading: "Platform-specific rules", body: "Instagram: 'Paid partnership' tag plus #ad in caption. TikTok: built-in disclosure plus spoken or written acknowledgement. YouTube: verbal disclosure plus on-screen text in first 30 seconds." },
      { heading: "Brand liability", body: "The FTC has fined brands for failing to monitor creator disclosures. You can't claim ignorance — you must have a compliance program." },
      { heading: "Penalties", body: "Up to $50,120 per violation. Recent FTC actions have resulted in 6-7 figure settlements for major brands." },
      { heading: "Tools to help", body: "Social Perks auto-injects FTC-compliant disclosure language in every brief and monitors published posts for compliance." },
      { heading: "Related topics", body: "See also: Influencer contracts, How to find influencers, Influencer outreach templates, Influencer campaign measurement, Nano vs macro influencers." },
    ],
  },
  {
    slug: "ugc-rights-management",
    title: "UGC Rights Management: Legal Use of Customer Content",
    intro: "Customer-generated photos and videos are gold — but only if you have the legal right to use them. This guide covers how to collect, document, and manage UGC rights at scale.",
    sections: [
      { heading: "The legal default", body: "A customer posting a photo of your product on Instagram does NOT grant you the right to use it in your ads. You need explicit permission, ideally in writing." },
      { heading: "Rights collection at submission", body: "When a customer submits UGC, include a clear rights grant in the submission flow. 'By submitting, you grant [Brand] the right to use this content in marketing for X years.'" },
      { heading: "Documentation", body: "Store every rights grant with the content. Timestamp, customer email, and exact terms. If you're audited or sued, you need the paper trail." },
      { heading: "Platform terms", body: "Instagram, TikTok, and Facebook each have separate platform terms that govern reposts. Read them. Permission from the creator doesn't automatically grant platform-level rights." },
      { heading: "Best practices", body: "Always credit the original creator. Watermark sparingly (it kills authenticity). Refresh rights annually for long-running campaigns." },
      { heading: "Tools to help", body: "Social Perks includes built-in rights management — every UGC submission comes with explicit rights granted upfront and documented forever." },
      { heading: "Related topics", body: "See also: Influencer contracts, FTC compliance for creators, How to find influencers, Influencer rates 2026, Influencer campaign measurement." },
    ],
  },
];

const socialTopics: ContentTopic[] = [
  { slug: "instagram-growth-strategy", title: "Instagram Growth Strategy for Small Business", intro: "Organic Instagram growth is harder than ever in 2026, but still possible with the right strategy. This guide covers the exact tactics that work for small businesses today.", sections: [
    { heading: "Reels-first content strategy", body: "Reels deliver 2-3x the reach of static posts. Aim for 3-4 Reels per week using trending audio and a clear hook in the first 3 seconds." },
    { heading: "Three content pillars", body: "Pick three categories (e.g., behind-the-scenes, customer features, tips) and rotate. Consistency trains the algorithm." },
    { heading: "Daily engagement", body: "20 minutes per day commenting on accounts in your niche. Real comments, not emoji drops. This is the single most underrated growth tactic." },
    { heading: "Collab posts", body: "Use the Collab feature with niche partners to double reach instantly. Aim for 2-3 collabs per month." },
    { heading: "Hashtag strategy", body: "3-5 niche hashtags per post. Rotate sets. Place in caption, not first comment." },
    { heading: "Tools to help", body: "Social Perks turns customers into a content engine — a structured UGC program adds 30-60 new tagged posts per month to your reach." },
    { heading: "Related topics", body: "See also: TikTok for business, Content calendar planning, Social media metrics, Engagement strategies, Cross-platform repurposing." },
  ]},
  { slug: "tiktok-for-business", title: "TikTok for Business: A Starter Guide", intro: "TikTok is the fastest-growing channel for small businesses in 2026. This guide covers setup, content strategy, and the first 30 days.", sections: [
    { heading: "Switch to Business account", body: "Free, unlocks analytics, and grants commercial music library access." },
    { heading: "Post 1-2 videos daily for 30 days", body: "Volume beats perfection. The algorithm needs data to find your audience — give it lots." },
    { heading: "Hook in 3 seconds", body: "Most viewers swipe away in 3 seconds. Your first frame, first words, and first motion must earn the next 7 seconds." },
    { heading: "Use trending sounds", body: "Trending audio 2-3x your reach. Open the app daily and identify trending sounds in your niche." },
    { heading: "Engage with comments fast", body: "TikTok rewards posts with high comment velocity. Reply to every comment in the first hour." },
    { heading: "Tools to help", body: "Social Perks generates TikTok-ready UGC from customers, giving you a steady stream of authentic content to repost or remix." },
    { heading: "Related topics", body: "See also: Instagram growth strategy, Content calendar planning, Social media metrics, Engagement strategies, Cross-platform repurposing." },
  ]},
  { slug: "content-calendar-planning", title: "Content Calendar Planning for Busy Businesses", intro: "A content calendar is the difference between sporadic posting and a real social media presence. This guide covers the exact structure and tools.", sections: [
    { heading: "Three content pillars", body: "Pick three categories that align with business goals. Rotate through them weekly." },
    { heading: "Plan 4-8 weeks ahead", body: "Long horizons let you batch-create, align with promotions, and avoid daily 'what should I post' decisions." },
    { heading: "Batch creation", body: "Set aside one 3-hour session per month to create the next 4 weeks of content. Schedule everything." },
    { heading: "Tool stack", body: "Notion or a Google Sheet for planning. Later, Buffer, or Meta Business Suite for scheduling. Canva for graphics." },
    { heading: "Weekly review", body: "Every Monday, review last week's performance and adjust upcoming content based on what worked." },
    { heading: "Tools to help", body: "Social Perks generates a steady flow of customer UGC you can drop directly into your content calendar." },
    { heading: "Related topics", body: "See also: Instagram growth strategy, TikTok for business, Social media metrics, Engagement strategies, Cross-platform repurposing." },
  ]},
  { slug: "social-media-metrics", title: "Social Media Metrics That Actually Matter", intro: "Followers and likes are vanity. This guide covers the metrics that predict real business impact.", sections: [
    { heading: "Saves and shares", body: "The strongest algorithm signals on Instagram and TikTok. A high save rate beats a high like rate every time." },
    { heading: "Engagement rate", body: "(Likes + comments + saves + shares) / followers × 100. Track weekly per post type." },
    { heading: "Reach and impressions", body: "Reach (unique viewers) matters more than impressions (total views). Aim to grow reach 5-10% month over month." },
    { heading: "Profile visits and link clicks", body: "These are the conversion signals. If reach is high but profile visits low, your content isn't compelling enough to drive action." },
    { heading: "Follower growth rate", body: "Track week-over-week. A 1-2% weekly growth rate compounds to a strong year." },
    { heading: "Tools to help", body: "Social Perks attributes social engagement to revenue — see exactly which posts drive customer actions." },
    { heading: "Related topics", body: "See also: Instagram growth strategy, TikTok for business, Content calendar planning, Engagement strategies, Cross-platform repurposing." },
  ]},
  { slug: "engagement-strategies", title: "Social Media Engagement Strategies That Work", intro: "Posting content is only step one. Engagement is what turns viewers into customers. This guide covers proven engagement tactics.", sections: [
    { heading: "Reply within the first hour", body: "Algorithms boost posts with high comment velocity in the first hour. Reply to every comment fast." },
    { heading: "Ask questions in captions", body: "Direct questions get 2-3x more comments than statements." },
    { heading: "DM new followers", body: "A personal 1-2 sentence welcome DM converts at 5-10x the rate of generic outreach." },
    { heading: "Engage on other accounts", body: "20 minutes per day commenting on niche-relevant accounts grows your audience faster than posting alone." },
    { heading: "Run polls and quizzes in Stories", body: "Story engagement signals to the algorithm that your audience is active. Polls and quizzes get 3-5x more responses than open questions." },
    { heading: "Tools to help", body: "Social Perks rewards customers for engaging with your social posts, multiplying engagement signals without manual outreach." },
    { heading: "Related topics", body: "See also: Instagram growth strategy, TikTok for business, Content calendar planning, Social media metrics, Cross-platform repurposing." },
  ]},
  { slug: "cross-platform-repurposing", title: "Cross-Platform Content Repurposing", intro: "Creating once and publishing everywhere is the only sustainable content strategy. This guide covers the repurposing framework.", sections: [
    { heading: "The hub-and-spoke model", body: "Create one 'hub' piece (long video or blog), then break it into 5-10 'spoke' pieces (short clips, social posts, email snippets)." },
    { heading: "Format adaptation", body: "Vertical video for TikTok and Reels. Square for Instagram feed. 16:9 for YouTube. Don't just crop — adapt the format for each platform." },
    { heading: "Caption rewriting", body: "Same idea, different voice per platform. LinkedIn caption is professional; TikTok caption is punchy; Instagram caption tells a story." },
    { heading: "Timing offsets", body: "Don't publish identical content on every platform on the same day. Stagger by 2-3 days for the audiences that overlap." },
    { heading: "Hashtag and tag strategies", body: "Each platform has its own hashtag culture. Don't copy-paste your Instagram tags to TikTok." },
    { heading: "Tools to help", body: "Social Perks generates UGC you can natively repurpose across every platform with proper rights documentation." },
    { heading: "Related topics", body: "See also: Instagram growth strategy, TikTok for business, Content calendar planning, Social media metrics, Engagement strategies." },
  ]},
  { slug: "social-listening", title: "Social Listening for Small Business", intro: "Social listening is monitoring what people say about you and your category online. This guide covers practical, low-cost approaches.", sections: [
    { heading: "Why it matters", body: "Catch complaints before they become viral. Find opportunities to engage. Discover customer language to use in your own marketing." },
    { heading: "Free tools", body: "Google Alerts for brand mentions on the web. Built-in platform notifications for tags and mentions. Mention.com free tier." },
    { heading: "What to track", body: "Brand name, common misspellings, top 3 competitors, top 5 category keywords." },
    { heading: "Response framework", body: "Respond within 24 hours. Empathize first, solve second. Move detailed conversations to DM or email." },
    { heading: "Turn listening into content", body: "What questions do customers ask repeatedly? Each one is a future blog post, social post, or FAQ entry." },
    { heading: "Tools to help", body: "Social Perks monitors social mentions and surfaces them in your customer-marketing dashboard." },
    { heading: "Related topics", body: "See also: Engagement strategies, Social media metrics, Instagram growth strategy, Content calendar planning, Cross-platform repurposing." },
  ]},
  { slug: "social-media-ads-basics", title: "Social Media Ads Basics for Small Business", intro: "Paid social can accelerate organic growth — or burn cash fast. This guide covers the fundamentals.", sections: [
    { heading: "Pick the right platform", body: "Match the platform to your audience: Meta for 25+, TikTok for under-35, LinkedIn for B2B. Don't run on all platforms at once." },
    { heading: "Start with retargeting", body: "Retargeting converts at 5-10x the rate of cold ads. Always set this up first before running cold campaigns." },
    { heading: "UGC creative wins", body: "Customer photos and videos outperform brand-shot ads by 4x. Use real UGC in every campaign." },
    { heading: "Budget structure", body: "Start at $20-$50/day for 14 days to gather data. Scale only what's profitable." },
    { heading: "Test, don't tweak", body: "Run an ad untouched for 7-14 days. Daily tweaks reset the learning phase." },
    { heading: "Tools to help", body: "Social Perks supplies the UGC and customer testimonials that make ad creative dramatically more effective." },
    { heading: "Related topics", body: "See also: Instagram growth strategy, TikTok for business, Social media metrics, Cross-platform repurposing, Engagement strategies." },
  ]},
];

const loyaltyTopics: ContentTopic[] = [
  { slug: "loyalty-program-design", title: "Loyalty Program Design Fundamentals", intro: "A good loyalty program drives repeat business, deepens customer relationships, and lifts profit. A bad one is an expensive distraction. This guide covers the design fundamentals.", sections: [
    { heading: "Start with the desired behavior", body: "What do you want customers to do more of? Repeat purchases, referrals, reviews, social posts, spend per visit. Design backward from the behavior." },
    { heading: "Pick a structure", body: "Points-based: simple, familiar, but commoditized. Perk-based: more memorable. Tiered: best for retention. Subscription: best for recurring purchase categories." },
    { heading: "Set the math correctly", body: "Reward should feel meaningful (5-15% of spend) without destroying margins. Test the redemption rate over 90 days." },
    { heading: "Keep it simple", body: "Customers should understand the program in 10 seconds. Complex programs have lower participation." },
    { heading: "Communicate everywhere", body: "In-store signage, receipts, email, social, website. A great program with bad communication fails." },
    { heading: "Tools to help", body: "Social Perks ships with 12+ pre-built loyalty templates designed for different business types." },
    { heading: "Related topics", body: "See also: Points vs perks, Loyalty program ROI, Loyalty tiers, Loyalty program software comparison, Customer retention strategies." },
  ]},
  { slug: "points-vs-perks", title: "Points vs Perks: Which Loyalty Structure Wins?", intro: "The two dominant loyalty structures take fundamentally different approaches. This guide compares them and helps you pick.", sections: [
    { heading: "Points-based programs", body: "Customers earn points per dollar spent. Points convert to discounts or rewards. Simple but commoditized — every retailer has one." },
    { heading: "Perk-based programs", body: "Customers earn experiences, status, or branded perks. More memorable, drives stronger emotional connection." },
    { heading: "When points work best", body: "High-frequency, low-emotion categories (coffee, groceries, gas). Customers want predictable utility." },
    { heading: "When perks work best", body: "Higher-consideration purchases, lifestyle brands, hospitality. Customers want the brand experience, not just the discount." },
    { heading: "Hybrid programs", body: "The strongest programs combine both: points for predictability, perks for delight." },
    { heading: "Tools to help", body: "Social Perks supports both structures and lets you blend them as your program matures." },
    { heading: "Related topics", body: "See also: Loyalty program design, Loyalty program ROI, Loyalty tiers, Loyalty program software comparison, Customer retention strategies." },
  ]},
  { slug: "loyalty-program-roi", title: "Loyalty Program ROI: Measuring What Matters", intro: "Loyalty programs are an investment. This guide covers how to measure the real return.", sections: [
    { heading: "The core metric: incremental revenue", body: "Loyalty member revenue minus what they would have spent anyway. This is the only metric that proves the program is generating real lift." },
    { heading: "Repeat purchase rate", body: "Compare loyalty members to non-members. Loyalty members should buy 30-50% more frequently." },
    { heading: "Average order value lift", body: "Loyalty members typically spend 10-25% more per transaction." },
    { heading: "Retention rate", body: "What percentage of loyalty members are still active 12 months in? Strong programs maintain 60-70% year-one retention." },
    { heading: "Cost analysis", body: "Total program cost (software + reward fulfillment + management) divided by incremental revenue. Healthy programs return 5-10x." },
    { heading: "Tools to help", body: "Social Perks reports incremental revenue, retention, and AOV lift automatically per loyalty member." },
    { heading: "Related topics", body: "See also: Loyalty program design, Points vs perks, Loyalty tiers, Loyalty program software comparison, Customer retention strategies." },
  ]},
  { slug: "loyalty-tiers", title: "Loyalty Tiers: When and How to Build Them", intro: "Tiered programs reward top customers with status, access, and exclusive perks. This guide covers when tiers make sense and how to design them.", sections: [
    { heading: "When tiers work", body: "When you have a meaningful top 20% spending 3-5x the average. Tiers give them recognition and a reason to push harder." },
    { heading: "Number of tiers", body: "Three tiers is the sweet spot. Two feels lazy; four+ confuses customers." },
    { heading: "Tier thresholds", body: "Set thresholds so 5-15% of customers reach the top tier. Too easy and the status is meaningless; too hard and no one bothers." },
    { heading: "Tier benefits", body: "Mix tangible (discounts, free shipping) and intangible (early access, dedicated support, VIP events). Intangibles drive emotional loyalty." },
    { heading: "Communication", body: "Show progress to next tier in customer dashboards and emails. Visibility drives behavior." },
    { heading: "Tools to help", body: "Social Perks ships with tier-based program templates, automatic tier calculation, and tier-specific communications." },
    { heading: "Related topics", body: "See also: Loyalty program design, Points vs perks, Loyalty program ROI, Loyalty program software comparison, Customer retention strategies." },
  ]},
  { slug: "loyalty-program-software-comparison", title: "Loyalty Program Software Compared", intro: "There are 50+ loyalty platforms on the market. This guide compares the leaders by business type, budget, and feature set.", sections: [
    { heading: "Enterprise platforms", body: "Yotpo Loyalty, Annex Cloud, Antavo. Aimed at brands doing $5M+/year. Pricing $1,000-$10,000+/month. Heavy implementation." },
    { heading: "Mid-market platforms", body: "Smile.io, LoyaltyLion, Stamped. $200-$1,500/month. Good for $500K-$5M businesses." },
    { heading: "Small business platforms", body: "Social Perks, Fivestars, Perkville. $49-$299/month. Built for under-$1M businesses." },
    { heading: "POS-integrated platforms", body: "Square Loyalty, Toast Loyalty, Clover Rewards. Cheap if you already use the POS but limited features." },
    { heading: "What to look for", body: "Integrations with your existing tools, flexibility in program design, reporting depth, customer support quality." },
    { heading: "Tools to help", body: "Social Perks covers loyalty plus reviews, UGC, and referrals in one platform — often replacing 3-5 separate tools." },
    { heading: "Related topics", body: "See also: Loyalty program design, Points vs perks, Loyalty program ROI, Loyalty tiers, Customer retention strategies." },
  ]},
  { slug: "customer-retention-strategies", title: "Customer Retention Strategies", intro: "Acquiring a customer costs 5-25x more than retaining one. This guide covers proven retention tactics.", sections: [
    { heading: "The first 30 days matter most", body: "Customers who make a second purchase within 30 days have a 4-5x higher lifetime value. Front-load engagement here." },
    { heading: "Welcome series", body: "5 emails over 14 days: welcome, brand story, social proof, education, offer. This single sequence often drives 30-40% of email revenue." },
    { heading: "Reorder reminders", body: "For consumable products, time-based reorder reminders lift repeat purchase rate 20-30%." },
    { heading: "Loyalty programs", body: "Loyalty members retain at 2-3x the rate of non-members." },
    { heading: "Personalized offers", body: "Segment by purchase history, geography, and engagement. Generic offers convert at 3-5x lower rates than personalized ones." },
    { heading: "Tools to help", body: "Social Perks combines loyalty, referrals, and review programs to build a complete retention system." },
    { heading: "Related topics", body: "See also: Loyalty program design, Points vs perks, Loyalty program ROI, Loyalty tiers, Loyalty program software comparison." },
  ]},
  { slug: "referral-program-mechanics", title: "Referral Program Mechanics", intro: "Referrals are the highest-converting customer acquisition channel. This guide covers the mechanics of a high-performing program.", sections: [
    { heading: "The give-get structure", body: "Both the referrer and the new customer get a reward. Double-sided programs convert 2x better than single-sided." },
    { heading: "Reward sizing", body: "Set reward at 10-20% of average order value. Smaller feels insulting; larger destroys margins." },
    { heading: "Trigger at peak satisfaction", body: "Ask for referrals right after a great experience (purchase, service completion, milestone). Timing drives 5-10x more shares." },
    { heading: "Tracking", body: "Unique referral codes or links per customer. Auto-track who referred whom and credit accordingly." },
    { heading: "Multi-channel promotion", body: "Email, in-app, receipts, in-store signage. The more places you promote the program, the more customers find it." },
    { heading: "Tools to help", body: "Social Perks ships with full referral program infrastructure — codes, tracking, multi-channel promotion, and dashboards." },
    { heading: "Related topics", body: "See also: Loyalty program design, Customer retention strategies, Loyalty program ROI, Loyalty tiers, Loyalty program software comparison." },
  ]},
  { slug: "vip-customer-programs", title: "VIP Customer Programs That Drive Profit", intro: "Your top 10% of customers often drive 50%+ of profit. A VIP program recognizes them and locks in long-term loyalty.", sections: [
    { heading: "Define VIP criteria", body: "Annual spend, visit frequency, lifetime value, or referrals made. Pick 1-2 criteria and make them clear." },
    { heading: "VIP benefits", body: "Early access to new products, dedicated support, exclusive events, surprise gifts. Mix tangible and experiential." },
    { heading: "Communication", body: "Treat VIPs like insiders. Personal emails, behind-the-scenes content, personalized recommendations." },
    { heading: "Surprise and delight", body: "Unexpected perks (birthday gift, anniversary recognition) drive emotional loyalty in ways predictable rewards can't." },
    { heading: "VIP-only events", body: "Private shopping nights, member-only workshops, or VIP-first product launches build community among top customers." },
    { heading: "Tools to help", body: "Social Perks lets you create VIP tiers, automate VIP-specific communications, and track VIP behavior separately." },
    { heading: "Related topics", body: "See also: Loyalty tiers, Customer retention strategies, Loyalty program design, Referral program mechanics, Loyalty program ROI." },
  ]},
];

const localTopics: ContentTopic[] = [
  { slug: "google-business-profile-optimization", title: "Google Business Profile Optimization", intro: "Your Google Business Profile is the single most important local marketing asset. This guide covers the optimization checklist that drives local search rankings.", sections: [
    { heading: "Complete every field", body: "Categories, attributes, services, products, hours, photos, description. Google rewards complete profiles." },
    { heading: "Primary and secondary categories", body: "Pick the most specific primary category. Add 3-5 secondary categories for broader discovery." },
    { heading: "10+ high-quality photos", body: "Interior, exterior, team, products, and customers. Update monthly. Photos drive 35% more clicks." },
    { heading: "Weekly Google Posts", body: "Offers, updates, events. Google Posts appear in your knowledge panel and signal freshness to the algorithm." },
    { heading: "Respond to every review", body: "Response rate is a confirmed local ranking factor. Aim for 100% response within 24 hours." },
    { heading: "Tools to help", body: "Social Perks plus a steady review program is the fastest way to boost Google Business Profile performance." },
    { heading: "Related topics", body: "See also: Local SEO fundamentals, Local citations, Google Map Pack ranking, Local link building, Neighborhood marketing." },
  ]},
  { slug: "local-seo-fundamentals", title: "Local SEO Fundamentals", intro: "Local SEO determines whether you show up for 'near me' searches. This guide covers the three pillars: Google Business Profile, on-page, and off-page.", sections: [
    { heading: "Google Business Profile", body: "The single most important factor. Complete every field, get reviews consistently, post weekly." },
    { heading: "On-page optimization", body: "Include city, neighborhood, and service area naturally in titles, headers, and content. Build location-specific landing pages for each area you serve." },
    { heading: "Off-page citations", body: "Consistent name/address/phone across Yelp, Apple Maps, Bing Places, and 20+ local directories." },
    { heading: "Backlinks from local sites", body: "Local newspapers, chamber of commerce, niche directories, and partner businesses. Quality over quantity." },
    { heading: "Schema markup", body: "Add LocalBusiness schema to your site. It helps Google understand your business and display rich results." },
    { heading: "Tools to help", body: "Social Perks plus a structured review program drives the review velocity and freshness signals local SEO depends on." },
    { heading: "Related topics", body: "See also: Google Business Profile optimization, Local citations, Google Map Pack ranking, Local link building, Neighborhood marketing." },
  ]},
  { slug: "local-citations", title: "Local Citations: The Foundation of Local SEO", intro: "Citations are mentions of your business name, address, and phone (NAP) across the web. Consistent citations build local search authority.", sections: [
    { heading: "The big 5 directories", body: "Google Business Profile, Yelp, Apple Maps, Bing Places, Facebook. Get listed and verified on all five before anything else." },
    { heading: "Top 25 secondary directories", body: "Yellow Pages, Foursquare, Better Business Bureau, Manta, Chamber of Commerce, plus industry-specific directories." },
    { heading: "NAP consistency", body: "Exact same name, address, and phone across every directory. Even small variations hurt rankings." },
    { heading: "Citation audits", body: "Use Moz Local, BrightLocal, or Whitespark to audit citations annually. Fix inconsistencies before they hurt rankings." },
    { heading: "Niche citations", body: "Industry-specific directories (TripAdvisor, Healthgrades, Avvo, etc.) often matter more than generic ones for niche businesses." },
    { heading: "Tools to help", body: "Social Perks integrates with citation management tools to ensure your data stays consistent everywhere." },
    { heading: "Related topics", body: "See also: Google Business Profile optimization, Local SEO fundamentals, Google Map Pack ranking, Local link building, Neighborhood marketing." },
  ]},
  { slug: "google-map-pack-ranking", title: "How to Rank in the Google Map Pack", intro: "The Map Pack (top 3 local results) gets 44% of clicks for local searches. This guide covers what it takes to rank there.", sections: [
    { heading: "Three ranking factors", body: "Relevance (how well your profile matches the search), distance (how close to the searcher), and prominence (overall authority based on reviews, links, and citations)." },
    { heading: "Optimize for relevance", body: "Use the exact category Google uses for the search you want to rank for. Include keywords naturally in your business description and services." },
    { heading: "Optimize for prominence", body: "Get 100+ reviews with a 4.5+ rating. Build local backlinks. Maintain consistent citations." },
    { heading: "Hyperlocal optimization", body: "Build location pages for each neighborhood you serve. Include neighborhood-specific photos and content." },
    { heading: "Track rankings", body: "Use BrightLocal, Local Falcon, or PlePer to track your rank in the Map Pack for target keywords from different locations." },
    { heading: "Tools to help", body: "Social Perks drives the review velocity that's the single biggest prominence signal." },
    { heading: "Related topics", body: "See also: Google Business Profile optimization, Local SEO fundamentals, Local citations, Local link building, Neighborhood marketing." },
  ]},
  { slug: "local-link-building", title: "Local Link Building Strategies", intro: "Backlinks from local sites signal authority to Google. This guide covers practical local link building tactics.", sections: [
    { heading: "Chamber of commerce", body: "Most chambers list members on their site. $200-$500/year membership often pays back via the backlink alone." },
    { heading: "Local newspapers and blogs", body: "Pitch story ideas tied to your business or community. A single feature can drive both traffic and authority." },
    { heading: "Sponsor local events", body: "Event sites typically link to sponsors. Choose events tied to your community for maximum relevance." },
    { heading: "Partner businesses", body: "Mutual link exchanges with non-competing local businesses (e.g., yoga studio links to local healthy cafe and vice versa)." },
    { heading: "Local resource lists", body: "Get featured on 'Best of [city]' lists. Pitch local bloggers and journalists with a specific angle." },
    { heading: "Tools to help", body: "Social Perks customer stories provide PR-worthy content that local journalists love to feature." },
    { heading: "Related topics", body: "See also: Google Business Profile optimization, Local SEO fundamentals, Local citations, Google Map Pack ranking, Neighborhood marketing." },
  ]},
  { slug: "neighborhood-marketing", title: "Neighborhood-Level Marketing for Local Business", intro: "Neighborhood marketing targets a 1-3 mile radius around your business. This guide covers tactics that don't require ad spend.", sections: [
    { heading: "Local Facebook groups", body: "Join 5-10 active neighborhood groups. Participate genuinely; promote sparingly." },
    { heading: "Nextdoor presence", body: "Claim your Nextdoor Business page. Run neighborhood-targeted offers. Engage with recommendations." },
    { heading: "Hyperlocal partnerships", body: "Partner with non-competing businesses on the same block. Cross-promote with bundled offers." },
    { heading: "Neighborhood events", body: "Host or sponsor events. Block parties, farmer's markets, school fundraisers." },
    { heading: "Walk-by marketing", body: "Sandwich boards, window displays, sidewalk activations. Your storefront is your highest-value billboard." },
    { heading: "Tools to help", body: "Social Perks captures customers from these neighborhood activities and turns them into a long-term marketing engine." },
    { heading: "Related topics", body: "See also: Google Business Profile optimization, Local SEO fundamentals, Local citations, Google Map Pack ranking, Local link building." },
  ]},
  { slug: "community-marketing", title: "Community Marketing for Small Business", intro: "Community marketing builds loyalty by aligning your business with causes and people your customers care about. This guide covers practical approaches.", sections: [
    { heading: "Pick causes authentically", body: "Choose 1-2 community causes you genuinely care about. Performative community marketing is transparent and backfires." },
    { heading: "Show up in person", body: "Sponsor a youth team, volunteer at a local nonprofit, host a fundraiser. Physical presence beats logo placement." },
    { heading: "Customer-led initiatives", body: "Invite customers to vote on which local nonprofits to support. Tie a percentage of sales to their choice." },
    { heading: "Tell the stories", body: "Document community work on social, in email, and in-store. Don't brag — show the people you're supporting." },
    { heading: "Measure impact, not vanity", body: "Dollars donated, hours volunteered, people helped. These numbers should grow year over year." },
    { heading: "Tools to help", body: "Social Perks lets you build perks where customer activity drives community contributions (e.g., 'every 10th referral = a meal donated')." },
    { heading: "Related topics", body: "See also: Neighborhood marketing, Local SEO fundamentals, Google Business Profile optimization, Local link building, Hyperlocal advertising." },
  ]},
  { slug: "hyperlocal-advertising", title: "Hyperlocal Advertising Tactics", intro: "Hyperlocal ads target customers within walking or short-driving distance. This guide covers the highest-ROI tactics.", sections: [
    { heading: "Meta ads with radius targeting", body: "Target a 1-3 mile radius around your location. Use UGC creative and a clear local hook." },
    { heading: "Google Local Service Ads", body: "Pay-per-lead ads for service businesses. Appears above organic results. Strong for plumbers, lawyers, locksmiths, etc." },
    { heading: "Direct mail", body: "Still works in 2026 for local businesses. EDDM (Every Door Direct Mail) postcards to your local zip codes." },
    { heading: "Neighborhood newspapers", body: "Small local papers and neighborhood newsletters often have surprisingly engaged readership at low ad rates." },
    { heading: "Geofencing", body: "Run mobile ads to people inside specific locations (a competitor's parking lot, a local event)." },
    { heading: "Tools to help", body: "Social Perks turns the customers acquired through hyperlocal ads into long-term advocates that compound your return." },
    { heading: "Related topics", body: "See also: Neighborhood marketing, Community marketing, Local SEO fundamentals, Google Business Profile optimization, Local link building." },
  ]},
];

export const CONTENT_CATEGORIES: ContentCategory[] = [
  { slug: "reviews", label: "Reviews", description: "Everything about collecting, displaying, responding to, and automating customer reviews.", topics: reviewsTopics },
  { slug: "influencer-marketing", label: "Influencer Marketing", description: "Finding, hiring, managing, and measuring influencer campaigns.", topics: influencerTopics },
  { slug: "social-media", label: "Social Media", description: "Organic growth and engagement on Instagram, TikTok, and beyond.", topics: socialTopics },
  { slug: "customer-loyalty", label: "Customer Loyalty", description: "Building loyalty programs, retaining customers, and creating VIPs.", topics: loyaltyTopics },
  { slug: "local-marketing", label: "Local Marketing", description: "Local SEO, Map Pack ranking, citations, and neighborhood-level marketing.", topics: localTopics },
];

export const CONTENT_CATEGORY_SLUGS = CONTENT_CATEGORIES.map((c) => c.slug);

export function getCategory(slug: string): ContentCategory | undefined {
  return CONTENT_CATEGORIES.find((c) => c.slug === slug);
}

export function getTopic(categorySlug: string, topicSlug: string): { category: ContentCategory; topic: ContentTopic } | undefined {
  const category = getCategory(categorySlug);
  if (!category) return undefined;
  const topic = category.topics.find((t) => t.slug === topicSlug);
  if (!topic) return undefined;
  return { category, topic };
}

export const ALL_CONTENT_PATHS: { category: string; topic: string }[] = CONTENT_CATEGORIES.flatMap((c) =>
  c.topics.map((t) => ({ category: c.slug, topic: t.slug }))
);
