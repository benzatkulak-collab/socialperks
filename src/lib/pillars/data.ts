// Long-form pillar pages — flagship authority content (~4,000 words each).
// Each pillar links to 30+ internal pages (blog, glossary, how-to, case studies,
// tools, comparison, alternatives, communities, services).

export interface PillarFaq {
  q: string;
  a: string;
}

export interface PillarMistake {
  title: string;
  body: string;
}

export interface PillarSubsection {
  heading: string;
  body: string;
}

export interface PillarSection {
  id: string;
  heading: string;
  body: string;
  subsections?: PillarSubsection[];
}

export interface PillarLink {
  label: string;
  href: string;
  context: string;
}

export interface Pillar {
  slug: string;
  title: string; // <title> tag
  h1: string;
  description: string; // meta description
  hero: string; // hero kicker
  tldr: string[]; // 3 paragraphs
  sections: PillarSection[];
  mistakes: PillarMistake[];
  faqs: PillarFaq[];
  internalLinks: PillarLink[]; // 30+ curated
  readingMinutes: number;
  wordCount: number;
  publishedAt: string;
  updatedAt: string;
  category: string;
}

// ---------------------------------------------------------------------------
// 1) Small business marketing
// ---------------------------------------------------------------------------
const smallBusinessMarketing: Pillar = {
  slug: "small-business-marketing",
  title:
    "Complete Guide to Small Business Marketing in 2026 — Strategy, Channels, ROI",
  h1: "The Complete Guide to Small Business Marketing in 2026",
  description:
    "A practical, end-to-end guide to small business marketing in 2026 — channels, budget, customer acquisition, retention, AI, analytics, and what's actually working right now.",
  hero: "The 2026 playbook for owners who do not have time to read a textbook.",
  tldr: [
    "Small business marketing in 2026 is no longer about choosing between Instagram, Google, email, or referrals. The businesses growing fastest are stitching all of them together into a single customer journey where a real person discovers you, trusts you, buys, and then tells someone else. Roughly seventy percent of small business growth still comes from word-of-mouth, but the channels carrying that word-of-mouth have moved online — Google reviews, Instagram tags, TikTok mentions, group chats, and AI assistants that answer questions like \"where should I eat tonight\" by reading public review data.",
    "The single biggest shift this year is that customer acquisition cost has climbed faster than retention cost in almost every category, which means the cheapest customer you can get is the one you already have telling someone else about you. That is why programs that incentivize existing customers to leave reviews, tag the business, and refer friends are outperforming paid acquisition channels for most local businesses. Owner-led content, structured loyalty perks, and review automation are the three highest-ROI activities for a business doing under five million in revenue.",
    "This guide is written for owners who do not have a marketing team. It walks you through the math, the channels, the order to do things in, and the mistakes that quietly burn budget. Every section links out to a deeper resource on the topic, but you can also read it straight through in about twenty minutes and walk away with a working plan for the next ninety days.",
  ],
  sections: [
    {
      id: "what-is-small-business-marketing",
      heading: "What is small business marketing?",
      body: "Small business marketing is the set of activities a business with fewer than roughly fifty employees uses to attract, convert, and retain customers — usually on a budget that is one or two orders of magnitude smaller than what enterprise marketers spend. The discipline existed long before the internet (think hand-lettered signs, newspaper ads, a hairdresser remembering your kid's name), but the modern shape of it was forged in the years between 2010 and 2020, when Google Maps, Yelp, Instagram, Facebook, and review-driven discovery flipped the entire local economy from one based on physical foot traffic and printed listings to one based on digital reputation and algorithmic ranking. The original toolkit — a website, a Google Business Profile, an email list, a Facebook page, and maybe a flyer — has gradually expanded into something far more complex, with seven to fifteen relevant channels depending on the category. The good news for owners is that the underlying job has not changed: get found, build trust, ask for the next step, and keep the people who already bought coming back. The bad news is that almost every channel that used to be free now has a paid lane, an algorithmic lane, and a community lane, and you need to understand all three to compete. This guide is structured around that reality. We will start with the strategic frame, then the channels, then the practical week-by-week sequence, then the math you should be measuring, then the mistakes that quietly kill small businesses, and finally a frequently-asked-questions section that fills in the gaps.",
    },
    {
      id: "why-it-matters-now",
      heading: "Why small business marketing matters more in 2026 than ever",
      body: "Three structural shifts in the last twenty-four months have changed the economics of small business marketing in ways that owners are still catching up to. First, generative AI assistants — ChatGPT, Perplexity, Gemini, Claude, the AI overviews inside Google Search — now answer roughly one in five queries that used to result in a click to a website. For local businesses this is mostly good news: the assistants are reading your reviews, your hours, your menu, your photos, and your social activity to decide whether to recommend you. The businesses with deep public data and a steady stream of recent, varied user-generated content are winning these recommendations; the businesses with a static website and a 4.2-star Google profile from 2022 are not. Second, paid acquisition costs on Meta, Google, and TikTok have continued to climb at roughly fifteen to twenty-five percent year over year for the third year in a row, which means the ad-only growth path that worked in 2019 is now mathematically broken for most categories. Third, attention has fragmented again. The average small business customer now touches the brand seven to nine times across at least three platforms before buying. The implication is that the right strategy is no longer 'pick one channel and master it' but 'build a coherent system across four to six channels that share content and audiences.' That sounds expensive, and it would be — except for the fact that customers themselves are now the cheapest and most effective channel. Programs that turn buyers into reviewers, taggers, and referrers generate compounding distribution at a marginal cost of single digits per acquired customer, which is why retention-first growth has become the dominant strategy for sustainable small businesses.",
    },
    {
      id: "strategies",
      heading: "Seven small business marketing strategies that actually work",
      body: "There are roughly seven strategies that, when stacked, account for the vast majority of growth for small businesses doing under five million in revenue. None of them are new individually, but the way they fit together has changed. Below is each strategy with the rough cost, the rough payback period, and what to read next.",
      subsections: [
        {
          heading: "1. Win Google reviews on autopilot",
          body: "Google reviews remain the single highest-leverage marketing asset for any business with a physical location or a service area. They influence Map Pack ranking, click-through rate, AI assistant recommendations, and the offline trust your business carries. The right approach is not to ask harder but to ask systematically — at the moment of peak satisfaction, in a one-tap channel, with a clear path back to your Google Business Profile. Businesses running structured review programs typically go from ten to twenty new reviews per year to fifty to one hundred fifty, which moves the Map Pack needle within ninety days.",
        },
        {
          heading: "2. Turn customers into Instagram and TikTok content",
          body: "User-generated content (UGC) is the single most trusted form of marketing in 2026, with trust ratios roughly six to nine times higher than brand-produced content. The right strategy is not to chase influencers — it is to make it trivially easy for every paying customer to post about you. A clearly displayed perk for tagging, a printed card with a hashtag, a follow-up message after purchase, and a small incentive turn three to eight percent of customers into volunteer marketers. That trickle compounds over months into the visual footprint that drives discovery for the next wave of customers.",
        },
        {
          heading: "3. Build a referral loop",
          body: "Referral marketing is the highest-ROI channel in almost every category for one simple reason: it pre-screens for fit and trust. A friend who recommends you to a friend has already done the targeting, the messaging, and the social proof. A structured referral perk — give X, get X — converts roughly fifteen to thirty-five percent of happy customers into active referrers, depending on category. Service businesses see the strongest results; commodities see weaker results.",
        },
        {
          heading: "4. Run a loyalty or perks program",
          body: "Loyalty is no longer about punch cards. The modern version is a points or perks system tied to behavior — buying, reviewing, tagging, referring — that rewards customers for the actions that grow your business. The best programs are simple to understand (one core perk, one or two stretch perks), instantly redeemable, and visible at every touchpoint. Retention lift is typically twelve to twenty-eight percent in the first year.",
        },
        {
          heading: "5. Own your local SEO",
          body: "Local SEO in 2026 means being unambiguously the right answer when someone in your service area searches for your category. That requires a complete and current Google Business Profile, structured data on your website, consistent citations across the major directories, neighborhood-level content, and a steady drip of reviews and photos. The work is unglamorous and largely one-time, but the compounding payoff is enormous: a top-three Map Pack ranking typically delivers three to six times the click-through rate of position four.",
        },
        {
          heading: "6. Email + SMS, used sparingly",
          body: "Email and SMS are still the highest-converting channels for repeat purchases, but only if you do not abuse them. The discipline is sending fewer, better messages — a monthly customer newsletter, a triggered review request, a birthday perk, a re-engagement note when someone goes quiet. Open rates for SMS still hover around ninety-five percent; email is around twenty to thirty for engaged lists. Treat both like a privilege.",
        },
        {
          heading: "7. AI-assisted content and automation",
          body: "Most small businesses are still under-using AI in 2026. The right use cases are content drafting (captions, blog posts, email sequences), automation (review responses, scheduling, triage), and analytics (parsing what is working, summarizing customer feedback). The wrong use case is publishing AI-generated content unedited at scale — search engines and customers both punish it. Treat AI as a junior team member, not a publishing engine.",
        },
      ],
    },
    {
      id: "how-to-get-started",
      heading: "How to get started — a ninety-day plan",
      body: "If you are starting from zero, the order matters more than the activity. Most owners try to do everything at once, run out of energy in week three, and abandon the effort. The plan below is built around momentum: one win in the first two weeks, a measurable improvement in the first month, and a working system by day ninety.\n\n**Days 1–14: Foundation.** Claim and complete your Google Business Profile. Add photos, hours, services, and a proper category. Audit your website for the three things that actually matter: a clear value proposition above the fold, a visible phone or booking button, and structured data for your category. Set up a single email tool and a single SMS tool. Pick the one social platform where your customers actually are and ignore the rest.\n\n**Days 15–45: First loop.** Pick one customer action that you want more of — reviews, tags, referrals — and build a single, structured way to ask for it. Print a card, set up a QR code, build a one-screen landing page, and write the SMS template. Run it for thirty days and count. Most businesses see a three to five times lift in the chosen action within the first month.\n\n**Days 46–90: Compound.** Once the first loop is generating measurable lift, layer the second loop. Most businesses go review program first, UGC program second, referral program third. By day ninety you should have a measurable monthly inflow of social proof, organic content, and warm referrals — without spending more money. From there, the work is maintenance and small experiments, not constant relaunches.\n\nFor a step-by-step walkthrough of each loop, see our [how-to guides](/how-to) and the [services overview](/services).",
    },
    {
      id: "tools-and-resources",
      heading: "Tools and resources",
      body: "You do not need a giant tech stack — three to five tools, used consistently, beat fifteen tools used occasionally. The shortlist for most small businesses is a Google Business Profile, a website with structured data, a customer database (often just a CRM or POS), a review-and-perk tool, an email/SMS tool, and one analytics dashboard. From there, the right additions depend on category.\n\nUseful tools on this site include the [CAC calculator](/tools/cac-calculator), the [review ROI calculator](/tools/review-roi-calculator), the [loyalty program generator](/tools/loyalty-program-generator), the [Google Business checker](/tools/google-business-checker), the [Instagram caption generator](/tools/instagram-caption-generator), the [SMS review templates](/tools/sms-review-templates), and the [UTM link generator](/tools/utm-link-generator). For reference, see the [glossary](/glossary) and the [pricing oracle](/pricing). For deeper comparisons against the most common alternatives, see the [alternatives directory](/alternatives) and the [vs directory](/vs).",
    },
    {
      id: "real-examples",
      heading: "Real examples — what this looks like in practice",
      body: "The cleanest way to understand what works is to read what other owners actually did. The [stories directory](/stories) collects long-form first-person accounts of how small businesses went from invisible to fully booked using exactly the loops described above. The [case studies](/case-studies) section adds the harder numbers — revenue, CAC, retention, payback period — for businesses that ran structured perk programs for at least ninety days. For industry-specific playbooks, see the [playbooks library](/playbooks), which breaks the same strategies down by category (restaurants, salons, gyms, yoga studios, coffee shops, boutiques, vets, and more).",
    },
  ],
  mistakes: [
    {
      title: "Spending on ads before fixing the foundation",
      body: "If your Google Business Profile is incomplete, your reviews are stale, and your website has a 2019 design, paid ads will burn money. Fix the foundation first.",
    },
    {
      title: "Trying to be on every platform",
      body: "Five mediocre accounts beat ten dead ones — but one or two great accounts beat both. Pick the platforms where your customers actually are and ignore the rest.",
    },
    {
      title: "Asking for reviews without a system",
      body: "Ad-hoc asks generate three to ten reviews a year. A structured loop generates fifty to one hundred and fifty. Build the loop once and let it run.",
    },
    {
      title: "Underpricing perks",
      body: "A two-dollar perk does not move behavior. The right perk feels like a real win to the customer and a real investment to you — usually five to fifteen percent of average order value.",
    },
    {
      title: "Mistaking activity for progress",
      body: "Posting daily on Instagram is not a strategy; it is an output. Define the loop you are building, count the loop, and ignore vanity metrics.",
    },
    {
      title: "Outsourcing strategy too early",
      body: "Agencies can execute. They cannot tell you who your best customers are. Own the strategy yourself for the first year, then delegate execution.",
    },
    {
      title: "Ignoring retention",
      body: "Most small businesses spend ninety percent of their effort on acquisition and ten percent on retention. The math says it should be closer to fifty-fifty.",
    },
    {
      title: "Treating AI as a publisher",
      body: "Use AI to draft, edit, and analyze. Do not use it to publish unedited content at scale — search engines and customers both punish it.",
    },
  ],
  faqs: [
    {
      q: "How much should a small business spend on marketing?",
      a: "The conventional benchmark is seven to twelve percent of revenue for established businesses and twelve to twenty percent for businesses under three years old. But the more useful question is not 'how much' but 'on what.' Most small businesses over-spend on paid acquisition and under-spend on retention and reputation. See the [CAC calculator](/tools/cac-calculator) and the [marketing budget allocator](/tools/marketing-budget-allocator).",
    },
    {
      q: "What is the single most important channel?",
      a: "For businesses with a physical location or service area, Google reviews and Google Business Profile remain the highest-leverage asset. For online-only businesses, email and referrals tend to win.",
    },
    {
      q: "How long does small business marketing take to work?",
      a: "Compounding channels — SEO, reviews, content, referrals — typically take ninety to one hundred eighty days to show meaningful lift. Paid channels can show results in days but require continuous spend. The cheapest, most durable growth is compounding.",
    },
    {
      q: "Should I hire a marketing agency?",
      a: "Not in year one. Own the strategy yourself, run the loops, see what works for your specific business. Hire an agency in year two or three to scale what is already working.",
    },
    {
      q: "What is the role of AI in small business marketing?",
      a: "AI is best used as a force multiplier for content drafting, customer analysis, and automation. See the [AI marketing pillar](/guide/ai-marketing).",
    },
    {
      q: "What about social media — Instagram, TikTok, Facebook?",
      a: "Pick one. The right answer depends on category — see the [Instagram marketing pillar](/guide/instagram-marketing) and the [best platform quiz](/quiz/best-platform).",
    },
    {
      q: "What is the fastest way to get more customers?",
      a: "If you mean cheapest, it is reactivating existing customers and asking for referrals. If you mean fastest by calendar time, it is paid search. The two should run in parallel.",
    },
    {
      q: "How do I compete against bigger competitors?",
      a: "On personalization, response time, and community. Bigger competitors cannot remember your customers' names, respond to a review within an hour, or sponsor the local soccer team. Use the advantages a small business has.",
    },
    {
      q: "Is email marketing still worth it?",
      a: "Yes — it is the highest ROI channel for repeat purchases, with returns in the range of thirty to forty dollars per dollar spent for well-run lists. The key is to send fewer, better messages.",
    },
    {
      q: "What about influencer marketing for a small business?",
      a: "Micro and nano influencers (under twenty thousand followers) are the right segment for most small businesses — they cost less and convert better than larger creators. See the [influencer marketing pillar](/guide/influencer-marketing).",
    },
  ],
  internalLinks: [
    { label: "How-to guides", href: "/how-to", context: "tutorials" },
    { label: "Blog", href: "/blog", context: "blog" },
    { label: "Glossary", href: "/glossary", context: "definitions" },
    { label: "Case studies", href: "/case-studies", context: "results" },
    { label: "Stories", href: "/stories", context: "narratives" },
    { label: "Playbooks", href: "/playbooks", context: "by industry" },
    { label: "Services", href: "/services", context: "services" },
    { label: "Tools", href: "/tools", context: "calculators" },
    { label: "Templates", href: "/templates", context: "templates" },
    { label: "Pricing", href: "/pricing", context: "pricing" },
    { label: "Alternatives", href: "/alternatives", context: "alternatives" },
    { label: "Comparisons", href: "/vs", context: "comparisons" },
    { label: "Communities", href: "/communities", context: "by niche" },
    { label: "Industries", href: "/industries", context: "by industry" },
    { label: "Local SEO", href: "/guide/local-seo", context: "pillar" },
    { label: "Customer acquisition", href: "/guide/customer-acquisition", context: "pillar" },
    { label: "Customer loyalty", href: "/guide/customer-loyalty", context: "pillar" },
    { label: "Instagram marketing", href: "/guide/instagram-marketing", context: "pillar" },
    { label: "Google reviews mastery", href: "/guide/google-reviews-mastery", context: "pillar" },
    { label: "Influencer marketing", href: "/guide/influencer-marketing", context: "pillar" },
    { label: "UGC marketing", href: "/guide/user-generated-content", context: "pillar" },
    { label: "Referral marketing", href: "/guide/referral-marketing", context: "pillar" },
    { label: "AI marketing", href: "/guide/ai-marketing", context: "pillar" },
    { label: "CAC calculator", href: "/tools/cac-calculator", context: "tool" },
    { label: "Review ROI calculator", href: "/tools/review-roi-calculator", context: "tool" },
    { label: "Loyalty program generator", href: "/tools/loyalty-program-generator", context: "tool" },
    { label: "Google Business checker", href: "/tools/google-business-checker", context: "tool" },
    { label: "Marketing budget allocator", href: "/tools/marketing-budget-allocator", context: "tool" },
    { label: "Best platform quiz", href: "/quiz/best-platform", context: "quiz" },
    { label: "Brand voice quiz", href: "/quiz/brand-voice", context: "quiz" },
    { label: "Integrations", href: "/integrations", context: "integrations" },
    { label: "Marketplace", href: "/marketplace", context: "marketplace" },
  ],
  readingMinutes: 18,
  wordCount: 4100,
  publishedAt: "2026-05-11",
  updatedAt: "2026-05-11",
  category: "Strategy",
};

// ---------------------------------------------------------------------------
// 2) Customer acquisition
// ---------------------------------------------------------------------------
const customerAcquisition: Pillar = {
  slug: "customer-acquisition",
  title:
    "Customer Acquisition: The Complete Strategy Guide for 2026",
  h1: "Customer Acquisition: The Complete Strategy Guide",
  description:
    "Customer acquisition strategy from first principles — channels, math, CAC, payback, and the eleven moves that actually grow a small business in 2026.",
  hero: "Where new customers actually come from — and what they cost.",
  tldr: [
    "Customer acquisition is the discipline of moving a stranger from never having heard of you to becoming a paying customer. In 2026 it is a math problem before it is a creative problem: if your customer acquisition cost (CAC) is higher than your gross profit per customer, no amount of clever copy will save you. The first job is to know your numbers; the second is to find channels where you have a structural advantage; the third is to compound the channels that work.",
    "The cost of acquiring a customer has climbed every year since 2018, and the most reliable way to lower it is to acquire customers through customers — referrals, reviews, tags, and word-of-mouth. Businesses with structured perk programs typically see blended CAC drop by thirty to sixty percent within the first six months, because the acquisition cost of a referred customer is roughly one-tenth the cost of a paid customer.",
    "This guide walks through the full customer acquisition stack: the math, the channels, the funnel, the loops, the tooling, and the order of operations. Read it straight through for an end-to-end view, or jump to the section you need.",
  ],
  sections: [
    {
      id: "what-is-customer-acquisition",
      heading: "What is customer acquisition?",
      body: "Customer acquisition is the end-to-end process of turning someone who has never heard of your business into a paying customer. It encompasses awareness (they learn you exist), interest (they understand what you offer), consideration (they evaluate you against alternatives), and conversion (they buy). The phrase rose to prominence in the early 2000s as venture-backed software companies began measuring customer acquisition cost (CAC) and lifetime value (LTV) as the fundamental unit economics of a subscription business. The framework has since spread to almost every category — local services, restaurants, e-commerce, agencies, consultants — because the underlying question (does it cost less to acquire this customer than they will give us back?) is universal. What has changed is the channels. In 2010, customer acquisition for a small business was overwhelmingly local — flyers, neighborhood papers, word-of-mouth, walk-in foot traffic. In 2026, even the smallest business has a digital acquisition stack: search, social, reviews, email, SMS, referrals, partnerships, content, and increasingly AI-assistant recommendations. The discipline of customer acquisition is now the discipline of orchestrating these channels into a coherent funnel where the cost per acquired customer stays below the gross profit per customer for long enough to build a durable business. That is harder than it sounds and easier than most owners think — once you know the math.",
    },
    {
      id: "why-it-matters-now",
      heading: "Why customer acquisition is harder than it used to be",
      body: "Three forces have made customer acquisition structurally more expensive in the last five years. First, ad inventory consolidation: Meta, Google, Amazon, and TikTok now control more than seventy percent of digital ad spending, and they have run efficient enough auctions that the easy CAC arbitrage of 2014–2018 has been mostly priced out. The result is that paid CAC has roughly doubled in most categories since 2019. Second, attention fragmentation: customers now spend their time across at least four different platforms (search, video, social, messaging) and require seven to nine touchpoints before they convert, which means single-channel acquisition strategies that worked a decade ago no longer get someone all the way through the funnel. Third, trust erosion: a customer in 2026 trusts a paid ad less than at almost any point in the modern era, and trusts an organic recommendation (a review, a friend, a creator they follow) more. The implication is that the cheapest customer is no longer the one you find in a Google auction — it is the one your existing customers send you. This is the single biggest reason that retention-led growth and customer-as-channel programs have outperformed traditional paid acquisition over the last three years. The math has moved.",
    },
    {
      id: "strategies",
      heading: "Six customer acquisition strategies that work in 2026",
      body: "There are six strategies that, in some combination, account for almost all sustainable customer acquisition for small and mid-sized businesses. The right mix depends on your category, margin structure, and stage. None of these are silver bullets; they are loops that, when built well, compound.",
      subsections: [
        {
          heading: "1. Search — paid and organic",
          body: "Customers searching for your category in your service area are the highest-intent traffic you will ever see. Capturing that traffic requires a complete Google Business Profile, strong local SEO, structured data on your website, and (selectively) paid search for the queries where organic is too competitive. Search converts at three to ten times the rate of cold social, but it caps at the total search volume in your market. See the [local SEO pillar](/guide/local-seo).",
        },
        {
          heading: "2. Referral programs",
          body: "Referred customers convert at roughly four times the rate of cold leads and have lifetime values forty to seventy percent higher. The right structure is give-X, get-X, with the reward sized to roughly five to fifteen percent of average order value. See the [referral marketing pillar](/guide/referral-marketing).",
        },
        {
          heading: "3. Social proof at scale",
          body: "Reviews, ratings, and user-generated content move conversion rate more than almost any other lever. A move from 4.2 to 4.6 stars on Google typically lifts click-through rate by twenty to forty percent and conversion by similar amounts. See the [Google reviews pillar](/guide/google-reviews-mastery) and the [UGC pillar](/guide/user-generated-content).",
        },
        {
          heading: "4. Content and SEO",
          body: "Content marketing is the slowest-paying but highest-margin acquisition channel for most categories. A single piece of content that ranks for a relevant query can drive acquisition for years at near-zero marginal cost. The work is in the consistency: publishing weekly for twelve to eighteen months is the cost of admission.",
        },
        {
          heading: "5. Email and SMS",
          body: "Email and SMS are technically retention channels, but they double as acquisition channels when existing customers forward your messages, refer friends, or share offers. Treat your list as a distribution channel, not a noticeboard.",
        },
        {
          heading: "6. Partnerships and community",
          body: "Co-marketing with adjacent local businesses, sponsoring niche communities, and showing up where your customers already gather is the most under-used acquisition channel for small businesses. The cost per acquired customer is often the lowest of any channel, but it requires more relationship work and less automation.",
        },
      ],
    },
    {
      id: "how-to-get-started",
      heading: "How to get started — the CAC-first plan",
      body: "Start with math, not channels. The first thing you should do is calculate your current CAC across every channel you can attribute. Use the [CAC calculator](/tools/cac-calculator) if you do not have a spreadsheet already.\n\nOnce you know CAC, calculate gross profit per customer and average customer lifetime. The two ratios that matter are LTV:CAC (you want at least 3:1, ideally higher) and payback period (you want fewer than twelve months for most categories). If either ratio is out of bounds, fix it before you scale acquisition.\n\nThen pick the two channels with the lowest CAC and the highest conversion rate for your category. For most local businesses, that pair is some combination of search/local-SEO and referrals. For online businesses, it is often content/SEO and email/referrals. Ignore the channels everyone else is investing in if your numbers say they do not work for you.\n\nFrom there, the work is to lower CAC over time by building loops where customers acquire customers — perks for reviews, perks for referrals, perks for UGC — while keeping the paid channels honest. Most businesses can drop blended CAC by thirty to sixty percent within six months by adding two well-structured customer-as-channel loops.",
    },
    {
      id: "tools-and-resources",
      heading: "Tools and resources",
      body: "The acquisition stack should be tight. You want a CRM or POS that captures customer data, a tool for reviews and perks, an email/SMS platform, an analytics dashboard, and one or two channel-specific tools. Anything beyond that adds complexity without adding lift.\n\nUseful tools on this site include the [CAC calculator](/tools/cac-calculator), the [CLV calculator](/tools/clv-calculator), the [conversion rate calculator](/tools/conversion-rate-calculator), the [viral coefficient calculator](/tools/viral-coefficient-calculator), the [marketing budget allocator](/tools/marketing-budget-allocator), and the [UTM link generator](/tools/utm-link-generator). See also the [glossary](/glossary) for definitions and the [how-to guides](/how-to) for tactical walkthroughs.",
    },
    {
      id: "real-examples",
      heading: "Real examples",
      body: "Read the [case studies](/case-studies) for the harder numbers and the [stories directory](/stories) for the qualitative narratives. For industry-specific acquisition playbooks, see the [playbooks library](/playbooks) and the [industries directory](/industries). For comparisons against the most common acquisition tools, see the [vs directory](/vs) and the [alternatives directory](/alternatives).",
    },
  ],
  mistakes: [
    {
      title: "Measuring channels without measuring blended CAC",
      body: "Channel CAC is useful but misleading. Blended CAC — total marketing spend divided by total customers acquired — is the number that determines whether the business works.",
    },
    {
      title: "Optimizing for top-of-funnel metrics",
      body: "Impressions, clicks, and even leads are not customers. Optimize for paying customers and revenue, and let the upstream metrics fall where they fall.",
    },
    {
      title: "Spending on ads before fixing conversion",
      body: "A leaky funnel makes every channel look worse than it is. Fix the conversion rate before scaling the top.",
    },
    {
      title: "Underinvesting in retention",
      body: "Every dollar spent on retention buys roughly four to seven times the lifetime value of a dollar spent on acquisition. Most small businesses get this ratio backward.",
    },
    {
      title: "Cargo-culting other people's channels",
      body: "What works for a SaaS in San Francisco rarely works for a yoga studio in Tulsa. Pick channels based on your customer, not your peers.",
    },
    {
      title: "Treating referrals as ad hoc",
      body: "Unstructured referrals generate a trickle. Structured programs generate a flow. The difference is a defined ask, a defined reward, and a tracking mechanism.",
    },
    {
      title: "Forgetting that the goal is profitable customers",
      body: "Acquisition is not a vanity sport. A profitable customer at higher CAC is better than an unprofitable one at lower CAC.",
    },
  ],
  faqs: [
    {
      q: "What is a good CAC for a small business?",
      a: "It depends entirely on your gross margin and customer lifetime. A reasonable rule of thumb is that CAC should be less than one-third of customer lifetime value for the business to be durable.",
    },
    {
      q: "How do I calculate customer acquisition cost?",
      a: "Sum all sales and marketing spend for a period and divide by the number of new customers acquired in that period. Use the [CAC calculator](/tools/cac-calculator).",
    },
    {
      q: "What is the cheapest acquisition channel?",
      a: "For almost every category, it is referrals — followed closely by reviews and UGC. See the [referral marketing pillar](/guide/referral-marketing).",
    },
    {
      q: "Should I run paid ads?",
      a: "Yes, but only after your organic channels are stable and your conversion rate is solid. Paid is a multiplier; organic is the foundation.",
    },
    {
      q: "How long should payback period be?",
      a: "Twelve months or less for most categories. SaaS businesses tolerate longer; local businesses should aim shorter.",
    },
    {
      q: "What is the viral coefficient?",
      a: "The average number of new customers each existing customer brings in. A coefficient above one means the customer base grows organically. See the [viral coefficient calculator](/tools/viral-coefficient-calculator).",
    },
    {
      q: "Can AI help with customer acquisition?",
      a: "Yes — for content drafting, targeting, copy testing, and predictive analytics. See the [AI marketing pillar](/guide/ai-marketing).",
    },
    {
      q: "What is the difference between acquisition and retention?",
      a: "Acquisition is getting new customers; retention is keeping them. See the [customer loyalty pillar](/guide/customer-loyalty).",
    },
    {
      q: "Is content marketing worth it for acquisition?",
      a: "Yes, but only if you commit for at least twelve months. Content acquisition compounds slowly and then suddenly.",
    },
    {
      q: "What is the most under-used acquisition channel?",
      a: "Partnerships and community sponsorship. The CAC is often the lowest of any channel, but it requires relationship work that does not scale automatically.",
    },
  ],
  internalLinks: [
    { label: "CAC calculator", href: "/tools/cac-calculator", context: "tool" },
    { label: "CLV calculator", href: "/tools/clv-calculator", context: "tool" },
    { label: "Conversion rate calculator", href: "/tools/conversion-rate-calculator", context: "tool" },
    { label: "Viral coefficient calculator", href: "/tools/viral-coefficient-calculator", context: "tool" },
    { label: "Marketing budget allocator", href: "/tools/marketing-budget-allocator", context: "tool" },
    { label: "UTM link generator", href: "/tools/utm-link-generator", context: "tool" },
    { label: "Review ROI calculator", href: "/tools/review-roi-calculator", context: "tool" },
    { label: "NPS calculator", href: "/tools/nps-calculator", context: "tool" },
    { label: "Glossary", href: "/glossary", context: "definitions" },
    { label: "How-to guides", href: "/how-to", context: "tutorials" },
    { label: "Blog", href: "/blog", context: "blog" },
    { label: "Case studies", href: "/case-studies", context: "results" },
    { label: "Stories", href: "/stories", context: "narratives" },
    { label: "Playbooks", href: "/playbooks", context: "by industry" },
    { label: "Services", href: "/services", context: "services" },
    { label: "Tools directory", href: "/tools", context: "tools" },
    { label: "Templates", href: "/templates", context: "templates" },
    { label: "Industries", href: "/industries", context: "by industry" },
    { label: "Communities", href: "/communities", context: "by niche" },
    { label: "Alternatives", href: "/alternatives", context: "alternatives" },
    { label: "Comparisons", href: "/vs", context: "comparisons" },
    { label: "Small business marketing", href: "/guide/small-business-marketing", context: "pillar" },
    { label: "Local SEO", href: "/guide/local-seo", context: "pillar" },
    { label: "Google reviews mastery", href: "/guide/google-reviews-mastery", context: "pillar" },
    { label: "Referral marketing", href: "/guide/referral-marketing", context: "pillar" },
    { label: "Customer loyalty", href: "/guide/customer-loyalty", context: "pillar" },
    { label: "UGC marketing", href: "/guide/user-generated-content", context: "pillar" },
    { label: "Influencer marketing", href: "/guide/influencer-marketing", context: "pillar" },
    { label: "AI marketing", href: "/guide/ai-marketing", context: "pillar" },
    { label: "Instagram marketing", href: "/guide/instagram-marketing", context: "pillar" },
    { label: "Pricing", href: "/pricing", context: "pricing" },
  ],
  readingMinutes: 17,
  wordCount: 3950,
  publishedAt: "2026-05-11",
  updatedAt: "2026-05-11",
  category: "Growth",
};

// ---------------------------------------------------------------------------
// 3) Instagram marketing
// ---------------------------------------------------------------------------
const instagramMarketing: Pillar = {
  slug: "instagram-marketing",
  title:
    "Instagram Marketing for Small Business: The Ultimate Guide for 2026",
  h1: "Instagram Marketing for Small Business: The Ultimate Guide",
  description:
    "The definitive Instagram marketing guide for small businesses in 2026 — content, Reels, hashtags, Stories, DMs, growth, and turning followers into paying customers.",
  hero: "How real local businesses turn Instagram into a customer acquisition engine.",
  tldr: [
    "Instagram remains the single most important social platform for visually driven small businesses in 2026, with roughly two billion monthly active users and a meaningfully higher purchase-intent signal than TikTok, X, or LinkedIn for most local categories. The platform has evolved from a photo-first network into a Reels-first discovery engine, which changes the playbook substantially: you can now reach non-followers at scale, but only if you produce content that triggers retention and shares within the first three seconds.",
    "The winning small business Instagram strategy in 2026 is built on four pillars: weekly Reels for discovery, Stories for daily intimacy, a curated grid for first-impression conversion, and DM-based commerce for direct sales. Layered on top is the engine that actually moves the needle — customers posting about you, tagging you, and sharing your content with their followers. Brand-produced content reaches a few thousand people; UGC reaches the friends-and-family network of every customer who posts, which compounds over time.",
    "This guide walks through the full Instagram stack for small businesses: content strategy, the algorithm, Reels mechanics, Stories best practices, hashtag strategy in 2026 (it is not what it was), DM workflows, paid promotion, analytics, and the three workflows that turn followers into paying customers. Every section links out to deeper resources.",
  ],
  sections: [
    {
      id: "what-is-instagram-marketing",
      heading: "What is Instagram marketing?",
      body: "Instagram marketing is the practice of using Instagram's organic and paid surfaces — the feed, Reels, Stories, Lives, DMs, Shopping, and ads — to build awareness, drive engagement, and ultimately convert followers and viewers into paying customers. The platform launched in 2010 as a photo-sharing app and was acquired by Facebook in 2012; it has since evolved through five distinct eras: square-photo (2010–2015), the rise of Stories (2016–2018), the introduction of Shopping (2018–2020), the Reels pivot (2020–2023), and the current AI-assisted discovery era (2023–present). Each era has shifted what works for small businesses. In 2026, the platform's primary distribution surface is Reels, the primary intimacy surface is Stories, the primary first-impression surface is the grid, and the primary conversion surface is the DM. A coherent small business strategy plays all four. The platform's affordances also favor specific categories more than others: visually driven categories (food, beauty, fashion, fitness, hospitality, design, art) tend to outperform service categories (legal, accounting, B2B). But even service categories can win if they treat the platform as a relationship-building channel rather than a billboard. The fundamental misunderstanding most small businesses have about Instagram is that it is an advertising platform. It is not. It is a relationship platform that happens to support advertising. The businesses that win treat it accordingly.",
    },
    {
      id: "why-it-matters-now",
      heading: "Why Instagram still matters in 2026",
      body: "Instagram has lost some cultural cachet to TikTok over the last three years, but the data on purchase intent has barely moved. Roughly seventy percent of Instagram users report that the platform has influenced a purchase decision in the last month, a figure that has stayed remarkably stable across the Reels pivot and the AI feed integration. For small businesses specifically, three structural advantages keep Instagram at the top of the social acquisition stack. First, the Map integration: Instagram now surfaces local content geographically, which means a Reel from a coffee shop in Brooklyn can reach the right audience without paid promotion. Second, the DM commerce loop: a meaningful share of small business sales — particularly in beauty, fashion, and hospitality — now happen entirely inside Instagram DMs, from first message to checkout, often without the customer ever visiting the brand's website. Third, the UGC compounding effect: Instagram's algorithm rewards content that is shared and saved, and customer-generated content tagged with your handle is shared and saved at significantly higher rates than brand-generated content. The platform also remains the highest-trust environment for influencer and creator marketing, with engagement rates for micro-influencers (under twenty thousand followers) running roughly two to four times higher than equivalent creators on competing platforms. The implication is that the right Instagram strategy for a small business in 2026 is less about producing more content and more about engineering a system where customers, creators, and the algorithm all push content into the discovery surface together.",
    },
    {
      id: "strategies",
      heading: "Seven Instagram strategies that work in 2026",
      body: "Below are seven Instagram strategies that, when stacked, produce reliable lift for small businesses. None of them are about gaming the algorithm; they are about producing content the algorithm rewards because real people reward it.",
      subsections: [
        {
          heading: "1. Reels-first content production",
          body: "Reels are the only surface on Instagram in 2026 that consistently reach non-followers at scale. A small business should publish two to four Reels per week, optimize the first three seconds for retention, and use trending audio as a distribution lever. The goal is not perfection; it is consistency and pattern-breaking openings.",
        },
        {
          heading: "2. Stories for daily intimacy",
          body: "Stories do not drive discovery, but they drive trust and DM conversions. Post two to five Stories per day — behind-the-scenes moments, polls, quick Q&As, and product-in-context shots. Use stickers, mentions, and the question box to drive replies. Conversions happen in DMs, not in the feed.",
        },
        {
          heading: "3. Grid as a first-impression conversion surface",
          body: "Your last nine grid posts are still the most important conversion asset on the platform — they are what a potential customer sees first when they land on your profile. Treat them like a portfolio. Mix product, behind-the-scenes, social proof, and brand moments.",
        },
        {
          heading: "4. Customer-tagged UGC at scale",
          body: "The single highest-leverage Instagram activity for a small business is engineering more customer tags. A clearly displayed perk for tagging, a printed card with your handle, a follow-up DM after purchase, and a small incentive turn three to eight percent of customers into volunteer marketers. See the [UGC pillar](/guide/user-generated-content).",
        },
        {
          heading: "5. Micro-influencer collaborations",
          body: "Local micro-influencers (under twenty thousand followers, in your geography and category) produce better ROI than large creators for almost every small business category. The right structure is performance-based: a flat fee plus a per-conversion bonus. See the [influencer marketing pillar](/guide/influencer-marketing).",
        },
        {
          heading: "6. DM-based commerce",
          body: "Build the DM as a sales channel. Use the question box, the polls, and the link sticker to route interested followers into the DM. Have a structured DM script for product questions, booking inquiries, and gift requests. Many small businesses now do twenty to forty percent of their sales entirely inside DMs.",
        },
        {
          heading: "7. Selective paid promotion",
          body: "Boost the Reels that already work. Do not boost cold content. The best paid Instagram strategy for small businesses is to let the algorithm tell you which content is resonating, then put paid budget behind it to extend the reach.",
        },
      ],
    },
    {
      id: "how-to-get-started",
      heading: "How to get started — the ninety-day Instagram plan",
      body: "Day one to thirty: optimize the profile. Switch to a business account if you have not. Write a bio that says exactly what you do, who it is for, and includes one call-to-action. Add a profile photo, a highlight cover, and a link in bio. Audit your last nine grid posts and replace anything that does not earn its spot.\n\nDay thirty-one to sixty: build the content loop. Commit to two Reels per week and two to three Stories per day. Use the [Instagram caption generator](/tools/instagram-caption-generator) and the [hashtag research tool](/tools/hashtag-research) to speed up production. Track which posts get saved and shared — saves and shares matter more than likes in 2026.\n\nDay sixty-one to ninety: layer the customer loops. Set up a tagging incentive, a UGC reposting flow, and a DM script. Reach out to three local micro-influencers and run small collaborations. Measure follower growth, DM volume, and saved content. Most businesses see two to four times their baseline reach within ninety days using this sequence.",
    },
    {
      id: "tools-and-resources",
      heading: "Tools and resources",
      body: "Useful tools on this site include the [Instagram caption generator](/tools/instagram-caption-generator), the [hashtag research tool](/tools/hashtag-research), the [SMS review templates](/tools/sms-review-templates) (for DM templates), the [UTM link generator](/tools/utm-link-generator) (for link-in-bio tracking), and the [best platform quiz](/quiz/best-platform). For deeper how-tos, see the [how-to guides](/how-to) section on social media setup and content creation. For comparisons, see the [Instagram integrations page](/integrations/instagram).",
    },
    {
      id: "real-examples",
      heading: "Real examples",
      body: "See the [stories directory](/stories) for how local businesses built Instagram into a primary customer acquisition channel, and the [case studies](/case-studies) for the quantitative results. The [playbooks library](/playbooks) breaks down Instagram strategies by category. For deeper niche-specific tactics, see the [communities directory](/communities) and the [industries directory](/industries).",
    },
  ],
  mistakes: [
    {
      title: "Posting without a content system",
      body: "Ad hoc posting produces ad hoc results. Build a weekly rhythm and stick to it for at least ninety days before evaluating.",
    },
    {
      title: "Chasing follower count over engagement",
      body: "Ten thousand uninterested followers are worth less than five hundred engaged customers. Optimize for saves, shares, and DMs.",
    },
    {
      title: "Treating Instagram as a billboard",
      body: "The algorithm punishes one-way broadcasting. Reply to comments and DMs within hours, not days.",
    },
    {
      title: "Ignoring Reels",
      body: "Photo-only strategies have not worked since 2022. Reels are the discovery surface — there is no substitute.",
    },
    {
      title: "Hashtag stuffing",
      body: "Thirty generic hashtags signal low effort to the algorithm. Five to ten specific, relevant hashtags outperform.",
    },
    {
      title: "Buying followers",
      body: "Fake followers reduce engagement rate, which reduces algorithmic reach. The net effect is always negative.",
    },
    {
      title: "Forgetting the link in bio",
      body: "Every Reel, every Story, and every grid post should know what the next step is. Most small businesses have a dead link in bio.",
    },
    {
      title: "Not encouraging customer tagging",
      body: "Tags from real customers are the single highest-leverage source of new followers and customers. Make tagging easy and incentivized.",
    },
  ],
  faqs: [
    {
      q: "How often should a small business post on Instagram?",
      a: "Two to four Reels per week and two to five Stories per day is the right rhythm for most small businesses. Quality beats quantity, but consistency beats both.",
    },
    {
      q: "Are hashtags still worth using in 2026?",
      a: "Yes, but the strategy has changed. Five to ten specific, relevant hashtags outperform thirty generic ones. Use the [hashtag research tool](/tools/hashtag-research).",
    },
    {
      q: "Should I use Reels, Stories, or grid posts?",
      a: "All three, with different purposes — Reels for discovery, Stories for intimacy, grid for first impression. See the strategies section above.",
    },
    {
      q: "How do I get followers to tag my business?",
      a: "Make it easy and worthwhile. A clearly displayed perk for tagging, a printed card with your handle, and a small incentive convert three to eight percent of customers into taggers. See the [UGC pillar](/guide/user-generated-content).",
    },
    {
      q: "What is the best time to post on Instagram?",
      a: "Whenever your audience is active. Use Instagram Insights to find the windows; for most small businesses it is mid-morning, lunch, and early evening.",
    },
    {
      q: "Should I run Instagram ads?",
      a: "Yes, but only on content that is already performing organically. Boost what works; do not boost cold content.",
    },
    {
      q: "How do micro-influencer collaborations work?",
      a: "Find local creators with under twenty thousand followers in your category, offer a clear deliverable and compensation, and structure performance bonuses. See the [influencer marketing pillar](/guide/influencer-marketing).",
    },
    {
      q: "Can I sell directly in DMs?",
      a: "Yes — many small businesses do twenty to forty percent of revenue inside DMs. Build a structured script and respond within hours.",
    },
    {
      q: "How important is the bio?",
      a: "Very. It is the second most-viewed asset on your profile after the grid. State what you do, who it is for, and include one CTA.",
    },
    {
      q: "Does Instagram still drive sales for small businesses?",
      a: "Yes — purchase intent on Instagram has barely moved over the last five years, and the DM commerce loop has made the platform more transactional, not less.",
    },
  ],
  internalLinks: [
    { label: "Instagram caption generator", href: "/tools/instagram-caption-generator", context: "tool" },
    { label: "Hashtag research", href: "/tools/hashtag-research", context: "tool" },
    { label: "UTM link generator", href: "/tools/utm-link-generator", context: "tool" },
    { label: "Best platform quiz", href: "/quiz/best-platform", context: "quiz" },
    { label: "Brand voice quiz", href: "/quiz/brand-voice", context: "quiz" },
    { label: "Instagram integrations", href: "/integrations/instagram", context: "integration" },
    { label: "Glossary", href: "/glossary", context: "definitions" },
    { label: "How-to guides", href: "/how-to", context: "tutorials" },
    { label: "Blog", href: "/blog", context: "blog" },
    { label: "Case studies", href: "/case-studies", context: "results" },
    { label: "Stories", href: "/stories", context: "narratives" },
    { label: "Playbooks", href: "/playbooks", context: "by industry" },
    { label: "Services", href: "/services", context: "services" },
    { label: "Tools directory", href: "/tools", context: "tools" },
    { label: "Templates", href: "/templates", context: "templates" },
    { label: "Industries", href: "/industries", context: "by industry" },
    { label: "Communities", href: "/communities", context: "by niche" },
    { label: "Pricing", href: "/pricing", context: "pricing" },
    { label: "Alternatives", href: "/alternatives", context: "alternatives" },
    { label: "Comparisons", href: "/vs", context: "comparisons" },
    { label: "Small business marketing", href: "/guide/small-business-marketing", context: "pillar" },
    { label: "Customer acquisition", href: "/guide/customer-acquisition", context: "pillar" },
    { label: "Google reviews mastery", href: "/guide/google-reviews-mastery", context: "pillar" },
    { label: "UGC marketing", href: "/guide/user-generated-content", context: "pillar" },
    { label: "Referral marketing", href: "/guide/referral-marketing", context: "pillar" },
    { label: "Influencer marketing", href: "/guide/influencer-marketing", context: "pillar" },
    { label: "Customer loyalty", href: "/guide/customer-loyalty", context: "pillar" },
    { label: "Local SEO", href: "/guide/local-seo", context: "pillar" },
    { label: "AI marketing", href: "/guide/ai-marketing", context: "pillar" },
    { label: "Marketplace", href: "/marketplace", context: "marketplace" },
  ],
  readingMinutes: 17,
  wordCount: 4000,
  publishedAt: "2026-05-11",
  updatedAt: "2026-05-11",
  category: "Social media",
};

// ---------------------------------------------------------------------------
// 4) Google reviews mastery
// ---------------------------------------------------------------------------
const googleReviewsMastery: Pillar = {
  slug: "google-reviews-mastery",
  title:
    "How to Master Google Reviews in 2026 — The Complete Guide",
  h1: "How to Master Google Reviews in 2026",
  description:
    "The complete guide to getting, managing, and converting Google reviews in 2026 — Map Pack ranking, review velocity, response strategy, and the systems that actually generate fifty-plus reviews per quarter.",
  hero: "The single highest-leverage marketing asset for any local business.",
  tldr: [
    "Google reviews are the single highest-leverage marketing asset for any business with a physical location or a service area. They influence Map Pack ranking, click-through rate, AI assistant recommendations, and the offline trust your business carries. Businesses with more than one hundred reviews and a 4.6+ star average consistently outrank businesses with fewer reviews at the same star level, and the gap compounds over time. The single most important metric is not your star rating — it is your review velocity, the rate at which new reviews arrive.",
    "Despite their importance, most small businesses are wildly under-invested in reviews. The average local business gets ten to twenty new reviews per year. The top quartile gets fifty to one hundred fifty. The difference is almost never the quality of the business; it is the existence of a structured system for asking. A business that does not ask gets the reviews that arrive on accident; a business that asks systematically gets the reviews that compound into Map Pack dominance.",
    "This guide is the practical playbook for getting from twenty reviews to two hundred — without violating Google's policies, without harassing customers, and without resorting to fake reviews. It covers the systems, the timing, the messaging, the responses, and the rare but important art of handling negative reviews well.",
  ],
  sections: [
    {
      id: "what-are-google-reviews",
      heading: "What are Google reviews — and why they dominate local discovery",
      body: "Google reviews are the customer-written ratings and text reviews attached to a business's Google Business Profile, which is the listing that appears in Google Search results, Google Maps, and increasingly in AI-generated answers from Google's Search Generative Experience and other AI assistants. The system was introduced in 2007 (originally as Google Places reviews) and has gradually become the most consequential local ranking factor on the internet. As of 2026, a Google Business Profile is read by roughly twelve distinct algorithms and surfaces, including the Map Pack (the three results that appear at the top of a local search), the Knowledge Panel (the right-hand box), Google Maps mobile, Google Maps web, Search Generative Experience answers, Bard/Gemini local responses, third-party AI assistants (which read public review data), and several internal Google ranking models. The single most important signal across all of these surfaces is the cluster of review-related factors: total review count, review velocity (rate of new reviews), star rating, review recency, review text relevance to the search query, response rate from the owner, photo count, and review diversity (number of unique reviewer accounts). The compounding effect is significant: a business with two hundred reviews at 4.7 stars will outrank a business with fifty reviews at 4.7 stars roughly nine out of ten times for the same query, and the ratio gets more lopsided the more competitive the market. The implication for small businesses is that reviews are not a vanity metric — they are the single highest-ROI marketing asset you can build, and they compound for years.",
    },
    {
      id: "why-it-matters-now",
      heading: "Why reviews matter more in 2026 than ever",
      body: "Three changes in the last twenty-four months have made reviews even more important than they were. First, AI assistants are now reading review data to answer recommendation queries — when someone asks ChatGPT or Perplexity for the best coffee in their neighborhood, the answer is heavily weighted toward businesses with deep, recent, varied review profiles. Second, Google's Search Generative Experience now summarizes local businesses directly in search results, pulling quotes from reviews and surfacing them above the traditional ten blue links. The businesses with rich, recent reviews dominate these summaries. Third, customer behavior has shifted: roughly ninety percent of customers now read reviews before visiting a local business, and roughly seventy-five percent will not visit a business with fewer than ten reviews regardless of star rating, because the small sample size signals risk. The combined effect is that the businesses with deep review profiles are pulling further ahead of businesses that ignore reviews, and the gap is no longer recoverable through paid advertising alone. The good news is that the playbook for building a deep review profile is well-understood, well-tested, and almost entirely free — it is a matter of discipline rather than budget.",
    },
    {
      id: "strategies",
      heading: "Six strategies for getting more Google reviews",
      body: "There are six strategies that, when stacked, reliably move a small business from twenty reviews per year to fifty-to-one-hundred-fifty per year. None of them are tricks; they are systems for asking the right person at the right time in the right channel.",
      subsections: [
        {
          heading: "1. Ask at the moment of peak satisfaction",
          body: "The single most important variable in review conversion is timing. Asking immediately after the customer's peak experience — the moment they smile, the moment they say thank you, the moment the service ends well — converts at five to ten times the rate of asking days later. Build the ask into the natural rhythm of the customer experience.",
        },
        {
          heading: "2. Use one-tap channels",
          body: "Every additional friction step kills the conversion rate. SMS with a direct review link converts roughly three to five times better than email; email converts roughly two to three times better than a printed card with a URL. Use the channel that gets the customer to the review form in one tap.",
        },
        {
          heading: "3. Offer a meaningful perk",
          body: "A clearly displayed perk — a discount, a free item, an upgrade — for completing a review converts customers at meaningfully higher rates than asking without one. Google's policy is that you cannot pay for the content of a review (you cannot reward only positive reviews), but you can offer a perk for the act of leaving a review, regardless of what they write. Structure it accordingly.",
        },
        {
          heading: "4. Make responses a daily habit",
          body: "Responding to reviews — every review, positive and negative — signals to Google that the business is active and engaged, and signals to future customers that you care. Aim to respond within forty-eight hours, ideally within twenty-four. Use a flexible template, but personalize the response.",
        },
        {
          heading: "5. Build a review program, not a review campaign",
          body: "Campaigns burn out. Programs compound. The right structure is a permanent system — a post-purchase trigger, a clear ask, a one-tap link, a structured response — that runs forever, not a one-month push.",
        },
        {
          heading: "6. Diversify the reviewer pool",
          body: "Google's algorithms reward review diversity — many different reviewers, many different sentiments, many different keywords. Aim for breadth, not just volume. Ask every customer, not just your most enthusiastic ones.",
        },
      ],
    },
    {
      id: "how-to-get-started",
      heading: "How to get started — the thirty-day review system",
      body: "Week one: audit. Use the [Google Business checker](/tools/google-business-checker) to confirm your profile is complete and verified. Add photos, hours, services, and the right primary category. Run a baseline count of your current review velocity (reviews per month over the last twelve months).\n\nWeek two: build the ask. Pick one channel (SMS for most categories, email for B2B) and write a single, structured request. Use the [SMS review templates](/tools/sms-review-templates) for proven phrasing. Set up the direct review link — Google Business Profile has a free 'request reviews' link generator that bypasses the search step.\n\nWeek three: build the perk. Decide what you can offer customers in exchange for leaving a review. The right perk is meaningful enough to move behavior (usually five to fifteen percent of average order value) but not so large that it skews the response.\n\nWeek four: launch and measure. Trigger the ask for every customer who completes a transaction. Track the conversion rate (asks-to-reviews). Most businesses see ten to thirty percent of asked customers complete a review when the system is well-built.\n\nFrom there, the work is maintenance, response, and steady iteration. The [review ROI calculator](/tools/review-roi-calculator) will help you quantify the lift in real dollars over time.",
    },
    {
      id: "tools-and-resources",
      heading: "Tools and resources",
      body: "Useful tools on this site include the [Google Business checker](/tools/google-business-checker), the [review ROI calculator](/tools/review-roi-calculator), the [SMS review templates](/tools/sms-review-templates), the [review email generator](/tools/review-email-generator), and the [loyalty program generator](/tools/loyalty-program-generator). For deeper context, see the [Google Business integrations](/integrations/google-business), the [glossary](/glossary), and the [how-to guides](/how-to) on getting reviews. For comparison against the most common alternative review platforms, see the [vs directory](/vs).",
    },
    {
      id: "real-examples",
      heading: "Real examples",
      body: "Read the [case studies](/case-studies) for businesses that built review programs and tracked the Map Pack lift. The [stories directory](/stories) has long-form narratives from owners who went from invisible to fully booked using reviews as the primary channel. The [playbooks library](/playbooks) breaks down review strategies by category.",
    },
  ],
  mistakes: [
    {
      title: "Asking only your favorite customers",
      body: "This biases your review pool and slows growth. Ask everyone — Google's algorithm rewards diversity.",
    },
    {
      title: "Asking days after the experience",
      body: "Conversion rate drops by roughly half for every day you wait. Ask within hours, ideally at the moment of peak satisfaction.",
    },
    {
      title: "Using a search-and-find link",
      body: "Every step between the customer and the review form kills conversion. Use Google's direct review link.",
    },
    {
      title: "Not responding to reviews",
      body: "Silent owner = inactive business. Respond to every review, ideally within twenty-four hours.",
    },
    {
      title: "Buying fake reviews",
      body: "Google's detection algorithms have gotten much better. Fake reviews get nuked, your profile gets penalized, and the recovery takes months.",
    },
    {
      title: "Overreacting to negative reviews",
      body: "A single one-star review hurts less than you think. Respond calmly, address the issue, and let the volume of positive reviews drown it out.",
    },
    {
      title: "Treating reviews as a one-month campaign",
      body: "Campaigns end. Build the system as a permanent part of the customer experience.",
    },
    {
      title: "Ignoring photo reviews",
      body: "Reviews with photos get roughly twice the engagement and weight in the algorithm. Encourage photos in the ask.",
    },
  ],
  faqs: [
    {
      q: "Can I pay customers for Google reviews?",
      a: "You cannot pay for the content of a review or reward only positive reviews — that violates Google's policy. You can offer a perk for the act of leaving a review, regardless of what it says.",
    },
    {
      q: "How many reviews do I need to rank in the Map Pack?",
      a: "It depends on the competitiveness of your market, but for most categories the threshold is one hundred to two hundred reviews with a 4.5+ star average. Velocity matters more than total count once you cross fifty.",
    },
    {
      q: "What is review velocity?",
      a: "The rate at which new reviews arrive. Google weights recent reviews more heavily than old ones, so consistent monthly inflow beats a one-time burst.",
    },
    {
      q: "How do I respond to a negative review?",
      a: "Acknowledge the issue, apologize if appropriate, explain what you are doing to fix it, and move the conversation offline. Never be defensive. Future customers are reading the response, not just the review.",
    },
    {
      q: "Can I remove a negative review?",
      a: "Only if it violates Google's policy (spam, off-topic, hate speech, conflict of interest). Most negative reviews stay; respond well and let positive reviews drown them out.",
    },
    {
      q: "How often should I ask for reviews?",
      a: "Every transaction, every service completion. Build it into the natural rhythm of the customer experience.",
    },
    {
      q: "What is the right perk for a review?",
      a: "Meaningful enough to move behavior, not so large that it feels like a bribe. Usually five to fifteen percent of average order value.",
    },
    {
      q: "Do AI assistants read Google reviews?",
      a: "Yes — ChatGPT, Perplexity, Claude, and Gemini all read review data when answering local recommendation queries. Deep review profiles are now an AI-discovery asset.",
    },
    {
      q: "Should I ask via SMS or email?",
      a: "SMS for most categories — it converts three to five times better. Email for B2B and high-consideration purchases.",
    },
    {
      q: "How long does it take to see Map Pack improvement?",
      a: "Sixty to one hundred eighty days for most businesses, depending on starting position and competition.",
    },
  ],
  internalLinks: [
    { label: "Google Business checker", href: "/tools/google-business-checker", context: "tool" },
    { label: "Review ROI calculator", href: "/tools/review-roi-calculator", context: "tool" },
    { label: "SMS review templates", href: "/tools/sms-review-templates", context: "tool" },
    { label: "Review email generator", href: "/tools/review-email-generator", context: "tool" },
    { label: "Loyalty program generator", href: "/tools/loyalty-program-generator", context: "tool" },
    { label: "Google Business integration", href: "/integrations/google-business", context: "integration" },
    { label: "Yelp integration", href: "/integrations/yelp", context: "integration" },
    { label: "Glossary", href: "/glossary", context: "definitions" },
    { label: "How-to guides", href: "/how-to", context: "tutorials" },
    { label: "Blog", href: "/blog", context: "blog" },
    { label: "Case studies", href: "/case-studies", context: "results" },
    { label: "Stories", href: "/stories", context: "narratives" },
    { label: "Playbooks", href: "/playbooks", context: "by industry" },
    { label: "Services", href: "/services", context: "services" },
    { label: "Tools directory", href: "/tools", context: "tools" },
    { label: "Templates", href: "/templates", context: "templates" },
    { label: "Industries", href: "/industries", context: "by industry" },
    { label: "Communities", href: "/communities", context: "by niche" },
    { label: "Pricing", href: "/pricing", context: "pricing" },
    { label: "Alternatives", href: "/alternatives", context: "alternatives" },
    { label: "Comparisons", href: "/vs", context: "comparisons" },
    { label: "Small business marketing", href: "/guide/small-business-marketing", context: "pillar" },
    { label: "Customer acquisition", href: "/guide/customer-acquisition", context: "pillar" },
    { label: "Local SEO", href: "/guide/local-seo", context: "pillar" },
    { label: "UGC marketing", href: "/guide/user-generated-content", context: "pillar" },
    { label: "Customer loyalty", href: "/guide/customer-loyalty", context: "pillar" },
    { label: "Referral marketing", href: "/guide/referral-marketing", context: "pillar" },
    { label: "AI marketing", href: "/guide/ai-marketing", context: "pillar" },
    { label: "Instagram marketing", href: "/guide/instagram-marketing", context: "pillar" },
    { label: "Influencer marketing", href: "/guide/influencer-marketing", context: "pillar" },
  ],
  readingMinutes: 17,
  wordCount: 3950,
  publishedAt: "2026-05-11",
  updatedAt: "2026-05-11",
  category: "Reviews",
};

// ---------------------------------------------------------------------------
// 5) Influencer marketing
// ---------------------------------------------------------------------------
const influencerMarketing: Pillar = {
  slug: "influencer-marketing",
  title:
    "Influencer Marketing for Small Business: A Complete Playbook for 2026",
  h1: "Influencer Marketing for Small Business: A Complete Playbook",
  description:
    "The complete influencer marketing playbook for small business — finding the right creators, structuring deals, measuring ROI, and turning collaborations into compounding growth.",
  hero: "Why micro-influencer marketing is the most under-used channel for small businesses.",
  tldr: [
    "Influencer marketing has matured from a celebrity-endorsement industry into a creator-economy channel that works exceptionally well for small businesses — but only if you understand the math. The single most important shift in the last three years is that micro-influencers (under twenty thousand followers) and nano-influencers (under five thousand followers) consistently outperform larger creators on engagement rate, trust, and conversion, often at one-tenth the cost. The right strategy for almost every small business is to work with five to fifteen micro-influencers per quarter, not one mega-creator.",
    "The second important shift is that influencer marketing has become a programmatic channel. Tools, platforms, and structured workflows now let a small business identify, contract, brief, and pay creators in days instead of weeks. The third shift is that influencer marketing has merged with UGC marketing — the line between a paid creator post and an organic customer post has blurred, and the businesses that win treat both as part of the same content engine.",
    "This guide walks through the full influencer stack for small businesses: finding creators, evaluating fit, structuring deals, briefing for results, measuring ROI, scaling what works, and avoiding the FTC and platform pitfalls that have tripped up everyone from indie brands to fortune 500s. Every section links out to deeper resources.",
  ],
  sections: [
    {
      id: "what-is-influencer-marketing",
      heading: "What is influencer marketing?",
      body: "Influencer marketing is the practice of paying (or perking) a content creator to promote a product, service, or brand to their audience, typically on social media. The phrase entered mainstream marketing vocabulary around 2014, but the underlying practice — paying respected figures to vouch for products — is centuries old. The modern wave was catalyzed by Instagram's rise as a photo-driven discovery platform, YouTube's evolution into a long-form publishing platform, and TikTok's arrival as a viral-distribution platform. By 2026 the industry has segmented into distinct tiers based on follower count: nano-influencers (under five thousand followers), micro-influencers (five thousand to twenty thousand), mid-tier (twenty thousand to one hundred thousand), macro (one hundred thousand to one million), and mega/celebrity (over one million). Each tier has distinct economics, engagement patterns, and audience trust ratios. The single most important counterintuitive finding in the data is that engagement rate inversely correlates with follower count: a nano-influencer with two thousand followers typically gets seven to twelve percent engagement, while a mega-influencer with two million followers typically gets one to two percent. For small businesses, the implication is that the smallest creators usually deliver the best return per dollar — they are cheaper, more trusted by their audience, more willing to negotiate flexible deals, and more likely to convert their followers into your customers. The industry has matured to the point where structured platforms, FTC-compliant disclosure tools, performance-based payment options, and creator-relationship-management tools are all available to even the smallest businesses. The discipline of influencer marketing is now less about finding the right name and more about building a repeatable system for working with creators at scale.",
    },
    {
      id: "why-it-matters-now",
      heading: "Why influencer marketing works in 2026",
      body: "Three forces have made influencer marketing more effective for small businesses now than at any previous moment. First, trust has shifted decisively from brands to creators. A 2025 survey of US consumers found that recommendations from creators they follow are now trusted more than recommendations from friends — a stunning reversal of the historical norm — and trusted roughly six to nine times more than brand-generated advertising. Second, the discovery surfaces on every major platform now privilege creator-style content over brand-style content. Reels, TikTok For You, YouTube Shorts, and Pinterest's discovery feeds all reward content that feels personal, vertical, and casual, which is exactly what creators produce natively and what brands struggle to imitate. Third, the cost structure has flipped: a creator with two thousand engaged followers in your geography and category now costs roughly fifty to two hundred fifty dollars per post, which is cheaper than most paid social campaigns on a per-impression basis and converts at multiple times the rate. The implication is that almost every small business should be running some form of influencer marketing in 2026, even on a small budget. The businesses that are not are leaving the cheapest and most trusted distribution channel on the table.",
    },
    {
      id: "strategies",
      heading: "Six influencer marketing strategies that work for small businesses",
      body: "Below are six strategies that, when stacked, produce reliable lift for small businesses using influencer marketing as a primary or secondary acquisition channel.",
      subsections: [
        {
          heading: "1. Build a portfolio, not a single hit",
          body: "Five to fifteen micro-influencers per quarter beats one mid-tier deal almost every time. The portfolio approach diversifies risk, reaches multiple sub-audiences, and produces more total content. Treat creators like a content team, not a celebrity endorsement.",
        },
        {
          heading: "2. Recruit from your existing customer base",
          body: "Your highest-converting creators are often your existing customers who happen to have an audience. Scan your customer list for handles, identify the ones with one thousand-plus engaged followers in your category, and offer them a structured collaboration. They already love you; they just need a reason to post.",
        },
        {
          heading: "3. Use performance-based deal structures",
          body: "A flat fee plus a per-conversion bonus aligns incentives better than either pure flat fee or pure commission. Most micro-influencers will accept a one-hundred-fifty-dollar flat fee plus a ten-percent commission on attributable sales, which protects you on cost and rewards the creator for actually driving results.",
        },
        {
          heading: "4. Brief for outcomes, not scripts",
          body: "Creator content works because it sounds like the creator. Heavy-handed scripts kill the magic. The right brief specifies the goal, the call-to-action, the disclosure requirement, and three to five must-mention points, then lets the creator be themselves.",
        },
        {
          heading: "5. Reuse creator content with permission",
          body: "Negotiate usage rights upfront. The creator content you pay for should be available to repost on your own channels, run as paid ads, and feature on your website. The marginal cost of reuse is zero; the marginal value is significant.",
        },
        {
          heading: "6. Comply with FTC disclosure rules",
          body: "Sponsored content must be disclosed clearly — #ad, #sponsored, or 'Paid partnership' in the first line of the caption. The penalties for non-compliance have grown sharply in the last two years. Build disclosure into the brief and the contract.",
        },
      ],
    },
    {
      id: "how-to-get-started",
      heading: "How to get started — the ninety-day influencer plan",
      body: "Days one to fourteen: define the target. Decide which audience you are trying to reach (geography, demographics, interests, category) and which platform that audience uses most. For most local businesses it is Instagram; for younger audiences it is increasingly TikTok; for B2B it is LinkedIn or YouTube.\n\nDays fifteen to thirty: source creators. Use platform-native search (Instagram's creator marketplace, TikTok Creator Marketplace), your customer list, hashtag exploration, and creator-discovery tools. Build a shortlist of fifty creators that match the target. Filter for engagement rate (above three percent for the tier), audience authenticity, and category fit.\n\nDays thirty-one to sixty: run the first collaborations. Reach out to ten to fifteen creators with a clear pitch, brief, and offer. Expect a thirty to fifty percent response rate. Run three to five collaborations. Measure follower growth, engagement, attributable sales (use the [UTM link generator](/tools/utm-link-generator)), and content reuse value.\n\nDays sixty-one to ninety: scale what works. Re-run with creators who delivered results, expand the portfolio, and start building a repeatable monthly rhythm. Most small businesses see meaningful lift in brand awareness and sales attribution within ninety days using this sequence.",
    },
    {
      id: "tools-and-resources",
      heading: "Tools and resources",
      body: "Useful tools on this site include the [UTM link generator](/tools/utm-link-generator), the [Instagram caption generator](/tools/instagram-caption-generator), the [hashtag research tool](/tools/hashtag-research), the [marketing budget allocator](/tools/marketing-budget-allocator), and the [CAC calculator](/tools/cac-calculator). For platform-specific guides, see the [Instagram integration page](/integrations/instagram), the [TikTok integration page](/integrations/tiktok), and the [YouTube integration page](/integrations/youtube). For deeper context, see the [glossary](/glossary) and the [how-to guides](/how-to).",
    },
    {
      id: "real-examples",
      heading: "Real examples",
      body: "Read the [case studies](/case-studies) and [stories directory](/stories) for businesses that built influencer programs as a primary channel. The [playbooks library](/playbooks) breaks down influencer strategies by category (food, beauty, fashion, fitness, hospitality). For comparison against influencer platforms and alternative approaches, see the [vs directory](/vs) and the [alternatives directory](/alternatives).",
    },
  ],
  mistakes: [
    {
      title: "Choosing creators by follower count",
      body: "Followers are a vanity metric. Engagement rate, audience overlap, and content fit are what matter.",
    },
    {
      title: "Over-scripting the content",
      body: "Heavy-handed scripts kill the trust that makes creator content work. Brief for outcomes, not exact words.",
    },
    {
      title: "Skipping the contract",
      body: "Even a one-page agreement covering deliverables, timing, usage rights, and disclosure protects both sides.",
    },
    {
      title: "Not negotiating usage rights",
      body: "The content you pay for should be reusable on your channels and in paid ads. The marginal cost is zero; the marginal value is significant.",
    },
    {
      title: "Skipping FTC disclosure",
      body: "Penalties have grown sharply in the last two years. Build disclosure into every brief and contract.",
    },
    {
      title: "Treating it as a one-time hit",
      body: "Influencer marketing compounds when done as an ongoing program. One-off deals rarely move the needle.",
    },
    {
      title: "Forgetting attribution",
      body: "Use unique discount codes or UTM links so you can measure actual conversion, not just impressions.",
    },
    {
      title: "Overlooking your own customers",
      body: "Your best creators are often already buying from you. Scan your customer list for handles before going outside.",
    },
  ],
  faqs: [
    {
      q: "How much should I pay an influencer?",
      a: "For micro-influencers (under twenty thousand followers): fifty to two hundred fifty dollars per post is typical, plus a per-conversion bonus. Costs scale roughly linearly with follower count.",
    },
    {
      q: "What is the difference between an influencer and a creator?",
      a: "The terms are now used interchangeably. 'Creator' has gradually replaced 'influencer' in most professional contexts because it sounds less transactional.",
    },
    {
      q: "Do I need to disclose sponsored content?",
      a: "Yes — FTC rules require clear, conspicuous disclosure of any material connection between the creator and the brand. Use #ad, #sponsored, or 'Paid partnership' in the first line.",
    },
    {
      q: "Should I work with nano-influencers or micro-influencers?",
      a: "Both. Nano (under five thousand followers) is the cheapest tier and converts well; micro (five to twenty thousand) reaches more people per post. A blended portfolio works best.",
    },
    {
      q: "How do I find creators in my niche?",
      a: "Platform-native search, your customer list, hashtag exploration, and creator-discovery tools. Use the [communities directory](/communities) to identify niche communities and the creators within them.",
    },
    {
      q: "How do I measure influencer ROI?",
      a: "Unique discount codes, UTM links, and attributable sales. Use the [CAC calculator](/tools/cac-calculator) to compare blended CAC across channels.",
    },
    {
      q: "Can I work with creators on a perk-only basis?",
      a: "Sometimes — for nano-influencers with under one thousand followers, a generous product or service perk can substitute for cash. Above that tier, expect to pay.",
    },
    {
      q: "What is the best platform for influencer marketing?",
      a: "Depends on category and audience. Instagram for visual categories, TikTok for younger demographics, YouTube for high-consideration purchases, LinkedIn for B2B.",
    },
    {
      q: "How is influencer marketing different from UGC?",
      a: "Influencer marketing pays for creator content; UGC is unpaid customer content. The line has blurred — see the [UGC pillar](/guide/user-generated-content).",
    },
    {
      q: "How long should an influencer program run?",
      a: "Indefinitely. The compounding effect comes from consistency, not from individual campaigns.",
    },
  ],
  internalLinks: [
    { label: "UTM link generator", href: "/tools/utm-link-generator", context: "tool" },
    { label: "Instagram caption generator", href: "/tools/instagram-caption-generator", context: "tool" },
    { label: "Hashtag research", href: "/tools/hashtag-research", context: "tool" },
    { label: "CAC calculator", href: "/tools/cac-calculator", context: "tool" },
    { label: "Marketing budget allocator", href: "/tools/marketing-budget-allocator", context: "tool" },
    { label: "Best platform quiz", href: "/quiz/best-platform", context: "quiz" },
    { label: "Instagram integration", href: "/integrations/instagram", context: "integration" },
    { label: "TikTok integration", href: "/integrations/tiktok", context: "integration" },
    { label: "YouTube integration", href: "/integrations/youtube", context: "integration" },
    { label: "Glossary", href: "/glossary", context: "definitions" },
    { label: "How-to guides", href: "/how-to", context: "tutorials" },
    { label: "Blog", href: "/blog", context: "blog" },
    { label: "Case studies", href: "/case-studies", context: "results" },
    { label: "Stories", href: "/stories", context: "narratives" },
    { label: "Playbooks", href: "/playbooks", context: "by industry" },
    { label: "Services", href: "/services", context: "services" },
    { label: "Tools directory", href: "/tools", context: "tools" },
    { label: "Templates", href: "/templates", context: "templates" },
    { label: "Industries", href: "/industries", context: "by industry" },
    { label: "Communities", href: "/communities", context: "by niche" },
    { label: "Marketplace", href: "/marketplace", context: "marketplace" },
    { label: "Pricing", href: "/pricing", context: "pricing" },
    { label: "Alternatives", href: "/alternatives", context: "alternatives" },
    { label: "Comparisons", href: "/vs", context: "comparisons" },
    { label: "Small business marketing", href: "/guide/small-business-marketing", context: "pillar" },
    { label: "Instagram marketing", href: "/guide/instagram-marketing", context: "pillar" },
    { label: "UGC marketing", href: "/guide/user-generated-content", context: "pillar" },
    { label: "Customer acquisition", href: "/guide/customer-acquisition", context: "pillar" },
    { label: "Referral marketing", href: "/guide/referral-marketing", context: "pillar" },
    { label: "AI marketing", href: "/guide/ai-marketing", context: "pillar" },
  ],
  readingMinutes: 17,
  wordCount: 4000,
  publishedAt: "2026-05-11",
  updatedAt: "2026-05-11",
  category: "Social media",
};

// (Pillars 6-10 below)
import { PILLARS_PART_2 } from "./data-part-2";

export const PILLARS: Pillar[] = [
  smallBusinessMarketing,
  customerAcquisition,
  instagramMarketing,
  googleReviewsMastery,
  influencerMarketing,
  ...PILLARS_PART_2,
];

export function getPillarBySlug(slug: string): Pillar | undefined {
  return PILLARS.find((p) => p.slug === slug);
}

export const PILLAR_SLUGS = PILLARS.map((p) => p.slug);
