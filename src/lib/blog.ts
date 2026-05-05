/**
 * Blog posts. Hand-written for now; later swap for a `blog_posts` table
 * + admin UI. Each post should be tagged with city + industry for
 * cross-linking from the city-industry pages.
 */

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date
  city?: string;       // city slug from src/lib/cities.ts
  industry?: string;   // industry slug from src/lib/industries.ts
  /** Plain-text body. Renders with whitespace preserved + paragraph breaks on blank lines. */
  body: string;
}

export const POSTS: BlogPost[] = [
  {
    slug: "incentivized-reviews-google-vs-instagram",
    title: "Why we don't pay customers for Google reviews — and what we pay for instead",
    description: "Google's terms ban incentivized reviews. We refuse to launch them. Here's the safe alternative that drives the same word-of-mouth without the platform risk.",
    publishedAt: "2026-05-04",
    industry: "coffee-shops",
    body: `Google, Yelp, and Tripadvisor explicitly prohibit incentivized reviews. The penalty for a business is a delisting that can take months to undo — sometimes never.

Instagram, TikTok, and Facebook take a different stance: incentivized posts are allowed, with mandatory FTC disclosure (#ad, #sponsored, branded-content tag, etc.). That's the path Social Perks takes — and the only path the platform will actually let you launch.

The compliance gate built into Social Perks refuses to launch a campaign that incentivizes a Google review. The dashboard's quick-start templates have already had every Google-review template removed. The campaign-creation wizard hides those actions behind a disabled, struck-through indicator with a tooltip explaining the policy.

What businesses get instead: real customer posts on the platforms where reach is actually growing. Each post auto-injects the FTC disclosure. Each post is verifiable. Each post is yours forever.

That's the whole product. The "no" is as important as the "yes."`,
  },
  {
    slug: "ftc-compliance-without-thinking-about-it",
    title: "FTC compliance without thinking about it",
    description: "Every Social Perks campaign auto-injects the right disclosure for each platform. You can't accidentally launch a non-compliant campaign — the system blocks it.",
    publishedAt: "2026-05-04",
    body: `The FTC's Endorsement Guides require disclosure when a creator received "anything of value" in exchange for content. The penalty is steep: $51,744 per violation under current law.

Most platforms leave this to the creator. We don't. Every Social Perks campaign auto-injects the platform-appropriate disclosure into the creator's posting flow:

- Instagram: #ad or Paid Partnership tag
- TikTok: Branded Content toggle
- Facebook: Branded Content tag
- Reviews: "I received a [discount/free product] in exchange for this review"

The compliance plugin runs at campaign launch. If the disclosure can't be applied, the launch is blocked. There is no path through the product where a non-compliant campaign goes live.

That's the fastest way to think about FTC compliance: don't.`,
  },
];

export function getPost(slug: string): BlogPost | null {
  return POSTS.find((p) => p.slug === slug) ?? null;
}

export function listPosts(): BlogPost[] {
  return [...POSTS].sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}
