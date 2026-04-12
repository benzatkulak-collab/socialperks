// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — FTC Compliance Automation Engine
// Ensures all campaigns, content, and reviews meet FTC disclosure
// requirements and platform-specific advertising rules.
// ══════════════════════════════════════════════════════════════════════════════

import type { LaunchedCampaign, ActionType } from "./types";
import { findAction, findPlatform } from "./platforms";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ComplianceCheck {
  campaignId: string;
  compliant: boolean;
  issues: ComplianceIssue[];
  disclosures: PlatformDisclosure[];
  score: number; // 0-100, higher = more compliant
}

export interface ComplianceIssue {
  severity: "critical" | "warning" | "info";
  code: string;
  message: string;
  recommendation: string;
}

export interface PlatformDisclosure {
  platformId: string;
  platformName: string;
  required: string[];
  placement: string;
  format: string;
}

export interface ContentValidation {
  valid: boolean;
  missing: string[];
  found: string[];
  warnings: string[];
}

export interface ComplianceReport {
  businessId: string;
  generatedAt: string; // ISO 8601
  overallScore: number; // 0-100
  totalCampaigns: number;
  compliantCampaigns: number;
  nonCompliantCampaigns: number;
  campaignChecks: ComplianceCheck[];
  summary: string;
  topIssues: ComplianceIssue[];
  recommendations: string[];
}

export interface PlatformRules {
  platformId: string;
  platformName: string;
  reviewPolicy: ReviewPolicy;
  contentDisclosure: ContentDisclosureRules;
  prohibitions: string[];
  bestPractices: string[];
  lastUpdated: string; // ISO 8601
}

export interface ReviewPolicy {
  incentivizedReviewsAllowed: boolean;
  disclosureRequired: boolean;
  disclosureText: string;
  riskLevel: "low" | "medium" | "high" | "prohibited";
  notes: string;
}

export interface ContentDisclosureRules {
  hashtagsRequired: string[];
  nativeToolRequired: boolean;
  nativeToolName: string | null;
  placementRule: string;
  formatRule: string;
}

// ─── Platform-Specific Rules Database ───────────────────────────────────────

const PLATFORM_RULES: Record<string, PlatformRules> = {
  ig: {
    platformId: "ig",
    platformName: "Instagram",
    reviewPolicy: {
      incentivizedReviewsAllowed: true,
      disclosureRequired: true,
      disclosureText: "Must disclose incentive in caption",
      riskLevel: "low",
      notes: "Instagram is content-focused; review-type posts must include disclosure.",
    },
    contentDisclosure: {
      hashtagsRequired: ["#ad", "#sponsored"],
      nativeToolRequired: true,
      nativeToolName: "Paid Partnership label",
      placementRule: "First line of caption, above the fold",
      formatRule: "Must be clearly visible, not buried in hashtags. Use Paid Partnership label when available.",
    },
    prohibitions: [
      "Hidden disclosures at end of caption",
      "Disclosure only in hashtag block",
      "Ambiguous abbreviations (e.g., #spon instead of #sponsored)",
      "Disclosures visible only after 'more' tap",
    ],
    bestPractices: [
      "Use Instagram's built-in Paid Partnership label",
      "Place #ad at the very beginning of caption",
      "Include verbal disclosure in Reels/Stories",
      "Use clear language: 'Ad', 'Sponsored', 'Paid partnership with [Business]'",
    ],
    lastUpdated: "2026-03-01",
  },
  tt: {
    platformId: "tt",
    platformName: "TikTok",
    reviewPolicy: {
      incentivizedReviewsAllowed: true,
      disclosureRequired: true,
      disclosureText: "Must use Branded Content toggle and caption disclosure",
      riskLevel: "low",
      notes: "TikTok encourages transparency via native tools.",
    },
    contentDisclosure: {
      hashtagsRequired: ["#ad"],
      nativeToolRequired: true,
      nativeToolName: "Branded Content toggle",
      placementRule: "Video description, visible before 'see more'",
      formatRule: "Enable Branded Content toggle AND include #ad in description. Verbal disclosure in video recommended.",
    },
    prohibitions: [
      "Disabling Branded Content toggle on sponsored content",
      "Placing #ad only at end of description",
      "Not disclosing in video content itself",
    ],
    bestPractices: [
      "Enable Branded Content toggle for all sponsored content",
      "Say 'ad' or 'sponsored by [Business]' verbally in the video",
      "Include #ad in first line of description",
      "Be transparent about what perk was received",
    ],
    lastUpdated: "2026-03-01",
  },
  yt: {
    platformId: "yt",
    platformName: "YouTube",
    reviewPolicy: {
      incentivizedReviewsAllowed: true,
      disclosureRequired: true,
      disclosureText: "Must check 'Includes paid promotion' and verbally disclose",
      riskLevel: "low",
      notes: "YouTube has robust native disclosure tools.",
    },
    contentDisclosure: {
      hashtagsRequired: [],
      nativeToolRequired: true,
      nativeToolName: "'Includes paid promotion' checkbox",
      placementRule: "Video settings + first 30 seconds of video + description",
      formatRule: "Check the paid promotion box in video settings. Verbally disclose within first 30 seconds. Include written disclosure in description.",
    },
    prohibitions: [
      "Relying solely on description disclosure without verbal",
      "Burying disclosure after the fold in description",
      "Not using YouTube's native paid promotion checkbox",
    ],
    bestPractices: [
      "Always check 'Includes paid promotion' in advanced settings",
      "State sponsorship verbally within first 30 seconds",
      "Include disclosure text in video description",
      "Pin a disclosure comment for Shorts",
    ],
    lastUpdated: "2026-03-01",
  },
  go: {
    platformId: "go",
    platformName: "Google",
    reviewPolicy: {
      incentivizedReviewsAllowed: false,
      disclosureRequired: true,
      disclosureText: "Google prohibits incentivized reviews. Do NOT offer perks in exchange for Google reviews.",
      riskLevel: "prohibited",
      notes: "Google's Review Policy prohibits businesses from offering incentives in exchange for reviews. Reviews may be removed and listing penalized. Incentivize Google Photos and Q&A instead, and ask for reviews separately without any reward.",
    },
    contentDisclosure: {
      hashtagsRequired: [],
      nativeToolRequired: false,
      nativeToolName: null,
      placementRule: "Within the review text body",
      formatRule: "Google prohibits incentivized reviews. Incentivize photo uploads and Q&A instead. Ask for reviews separately without any reward tied to the request.",
    },
    prohibitions: [
      "Any incentive tied to writing a Google review",
      "Fake reviews or reviews for services not received",
      "Paying for specific star ratings",
      "Review gating (only asking satisfied customers)",
      "Bulk review solicitation from non-customers",
    ],
    bestPractices: [
      "Incentivize Google Photos uploads and Q&A answers instead of reviews",
      "Ask for reviews separately after customers complete their social media posts — no reward attached",
      "Never suggest a specific star rating",
      "Encourage honest feedback regardless of sentiment",
      "Send a follow-up email with a direct Google review link 24 hours after service",
    ],
    lastUpdated: "2026-03-01",
  },
  fb: {
    platformId: "fb",
    platformName: "Facebook",
    reviewPolicy: {
      incentivizedReviewsAllowed: true,
      disclosureRequired: true,
      disclosureText: "Must use Branded Content tag for sponsored posts; Recommendations must disclose",
      riskLevel: "low",
      notes: "Facebook has native branded content tools for Pages.",
    },
    contentDisclosure: {
      hashtagsRequired: ["#ad", "#sponsored"],
      nativeToolRequired: true,
      nativeToolName: "Branded Content tag",
      placementRule: "Post body, visible without clicking 'See more'",
      formatRule: "Use Branded Content tag when available. Include #ad or #sponsored in post text, visible before truncation.",
    },
    prohibitions: [
      "Hiding disclosure behind 'See more' truncation",
      "Not using Branded Content tag for Page partnerships",
      "Misleading content about the nature of the relationship",
    ],
    bestPractices: [
      "Use Facebook's Branded Content tag for all sponsored posts",
      "Place disclosure in first line of post",
      "For Recommendations, include 'I received a perk for this recommendation'",
      "Be transparent about the business relationship",
    ],
    lastUpdated: "2026-03-01",
  },
  xw: {
    platformId: "xw",
    platformName: "X",
    reviewPolicy: {
      incentivizedReviewsAllowed: true,
      disclosureRequired: true,
      disclosureText: "Must include #ad in post",
      riskLevel: "low",
      notes: "Character limits make disclosure placement critical.",
    },
    contentDisclosure: {
      hashtagsRequired: ["#ad"],
      nativeToolRequired: false,
      nativeToolName: null,
      placementRule: "Within the post text, not as the last hashtag",
      formatRule: "Include #ad clearly in the post. For threads, include in the first post. Must be visible without expanding.",
    },
    prohibitions: [
      "Burying #ad at end of hashtag strings",
      "Using only ambiguous terms like #spon or #collab",
      "Not disclosing in thread openers",
    ],
    bestPractices: [
      "Place #ad near the beginning of the post",
      "In threads, disclose in the first tweet",
      "Use clear language: 'Ad' or 'Sponsored by [Business]'",
      "Avoid cluttering with too many hashtags that hide the disclosure",
    ],
    lastUpdated: "2026-03-01",
  },
  yp: {
    platformId: "yp",
    platformName: "Yelp",
    reviewPolicy: {
      incentivizedReviewsAllowed: false,
      disclosureRequired: true,
      disclosureText: "Yelp prohibits incentivized reviews. High compliance risk.",
      riskLevel: "prohibited",
      notes: "Yelp's Content Guidelines explicitly prohibit businesses from offering incentives for reviews. Running review campaigns on Yelp is high-risk and may result in consumer alerts on the business page.",
    },
    contentDisclosure: {
      hashtagsRequired: [],
      nativeToolRequired: false,
      nativeToolName: null,
      placementRule: "N/A — incentivized reviews prohibited",
      formatRule: "Yelp does not allow incentivized reviews. Photo uploads may be acceptable if not tied to review content.",
    },
    prohibitions: [
      "Any incentive tied to writing a review",
      "Asking customers to write reviews in exchange for discounts",
      "Review solicitation that implies specific content or rating",
      "Business owners reviewing their own business",
    ],
    bestPractices: [
      "Only incentivize photo uploads, check-ins, and non-review actions on Yelp",
      "Never tie perks directly to writing a Yelp review",
      "If running review campaigns, focus on Google/Facebook instead",
      "Monitor Yelp's Consumer Alert system for compliance warnings",
    ],
    lastUpdated: "2026-03-01",
  },
  li: {
    platformId: "li",
    platformName: "LinkedIn",
    reviewPolicy: {
      incentivizedReviewsAllowed: true,
      disclosureRequired: true,
      disclosureText: "Must disclose business relationship in post/article",
      riskLevel: "low",
      notes: "LinkedIn's professional context requires clear disclosure of business relationships.",
    },
    contentDisclosure: {
      hashtagsRequired: ["#ad", "#sponsored"],
      nativeToolRequired: false,
      nativeToolName: null,
      placementRule: "First line of post or article header",
      formatRule: "Include #ad or #sponsored in post. For articles, include disclosure in the opening paragraph.",
    },
    prohibitions: [
      "Undisclosed paid endorsements",
      "Testimonials without relationship disclosure",
      "Misleading professional recommendations",
    ],
    bestPractices: [
      "Disclose in the first line: 'Sponsored post' or 'Ad: ...'",
      "For articles, include disclosure in opening paragraph",
      "Be transparent about the nature of the business relationship",
      "Maintain professional tone appropriate to LinkedIn",
    ],
    lastUpdated: "2026-03-01",
  },
  pi: {
    platformId: "pi",
    platformName: "Pinterest",
    reviewPolicy: {
      incentivizedReviewsAllowed: true,
      disclosureRequired: true,
      disclosureText: "Must include disclosure in Pin description",
      riskLevel: "low",
      notes: "Pinterest is primarily visual; disclosure must be in pin description.",
    },
    contentDisclosure: {
      hashtagsRequired: ["#ad", "#sponsored"],
      nativeToolRequired: false,
      nativeToolName: null,
      placementRule: "Pin description, first line",
      formatRule: "Include #ad or #sponsored in pin description. For Idea Pins, include verbal or text overlay disclosure.",
    },
    prohibitions: [
      "Hiding disclosures in pin that's only visible on click-through",
      "No disclosure on Idea Pins with sponsored content",
    ],
    bestPractices: [
      "Include #ad at start of pin description",
      "For Idea Pins, add text overlay with disclosure",
      "Use clear, unambiguous language",
    ],
    lastUpdated: "2026-03-01",
  },
  nd: {
    platformId: "nd",
    platformName: "Nextdoor",
    reviewPolicy: {
      incentivizedReviewsAllowed: true,
      disclosureRequired: true,
      disclosureText: "Must disclose incentive in recommendation text",
      riskLevel: "medium",
      notes: "Nextdoor is hyperlocal and trust-based. Undisclosed incentives are particularly damaging.",
    },
    contentDisclosure: {
      hashtagsRequired: [],
      nativeToolRequired: false,
      nativeToolName: null,
      placementRule: "Within recommendation or post text",
      formatRule: "Include clear disclosure: 'I received a discount for sharing my experience.' Nextdoor's community trust model makes transparency critical.",
    },
    prohibitions: [
      "Undisclosed incentivized recommendations",
      "Fake neighbor accounts posting recommendations",
      "Spam-like promotional content",
    ],
    bestPractices: [
      "Be transparent: 'I received a perk from [Business] for this recommendation'",
      "Keep content authentic and community-appropriate",
      "Focus on genuine experience details",
    ],
    lastUpdated: "2026-03-01",
  },
  th: {
    platformId: "th",
    platformName: "Threads",
    reviewPolicy: {
      incentivizedReviewsAllowed: true,
      disclosureRequired: true,
      disclosureText: "Must include #ad in post",
      riskLevel: "low",
      notes: "Threads follows similar rules to Instagram as a Meta platform.",
    },
    contentDisclosure: {
      hashtagsRequired: ["#ad", "#sponsored"],
      nativeToolRequired: false,
      nativeToolName: null,
      placementRule: "Within post text, near beginning",
      formatRule: "Include #ad or #sponsored clearly in the post text. Must be visible without expanding.",
    },
    prohibitions: [
      "Hiding disclosure at end of post",
      "Using ambiguous abbreviations",
    ],
    bestPractices: [
      "Place #ad near the beginning of the post",
      "Be transparent about the perk received",
      "Follow Instagram disclosure standards",
    ],
    lastUpdated: "2026-03-01",
  },
  sc: {
    platformId: "sc",
    platformName: "Snapchat",
    reviewPolicy: {
      incentivizedReviewsAllowed: true,
      disclosureRequired: true,
      disclosureText: "Must include visual disclosure overlay",
      riskLevel: "low",
      notes: "Ephemeral content still requires disclosure while visible.",
    },
    contentDisclosure: {
      hashtagsRequired: [],
      nativeToolRequired: false,
      nativeToolName: null,
      placementRule: "Text overlay on Snap or Story",
      formatRule: "Include 'Ad' or 'Sponsored' as visible text overlay on snaps. For Spotlight, include in description.",
    },
    prohibitions: [
      "Sponsored content without any visual disclosure",
      "Text overlay too small to read",
    ],
    bestPractices: [
      "Add 'Ad' or 'Sponsored' text overlay on all sponsored snaps",
      "For Spotlight, include #ad in description",
      "Make disclosure legible and not obscured by other elements",
    ],
    lastUpdated: "2026-03-01",
  },
  ta: {
    platformId: "ta",
    platformName: "TripAdvisor",
    reviewPolicy: {
      incentivizedReviewsAllowed: false,
      disclosureRequired: true,
      disclosureText: "TripAdvisor prohibits incentivized reviews. Do NOT offer perks in exchange for TripAdvisor reviews.",
      riskLevel: "prohibited",
      notes: "TripAdvisor's Review Policy prohibits incentivized reviews. Violations can result in ranking penalties, fraud badges, and review removal. Ask for TripAdvisor reviews separately without tying to any reward.",
    },
    contentDisclosure: {
      hashtagsRequired: [],
      nativeToolRequired: false,
      nativeToolName: null,
      placementRule: "Within the review text body",
      formatRule: "TripAdvisor prohibits incentivized reviews. Incentivize social media content (Instagram, TikTok) about the experience instead. Ask for TripAdvisor reviews separately without any reward.",
    },
    prohibitions: [
      "Any incentive tied to writing a TripAdvisor review",
      "Review manipulation or review buying",
      "Fake reviews from non-visitors",
      "Bulk review solicitation from the same IP/location",
    ],
    bestPractices: [
      "Incentivize social media content about the visit instead of TripAdvisor reviews",
      "Ask for TripAdvisor reviews separately after customers post on social media — no reward attached",
      "Encourage genuine, detailed reviews",
      "Space out review requests to avoid bulk flagging",
    ],
    lastUpdated: "2026-03-01",
  },
  rd: {
    platformId: "rd",
    platformName: "Reddit",
    reviewPolicy: {
      incentivizedReviewsAllowed: true,
      disclosureRequired: true,
      disclosureText: "Must disclose sponsorship — Reddit community polices this heavily",
      riskLevel: "high",
      notes: "Reddit communities actively detect and punish undisclosed promotion. Subreddit bans and account suspensions are common for non-disclosure.",
    },
    contentDisclosure: {
      hashtagsRequired: [],
      nativeToolRequired: false,
      nativeToolName: null,
      placementRule: "Post flair + opening line of post/comment",
      formatRule: "Clearly state: 'Disclosure: I received a perk from [Business].' Use [Ad] or [Sponsored] flair/prefix. Reddit users are extremely hostile to undisclosed promotion.",
    },
    prohibitions: [
      "Undisclosed promotional content (astroturfing)",
      "Pretending to be a regular user while promoting a business",
      "Posting in subreddits that prohibit self-promotion",
      "Vote manipulation to boost promotional content",
    ],
    bestPractices: [
      "Always prefix posts with [Ad] or [Sponsored]",
      "Include disclosure in first line of comment recommendations",
      "Check subreddit rules before posting promotional content",
      "Be genuine — Reddit users detect and punish inauthenticity",
    ],
    lastUpdated: "2026-03-01",
  },
  rf: {
    platformId: "rf",
    platformName: "Referral",
    reviewPolicy: {
      incentivizedReviewsAllowed: true,
      disclosureRequired: true,
      disclosureText: "Must disclose that both parties receive a perk",
      riskLevel: "low",
      notes: "Direct referrals are generally low-risk but FTC still requires disclosure of material connections.",
    },
    contentDisclosure: {
      hashtagsRequired: [],
      nativeToolRequired: false,
      nativeToolName: null,
      placementRule: "In referral message or conversation",
      formatRule: "When sharing referral links or recommending in person, disclose that a perk is received for the referral.",
    },
    prohibitions: [
      "Hiding referral incentive structure from the referred person",
      "Misleading claims about the referred product/service",
    ],
    bestPractices: [
      "Tell the referred friend: 'I get a perk if you sign up, and you get one too'",
      "Be honest about the business and service quality",
      "Include disclosure in email forwards and group chat messages",
    ],
    lastUpdated: "2026-03-01",
  },
};

// ─── FTC Compliance Issue Codes ─────────────────────────────────────────────

const ISSUE_CODES = {
  // Critical
  YELP_REVIEW_INCENTIVE: "FTC-001",
  NO_DISCLOSURE: "FTC-002",
  REVIEW_NO_DISCLOSURE: "FTC-003",
  PROHIBITED_PLATFORM_ACTION: "FTC-004",

  // Warning
  MISSING_NATIVE_TOOL: "FTC-101",
  WEAK_DISCLOSURE_PLACEMENT: "FTC-102",
  HIGH_RISK_REVIEW_PLATFORM: "FTC-103",
  MISSING_HASHTAG: "FTC-104",
  CONTENT_DISCLOSURE_INCOMPLETE: "FTC-105",

  // Info
  BEST_PRACTICE_SUGGESTION: "FTC-201",
  PLATFORM_RULE_UPDATE: "FTC-202",
  MULTIPLE_PLATFORMS_NOTE: "FTC-203",
} as const;

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Determine the action types present in a campaign's action list.
 */
function getCampaignActionTypes(actionIds: readonly string[]): Set<ActionType> {
  const types = new Set<ActionType>();
  for (const id of actionIds) {
    const action = findAction(id);
    if (action) {
      types.add(action.type);
    }
  }
  return types;
}

/**
 * Determine the platform IDs involved in a campaign's action list.
 */
function getCampaignPlatformIds(actionIds: readonly string[]): Set<string> {
  const platformIds = new Set<string>();
  for (const id of actionIds) {
    const action = findAction(id);
    if (action) {
      platformIds.add(action.platformId);
    }
  }
  return platformIds;
}

/**
 * Check if any of the campaign's actions are review-type actions.
 */
function hasReviewActions(actionIds: readonly string[]): boolean {
  return getCampaignActionTypes(actionIds).has("review");
}

/**
 * Get review platform IDs from campaign actions.
 */
function getReviewPlatformIds(actionIds: readonly string[]): string[] {
  const result: string[] = [];
  for (const id of actionIds) {
    const action = findAction(id);
    if (action && action.type === "review") {
      result.push(action.platformId);
    }
  }
  return [...new Set(result)];
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get the current advertising and disclosure rules for a platform.
 */
export function getPlatformRules(platformId: string): PlatformRules | null {
  return PLATFORM_RULES[platformId] ?? null;
}

/**
 * Get required disclosures for a set of platforms and action types.
 * Returns a disclosure requirement for each unique platform involved.
 */
export function getRequiredDisclosures(
  platformIds: readonly string[],
  actionTypes: readonly ActionType[]
): PlatformDisclosure[] {
  const disclosures: PlatformDisclosure[] = [];
  const uniquePlatforms = new Set(platformIds);

  for (const pid of uniquePlatforms) {
    const rules = PLATFORM_RULES[pid];
    if (!rules) continue;

    const platform = findPlatform(pid);
    if (!platform) continue;

    const isReview = actionTypes.includes("review");

    // Build required disclosures list
    const required: string[] = [];

    // Add required hashtags
    if (rules.contentDisclosure.hashtagsRequired.length > 0) {
      required.push(...rules.contentDisclosure.hashtagsRequired);
    }

    // Add native tool requirement
    if (rules.contentDisclosure.nativeToolRequired && rules.contentDisclosure.nativeToolName) {
      required.push(rules.contentDisclosure.nativeToolName);
    }

    // Add review-specific disclosure
    if (isReview && rules.reviewPolicy.disclosureRequired) {
      required.push(rules.reviewPolicy.disclosureText);
    }

    // Build placement instruction
    let placement = rules.contentDisclosure.placementRule;
    if (isReview) {
      placement = "Within review text body AND " + placement;
    }

    disclosures.push({
      platformId: pid,
      platformName: platform.name,
      required: [...new Set(required)],
      placement,
      format: rules.contentDisclosure.formatRule,
    });
  }

  return disclosures;
}

/**
 * Validate whether content text contains the required disclosures.
 * Checks for hashtags, keywords, and disclosure phrases.
 */
export function validateContentDisclosure(
  content: string,
  requiredDisclosures: PlatformDisclosure[]
): ContentValidation {
  const normalizedContent = content.toLowerCase();
  const missing: string[] = [];
  const found: string[] = [];
  const warnings: string[] = [];

  for (const disclosure of requiredDisclosures) {
    for (const req of disclosure.required) {
      const normalizedReq = req.toLowerCase();

      // Check for hashtags
      if (normalizedReq.startsWith("#")) {
        if (normalizedContent.includes(normalizedReq)) {
          found.push(`${disclosure.platformName}: ${req}`);
        } else {
          missing.push(`${disclosure.platformName}: ${req}`);
        }
      }
      // Check for native tool mentions (these can't be auto-verified from text alone)
      else if (
        normalizedReq.includes("label") ||
        normalizedReq.includes("toggle") ||
        normalizedReq.includes("checkbox") ||
        normalizedReq.includes("tag")
      ) {
        warnings.push(
          `${disclosure.platformName}: "${req}" — cannot verify from text alone, must be enabled in platform settings`
        );
      }
      // Check for disclosure phrases
      else {
        // Look for key terms from the requirement
        const keyTerms = extractKeyTerms(normalizedReq);
        const matchCount = keyTerms.filter(term =>
          normalizedContent.includes(term)
        ).length;
        const matchRatio = keyTerms.length > 0 ? matchCount / keyTerms.length : 0;

        if (matchRatio >= 0.5) {
          found.push(`${disclosure.platformName}: ${req} (partial match)`);
        } else {
          missing.push(`${disclosure.platformName}: ${req}`);
        }
      }
    }

    // Check placement: is disclosure near the beginning?
    const disclosureTerms = ["#ad", "#sponsored", "ad:", "sponsored", "paid partnership", "disclosure"];
    const firstDisclosureIndex = disclosureTerms.reduce((minIdx, term) => {
      const idx = normalizedContent.indexOf(term);
      if (idx === -1) return minIdx;
      return minIdx === -1 ? idx : Math.min(minIdx, idx);
    }, -1);

    if (firstDisclosureIndex > 200) {
      warnings.push(
        `${disclosure.platformName}: Disclosure found but appears late in content (position ${firstDisclosureIndex}). ${disclosure.placement}`
      );
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    found,
    warnings,
  };
}

function extractKeyTerms(text: string): string[] {
  const stopWords = new Set([
    "must", "the", "a", "an", "in", "for", "of", "to", "and", "or",
    "be", "is", "are", "was", "were", "this", "that", "with", "from",
    "i", "my", "their", "have", "has", "had",
  ]);
  return text
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

/**
 * Check whether review text contains proper disclosure of the incentive received.
 * Returns true if the review appears to disclose that a perk was received.
 */
export function checkReviewCompliance(reviewText: string): {
  compliant: boolean;
  disclosureFound: string | null;
  recommendation: string;
} {
  // Disclosure patterns to look for
  const disclosurePatterns: { pattern: RegExp; label: string }[] = [
    { pattern: /i received .* (in exchange|for|discount|perk|incentive)/i, label: "Exchange disclosure" },
    { pattern: /(discount|perk|incentive|reward|coupon|deal) .* (exchange|return|sharing|writing|posting|review)/i, label: "Perk disclosure" },
    { pattern: /(complimentary|free|gifted|sponsored|comped|incentivized)/i, label: "Gifted/sponsored disclosure" },
    { pattern: /(disclosure|disclosing|#ad|#sponsored|paid|compensation)/i, label: "Standard disclosure" },
    { pattern: /received (a |an )?(discount|perk|reward|coupon|credit|gift|freebie)/i, label: "Received perk disclosure" },
    { pattern: /in exchange for (this |my |an? )?(honest |genuine )?(review|feedback|opinion|experience)/i, label: "Exchange for review" },
    { pattern: /(was given|was offered|was provided) (a |an )?(discount|perk|incentive)/i, label: "Passive perk disclosure" },
  ];

  for (const { pattern, label } of disclosurePatterns) {
    if (pattern.test(reviewText)) {
      return {
        compliant: true,
        disclosureFound: label,
        recommendation: "Review contains appropriate disclosure.",
      };
    }
  }

  return {
    compliant: false,
    disclosureFound: null,
    recommendation:
      'Review does not appear to disclose the incentive received. Add a statement like: "I received a [perk] in exchange for sharing my honest experience."',
  };
}

/**
 * Run a full compliance check on a campaign and its actions.
 * Returns a ComplianceCheck with all issues, required disclosures, and a score.
 */
export function checkCampaignCompliance(
  campaign: LaunchedCampaign,
  actions?: readonly string[]
): ComplianceCheck {
  const actionIds = actions ?? campaign.actions;
  const issues: ComplianceIssue[] = [];
  const platformIds = getCampaignPlatformIds(actionIds);
  const actionTypes = getCampaignActionTypes(actionIds);

  // Get required disclosures for all platforms in this campaign
  const disclosures = getRequiredDisclosures(
    [...platformIds],
    [...actionTypes]
  );

  // ── Check 1: Non-incentivizable review platforms (critical) ──
  // Google, Google Maps, Yelp, and TripAdvisor all prohibit incentivized reviews.
  const reviewPlatforms = getReviewPlatformIds(actionIds);
  const prohibitedReviewPlatforms = ["yp", "go", "gm", "ta"];

  for (const pid of prohibitedReviewPlatforms) {
    if (reviewPlatforms.includes(pid)) {
      const platformReviewActions = actionIds.filter(id => {
        const action = findAction(id);
        return action && action.platformId === pid && action.type === "review";
      });

      if (platformReviewActions.length > 0) {
        const rules = PLATFORM_RULES[pid];
        const platformName = rules?.platformName ?? pid;
        issues.push({
          severity: "critical",
          code: ISSUE_CODES.PROHIBITED_PLATFORM_ACTION,
          message:
            `Campaign includes incentivized ${platformName} reviews. ${platformName} prohibits incentivized reviews and may penalize your business listing.`,
          recommendation:
            `Remove ${platformName} review actions from this campaign. ${pid === "yp" ? "You can keep Yelp photo uploads and check-ins." : pid === "go" || pid === "gm" ? "You can keep Google/Maps photo uploads and Q&A answers." : "Redirect to social media content and Facebook Recommendations instead."} Ask for reviews separately without tying to any reward.`,
        });
      }
    }
  }

  // ── Check 2: High-risk review platforms (warning) ──
  for (const pid of reviewPlatforms) {
    if (prohibitedReviewPlatforms.includes(pid)) continue; // Already handled as critical above
    const rules = PLATFORM_RULES[pid];
    if (rules && (rules.reviewPolicy.riskLevel === "high" || rules.reviewPolicy.riskLevel === "prohibited")) {
      issues.push({
        severity: "warning",
        code: ISSUE_CODES.HIGH_RISK_REVIEW_PLATFORM,
        message: `${rules.platformName} is a high-risk platform for incentivized reviews. ${rules.reviewPolicy.notes}`,
        recommendation: `Ensure all ${rules.platformName} reviews include clear disclosure text. Consider limiting review volume to avoid fraud detection triggers.`,
      });
    }
  }

  // ── Check 3: Missing native disclosure tools (warning) ──
  for (const pid of platformIds) {
    const rules = PLATFORM_RULES[pid];
    if (rules && rules.contentDisclosure.nativeToolRequired && rules.contentDisclosure.nativeToolName) {
      issues.push({
        severity: "warning",
        code: ISSUE_CODES.MISSING_NATIVE_TOOL,
        message: `${rules.platformName} requires use of "${rules.contentDisclosure.nativeToolName}" for sponsored content. This cannot be enforced automatically.`,
        recommendation: `Include instructions in campaign guidelines for participants to enable "${rules.contentDisclosure.nativeToolName}" on ${rules.platformName}.`,
      });
    }
  }

  // ── Check 4: FTC disclosure for review actions ──
  if (hasReviewActions(actionIds)) {
    // Check if campaign has FTC disclosures configured
    const hasFtcDisclosures = campaign.ftcDisclosures && campaign.ftcDisclosures.length > 0;
    if (!hasFtcDisclosures) {
      issues.push({
        severity: "critical",
        code: ISSUE_CODES.REVIEW_NO_DISCLOSURE,
        message:
          "Campaign includes review actions but has no FTC disclosure requirements configured.",
        recommendation:
          "Add disclosure requirements to the campaign. All incentivized reviews must include a statement that a perk was received.",
      });
    }
  }

  // ── Check 5: General disclosure check for non-review content ──
  const contentPlatforms = [...platformIds].filter(pid => {
    const platformActions = actionIds.filter(id => {
      const a = findAction(id);
      return a && a.platformId === pid && a.type !== "engage"; // Engagement (likes/follows) doesn't need disclosure
    });
    return platformActions.length > 0;
  });

  if (contentPlatforms.length > 0) {
    const hasFtcDisclosures = campaign.ftcDisclosures && campaign.ftcDisclosures.length > 0;
    if (!hasFtcDisclosures) {
      issues.push({
        severity: "warning",
        code: ISSUE_CODES.NO_DISCLOSURE,
        message:
          "Campaign creates sponsored content across platforms but no FTC disclosure requirements are configured.",
        recommendation:
          "Add disclosure requirements. FTC requires clear and conspicuous disclosure of material connections (perks, discounts) in all sponsored content.",
      });
    }
  }

  // ── Check 6: Multi-platform note ──
  if (platformIds.size > 3) {
    issues.push({
      severity: "info",
      code: ISSUE_CODES.MULTIPLE_PLATFORMS_NOTE,
      message: `Campaign spans ${platformIds.size} platforms. Each platform has different disclosure requirements.`,
      recommendation:
        "Include platform-specific disclosure instructions in campaign guidelines. Consider providing a disclosure template for each platform.",
    });
  }

  // ── Check 7: Campaign guidelines check ──
  if (campaign.guidelines) {
    const guidelineCheck = validateContentDisclosure(campaign.guidelines, disclosures);
    if (guidelineCheck.missing.length > 0 && guidelineCheck.warnings.length > 0) {
      issues.push({
        severity: "info",
        code: ISSUE_CODES.BEST_PRACTICE_SUGGESTION,
        message:
          "Campaign guidelines could include more specific disclosure instructions.",
        recommendation: `Consider adding these to your guidelines: ${guidelineCheck.missing.slice(0, 3).join("; ")}`,
      });
    }
  }

  // ── Calculate compliance score ──
  let score = 100;

  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;
  const infoCount = issues.filter(i => i.severity === "info").length;

  score -= criticalCount * 30; // Each critical issue is a major deduction
  score -= warningCount * 10; // Warnings are moderate
  score -= infoCount * 2; // Info items are minor

  // Bonus for having FTC disclosures configured
  if (campaign.ftcDisclosures && campaign.ftcDisclosures.length > 0) {
    score += 5;
  }

  // Bonus for having guidelines
  if (campaign.guidelines && campaign.guidelines.length > 50) {
    score += 5;
  }

  score = Math.max(0, Math.min(100, score));

  const compliant = criticalCount === 0 && score >= 60;

  return {
    campaignId: campaign.id,
    compliant,
    issues,
    disclosures,
    score,
  };
}

/**
 * Generate a comprehensive compliance report for all campaigns belonging to a business.
 */
export function generateComplianceReport(
  businessId: string,
  campaigns: readonly LaunchedCampaign[]
): ComplianceReport {
  const businessCampaigns = campaigns.filter(c => c.businessId === businessId);
  const campaignChecks = businessCampaigns.map(c => checkCampaignCompliance(c));

  const compliantCampaigns = campaignChecks.filter(c => c.compliant).length;
  const nonCompliantCampaigns = campaignChecks.filter(c => !c.compliant).length;

  // Calculate overall score (weighted average, penalizing worst offenders)
  let overallScore = 100;
  if (campaignChecks.length > 0) {
    const avgScore =
      campaignChecks.reduce((sum, c) => sum + c.score, 0) / campaignChecks.length;
    const minScore = Math.min(...campaignChecks.map(c => c.score));
    // Weight: 70% average, 30% worst campaign (to pull score down for bad actors)
    overallScore = Math.round(avgScore * 0.7 + minScore * 0.3);
  }

  // Collect all issues and deduplicate by code
  const allIssues = campaignChecks.flatMap(c => c.issues);
  const issuesByCode = new Map<string, ComplianceIssue & { count: number }>();
  for (const issue of allIssues) {
    const existing = issuesByCode.get(issue.code);
    if (existing) {
      existing.count++;
    } else {
      issuesByCode.set(issue.code, { ...issue, count: 1 });
    }
  }

  // Sort top issues by severity then count
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const topIssues = [...issuesByCode.values()]
    .sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return b.count - a.count;
    })
    .slice(0, 10)
    .map(({ count: _count, ...issue }) => issue);

  // Generate recommendations
  const recommendations: string[] = [];

  const hasCritical = topIssues.some(i => i.severity === "critical");
  if (hasCritical) {
    recommendations.push(
      "URGENT: Address all critical compliance issues immediately. These represent significant legal risk."
    );
  }

  if (nonCompliantCampaigns > 0) {
    recommendations.push(
      `${nonCompliantCampaigns} of ${businessCampaigns.length} campaigns need compliance fixes. Review each campaign's disclosure requirements.`
    );
  }

  const yelpIssues = topIssues.filter(i => i.code === ISSUE_CODES.YELP_REVIEW_INCENTIVE);
  if (yelpIssues.length > 0) {
    recommendations.push(
      "Remove all Yelp review incentives. Redirect review campaigns to Google or Facebook. Yelp photos and check-ins are acceptable."
    );
  }

  const nativeToolIssues = topIssues.filter(i => i.code === ISSUE_CODES.MISSING_NATIVE_TOOL);
  if (nativeToolIssues.length > 0) {
    recommendations.push(
      "Add instructions to campaign guidelines for participants to use platform-native disclosure tools (Instagram Paid Partnership, TikTok Branded Content toggle, YouTube Paid Promotion checkbox)."
    );
  }

  if (overallScore >= 80 && !hasCritical) {
    recommendations.push(
      "Overall compliance is good. Continue monitoring platform rule updates and ensure all new campaigns include disclosure requirements."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("All campaigns are compliant. Keep up the good work.");
  }

  // Generate summary
  let summary: string;
  if (businessCampaigns.length === 0) {
    summary = "No campaigns found for this business.";
  } else if (overallScore >= 90 && !hasCritical) {
    summary = `Excellent compliance. ${compliantCampaigns}/${businessCampaigns.length} campaigns meet FTC requirements.`;
  } else if (overallScore >= 70 && !hasCritical) {
    summary = `Good compliance with some areas for improvement. ${compliantCampaigns}/${businessCampaigns.length} campaigns are compliant.`;
  } else if (hasCritical) {
    summary = `Critical compliance issues found. ${nonCompliantCampaigns}/${businessCampaigns.length} campaigns have issues that need immediate attention.`;
  } else {
    summary = `Compliance needs attention. ${nonCompliantCampaigns}/${businessCampaigns.length} campaigns are non-compliant.`;
  }

  return {
    businessId,
    generatedAt: new Date().toISOString(),
    overallScore,
    totalCampaigns: businessCampaigns.length,
    compliantCampaigns,
    nonCompliantCampaigns,
    campaignChecks,
    summary,
    topIssues,
    recommendations,
  };
}
