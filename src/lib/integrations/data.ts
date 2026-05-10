export interface IntegrationFAQ {
  q: string;
  a: string;
}

export interface IntegrationExample {
  title: string;
  description: string;
}

export interface IntegrationPlatform {
  slug: string;
  name: string;
  tagline: string;
  color: string; // tailwind text color class
  accent: string; // tailwind bg color class
  bullets: string[]; // 5
  steps: [string, string, string]; // 3
  examples: IntegrationExample[]; // 2-3
  faqs: IntegrationFAQ[]; // 5
  description: string; // for meta
}

export const INTEGRATIONS: IntegrationPlatform[] = [
  {
    slug: "instagram",
    name: "Instagram",
    tagline: "Turn happy customers into Instagram stories, reels, and tagged posts — automatically.",
    color: "text-pink-400",
    accent: "from-pink-500/20 to-purple-500/10",
    description:
      "Run UGC campaigns on Instagram with Social Perks. Reward customers for stories, reels, and tagged posts.",
    bullets: [
      "Launch story campaigns where customers tag your handle to earn a perk.",
      "Track tagged posts and stories automatically without manual screenshotting.",
      "Reward reels and carousel posts at different perk tiers based on reach.",
      "FTC #ad disclosure injected automatically on every campaign brief.",
      "Verify follower count and engagement before paying out perks.",
    ],
    steps: [
      "Connect your Instagram Business account in 30 seconds via OAuth.",
      "Set the perk and the action — story tag, in-feed post, or reel.",
      "Customers post, Social Perks verifies, perks are issued automatically.",
    ],
    examples: [
      {
        title: "Coffee shop story-tag campaign",
        description:
          "'Tag us in your latte story this week, get your next drink free.' Verified via story mention API.",
      },
      {
        title: "Salon reel review",
        description:
          "'Post a reel of your new color, tag us, get 20% off your next appointment.' Auto-verified once posted.",
      },
      {
        title: "Boutique carousel post",
        description:
          "'Share a 3-photo carousel wearing your purchase, get a $25 store credit.' Engagement is tracked for 7 days.",
      },
    ],
    faqs: [
      {
        q: "Do I need an Instagram Business account?",
        a: "Yes — Instagram's API only allows posting analytics and tag tracking through Business or Creator accounts. Switching from Personal takes 30 seconds in the app.",
      },
      {
        q: "How do you verify a customer actually posted?",
        a: "We use Instagram's Graph API to confirm the post or story exists, that your handle was tagged, and that the account is real (not a freshly-created throwaway).",
      },
      {
        q: "What happens if they delete the post after redeeming the perk?",
        a: "Social Perks monitors active campaigns for 30 days. If a post is deleted within the bonus window, the perk is flagged and you can choose to reverse the reward.",
      },
      {
        q: "Can I require a minimum follower count?",
        a: "Yes. You can set follower-count tiers — base perk for anyone, +5% for 500+, +10% for 2K+, up to +25% for 50K+.",
      },
      {
        q: "Is this compliant with FTC rules?",
        a: "Yes. Every campaign brief includes the required #ad or #partner disclosure. Customers must use the hashtag for the post to count, which keeps you on the safe side of FTC endorsement rules.",
      },
    ],
  },
  {
    slug: "tiktok",
    name: "TikTok",
    tagline: "Get customers making short videos about you — without paying for influencer rates.",
    color: "text-cyan-400",
    accent: "from-cyan-500/20 to-rose-500/10",
    description:
      "Run TikTok UGC campaigns with Social Perks. Reward customers for videos, duets, and stitches.",
    bullets: [
      "Launch hashtag challenges customers can join for a perk.",
      "Reward duets, stitches, and original videos at different tiers.",
      "Auto-detect when a video uses your branded hashtag or sound.",
      "Pay based on real reach, not follower count — TikTok's algorithm is the great equalizer.",
      "Built-in FTC #ad disclosure for every TikTok campaign brief.",
    ],
    steps: [
      "Connect your TikTok for Business account.",
      "Pick a hashtag, sound, or branded effect for the campaign.",
      "Customers post, you reward based on views or engagement.",
    ],
    examples: [
      {
        title: "Restaurant 'order reveal' challenge",
        description:
          "'Post a TikTok unboxing your meal with #brunchatours, get a free dessert next visit.' Verified via hashtag tracking.",
      },
      {
        title: "Salon transformation video",
        description:
          "'30-second before/after of your new cut, tag us, earn 25% off your next visit + entry to monthly $200 draw.'",
      },
    ],
    faqs: [
      {
        q: "Do I need a TikTok Business account?",
        a: "Yes — Business or Creator. Switch is free and instant from the TikTok app settings.",
      },
      {
        q: "How do you track which TikToks count?",
        a: "We hook into TikTok's hashtag API and your branded sound metrics. Posts using your assigned hashtag get auto-detected and queued for verification.",
      },
      {
        q: "Can I reward based on views instead of just posting?",
        a: "Yes. Set tiered rewards — e.g. base perk for posting, bonus perk at 1K views, larger bonus at 10K views.",
      },
      {
        q: "What if a video goes mega-viral?",
        a: "You can set a max payout cap per campaign so a freak viral hit doesn't blow your budget. Most businesses cap at 5× the base reward.",
      },
      {
        q: "Will this work for boring industries?",
        a: "Yes — some of the best-performing TikTok campaigns are for plumbers, dentists, and accountants. The 'before/after' or 'day in the life' format works for everything.",
      },
    ],
  },
  {
    slug: "google-business",
    name: "Google Business Profile",
    tagline: "More Google reviews, automatically — the single highest-impact marketing channel for local businesses.",
    color: "text-blue-400",
    accent: "from-blue-500/20 to-green-500/10",
    description:
      "Drive Google reviews with Social Perks. Send review requests, verify completion, reward customers — all compliant.",
    bullets: [
      "Send post-visit review requests by SMS and email with a one-click link.",
      "Verify a review was actually posted before issuing the perk (no honor system).",
      "Reward for honest reviews — not 5-star reviews — keeping you FTC compliant.",
      "Auto-respond to new reviews with AI-drafted replies you approve.",
      "Track review velocity, sentiment, and impact on your local pack ranking.",
    ],
    steps: [
      "Connect your Google Business Profile in 30 seconds.",
      "Pick when review requests go out — after a purchase, visit, or service.",
      "Customers leave reviews, Social Perks verifies, perks are issued.",
    ],
    examples: [
      {
        title: "Coffee shop post-visit review",
        description:
          "'Thanks for stopping in — leave us an honest review and your next drip coffee is on us.' 1-click verification.",
      },
      {
        title: "Auto detailer review + photo",
        description:
          "'Leave a review with a photo of your car, earn $20 off your next detail.' Verified via Google's review API.",
      },
      {
        title: "Restaurant 'tell us how we did'",
        description:
          "Sent 2 hours after the customer's reservation ends. Includes a one-tap Google review link plus a free appetizer reward.",
      },
    ],
    faqs: [
      {
        q: "Is rewarding customers for Google reviews allowed?",
        a: "Yes — as long as you reward for an honest review (positive OR negative). Rewarding only for 5-star reviews violates Google and FTC rules. Social Perks rewards on completion, not on rating, which keeps you compliant.",
      },
      {
        q: "Does Google's policy allow this?",
        a: "Google's policy prohibits soliciting reviews 'in exchange for benefit' from specific customer subsets. Social Perks frames the offer as a thank-you for honest feedback from all customers, which complies with the policy interpretation most local agencies use.",
      },
      {
        q: "How fast will my rating actually move?",
        a: "Most businesses see their rating move 0.3–0.7 stars within 60 days of consistent use, depending on existing review volume. Newer businesses move faster.",
      },
      {
        q: "Can I respond to all my reviews from inside Social Perks?",
        a: "Yes. AI drafts a reply for every new review (positive and negative). You approve, edit, or send as-is in one click.",
      },
      {
        q: "What if I get a 1-star review from this?",
        a: "It happens. But Google's algorithm weights recent reviews heavily — a few new 4 and 5 stars from happy customers will offset one bad review faster than you'd think.",
      },
    ],
  },
  {
    slug: "facebook",
    name: "Facebook",
    tagline: "Recommendations, shares, and check-ins from your existing customers — without paid ads.",
    color: "text-blue-400",
    accent: "from-blue-500/20 to-indigo-500/10",
    description:
      "Run Facebook campaigns with Social Perks. Drive recommendations, shares, and check-ins from real customers.",
    bullets: [
      "Customers leave a Facebook Page recommendation for a perk.",
      "Reward check-ins at your physical location.",
      "Get shares of your posts to friends' timelines — the highest-trust marketing there is.",
      "Run group-share campaigns for local community pages.",
      "Track Page rating, follower growth, and engagement lift inside Social Perks.",
    ],
    steps: [
      "Connect your Facebook Page via Meta Business OAuth.",
      "Set the action — recommendation, check-in, share, or photo upload.",
      "Customers post, Social Perks verifies via Graph API, perk is issued.",
    ],
    examples: [
      {
        title: "Yoga studio recommendation",
        description:
          "'Leave us a Facebook recommendation after class, get a free guest pass for a friend.' Auto-verified.",
      },
      {
        title: "Boutique share-to-win",
        description:
          "'Share our latest collection post to your timeline, get 15% off this weekend.' Tracked via post-share API.",
      },
    ],
    faqs: [
      {
        q: "Does Facebook still drive traffic to local businesses?",
        a: "Yes — especially for older demographics, parents, and community-driven categories like fitness, kids' activities, and home services. Facebook recommendations also feed Google's local pack signals.",
      },
      {
        q: "What's the difference between a review and a recommendation?",
        a: "Facebook replaced star ratings with thumbs-up Recommendations a few years ago. They're equivalent for trust, and most platforms still surface them in search.",
      },
      {
        q: "Can I reward check-ins?",
        a: "Yes — check-ins are a great low-friction action. Reward 10% off when they check in, doubling the perk if they include a photo.",
      },
      {
        q: "What about Facebook Groups?",
        a: "We support group-share campaigns for local community pages where it's allowed. We don't auto-post to groups — that's a fast way to get banned. Customers share willingly.",
      },
      {
        q: "Do I need a Facebook Ads account?",
        a: "No. Social Perks works on organic Facebook only. If you also run paid ads, we can layer in retargeting against perk-redeemers for higher ROAS.",
      },
    ],
  },
  {
    slug: "yelp",
    name: "Yelp",
    tagline: "Compliant Yelp review growth — without getting filtered.",
    color: "text-rose-400",
    accent: "from-rose-500/20 to-red-500/10",
    description:
      "Grow Yelp reviews compliantly with Social Perks. Avoid filters, stay within Yelp's terms, drive trust.",
    bullets: [
      "Soft-prompt customers (Yelp doesn't allow direct solicitation — we work within that).",
      "Use Yelp's 'check-in offers' instead of cash rewards for posting.",
      "Verify and respond to reviews from inside Social Perks.",
      "Monitor your filtered review rate and recommended review rate.",
      "Optimize the timing of customer touchpoints so reviews don't get caught by Yelp's filter.",
    ],
    steps: [
      "Connect your Yelp Business account.",
      "Set up check-in offers — the only Yelp-compliant way to incentivize visits.",
      "Customers check in, leave reviews on their own, and you respond automatically.",
    ],
    examples: [
      {
        title: "Restaurant check-in offer",
        description:
          "'Check in on Yelp, get a free dessert with any entrée.' Compliant with Yelp's terms.",
      },
      {
        title: "Salon post-service nudge",
        description:
          "A polite SMS 24 hours after the appointment thanking the customer, mentioning Yelp last, never asking directly.",
      },
    ],
    faqs: [
      {
        q: "Can I pay customers for Yelp reviews?",
        a: "No — Yelp prohibits any review-for-incentive arrangement, and their filter is aggressive. Social Perks works around this with check-in offers and soft post-visit prompts that don't violate Yelp's terms.",
      },
      {
        q: "Why are so many of my Yelp reviews 'not recommended'?",
        a: "Yelp's filter (Recommendation Software) hides reviews from accounts with few reviews, low activity, or signals of solicitation. Social Perks helps you time customer touchpoints to avoid triggering it.",
      },
      {
        q: "Is Yelp still worth caring about?",
        a: "In some categories, yes — especially restaurants, home services, auto repair, and beauty. In others (retail, fitness), Google Business Profile has eclipsed it.",
      },
      {
        q: "Can I respond to bad Yelp reviews?",
        a: "Yes, and you should. Social Perks drafts a reply that acknowledges the issue, offers to resolve it offline, and shows future readers that you care.",
      },
      {
        q: "What about Yelp Ads?",
        a: "Social Perks doesn't manage Yelp ad spend. If you run them separately, we'll surface the data alongside your organic metrics so you can see total ROI.",
      },
    ],
  },
  {
    slug: "youtube",
    name: "YouTube",
    tagline: "Long-form video reviews and demos from real customers — the highest-trust content on the internet.",
    color: "text-red-400",
    accent: "from-red-500/20 to-orange-500/10",
    description:
      "Drive YouTube reviews, demos, and shorts with Social Perks. Reward customers for long-form video content.",
    bullets: [
      "Reward customers for posting product reviews or unboxings on YouTube.",
      "Track YouTube Shorts as well as long-form video.",
      "Verify subscribers and view counts before payout.",
      "Higher perk tiers for videos that hit view milestones.",
      "FTC #ad and 'paid promotion' flag injected automatically in descriptions.",
    ],
    steps: [
      "Connect your YouTube channel for tracking.",
      "Customers post video, link it in Social Perks.",
      "Once verified and minimum view threshold hit, perk is released.",
    ],
    examples: [
      {
        title: "DTC product unboxing",
        description:
          "'Post a 60+ second YouTube review, get a $50 store credit at 1,000 views.'",
      },
      {
        title: "Gym member transformation",
        description:
          "'90-day transformation Short, tag the gym, get 3 months free at 5,000 views.'",
      },
    ],
    faqs: [
      {
        q: "Do reviewers need a big channel?",
        a: "No. Social Perks works best with everyday customers (50–5,000 subs). Their videos feel authentic and rank well for long-tail product queries.",
      },
      {
        q: "How do you handle view milestones?",
        a: "You set tiers — e.g. base reward at posting, bonus at 1K views, bigger bonus at 10K. We poll the YouTube API and release perks automatically.",
      },
      {
        q: "Does this work for service businesses?",
        a: "Yes — especially for home services, fitness, beauty, and food. 'A day with [business]' or 'I tried [service] for 30 days' format works very well.",
      },
      {
        q: "What about YouTube Shorts?",
        a: "Treated as a separate action type. Shorts have different view dynamics, so reward thresholds are typically 5–10× higher (10K, 50K, 100K views).",
      },
      {
        q: "Is FTC disclosure handled?",
        a: "Yes — every campaign brief tells the creator to add 'paid promotion' in the YouTube settings and #ad in the description. We can't enforce it, but we make it easy and remind them.",
      },
    ],
  },
  {
    slug: "twitter",
    name: "X (Twitter)",
    tagline: "Tweets, retweets, and quote-tweets from customers who actually care about your business.",
    color: "text-blue-300",
    accent: "from-blue-500/20 to-slate-500/10",
    description:
      "Run X (Twitter) campaigns with Social Perks. Drive tweets, retweets, and quote tweets from real customers.",
    bullets: [
      "Reward original tweets mentioning your handle or hashtag.",
      "Track quote tweets and retweets at different perk tiers.",
      "Auto-detect mentions and queue them for verification.",
      "Verify account age and follower realness before payout.",
      "Built-in FTC disclosure (#ad) for every campaign brief.",
    ],
    steps: [
      "Connect your X (Twitter) account.",
      "Set the action — tweet, quote tweet, or thread.",
      "Customers tweet, Social Perks verifies, perks are issued.",
    ],
    examples: [
      {
        title: "Coffee shop tweet-and-show",
        description:
          "'Tweet about your favorite drink with #brewofthemonth, show the tweet at the register, get $1 off.'",
      },
      {
        title: "B2B SaaS quote tweet",
        description:
          "'Quote tweet our launch with one thing you'd use it for, get a free month of Pro.'",
      },
    ],
    faqs: [
      {
        q: "Does Twitter still matter for local businesses?",
        a: "Less than it used to. Twitter (X) works best for B2B, tech, media, and creator-economy businesses. For most local brick-and-mortar, Instagram and Google drive more.",
      },
      {
        q: "How do you handle bots and fake accounts?",
        a: "We check account age, follower-to-following ratio, and recent activity. Brand-new accounts and bot-pattern accounts are auto-flagged for manual review.",
      },
      {
        q: "Can I reward threads, not just single tweets?",
        a: "Yes — threads are a higher-tier action with a bigger reward, since they take more effort and tend to get more reach.",
      },
      {
        q: "What's the verification process?",
        a: "We use Twitter's API to confirm the tweet exists, mentions your handle, and meets your criteria (length, hashtag, media). It's automatic.",
      },
      {
        q: "Will my customers actually tweet about me?",
        a: "Most won't unless you make it dead simple and worth their while. Social Perks' templates and one-tap share links solve both. Conversion rates are 8–15% on well-designed campaigns.",
      },
    ],
  },
  {
    slug: "pinterest",
    name: "Pinterest",
    tagline: "Pins from customers that drive search traffic for years, not days.",
    color: "text-red-400",
    accent: "from-red-500/20 to-pink-500/10",
    description:
      "Drive Pinterest pins and saves with Social Perks. Reward customers for creating boards and pinning your content.",
    bullets: [
      "Reward customers for pinning your products to their boards.",
      "Track saves, board adds, and outbound clicks.",
      "Run 'idea pin' campaigns (Pinterest's short video format).",
      "Verify pin metadata and audience reach before payout.",
      "FTC #ad disclosure auto-injected for every Pinterest campaign.",
    ],
    steps: [
      "Connect your Pinterest Business account.",
      "Set the action — pin, save, board create, or idea pin.",
      "Customers pin, Social Perks verifies, perk is issued.",
    ],
    examples: [
      {
        title: "Boutique inspiration board",
        description:
          "'Create a Pinterest board called 'My [Brand] Wishlist' with 10+ of our products, get 15% off your next order.'",
      },
      {
        title: "Bakery recipe pin",
        description:
          "'Pin our seasonal recipe to your food board, get a free pastry next visit.'",
      },
    ],
    faqs: [
      {
        q: "Is Pinterest worth marketing on in 2026?",
        a: "Absolutely — for visual, lifestyle, food, fashion, home, and DIY businesses. Pinterest traffic compounds: a single pin can drive search traffic for years.",
      },
      {
        q: "Do I need a Pinterest Business account?",
        a: "Yes, free to set up. Business accounts get analytics and API access; personal accounts don't.",
      },
      {
        q: "Can I reward saves vs. original pins?",
        a: "Both are separate action types in Social Perks. Original pins (the customer creates) are a higher tier than saving existing pins.",
      },
      {
        q: "What about Pinterest ads?",
        a: "We don't manage paid Pinterest spend, but you can layer Social Perks UGC on top of your ad creative for higher CTR.",
      },
      {
        q: "How long does it take to see results?",
        a: "Pinterest is slower than Instagram or TikTok at first, but pins keep delivering. Expect noticeable traffic lift in 60–90 days, accelerating after that.",
      },
    ],
  },
  {
    slug: "linkedin",
    name: "LinkedIn",
    tagline: "Employee and customer advocacy on LinkedIn — for B2B businesses and professional services.",
    color: "text-blue-400",
    accent: "from-blue-500/20 to-sky-500/10",
    description:
      "Run LinkedIn campaigns with Social Perks. Drive employee advocacy, customer testimonials, and recommendations.",
    bullets: [
      "Reward employees for sharing company posts (employee advocacy at scale).",
      "Drive customer LinkedIn recommendations and testimonials.",
      "Track post-shares, reactions, and comment engagement.",
      "Verify the poster's job title and company before payout (for B2B campaigns).",
      "Built-in disclosure language for paid promotions.",
    ],
    steps: [
      "Connect your LinkedIn Company Page.",
      "Set the action — post share, recommendation, or testimonial.",
      "Employees or customers post, Social Perks verifies, perks issued.",
    ],
    examples: [
      {
        title: "B2B SaaS employee advocacy",
        description:
          "'Share the launch post with your own take, earn $25 for every 100 reactions.'",
      },
      {
        title: "Consultancy client recommendation",
        description:
          "'Leave a LinkedIn recommendation describing the project, get a discount on your next engagement.'",
      },
    ],
    faqs: [
      {
        q: "Is LinkedIn worth it for local businesses?",
        a: "Mostly no — LinkedIn shines for B2B, professional services, consultancies, agencies, and recruiting. If your customers are businesses, yes. If they're consumers, focus elsewhere.",
      },
      {
        q: "Can I reward my employees for sharing posts?",
        a: "Yes — this is called employee advocacy and is one of the highest-ROI uses of LinkedIn. Just make sure the program is fully opt-in and doesn't pressure employees.",
      },
      {
        q: "How do you verify a LinkedIn recommendation?",
        a: "We use LinkedIn's API to confirm the recommendation was given, includes minimum content, and the giver has a real profile (not a spam account).",
      },
      {
        q: "What about LinkedIn Ads?",
        a: "We don't run paid ads. We do layer your UGC content into your ad team's creative library if they want to use it.",
      },
      {
        q: "Is there an FTC issue with employee advocacy?",
        a: "Employees should disclose their employment when posting about the company — this is standard. Social Perks adds a disclosure reminder to every brief.",
      },
    ],
  },
  {
    slug: "snapchat",
    name: "Snapchat",
    tagline: "Snap stories, lenses, and spotlight posts from your younger customers.",
    color: "text-yellow-400",
    accent: "from-yellow-500/20 to-amber-500/10",
    description:
      "Run Snapchat campaigns with Social Perks. Reward customers for snaps, stories, and Spotlight posts.",
    bullets: [
      "Reward customers for Snap stories featuring your business.",
      "Run lens-based campaigns with your branded AR filter.",
      "Track Spotlight posts (Snapchat's TikTok-style feed).",
      "Verify snap views and audience before payout.",
      "FTC disclosure included in every campaign brief.",
    ],
    steps: [
      "Connect your Snapchat for Business account.",
      "Set the action — story, lens use, or Spotlight.",
      "Customers post, Social Perks verifies, perk is issued.",
    ],
    examples: [
      {
        title: "Ice cream shop snap-and-show",
        description:
          "'Snap a story with our cone, show the cashier, get $1 off your next scoop.'",
      },
      {
        title: "College bar lens campaign",
        description:
          "'Use our custom Snapchat lens at the bar, post to your story, get a free drink.'",
      },
    ],
    faqs: [
      {
        q: "Who is Snapchat actually good for?",
        a: "Businesses targeting Gen Z and younger millennials — bars, restaurants near college campuses, gyms, dance studios, ice cream shops, fast casual.",
      },
      {
        q: "Do I need a custom lens?",
        a: "No, but it helps. A branded Snapchat lens costs $300–$1,500 to build and works for months. We can recommend lens studios.",
      },
      {
        q: "How do you verify a snap was actually posted?",
        a: "Snapchat's API is more limited than Instagram's. We verify Spotlight posts directly; for stories, we ask customers to share their story link or screenshot, then sample-verify.",
      },
      {
        q: "Is Snapchat still relevant in 2026?",
        a: "For specific demographics, yes — especially 13–24 year-olds and certain college markets. For everyone else, prioritize Instagram and TikTok.",
      },
      {
        q: "Can I run lens-based campaigns without paying for a custom lens?",
        a: "Yes — you can use Snapchat's existing community lenses and just track usage at your location.",
      },
    ],
  },
  {
    slug: "threads",
    name: "Threads",
    tagline: "Authentic text-based posts from customers on Meta's fast-growing platform.",
    color: "text-slate-300",
    accent: "from-slate-500/20 to-zinc-500/10",
    description:
      "Run Threads campaigns with Social Perks. Reward customers for authentic posts on Meta's text-first platform.",
    bullets: [
      "Reward customers for posts mentioning your handle or hashtag.",
      "Track replies and reposts at separate tiers.",
      "Auto-detect mentions via the Threads API.",
      "Verify account quality before payout.",
      "FTC disclosure (#ad) included in every brief.",
    ],
    steps: [
      "Connect your Threads account (linked to your Instagram).",
      "Set the action — original post, reply, or repost.",
      "Customers post, Social Perks verifies, perk is issued.",
    ],
    examples: [
      {
        title: "Coffee shop thread tag",
        description:
          "'Post your honest thoughts about our new oat latte on Threads, tag us, get your next one free.'",
      },
      {
        title: "Bookstore review thread",
        description:
          "'Post a 3-thread review of any book you bought from us this month, get a $10 store credit.'",
      },
    ],
    faqs: [
      {
        q: "Is Threads big enough to matter?",
        a: "It crossed 175M+ monthly users and is still growing. Adoption is highest among 25–44 year-olds who left or downsized Twitter. Worth running campaigns now while organic reach is still strong.",
      },
      {
        q: "Do I need a separate Threads account?",
        a: "Threads is tied to Instagram. If you have an Instagram account, you can activate Threads in a couple of taps.",
      },
      {
        q: "How does verification work?",
        a: "We use Meta's API (Threads shares the Graph API with Instagram). Mentions and tagged posts are auto-detected.",
      },
      {
        q: "Is the audience here actually buying?",
        a: "Yes — Threads users skew older and more affluent than Twitter, with better discussion quality. For most consumer businesses, conversion is on par with Instagram.",
      },
      {
        q: "Should I post on Threads myself first?",
        a: "Yes — campaigns work better when your brand is already active. Aim for 3–5 posts a week before launching a customer campaign.",
      },
    ],
  },
  {
    slug: "reddit",
    name: "Reddit",
    tagline: "Authentic posts and comments in niche subreddits — where buying decisions actually get made.",
    color: "text-orange-400",
    accent: "from-orange-500/20 to-red-500/10",
    description:
      "Run Reddit campaigns carefully and compliantly with Social Perks. Reward authentic posts and reviews.",
    bullets: [
      "Reward customers for honest reviews in relevant subreddits (where allowed).",
      "Track upvote counts and comment engagement as reward tiers.",
      "Aggressive disclosure handling — Reddit communities don't tolerate undisclosed promotion.",
      "Verify account age and karma before payout (we reject brand-new accounts).",
      "Built-in FTC disclosure language for every Reddit campaign brief.",
    ],
    steps: [
      "Connect Social Perks for Reddit campaign tracking.",
      "Pick the subreddits you're targeting and verify their self-promo rules.",
      "Customers post, Social Perks verifies, perk is issued with full disclosure.",
    ],
    examples: [
      {
        title: "DTC product genuine review",
        description:
          "'Post your honest review in r/[category], disclose you got the product free, get a $30 store credit.'",
      },
      {
        title: "Local restaurant /r/yourcity recommendation",
        description:
          "'If you'd genuinely recommend us in /r/[city], do it honestly with disclosure — get a free appetizer.'",
      },
    ],
    faqs: [
      {
        q: "Isn't Reddit hostile to brands?",
        a: "Reddit is hostile to inauthentic, undisclosed brand activity. It's actually fine with honest, disclosed customer reviews — many subreddits have explicit rules permitting them. The key is transparency.",
      },
      {
        q: "How do I avoid getting banned from subreddits?",
        a: "Read each subreddit's rules before campaigning. Most allow customer reviews if they're honest and disclosed. We help you screen subreddit rules during campaign setup.",
      },
      {
        q: "What's the disclosure language?",
        a: "Customers must clearly state they received the product or perk from your business. Our brief gives them exact wording. No exceptions.",
      },
      {
        q: "Can I reward upvotes?",
        a: "No — that's vote manipulation and is against Reddit's site-wide rules. You can reward for the post itself, regardless of how it performs.",
      },
      {
        q: "Is Reddit traffic actually valuable?",
        a: "Reddit posts rank very well in Google. A genuine, well-received post can drive search traffic for years. It's also where most buyers research before purchasing in tech, gaming, fitness, and DIY.",
      },
    ],
  },
];

export const INTEGRATION_BY_SLUG: Record<string, IntegrationPlatform> =
  Object.fromEntries(INTEGRATIONS.map((p) => [p.slug, p]));
