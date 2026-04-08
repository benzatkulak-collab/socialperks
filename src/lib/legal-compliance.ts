// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Legal Compliance Guard
//
// Enforces the separation between incentivizable actions (social media posts,
// shares, follows, etc.) and non-incentivizable actions (reviews on platforms
// that prohibit incentivized reviews: Google, Yelp, TripAdvisor, Google Maps).
//
// This module is the single source of truth for what can and cannot be
// incentivized. It is used by perk programs, campaigns, the AI agent,
// and the AI review pipeline.
// ══════════════════════════════════════════════════════════════════════════════

import { PLATFORMS, ALL_ACTIONS, findAction, findPlatform } from "./platforms";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LegalWarning {
  actionId: string;
  actionLabel: string;
  platform: string;
  severity: "blocked" | "warning" | "info";
  message: string;
  legalBasis: string;
  recommendation: string;
}

export interface ComplianceScanResult {
  safe: boolean;
  warnings: LegalWarning[];
  blockedActions: string[];
  safeActions: string[];
  reviewActions: string[]; // non-incentivizable review actions found
  suggestion: string; // what to do instead
}

// ─── Non-Incentivizable Action Registry ─────────────────────────────────────

/** Platform-level legal basis for review prohibitions. */
const REVIEW_PROHIBITION_BASIS: Record<string, string> = {
  go: "Google's Review Policy prohibits businesses from offering incentives in exchange for reviews. Violations can result in review removal and listing penalties.",
  gm: "Google Maps follows Google's Review Policy which prohibits incentivized reviews. Reviews may be removed and business listing penalized.",
  yp: "Yelp's Content Guidelines explicitly prohibit businesses from offering incentives for reviews. Violations trigger Consumer Alerts on business pages.",
  ta: "TripAdvisor's Review Policy prohibits incentivized reviews. Violations can result in ranking penalties, fraud badges, and review removal.",
};

/** Alternative actions suggested when a review action is blocked. */
const REVIEW_ALTERNATIVES: Record<string, { actionIds: string[]; explanation: string }> = {
  go_rv: {
    actionIds: ["go_ph", "go_qa", "ig_rl", "fb_rc"],
    explanation: "Instead of incentivizing Google Reviews, incentivize Google Photos uploads and separately ask for reviews without an incentive.",
  },
  go_rd: {
    actionIds: ["go_ph", "go_qa", "ig_fp", "fb_rc"],
    explanation: "Instead of incentivizing detailed Google Reviews, incentivize Google Photos and Q&A engagement. Ask for detailed reviews separately without tying to rewards.",
  },
  go_rp: {
    actionIds: ["go_ph", "gm_ph", "ig_fc", "fb_rc"],
    explanation: "Instead of incentivizing Google Review + Photos, incentivize Google/Maps photo uploads directly and ask for reviews separately.",
  },
  gm_rv: {
    actionIds: ["gm_ph", "gm_qa", "gm_li", "fb_rc"],
    explanation: "Instead of incentivizing Google Maps Reviews, incentivize photo uploads, Q&A answers, and list additions on Maps.",
  },
  gm_rp: {
    actionIds: ["gm_ph", "gm_qa", "gm_li", "ig_rl"],
    explanation: "Instead of incentivizing Google Maps Review + Photos, incentivize Maps photo uploads and other engagement actions.",
  },
  yp_rv: {
    actionIds: ["yp_ph", "yp_ci", "go_ph", "fb_rc"],
    explanation: "Instead of incentivizing Yelp Reviews, incentivize Yelp photo uploads and check-ins. Redirect review incentives to Facebook Recommendations.",
  },
  yp_rp: {
    actionIds: ["yp_ph", "yp_ci", "ig_fp", "fb_rc"],
    explanation: "Instead of incentivizing Yelp Review + Photos, incentivize Yelp photo uploads separately and use Facebook for incentivized recommendations.",
  },
  ta_rv: {
    actionIds: ["ig_rl", "fb_rc", "go_ph", "nd_rc"],
    explanation: "Instead of incentivizing TripAdvisor Reviews, incentivize social media content about the experience. Ask for TripAdvisor reviews separately without rewards.",
  },
  ta_rp: {
    actionIds: ["ig_fc", "fb_rc", "tt_vd", "nd_rc"],
    explanation: "Instead of incentivizing TripAdvisor Review + Photos, incentivize Instagram carousels or TikTok videos of the experience.",
  },
};

// ─── FTC Disclosure Templates ───────────────────────────────────────────────

const DISCLOSURE_TEMPLATES: Record<string, Record<string, string>> = {
  ig: {
    content: "#ad | I received a perk from [Business] for this post. All opinions are my own.",
    engage: "#ad | Partnered with [Business].",
    share: "#ad | [Business] offered a perk for sharing.",
    referral: "#ad | I earn a reward if you visit [Business] through my link.",
  },
  tt: {
    content: "#ad I received a perk from [Business] for this video. Honest opinions only!",
    engage: "#ad Partnered with [Business].",
    share: "#ad [Business] perk for sharing.",
    referral: "#ad I get a reward when you visit [Business].",
  },
  fb: {
    content: "Sponsored | I received a perk from [Business] for this post.",
    review: "Disclosure: I received a perk from [Business] in exchange for this recommendation. All opinions are honest.",
    engage: "Sponsored by [Business].",
    share: "Sponsored | [Business] offered a perk for sharing.",
    referral: "Referral: I receive a reward if you visit [Business].",
  },
  yt: {
    content: "This video includes a paid promotion. I received a perk from [Business]. All opinions are my own.",
    engage: "Sponsored by [Business].",
  },
  xw: {
    content: "#ad Received a perk from [Business]. Honest take.",
    engage: "#ad [Business] partner.",
    share: "#ad Sharing for a [Business] perk.",
  },
  li: {
    content: "#ad | Disclosure: I received a perk from [Business] for this content.",
    engage: "#ad | Partnered with [Business].",
  },
  nd: {
    review: "Disclosure: I received a perk from [Business] for this recommendation. My experience and opinions are genuine.",
    content: "Disclosure: [Business] offered a perk for this post.",
  },
  rd: {
    content: "[Ad/Sponsored] Disclosure: I received a perk from [Business] for this post.",
  },
  default: {
    content: "#ad | I received a perk from [Business]. All opinions are my own.",
    review: "Disclosure: I received a perk from [Business] in exchange for sharing my honest experience.",
    engage: "#ad | Partnered with [Business].",
    share: "#ad | [Business] perk for sharing.",
    referral: "#ad | I earn a reward if you visit [Business].",
  },
};

// ─── Legal Compliance Guard Class ───────────────────────────────────────────

export class LegalComplianceGuard {
  /**
   * Check if a specific action can be legally incentivized.
   */
  isIncentivizable(actionId: string): boolean {
    const action = findAction(actionId);
    if (!action) return true; // Unknown actions default to incentivizable
    return action.incentivizable;
  }

  /**
   * Scan a perk program's allowed action list for legal issues.
   */
  scanProgram(allowedActions: string[]): ComplianceScanResult {
    return this._scanActions(allowedActions);
  }

  /**
   * Scan a campaign's action list for legal issues.
   */
  scanCampaign(actions: string[]): ComplianceScanResult {
    return this._scanActions(actions);
  }

  /**
   * Get specific warnings for a single action.
   */
  getWarningsForAction(actionId: string): LegalWarning[] {
    const action = findAction(actionId);
    if (!action) return [];

    if (action.incentivizable) return [];

    const platform = findPlatform(action.platformId);
    const platformName = platform?.name ?? action.platformId;
    const legalBasis = REVIEW_PROHIBITION_BASIS[action.platformId] ?? "Platform terms of service prohibit incentivized reviews.";

    return [{
      actionId: action.id,
      actionLabel: action.label,
      platform: platformName,
      severity: "blocked",
      message: `Incentivizing "${action.label}" on ${platformName} is prohibited by ${platformName}'s terms of service.`,
      legalBasis,
      recommendation: REVIEW_ALTERNATIVES[actionId]?.explanation ?? `Remove this action from incentivized campaigns. Ask for ${platformName} reviews separately without tying to any reward.`,
    }];
  }

  /**
   * Suggest legal alternatives for a blocked action.
   */
  getAlternatives(blockedActionId: string): {
    alternatives: Array<{ actionId: string; label: string; platform: string; reason: string }>;
    explanation: string;
  } {
    const alt = REVIEW_ALTERNATIVES[blockedActionId];
    const action = findAction(blockedActionId);
    const platformName = action ? (findPlatform(action.platformId)?.name ?? action.platformId) : "Unknown";

    if (!alt) {
      return {
        alternatives: [
          { actionId: "ig_rl", label: "Instagram Reel", platform: "Instagram", reason: "High-visibility visual content that drives discovery" },
          { actionId: "fb_rc", label: "Facebook Recommendation", platform: "Facebook", reason: "Facebook allows incentivized recommendations with disclosure" },
          { actionId: "go_ph", label: "Google Photos", platform: "Google", reason: "Photo uploads improve your Google listing without review policy risk" },
        ],
        explanation: `Instead of incentivizing ${platformName} reviews, focus on social media content actions and ask for reviews separately without any incentive.`,
      };
    }

    const alternatives = alt.actionIds.map((id) => {
      const a = findAction(id);
      const p = a ? findPlatform(a.platformId) : null;
      return {
        actionId: id,
        label: a?.label ?? id,
        platform: p?.name ?? "Unknown",
        reason: `Safe alternative to incentivized ${platformName} reviews`,
      };
    });

    return {
      alternatives,
      explanation: alt.explanation,
    };
  }

  /**
   * Generate the correct FTC disclosure text for a platform/action combination.
   */
  generateDisclosure(platformId: string, actionType: string): string {
    const platformTemplates = DISCLOSURE_TEMPLATES[platformId] ?? DISCLOSURE_TEMPLATES.default;
    return platformTemplates[actionType] ?? DISCLOSURE_TEMPLATES.default[actionType] ?? DISCLOSURE_TEMPLATES.default.content;
  }

  /**
   * Generate a plain-English legal briefing for a business type.
   */
  getLegalBriefing(businessType: string): {
    incentivizableActions: string[];
    nonIncentivizableActions: string[];
    explanation: string;
    reviewStrategy: string;
    fullBriefing: string;
  } {
    const safe: string[] = [];
    const blocked: string[] = [];

    // Collect relevant actions based on typical business channels
    const relevantPlatforms = this._getRelevantPlatforms(businessType);

    for (const platform of PLATFORMS) {
      if (!relevantPlatforms.includes(platform.id)) continue;
      for (const action of platform.actions) {
        const label = `${platform.name}: ${action.label}`;
        if (action.incentivizable) {
          safe.push(label);
        } else {
          blocked.push(label);
        }
      }
    }

    const explanation = this._buildExplanation(businessType, safe, blocked);
    const reviewStrategy = this._buildReviewStrategy(businessType);

    const canDo = safe.slice(0, 10).map((a) => `   - ${a} with #ad`).join("\n");
    const cannotDo = blocked.map((a) => `   - ${a}`).join("\n");

    const fullBriefing = [
      `Legal Compliance Briefing for: ${businessType}`,
      "",
      "YOU CAN offer perks/cash back for:",
      canDo,
      ...(safe.length > 10 ? [`   ... and ${safe.length - 10} more actions`] : []),
      "",
      ...(blocked.length > 0 ? [
        "YOU CANNOT offer perks/cash back for:",
        cannotDo,
        "",
      ] : []),
      "HOW TO STILL GET REVIEWS:",
      `   ${reviewStrategy}`,
    ].join("\n");

    return {
      incentivizableActions: safe,
      nonIncentivizableActions: blocked,
      explanation,
      reviewStrategy,
      fullBriefing,
    };
  }

  // ─── Private Methods ────────────────────────────────────────────────────

  private _scanActions(actionIds: string[]): ComplianceScanResult {
    const warnings: LegalWarning[] = [];
    const blockedActions: string[] = [];
    const safeActions: string[] = [];
    const reviewActions: string[] = [];

    for (const actionId of actionIds) {
      const action = findAction(actionId);
      if (!action) {
        safeActions.push(actionId);
        continue;
      }

      if (!action.incentivizable) {
        blockedActions.push(actionId);
        reviewActions.push(actionId);

        const platform = findPlatform(action.platformId);
        const platformName = platform?.name ?? action.platformId;
        const legalBasis = REVIEW_PROHIBITION_BASIS[action.platformId] ?? "Platform TOS prohibits incentivized reviews.";

        warnings.push({
          actionId: action.id,
          actionLabel: action.label,
          platform: platformName,
          severity: "blocked",
          message: `Cannot incentivize "${action.label}" on ${platformName}. This violates ${platformName}'s terms of service.`,
          legalBasis,
          recommendation: REVIEW_ALTERNATIVES[actionId]?.explanation
            ?? `Remove this action and ask for ${platformName} reviews separately without any incentive.`,
        });
      } else {
        safeActions.push(actionId);
      }
    }

    const safe = blockedActions.length === 0;
    let suggestion = "";

    if (!safe) {
      const blockedPlatforms = [...new Set(blockedActions.map((id) => {
        const a = findAction(id);
        return a ? (findPlatform(a.platformId)?.name ?? a.platformId) : "Unknown";
      }))];

      suggestion = `Remove incentivized review actions from ${blockedPlatforms.join(", ")}. ` +
        "You can still ask for reviews separately without tying them to any reward. " +
        "Consider replacing with photo uploads, check-ins, or social media content actions which are legally safe to incentivize.";
    }

    return {
      safe,
      warnings,
      blockedActions,
      safeActions,
      reviewActions,
      suggestion,
    };
  }

  private _getRelevantPlatforms(businessType: string): string[] {
    const lower = businessType.toLowerCase();
    const base = ["ig", "fb", "go", "gm"];

    if (lower.includes("restaurant") || lower.includes("food") || lower.includes("cafe") ||
        lower.includes("bakery") || lower.includes("coffee") || lower.includes("pizza")) {
      return [...base, "yp", "tt", "ta"];
    }
    if (lower.includes("hotel") || lower.includes("resort") || lower.includes("hospitality") ||
        lower.includes("travel") || lower.includes("tour")) {
      return [...base, "ta", "yp", "tt"];
    }
    if (lower.includes("roofer") || lower.includes("plumber") || lower.includes("contractor") ||
        lower.includes("hvac") || lower.includes("electrician") || lower.includes("painter") ||
        lower.includes("landscap")) {
      return [...base, "nd", "yp", "tt"];
    }
    if (lower.includes("yoga") || lower.includes("gym") || lower.includes("fitness") ||
        lower.includes("spa") || lower.includes("salon")) {
      return [...base, "yp", "tt", "nd"];
    }
    if (lower.includes("dental") || lower.includes("doctor") || lower.includes("vet") ||
        lower.includes("medical") || lower.includes("clinic")) {
      return [...base, "yp", "nd"];
    }

    return [...base, "yp", "tt", "nd", "ta"];
  }

  private _buildExplanation(businessType: string, safe: string[], blocked: string[]): string {
    if (blocked.length === 0) {
      return `All relevant marketing actions for ${businessType} businesses are safe to incentivize with proper FTC disclosure.`;
    }

    return `As a ${businessType}, you can incentivize ${safe.length} marketing actions across social media, content creation, ` +
      `and engagement. However, ${blocked.length} review actions on platforms that prohibit incentivized reviews ` +
      `(Google, Yelp, TripAdvisor, Google Maps) cannot be tied to rewards. ` +
      `You CAN still get reviews on these platforms by asking customers separately after they complete their social media actions.`;
  }

  private _buildReviewStrategy(_businessType: string): string {
    return "After a customer completes their incentivized social media posts, separately ask " +
      "\"We'd love a Google review if you have time!\" Do NOT tie any reward to the review. " +
      "This is legal and effective — customers who just posted about you are primed to leave positive reviews. " +
      "You can also send a follow-up email 24 hours later with a direct link to your Google review page.";
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────────

export const legalGuard = new LegalComplianceGuard();

/**
 * Quick helper: check if an action ID is incentivizable.
 */
export function isActionIncentivizable(actionId: string): boolean {
  return legalGuard.isIncentivizable(actionId);
}

/**
 * Get all non-incentivizable action IDs across all platforms.
 */
export function getNonIncentivizableActionIds(): string[] {
  return ALL_ACTIONS.filter((a) => !a.incentivizable).map((a) => a.id);
}
