// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Compliance Automation Engine
//
// Three sub-systems:
//   1. NLP Content Scanner — Scans text for FTC compliance (disclosures,
//      misleading claims, prohibited content, sentiment).
//   2. Multi-Jurisdiction Rule Engine — Enforces rules across US (FTC),
//      UK (ASA), EU (UCPD), and Canada (CSA).
//   3. Audit Trail — Immutable compliance-check history with reporting.
//
// All scanning is keyword / pattern-based (no external AI dependency).
// ══════════════════════════════════════════════════════════════════════════════

// ─── Content Scanner Types ──────────────────────────────────────────────────

export interface ContentScanResult {
  hasDisclosure: boolean;
  disclosureType: string | null; // "#ad", "#sponsored", "Paid partnership", etc.
  disclosurePosition: "beginning" | "middle" | "end" | "none";
  language: string;
  sentiment: "positive" | "neutral" | "negative";
  misleadingClaims: string[];
  prohibitedContent: string[];
  complianceScore: number; // 0-100
  issues: ComplianceIssue[];
}

export interface ComplianceIssue {
  type:
    | "missing_disclosure"
    | "buried_disclosure"
    | "misleading_claim"
    | "prohibited_content"
    | "incorrect_format";
  severity: "critical" | "warning" | "info";
  description: string;
  suggestion: string;
}

// ─── Jurisdiction Types ─────────────────────────────────────────────────────

export interface JurisdictionRules {
  jurisdiction: string; // "US_FTC", "UK_ASA", "EU_UCPD", "CA_CSA"
  requiredDisclosures: {
    platform: string;
    format: string;
    placement: string;
  }[];
  prohibitions: string[];
  ageRestrictions: { minAge: number; requiresVerification: boolean };
  dataProtection: { consentRequired: boolean; retentionDays: number };
}

export interface JurisdictionCheckResult {
  jurisdiction: string;
  compliant: boolean;
  score: number; // 0-100
  issues: ComplianceIssue[];
  requiredDisclosures: {
    platform: string;
    format: string;
    placement: string;
  }[];
  generatedDisclosure: string | null;
}

// ─── Audit Trail Types ──────────────────────────────────────────────────────

export interface AuditRecord {
  id: string;
  timestamp: string; // ISO 8601
  entityType: "campaign" | "submission" | "content";
  entityId: string;
  businessId: string;
  jurisdiction: string;
  checkType: "content_scan" | "jurisdiction_check" | "full_review";
  result: ContentScanResult | JurisdictionCheckResult;
  complianceScore: number;
  passed: boolean;
  reviewedBy: "system" | "manual";
  metadata: Record<string, unknown>;
}

export interface ComplianceReport {
  businessId: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  averageScore: number;
  criticalIssues: ComplianceIssue[];
  topIssueTypes: { type: string; count: number }[];
  jurisdictionBreakdown: {
    jurisdiction: string;
    checks: number;
    averageScore: number;
    passed: number;
  }[];
  recommendations: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// NLP Content Scanner
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Disclosure Patterns ────────────────────────────────────────────────────

const DISCLOSURE_PATTERNS: { pattern: RegExp; type: string }[] = [
  { pattern: /#ad\b/i, type: "#ad" },
  { pattern: /#sponsored\b/i, type: "#sponsored" },
  { pattern: /#partner\b/i, type: "#partner" },
  { pattern: /#paidpartnership\b/i, type: "#paidpartnership" },
  { pattern: /paid partnership/i, type: "Paid partnership" },
  { pattern: /\bsponsored\s+(by|post|content)\b/i, type: "Sponsored by" },
  { pattern: /\bad\b:\s/i, type: "Ad:" },
  { pattern: /\bgifted\b/i, type: "Gifted" },
  { pattern: /\b(i|we) received .* (in exchange|for|discount|perk|incentive)/i, type: "Exchange disclosure" },
  { pattern: /\bdisclosure\b/i, type: "Disclosure statement" },
  { pattern: /\bcomped\b/i, type: "Comped" },
  { pattern: /\bcomplimentary\b/i, type: "Complimentary" },
  { pattern: /\b(was given|was offered|was provided)\b/i, type: "Passive disclosure" },
  { pattern: /#collab\b/i, type: "#collab" },
  { pattern: /\bbranded content\b/i, type: "Branded content" },
  { pattern: /\bpaid promotion\b/i, type: "Paid promotion" },
  { pattern: /\baffiliate\b/i, type: "Affiliate" },
  { pattern: /\binclude[sd]? paid promotion\b/i, type: "Includes paid promotion" },
];

// ─── Sentiment Keyword Lists ────────────────────────────────────────────────

const POSITIVE_WORDS = new Set([
  "amazing", "awesome", "best", "brilliant", "delicious", "delightful",
  "excellent", "exceptional", "fabulous", "fantastic", "favorite", "gorgeous",
  "great", "incredible", "love", "loved", "lovely", "magnificent", "marvellous",
  "outstanding", "perfect", "phenomenal", "recommend", "remarkable",
  "spectacular", "stunning", "superb", "terrific", "thrilled", "wonderful",
  "worth", "beautiful", "impressive", "enjoy", "enjoyed", "happy",
  "pleased", "satisfied", "premium", "top-notch", "first-class",
]);

const NEGATIVE_WORDS = new Set([
  "awful", "bad", "boring", "broken", "cheap", "complained", "confusing",
  "disappointing", "disgusting", "dreadful", "fail", "horrible", "mediocre",
  "nasty", "overpriced", "pathetic", "poor", "rude", "scam", "slow",
  "terrible", "ugly", "unacceptable", "unhappy", "uninspiring",
  "unprofessional", "useless", "waste", "worst", "avoid", "regret",
  "frustrated", "annoying", "misleading",
]);

// ─── Misleading Claim Patterns ──────────────────────────────────────────────

const MISLEADING_CLAIM_PATTERNS: { pattern: RegExp; description: string }[] = [
  // Superlatives without evidence
  { pattern: /\b(best|#1|number one|top rated|highest rated) (in|of) (the )?(world|country|city|state|nation)\b/i, description: "Unsubstantiated superlative claim" },
  { pattern: /\bguaranteed results?\b/i, description: "Guarantee claim without evidence" },
  { pattern: /\b100% (effective|guaranteed|proven|safe)\b/i, description: "Absolute claim without evidence" },

  // Health / medical claims
  { pattern: /\b(cures?|treats?|heals?|prevents?) (cancer|diabetes|heart disease|depression|anxiety|covid|illness)\b/i, description: "Unverified medical/health claim" },
  { pattern: /\b(clinically proven|doctor recommended|scientifically proven)\b/i, description: "Medical authority claim without citation" },
  { pattern: /\blost? \d+ (pounds?|lbs?|kg) (in|within) \d+ (days?|weeks?)\b/i, description: "Rapid weight loss claim" },
  { pattern: /\bmiracle (cure|product|solution|treatment)\b/i, description: "Miracle claim" },

  // Income / financial claims
  { pattern: /\b(earn|make|made) \$[\d,]+ (a |per |in a )?(day|week|month|hour)\b/i, description: "Unverified income claim" },
  { pattern: /\bget rich quick\b/i, description: "Get-rich-quick claim" },
  { pattern: /\bfinancial freedom\b/i, description: "Financial freedom claim (may need disclaimer)" },

  // Fake urgency / scarcity
  { pattern: /\b(only \d+ left|limited (time|stock|spots?)|act now or miss out|last chance)\b/i, description: "Potentially false urgency/scarcity claim" },
];

// ─── Prohibited Content Patterns ────────────────────────────────────────────

const PROHIBITED_CONTENT_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /\b(buy fake (reviews?|followers?|likes?)|fake (engagement|testimonials?))\b/i, description: "Reference to fake engagement" },
  { pattern: /\b(click(farm|bait)|bot(ting|ted)?|astroturf)\b/i, description: "Reference to artificial engagement methods" },
  { pattern: /\b(tobacco|cigarettes?|vaping?|e-cig)\b/i, description: "Tobacco/vaping product promotion" },
  { pattern: /\b(illegal|illicit)\s+(drug|substance|gambling)\b/i, description: "Illegal substance/activity promotion" },
  { pattern: /\b(pyramid scheme|ponzi|multi-?level marketing scam)\b/i, description: "Fraudulent scheme promotion" },
  { pattern: /\b(hack|exploit|cheat code) .* (algorithm|system|platform)\b/i, description: "Platform exploitation reference" },
];

// ─── Content Scanner Class ──────────────────────────────────────────────────

export class ContentScanner {
  /**
   * Scan text content for FTC compliance issues.
   * Performs disclosure detection, position analysis, sentiment analysis,
   * misleading-claim detection, and prohibited-content detection.
   */
  scan(content: string, options: { platform?: string; jurisdiction?: string } = {}): ContentScanResult {
    const trimmed = content.trim();

    if (trimmed.length === 0) {
      return {
        hasDisclosure: false,
        disclosureType: null,
        disclosurePosition: "none",
        language: "en",
        sentiment: "neutral",
        misleadingClaims: [],
        prohibitedContent: [],
        complianceScore: 0,
        issues: [
          {
            type: "missing_disclosure",
            severity: "critical",
            description: "Content is empty — no disclosure present.",
            suggestion: "Provide content with appropriate FTC disclosure.",
          },
        ],
      };
    }

    // 1. Disclosure detection
    const { hasDisclosure, disclosureType, disclosurePosition } = this.detectDisclosure(trimmed);

    // 2. Sentiment analysis
    const sentiment = this.analyzeSentiment(trimmed);

    // 3. Misleading claim detection
    const misleadingClaims = this.detectMisleadingClaims(trimmed);

    // 4. Prohibited content detection
    const prohibitedContent = this.detectProhibitedContent(trimmed);

    // 5. Build issues list
    const issues = this.buildIssues(
      hasDisclosure,
      disclosurePosition,
      misleadingClaims,
      prohibitedContent,
      options
    );

    // 6. Calculate compliance score
    const complianceScore = this.calculateComplianceScore(
      hasDisclosure,
      disclosurePosition,
      misleadingClaims,
      prohibitedContent,
      issues
    );

    return {
      hasDisclosure,
      disclosureType,
      disclosurePosition,
      language: "en",
      sentiment,
      misleadingClaims,
      prohibitedContent,
      complianceScore,
      issues,
    };
  }

  // ── Disclosure Detection ──────────────────────────────────────────────────

  private detectDisclosure(content: string): {
    hasDisclosure: boolean;
    disclosureType: string | null;
    disclosurePosition: "beginning" | "middle" | "end" | "none";
  } {
    for (const { pattern, type } of DISCLOSURE_PATTERNS) {
      const match = content.match(pattern);
      if (match && match.index !== undefined) {
        const position = this.classifyPosition(match.index, content.length);
        return { hasDisclosure: true, disclosureType: type, disclosurePosition: position };
      }
    }
    return { hasDisclosure: false, disclosureType: null, disclosurePosition: "none" };
  }

  private classifyPosition(index: number, totalLength: number): "beginning" | "middle" | "end" {
    const relativePosition = index / totalLength;
    if (relativePosition <= 0.2) return "beginning";
    if (relativePosition >= 0.7) return "end";
    return "middle";
  }

  // ── Sentiment Analysis ────────────────────────────────────────────────────

  private analyzeSentiment(content: string): "positive" | "neutral" | "negative" {
    const words = content.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (POSITIVE_WORDS.has(word)) positiveCount++;
      if (NEGATIVE_WORDS.has(word)) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    if (total === 0) return "neutral";

    const positiveRatio = positiveCount / total;
    if (positiveRatio >= 0.65) return "positive";
    if (positiveRatio <= 0.35) return "negative";
    return "neutral";
  }

  // ── Misleading Claim Detection ────────────────────────────────────────────

  private detectMisleadingClaims(content: string): string[] {
    const claims: string[] = [];
    for (const { pattern, description } of MISLEADING_CLAIM_PATTERNS) {
      if (pattern.test(content)) {
        claims.push(description);
      }
    }
    return claims;
  }

  // ── Prohibited Content Detection ──────────────────────────────────────────

  private detectProhibitedContent(content: string): string[] {
    const found: string[] = [];
    for (const { pattern, description } of PROHIBITED_CONTENT_PATTERNS) {
      if (pattern.test(content)) {
        found.push(description);
      }
    }
    return found;
  }

  // ── Issue Builder ─────────────────────────────────────────────────────────

  private buildIssues(
    hasDisclosure: boolean,
    disclosurePosition: "beginning" | "middle" | "end" | "none",
    misleadingClaims: string[],
    prohibitedContent: string[],
    _options: { platform?: string; jurisdiction?: string }
  ): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];

    // Missing disclosure
    if (!hasDisclosure) {
      issues.push({
        type: "missing_disclosure",
        severity: "critical",
        description: "No FTC-required disclosure found in content.",
        suggestion:
          'Add a clear disclosure such as "#ad", "#sponsored", or "Paid partnership with [Business]" at the beginning of your content.',
      });
    }

    // Buried disclosure
    if (hasDisclosure && disclosurePosition === "end") {
      issues.push({
        type: "buried_disclosure",
        severity: "warning",
        description:
          "Disclosure is buried at the end of the content. FTC guidelines require disclosures to be prominent and early.",
        suggestion:
          "Move the disclosure to the beginning of your content so it is visible without scrolling or expanding.",
      });
    }

    if (hasDisclosure && disclosurePosition === "middle") {
      issues.push({
        type: "buried_disclosure",
        severity: "info",
        description:
          "Disclosure is in the middle of the content. Ideally it should appear at the very beginning.",
        suggestion:
          'Consider moving the disclosure to the first line of your content for maximum compliance.',
      });
    }

    // Misleading claims
    for (const claim of misleadingClaims) {
      issues.push({
        type: "misleading_claim",
        severity: "warning",
        description: `Potentially misleading claim detected: ${claim}`,
        suggestion:
          "Remove or substantiate this claim with evidence. Unverified claims may violate FTC and advertising standards.",
      });
    }

    // Prohibited content
    for (const prohibited of prohibitedContent) {
      issues.push({
        type: "prohibited_content",
        severity: "critical",
        description: `Prohibited content detected: ${prohibited}`,
        suggestion:
          "Remove this content immediately. It may violate platform terms of service and advertising regulations.",
      });
    }

    return issues;
  }

  // ── Compliance Score ──────────────────────────────────────────────────────

  private calculateComplianceScore(
    hasDisclosure: boolean,
    disclosurePosition: "beginning" | "middle" | "end" | "none",
    misleadingClaims: string[],
    prohibitedContent: string[],
    issues: ComplianceIssue[]
  ): number {
    let score = 100;

    // No disclosure: -50
    if (!hasDisclosure) {
      score -= 50;
    } else {
      // Position penalties
      if (disclosurePosition === "end") score -= 20;
      else if (disclosurePosition === "middle") score -= 10;
      // "beginning" gets no penalty
    }

    // Misleading claims: -10 each, up to -30
    score -= Math.min(30, misleadingClaims.length * 10);

    // Prohibited content: -20 each, up to -40
    score -= Math.min(40, prohibitedContent.length * 20);

    // Additional penalty for critical issues beyond what's already counted
    const criticalCount = issues.filter((i) => i.severity === "critical").length;
    if (criticalCount > 1) {
      score -= (criticalCount - 1) * 5;
    }

    return Math.max(0, Math.min(100, score));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Multi-Jurisdiction Rule Engine
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Jurisdiction Rule Databases ────────────────────────────────────────────

const JURISDICTION_RULES: Record<string, JurisdictionRules> = {
  US_FTC: {
    jurisdiction: "US_FTC",
    requiredDisclosures: [
      {
        platform: "instagram",
        format: '#ad or "Paid partnership with [Business]" using native label',
        placement: "First line of caption, above the fold",
      },
      {
        platform: "tiktok",
        format: "#ad in description + Branded Content toggle enabled",
        placement: "Video description, visible before 'see more'",
      },
      {
        platform: "youtube",
        format: "'Includes paid promotion' checkbox + verbal disclosure within 30s",
        placement: "Video settings, first 30 seconds of video, and description",
      },
      {
        platform: "twitter",
        format: "#ad clearly in the post text",
        placement: "Within the post, not as last hashtag",
      },
      {
        platform: "facebook",
        format: "Branded Content tag + #ad or #sponsored",
        placement: "Post body, visible without clicking 'See more'",
      },
      {
        platform: "google",
        format: 'Statement: "I received [perk] in exchange for this review"',
        placement: "Within the review text body",
      },
      {
        platform: "generic",
        format: "Clear and conspicuous disclosure of material connection",
        placement: "Before any endorsement claim, visible without additional action",
      },
    ],
    prohibitions: [
      "Undisclosed material connections between endorsers and businesses",
      "Fake testimonials or fabricated experiences",
      "Misleading health, safety, or efficacy claims without substantiation",
      "Deceptive pricing or availability claims",
      "Endorsements that do not reflect honest opinions",
      "Disclosure hidden behind 'see more', in hashtag blocks, or at end of content",
      "Using ambiguous abbreviations like #spon instead of #ad or #sponsored",
    ],
    ageRestrictions: {
      minAge: 13,
      requiresVerification: false,
    },
    dataProtection: {
      consentRequired: true,
      retentionDays: 730, // FTC recommends retaining records for 2 years
    },
  },

  UK_ASA: {
    jurisdiction: "UK_ASA",
    requiredDisclosures: [
      {
        platform: "instagram",
        format: '#ad at very start of caption, or "AD" as text overlay for Stories',
        placement: "First word or overlay — must be immediately obvious",
      },
      {
        platform: "tiktok",
        format: "#ad at start of description",
        placement: "First line of description, visible immediately",
      },
      {
        platform: "youtube",
        format: '"Ad" or "Paid promotion" verbal + in description + YouTube\'s paid promotion checkbox',
        placement: "First 30 seconds + description + video settings",
      },
      {
        platform: "twitter",
        format: "#ad at start of tweet",
        placement: "First word of tweet",
      },
      {
        platform: "generic",
        format: "Ad or Advertisement label, immediately identifiable",
        placement: "Before any content, not hidden or ambiguous",
      },
    ],
    prohibitions: [
      "Ads that are not obviously identifiable as ads",
      "Hidden or buried disclosure",
      '#gifted without clear #ad label when there is a commercial relationship',
      "Misleading claims about products or services",
      "Ads targeting children under 12 for products unsuitable for them",
      "Failure to label affiliate links as advertising",
    ],
    ageRestrictions: {
      minAge: 13,
      requiresVerification: true,
    },
    dataProtection: {
      consentRequired: true,
      retentionDays: 365, // UK GDPR
    },
  },

  EU_UCPD: {
    jurisdiction: "EU_UCPD",
    requiredDisclosures: [
      {
        platform: "instagram",
        format: "Clear 'advertising' or 'ad' label per local language requirements",
        placement: "Immediately visible, before any content",
      },
      {
        platform: "tiktok",
        format: "'Werbung' (DE), 'Publicite' (FR), 'Ad' (EN) — local language required",
        placement: "First line or overlay, local language of the target audience",
      },
      {
        platform: "youtube",
        format: "Verbal + written disclosure in local language, YouTube paid promotion checkbox",
        placement: "Within first 30 seconds and in video description",
      },
      {
        platform: "generic",
        format: "Advertisement identification in the language of the target audience",
        placement: "Immediately recognizable, before commercial content begins",
      },
    ],
    prohibitions: [
      "Hidden commercial intent (any undisclosed paid promotion)",
      "Fake reviews or review manipulation",
      "Misleading advertising about product characteristics",
      "Bait and switch tactics",
      "Pressure tactics or false urgency",
      "Exploitation of consumers' inexperience or credulity",
      "Non-compliance with local language disclosure requirements",
    ],
    ageRestrictions: {
      minAge: 16, // GDPR default, member states may lower to 13
      requiresVerification: true,
    },
    dataProtection: {
      consentRequired: true,
      retentionDays: 365, // GDPR
    },
  },

  CA_CSA: {
    jurisdiction: "CA_CSA",
    requiredDisclosures: [
      {
        platform: "instagram",
        format: '#ad or "Paid partnership" label — bilingual if targeting Quebec',
        placement: "First line of caption",
      },
      {
        platform: "tiktok",
        format: "#ad — bilingual disclosure for Quebec audience",
        placement: "Video description, first line",
      },
      {
        platform: "youtube",
        format: "Verbal disclosure + description + paid promotion checkbox",
        placement: "First 30 seconds and video description",
      },
      {
        platform: "generic",
        format: "Clear disclosure of material connection; bilingual in Quebec",
        placement: "Prominently placed, immediately visible",
      },
    ],
    prohibitions: [
      "Undisclosed material connections",
      "Misleading or deceptive advertising",
      "False testimonials",
      "Non-bilingual disclosure in Quebec campaigns",
      "Advertising to children under 13 (strict Quebec rules)",
      "False sense of urgency in promotions",
    ],
    ageRestrictions: {
      minAge: 13,
      requiresVerification: false,
    },
    dataProtection: {
      consentRequired: true,
      retentionDays: 730, // PIPEDA
    },
  },
};

// ─── Jurisdiction Engine Class ──────────────────────────────────────────────

export class JurisdictionEngine {
  private rules = JURISDICTION_RULES;

  /**
   * Get the available jurisdictions.
   */
  getAvailableJurisdictions(): string[] {
    return Object.keys(this.rules);
  }

  /**
   * Get rules for a specific jurisdiction.
   */
  getRules(jurisdiction: string): JurisdictionRules | null {
    return this.rules[jurisdiction] ?? null;
  }

  /**
   * Check content compliance against a specific jurisdiction's rules.
   */
  checkCompliance(
    content: string,
    jurisdiction: string,
    platform: string
  ): JurisdictionCheckResult {
    const rules = this.rules[jurisdiction];

    if (!rules) {
      return {
        jurisdiction,
        compliant: false,
        score: 0,
        issues: [
          {
            type: "incorrect_format",
            severity: "critical",
            description: `Unknown jurisdiction: ${jurisdiction}`,
            suggestion: `Use one of: ${Object.keys(this.rules).join(", ")}`,
          },
        ],
        requiredDisclosures: [],
        generatedDisclosure: null,
      };
    }

    const normalizedContent = content.toLowerCase();
    const normalizedPlatform = platform.toLowerCase();
    const issues: ComplianceIssue[] = [];
    let score = 100;

    // 1. Check for required disclosures
    const relevantDisclosures = rules.requiredDisclosures.filter(
      (d) => d.platform === normalizedPlatform || d.platform === "generic"
    );

    const disclosurePresent = this.hasAnyDisclosure(normalizedContent);

    if (!disclosurePresent) {
      score -= 50;
      issues.push({
        type: "missing_disclosure",
        severity: "critical",
        description: `No disclosure found. ${jurisdiction} requires: ${
          relevantDisclosures.map((d) => d.format).join(" OR ")
        }`,
        suggestion: `Add a clear disclosure per ${jurisdiction} guidelines.`,
      });
    }

    // 2. Check disclosure placement (beginning vs buried)
    if (disclosurePresent) {
      const firstDisclosureIndex = this.findFirstDisclosureIndex(normalizedContent);
      if (firstDisclosureIndex > Math.min(200, normalizedContent.length * 0.2)) {
        score -= 15;
        issues.push({
          type: "buried_disclosure",
          severity: "warning",
          description: `Disclosure appears too far into the content (position ${firstDisclosureIndex}). ${jurisdiction} requires prominent placement.`,
          suggestion: relevantDisclosures[0]?.placement ?? "Place disclosure at the very beginning.",
        });
      }
    }

    // 3. Check for prohibitions
    for (const prohibition of rules.prohibitions) {
      const prohibitionLower = prohibition.toLowerCase();
      // Extract key phrases from prohibition for matching
      const keywords = this.extractProhibitionKeywords(prohibitionLower);
      const matchCount = keywords.filter((kw) => normalizedContent.includes(kw)).length;
      if (keywords.length > 0 && matchCount >= Math.ceil(keywords.length * 0.6)) {
        score -= 20;
        issues.push({
          type: "prohibited_content",
          severity: "critical",
          description: `Potential violation: ${prohibition}`,
          suggestion: `Review and remove content that may violate ${jurisdiction} rules.`,
        });
      }
    }

    // 4. EU / Canada specific: language checks
    if (jurisdiction === "EU_UCPD") {
      // EU requires disclosure in local language — we can only warn
      issues.push({
        type: "incorrect_format",
        severity: "info",
        description:
          "EU UCPD requires disclosure in the local language of the target audience.",
        suggestion:
          "Ensure the disclosure is provided in the primary language of your target audience (e.g., 'Werbung' in Germany, 'Publicite' in France).",
      });
    }

    if (jurisdiction === "CA_CSA" && normalizedPlatform !== "generic") {
      issues.push({
        type: "incorrect_format",
        severity: "info",
        description:
          "Canadian Standards Association: if targeting Quebec, disclosure must be bilingual (English + French).",
        suggestion:
          "For Quebec audiences, provide disclosure in both English and French.",
      });
    }

    score = Math.max(0, Math.min(100, score));

    return {
      jurisdiction,
      compliant: issues.filter((i) => i.severity === "critical").length === 0,
      score,
      issues,
      requiredDisclosures: relevantDisclosures,
      generatedDisclosure: this.injectDisclosure(platform, jurisdiction),
    };
  }

  /**
   * Get the required disclosures for a given platform and jurisdiction.
   */
  getRequiredDisclosures(
    platform: string,
    jurisdiction: string
  ): { platform: string; format: string; placement: string }[] {
    const rules = this.rules[jurisdiction];
    if (!rules) return [];

    const normalizedPlatform = platform.toLowerCase();
    return rules.requiredDisclosures.filter(
      (d) => d.platform === normalizedPlatform || d.platform === "generic"
    );
  }

  /**
   * Auto-generate the correct disclosure text for a platform + jurisdiction combination.
   */
  injectDisclosure(platform: string, jurisdiction: string, businessName?: string): string {
    const normalizedPlatform = platform.toLowerCase();
    const biz = businessName ?? "[Business Name]";

    // Platform-specific disclosure generation
    const disclosureMap: Record<string, Record<string, string>> = {
      US_FTC: {
        instagram: `#ad | Paid partnership with ${biz}`,
        tiktok: `#ad | Sponsored by ${biz}`,
        youtube: `This video includes paid promotion. Sponsored by ${biz}.`,
        twitter: `#ad Sponsored by ${biz}`,
        facebook: `#sponsored | Paid partnership with ${biz}`,
        google: `Disclosure: I received a perk from ${biz} in exchange for sharing my honest experience.`,
        generic: `#ad | Sponsored by ${biz}`,
      },
      UK_ASA: {
        instagram: `AD | Paid partnership with ${biz}`,
        tiktok: `#ad Paid partnership with ${biz}`,
        youtube: `AD — This video is a paid promotion with ${biz}.`,
        twitter: `#ad ${biz}`,
        generic: `AD | ${biz}`,
      },
      EU_UCPD: {
        instagram: `Werbung/Ad | ${biz}`,
        tiktok: `#ad | ${biz}`,
        youtube: `Werbung/Ad — Sponsored by ${biz}.`,
        generic: `Advertisement | ${biz}`,
      },
      CA_CSA: {
        instagram: `#ad / #pub | Paid partnership with / Partenariat payé avec ${biz}`,
        tiktok: `#ad / #pub | ${biz}`,
        youtube: `This video includes paid promotion / Cette vidéo inclut une promotion payée. ${biz}`,
        generic: `#ad / #pub | ${biz}`,
      },
    };

    const jurisdictionMap = disclosureMap[jurisdiction];
    if (!jurisdictionMap) return `#ad | Sponsored by ${biz}`;

    return jurisdictionMap[normalizedPlatform] ?? jurisdictionMap["generic"] ?? `#ad | Sponsored by ${biz}`;
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private hasAnyDisclosure(content: string): boolean {
    const disclosureTerms = [
      "#ad", "#sponsored", "#partner", "#paidpartnership", "#collab",
      "paid partnership", "sponsored by", "ad:", "gifted", "disclosure",
      "comped", "complimentary", "branded content", "paid promotion",
      "affiliate", "werbung", "publicite", "#pub", "advertisement",
    ];
    return disclosureTerms.some((term) => content.includes(term));
  }

  private findFirstDisclosureIndex(content: string): number {
    const disclosureTerms = [
      "#ad", "#sponsored", "ad:", "sponsored", "paid partnership",
      "disclosure", "#pub", "werbung", "publicite", "advertisement",
    ];
    let minIndex = content.length;
    for (const term of disclosureTerms) {
      const idx = content.indexOf(term);
      if (idx !== -1 && idx < minIndex) {
        minIndex = idx;
      }
    }
    return minIndex === content.length ? -1 : minIndex;
  }

  private extractProhibitionKeywords(prohibition: string): string[] {
    const stopWords = new Set([
      "the", "a", "an", "in", "for", "of", "to", "and", "or", "be", "is",
      "are", "was", "were", "that", "with", "from", "any", "about", "not",
      "no", "may", "can", "than", "their", "its", "this", "by",
    ]);
    return prohibition
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Audit Trail
// ═══════════════════════════════════════════════════════════════════════════════

// ─── In-Memory Store ────────────────────────────────────────────────────────

const auditStore = new Map<string, AuditRecord>();
const MAX_AUDIT_RECORDS = 100_000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateAuditId(): string {
  return `audit_${crypto.randomUUID()}`;
}

// ─── Audit Trail Class ──────────────────────────────────────────────────────

export class AuditTrail {
  /**
   * Record a compliance check with full details.
   * Returns the created AuditRecord.
   */
  record(params: {
    entityType: AuditRecord["entityType"];
    entityId: string;
    businessId: string;
    jurisdiction: string;
    checkType: AuditRecord["checkType"];
    result: ContentScanResult | JurisdictionCheckResult;
    complianceScore: number;
    passed: boolean;
    reviewedBy?: "system" | "manual";
    metadata?: Record<string, unknown>;
  }): AuditRecord {
    const record: AuditRecord = {
      id: generateAuditId(),
      timestamp: new Date().toISOString(),
      entityType: params.entityType,
      entityId: params.entityId,
      businessId: params.businessId,
      jurisdiction: params.jurisdiction,
      checkType: params.checkType,
      result: params.result,
      complianceScore: params.complianceScore,
      passed: params.passed,
      reviewedBy: params.reviewedBy ?? "system",
      metadata: params.metadata ?? {},
    };

    auditStore.set(record.id, record);

    // Evict oldest records if over limit
    if (auditStore.size > MAX_AUDIT_RECORDS) {
      const keys = Array.from(auditStore.keys());
      const evictCount = Math.floor(MAX_AUDIT_RECORDS * 0.1);
      for (let i = 0; i < evictCount; i++) {
        auditStore.delete(keys[i]);
      }
    }

    return record;
  }

  /**
   * Get audit history for a specific entity (campaign/submission).
   * Optionally filter by business ID.
   */
  getHistory(
    entityId: string,
    options: { businessId?: string; limit?: number } = {}
  ): AuditRecord[] {
    const limit = options.limit ?? 100;
    const results: AuditRecord[] = [];

    for (const record of auditStore.values()) {
      if (record.entityId !== entityId) continue;
      if (options.businessId && record.businessId !== options.businessId) continue;
      results.push(record);
      if (results.length >= limit) break;
    }

    return results.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Generate a compliance report for a business over a time period.
   */
  generateReport(
    businessId: string,
    periodStart: string,
    periodEnd: string
  ): ComplianceReport {
    const startDate = new Date(periodStart).getTime();
    const endDate = new Date(periodEnd).getTime();

    const records: AuditRecord[] = [];
    for (const record of auditStore.values()) {
      if (record.businessId !== businessId) continue;
      const recordTime = new Date(record.timestamp).getTime();
      if (recordTime >= startDate && recordTime <= endDate) {
        records.push(record);
      }
    }

    const totalChecks = records.length;
    const passedChecks = records.filter((r) => r.passed).length;
    const failedChecks = totalChecks - passedChecks;
    const averageScore =
      totalChecks > 0
        ? Math.round(records.reduce((sum, r) => sum + r.complianceScore, 0) / totalChecks)
        : 0;

    // Collect all critical issues
    const criticalIssues: ComplianceIssue[] = [];
    const issueTypeCounts = new Map<string, number>();

    for (const record of records) {
      const result = record.result;
      const issues = "issues" in result ? result.issues : [];
      for (const issue of issues) {
        if (issue.severity === "critical") {
          criticalIssues.push(issue);
        }
        const typeKey = issue.type;
        issueTypeCounts.set(typeKey, (issueTypeCounts.get(typeKey) ?? 0) + 1);
      }
    }

    // Top issue types
    const topIssueTypes = Array.from(issueTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Jurisdiction breakdown
    const jurisdictionMap = new Map<
      string,
      { checks: number; totalScore: number; passed: number }
    >();
    for (const record of records) {
      const existing = jurisdictionMap.get(record.jurisdiction) ?? {
        checks: 0,
        totalScore: 0,
        passed: 0,
      };
      existing.checks++;
      existing.totalScore += record.complianceScore;
      if (record.passed) existing.passed++;
      jurisdictionMap.set(record.jurisdiction, existing);
    }

    const jurisdictionBreakdown = Array.from(jurisdictionMap.entries()).map(
      ([jurisdiction, data]) => ({
        jurisdiction,
        checks: data.checks,
        averageScore: Math.round(data.totalScore / data.checks),
        passed: data.passed,
      })
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      averageScore,
      topIssueTypes,
      criticalIssues
    );

    return {
      businessId,
      generatedAt: new Date().toISOString(),
      periodStart,
      periodEnd,
      totalChecks,
      passedChecks,
      failedChecks,
      averageScore,
      criticalIssues: criticalIssues.slice(0, 20), // Limit for report size
      topIssueTypes,
      jurisdictionBreakdown,
      recommendations,
    };
  }

  /**
   * Get the overall compliance score for a business based on recent audit records.
   * Looks at the last N checks and calculates a weighted average.
   */
  getComplianceScore(
    businessId: string,
    options: { lookback?: number } = {}
  ): {
    score: number;
    totalChecks: number;
    recentPassRate: number;
    trend: "improving" | "stable" | "declining";
  } {
    const lookback = options.lookback ?? 50;

    const records: AuditRecord[] = [];
    for (const record of auditStore.values()) {
      if (record.businessId === businessId) {
        records.push(record);
      }
    }

    if (records.length === 0) {
      return { score: 100, totalChecks: 0, recentPassRate: 1, trend: "stable" };
    }

    // Sort by timestamp descending
    records.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const recent = records.slice(0, lookback);
    const score = Math.round(
      recent.reduce((sum, r) => sum + r.complianceScore, 0) / recent.length
    );
    const recentPassRate =
      recent.filter((r) => r.passed).length / recent.length;

    // Trend: compare first half vs second half of recent records
    let trend: "improving" | "stable" | "declining" = "stable";
    if (recent.length >= 6) {
      const half = Math.floor(recent.length / 2);
      const newerHalf = recent.slice(0, half);
      const olderHalf = recent.slice(half);
      const newerAvg =
        newerHalf.reduce((s, r) => s + r.complianceScore, 0) / newerHalf.length;
      const olderAvg =
        olderHalf.reduce((s, r) => s + r.complianceScore, 0) / olderHalf.length;
      const diff = newerAvg - olderAvg;
      if (diff > 5) trend = "improving";
      else if (diff < -5) trend = "declining";
    }

    return { score, totalChecks: records.length, recentPassRate, trend };
  }

  /**
   * Clear all audit records. Useful for testing.
   */
  clear(): void {
    auditStore.clear();
  }

  /**
   * Get the total number of audit records.
   */
  size(): number {
    return auditStore.size;
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private generateRecommendations(
    averageScore: number,
    topIssueTypes: { type: string; count: number }[],
    criticalIssues: ComplianceIssue[]
  ): string[] {
    const recommendations: string[] = [];

    if (averageScore < 50) {
      recommendations.push(
        "Overall compliance score is critically low. Prioritize adding FTC-required disclosures to all campaign content."
      );
    } else if (averageScore < 75) {
      recommendations.push(
        "Compliance score has room for improvement. Review the top issues below and address them systematically."
      );
    }

    // Recommend based on top issues
    for (const { type, count } of topIssueTypes.slice(0, 3)) {
      if (type === "missing_disclosure" && count > 2) {
        recommendations.push(
          `${count} instances of missing disclosure found. Implement automatic disclosure injection for all campaign content.`
        );
      }
      if (type === "buried_disclosure" && count > 2) {
        recommendations.push(
          `${count} instances of buried disclosures. Train content creators to place #ad or disclosure at the very beginning of posts.`
        );
      }
      if (type === "misleading_claim" && count > 1) {
        recommendations.push(
          `${count} potentially misleading claims detected. Establish a content review checklist to catch unsubstantiated claims before publishing.`
        );
      }
      if (type === "prohibited_content" && count > 0) {
        recommendations.push(
          `${count} instances of prohibited content. Implement stricter content guidelines and pre-publish review.`
        );
      }
    }

    if (criticalIssues.length > 5) {
      recommendations.push(
        `${criticalIssues.length} critical compliance issues detected in this period. Consider scheduling a compliance training session.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Compliance is in good shape. Continue monitoring and keep disclosure practices up to date."
      );
    }

    return recommendations;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Exports
// ═══════════════════════════════════════════════════════════════════════════════

export const contentScanner = new ContentScanner();
export const jurisdictionEngine = new JurisdictionEngine();
export const auditTrail = new AuditTrail();
