// ---------------------------------------------------------------------------
// Topic hubs — pillar pages for SEO
// ---------------------------------------------------------------------------
//
// Each topic hub is a curated landing page at /topics/[slug] that aggregates
// the strongest internal links for a single content cluster: a beginner's
// guide, free tools, real-world examples, comparisons, and glossary terms.
//
// The links here are deliberately routes that exist or are scheduled to
// exist elsewhere in the site. If a destination 404s temporarily, the topic
// hub still renders — the "empty section" branch in the page handles it.

export interface TopicLink {
  href: string;
  label: string;
}

export interface TopicHub {
  slug: string;
  topic: string;
  metaTitle: string;
  metaDescription: string;
  intro: string[];
  beginnerLinks: TopicLink[];
  toolLinks: TopicLink[];
  exampleLinks: TopicLink[];
  comparisonLinks: TopicLink[];
  glossaryLinks: TopicLink[];
  ctaCopy: string;
}

export const TOPIC_HUBS: TopicHub[] = [
  {
    slug: "google-reviews",
    topic: "Google Reviews",
    metaTitle: "Google Reviews for Small Business: Resource Hub · Social Perks",
    metaDescription:
      "Everything a local business needs to win at Google reviews — guides, templates, tools, examples, and a glossary, in one place.",
    intro: [
      "Google reviews are the single biggest local-SEO signal a small business controls. Every fresh review compounds: more recency, more keywords, more clicks, more booked appointments.",
      "This hub collects the best beginner guides, free generators, real-world playbooks, and glossary terms — built specifically for owners who'd rather run the business than read SEO blogs.",
    ],
    beginnerLinks: [
      { href: "/local-guide/get-more-google-reviews", label: "How to get more Google reviews (playbook)" },
      { href: "/local-guide/local-seo-checklist", label: "The 12-step local SEO checklist" },
      { href: "/blog", label: "More on the blog" },
    ],
    toolLinks: [
      { href: "/tools/review-email-generator", label: "Review email generator" },
      { href: "/tools/sms-review-templates", label: "SMS review templates" },
      { href: "/tools/qr-code-generator", label: "QR code generator" },
    ],
    exampleLinks: [
      { href: "/case-studies", label: "Real business case studies" },
    ],
    comparisonLinks: [
      { href: "/vs", label: "How Social Perks compares" },
    ],
    glossaryLinks: [
      { href: "/glossary", label: "Marketing glossary" },
    ],
    ctaCopy:
      "Run review requests on autopilot — branded QR, follow-up SMS, perk for every honest review.",
  },
  {
    slug: "instagram-marketing",
    topic: "Instagram Marketing",
    metaTitle: "Instagram Marketing for Small Business: Resource Hub · Social Perks",
    metaDescription:
      "Practical Instagram marketing for local business — captions, hashtags, UGC playbooks, and the tools to run it sustainably.",
    intro: [
      "Instagram is the #2 platform after Google for how customers under 35 discover local businesses. The catch: it rewards consistency, not virality.",
      "This hub pulls the best beginner content, free generators, real examples, and glossary terms for an Instagram practice you can actually maintain past month two.",
    ],
    beginnerLinks: [
      { href: "/local-guide/instagram-marketing-for-local-business", label: "Instagram marketing for local business" },
      { href: "/local-guide/user-generated-content-playbook", label: "The UGC playbook" },
    ],
    toolLinks: [
      { href: "/tools/instagram-caption-generator", label: "Instagram caption generator" },
      { href: "/tools/hashtag-generator", label: "Hashtag generator" },
    ],
    exampleLinks: [
      { href: "/case-studies", label: "Case studies" },
    ],
    comparisonLinks: [
      { href: "/vs", label: "Social Perks vs alternatives" },
    ],
    glossaryLinks: [
      { href: "/glossary", label: "Marketing glossary" },
    ],
    ctaCopy:
      "Set a sustainable cadence and let your customers fill your feed for you.",
  },
  {
    slug: "loyalty-programs",
    topic: "Loyalty Programs",
    metaTitle: "Loyalty Programs for Small Business: Resource Hub · Social Perks",
    metaDescription:
      "How small businesses build loyalty without an app. Guides, examples, comparisons, and tools — collected in one resource hub.",
    intro: [
      "A 5% lift in retention can grow profits 25-95%. But most small businesses overbuild — apps, points systems, dashboards — when a punch card with a QR would have outperformed everything.",
      "This hub collects the right-sized playbooks, comparison content, and tools for a loyalty program you can run from the register.",
    ],
    beginnerLinks: [
      { href: "/local-guide/loyalty-program-without-an-app", label: "Loyalty without an app" },
      { href: "/local-guide/qr-code-marketing-ideas", label: "QR code marketing ideas" },
    ],
    toolLinks: [
      { href: "/tools/qr-code-generator", label: "QR code generator" },
      { href: "/tools/sms-review-templates", label: "SMS templates" },
    ],
    exampleLinks: [
      { href: "/case-studies", label: "Real-world case studies" },
    ],
    comparisonLinks: [
      { href: "/vs", label: "Loyalty platform comparisons" },
    ],
    glossaryLinks: [
      { href: "/glossary", label: "Marketing glossary" },
    ],
    ctaCopy:
      "Set up perks customers actually want — and a system you can run in five minutes a week.",
  },
  {
    slug: "referral-marketing",
    topic: "Referral Marketing",
    metaTitle: "Referral Marketing for Small Business: Resource Hub · Social Perks",
    metaDescription:
      "Practical, low-cost referral marketing for local business. Guides, tools, examples, and the comparisons that help you pick a system.",
    intro: [
      "Referrals are the highest-converting, lowest-cost channel in local business. The hard part is never the reward — it's making the share one tap.",
      "This hub gathers the playbooks, tools, and examples for a referral program that runs itself.",
    ],
    beginnerLinks: [
      { href: "/local-guide/referral-program-for-small-business", label: "Run a referral program that works" },
    ],
    toolLinks: [
      { href: "/tools/utm-link-generator", label: "UTM link generator" },
      { href: "/tools/sms-review-templates", label: "SMS templates" },
    ],
    exampleLinks: [
      { href: "/case-studies", label: "Case studies" },
    ],
    comparisonLinks: [
      { href: "/vs", label: "Referral software comparisons" },
    ],
    glossaryLinks: [
      { href: "/glossary", label: "Marketing glossary" },
    ],
    ctaCopy:
      "Double-sided perks, frictionless links, and a leaderboard that turns customers into advocates.",
  },
  {
    slug: "sms-marketing",
    topic: "SMS Marketing",
    metaTitle: "SMS Marketing for Small Business: Resource Hub · Social Perks",
    metaDescription:
      "SMS marketing without being spammy — practical guides, templates, and compliance basics for small business owners.",
    intro: [
      "98% open rate. 90-second average response. SMS is the highest-ROI channel a local business has — and the easiest to misuse.",
      "This hub gathers the playbooks, free templates, and glossary terms you need to run SMS responsibly.",
    ],
    beginnerLinks: [
      { href: "/local-guide/sms-marketing-for-local-business", label: "SMS marketing for local business" },
    ],
    toolLinks: [
      { href: "/tools/sms-review-templates", label: "SMS review templates" },
    ],
    exampleLinks: [
      { href: "/case-studies", label: "Case studies" },
    ],
    comparisonLinks: [
      { href: "/vs", label: "Compare SMS providers" },
    ],
    glossaryLinks: [
      { href: "/glossary", label: "Marketing glossary" },
    ],
    ctaCopy:
      "Run SMS the right way — explicit opt-in, smart cadence, and human-sounding copy.",
  },
  {
    slug: "local-seo",
    topic: "Local SEO",
    metaTitle: "Local SEO for Small Business: Resource Hub · Social Perks",
    metaDescription:
      "A complete local SEO resource hub — checklists, playbooks, tools, examples, and comparisons for small business owners.",
    intro: [
      "Local SEO isn't twelve big projects. It's twelve small jobs done consistently. Most of your competitors do four.",
      "This hub collects the checklists, templates, and comparisons that move local rank — without an agency.",
    ],
    beginnerLinks: [
      { href: "/local-guide/local-seo-checklist", label: "The 12-step local SEO checklist" },
      { href: "/local-guide/get-more-google-reviews", label: "How to get more Google reviews" },
    ],
    toolLinks: [
      { href: "/tools/utm-link-generator", label: "UTM link generator" },
      { href: "/tools/qr-code-generator", label: "QR code generator" },
    ],
    exampleLinks: [
      { href: "/case-studies", label: "Real case studies" },
    ],
    comparisonLinks: [
      { href: "/vs", label: "Compare local SEO platforms" },
    ],
    glossaryLinks: [
      { href: "/glossary", label: "Marketing glossary" },
    ],
    ctaCopy:
      "Get the small things right, every week. Watch your zip code rankings climb.",
  },
  {
    slug: "user-generated-content",
    topic: "User-Generated Content",
    metaTitle: "User-Generated Content for Small Business: Resource Hub · Social Perks",
    metaDescription:
      "Turn customers into your content team. Playbooks, examples, and tools for a UGC engine you can run weekly.",
    intro: [
      "UGC converts four times better than branded content and costs a fraction. The only barrier is getting it consistently.",
      "This hub pulls the playbooks, generators, and examples for a UGC engine that runs on perks, not budget.",
    ],
    beginnerLinks: [
      { href: "/local-guide/user-generated-content-playbook", label: "The UGC playbook" },
      { href: "/local-guide/instagram-marketing-for-local-business", label: "Instagram marketing for local business" },
    ],
    toolLinks: [
      { href: "/tools/instagram-caption-generator", label: "Caption generator" },
      { href: "/tools/hashtag-generator", label: "Hashtag generator" },
    ],
    exampleLinks: [
      { href: "/case-studies", label: "Case studies" },
    ],
    comparisonLinks: [
      { href: "/vs", label: "Compare UGC platforms" },
    ],
    glossaryLinks: [
      { href: "/glossary", label: "Marketing glossary" },
    ],
    ctaCopy:
      "Trade small perks for authentic content that converts better than anything an agency makes.",
  },
  {
    slug: "review-management",
    topic: "Review Management",
    metaTitle: "Review Management for Small Business: Resource Hub · Social Perks",
    metaDescription:
      "Manage reviews across Google, Yelp, Facebook, and more. Playbooks, free templates, comparisons, and tools.",
    intro: [
      "Review management isn't about responding to one-star drama. It's a steady-state practice: ask consistently, respond quickly, learn from every signal.",
      "This hub gathers the templates, tools, and playbooks for a review practice your team can actually keep up with.",
    ],
    beginnerLinks: [
      { href: "/local-guide/get-more-google-reviews", label: "How to get more Google reviews" },
      { href: "/local-guide/local-seo-checklist", label: "Local SEO checklist" },
    ],
    toolLinks: [
      { href: "/tools/review-email-generator", label: "Review email generator" },
      { href: "/tools/sms-review-templates", label: "SMS review templates" },
    ],
    exampleLinks: [
      { href: "/case-studies", label: "Case studies" },
    ],
    comparisonLinks: [
      { href: "/vs", label: "Compare review platforms" },
    ],
    glossaryLinks: [
      { href: "/glossary", label: "Marketing glossary" },
    ],
    ctaCopy:
      "Steady asks, fast responses, and a perk for every honest review — automated.",
  },
];

const TOPIC_MAP: Map<string, TopicHub> = new Map(
  TOPIC_HUBS.map((t) => [t.slug, t]),
);

export function getTopic(slug: string): TopicHub | undefined {
  return TOPIC_MAP.get(slug);
}
