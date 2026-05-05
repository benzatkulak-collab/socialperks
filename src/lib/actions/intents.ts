/**
 * Action library v2 — intent classification layer.
 *
 * The base library in packages/shared/src/platforms.ts has 125
 * actions across 25 platforms with type / effort / value fields.
 * Those are mechanical descriptors — what the action IS. They tell
 * an agent NOTHING about what shop-owner goal the action serves,
 * which is what the agent's principal actually asked about.
 *
 * This module overlays an intent classification on top — answers
 * "which actions are good for {goal}?" where goal is a phrase a
 * shop owner would actually say. The agent matches user intent →
 * goal → action set without us forcing the agent to learn the
 * effort/value math.
 *
 * Why not bake intents into the base data file:
 *   - That file is large + tested. Mutating it churns more than
 *     it should.
 *   - Intents are a derived view; many actions serve multiple
 *     intents (an IG Reel serves both "drive new customers" AND
 *     "build social proof"). One-to-many fits a separate map
 *     better than nested fields on each action.
 *
 * Usage:
 *   const goals = listGoals();
 *   // → ["new_customers", "build_social_proof", "boost_review_score", ...]
 *
 *   const actions = getActionsForGoal("new_customers");
 *   // → ranked list of (platformId, actionId) tuples
 */

import { ALL_ACTIONS, PLATFORMS } from "@social-perks/shared/platforms";

export type Goal =
  | "new_customers"
  | "build_social_proof"
  | "boost_review_score"
  | "deepen_loyalty"
  | "viral_reach"
  | "in_store_traffic"
  | "online_orders"
  | "low_effort_starter"
  | "high_engagement_post"
  | "ftc_compliant_review";

export interface GoalDefinition {
  id: Goal;
  /** Plain-English label a shop owner would recognize. */
  label: string;
  /** One-sentence agent-facing description: "use this when the user asks about X". */
  description: string;
  /** Action selection rules — see resolveActionsForGoal. */
  rules: GoalRule;
  /** Suggested perk shape for this goal (helps the AI recommend coherent rewards). */
  suggestedPerk: { type: "pct" | "dol" | "free"; valueRange: [number, number]; rationale: string };
}

interface GoalRule {
  /** Must match at least one action type. */
  anyType?: ActionTypeUnion[];
  /** Must match at least one platform id. */
  anyPlatform?: string[];
  /** Effort range — typical shop owners want low-effort for first-launch. */
  effortMax?: number;
  /** Value floor — filters out trivial engagement when reach is the goal. */
  valueMin?: number;
  /** Optional explicit allow-list of action ids that ALWAYS match. */
  alwaysInclude?: string[];
  /** Optional explicit deny-list. */
  exclude?: string[];
  /** Whether incentivizable actions are required (Google reviews aren't). */
  incentivizableOnly?: boolean;
}

type ActionTypeUnion = "content" | "review" | "engage" | "share" | "referral";

const GOALS: GoalDefinition[] = [
  {
    id: "new_customers",
    label: "Get new customers in the door",
    description:
      "Use when the user asks how to grow foot traffic, get more first-time visitors, or 'get more customers'. Prioritizes high-reach social posts on platforms with location-aware discovery.",
    rules: {
      anyType: ["content", "share"],
      anyPlatform: ["ig", "tt", "fb", "go", "yp"],
      effortMax: 3,
      valueMin: 1.0,
      incentivizableOnly: true,
    },
    suggestedPerk: {
      type: "pct",
      valueRange: [10, 20],
      rationale: "Mid-tier discount big enough to motivate posting, small enough to absorb on a first-time visit",
    },
  },
  {
    id: "build_social_proof",
    label: "Build social proof",
    description:
      "Use when the user wants more visible reviews, photos, or testimonials. Prioritizes review platforms and long-form content that lives forever as an SEO/AEO surface.",
    rules: {
      anyType: ["content", "review"],
      anyPlatform: ["go", "yp", "tr", "ig", "tt"],
      valueMin: 2,
    },
    suggestedPerk: {
      type: "dol",
      valueRange: [3, 8],
      rationale: "Small fixed reward — keeps social proof authentic; FTC requires disclosure regardless",
    },
  },
  {
    id: "boost_review_score",
    label: "Boost Google/Yelp review score",
    description:
      "Use when the user mentions ratings, stars, or review score. Routes to platform-specific review actions. Note: reviews are NOT incentivizable per FTC; we still surface them but the perk must NOT be conditional on a positive rating.",
    rules: {
      anyType: ["review"],
      anyPlatform: ["go", "yp", "tr", "fa"],
      incentivizableOnly: false,
    },
    suggestedPerk: {
      type: "free",
      valueRange: [0, 0],
      rationale:
        "Free item for ANY review (positive or negative). Conditional rewards on positive ratings violate FTC and platform ToS.",
    },
  },
  {
    id: "deepen_loyalty",
    label: "Deepen loyalty with existing regulars",
    description:
      "Use when the user wants to reward repeat customers or build a regulars program. Prioritizes low-effort, high-frequency actions that fit a recurring visit pattern.",
    rules: {
      anyType: ["engage", "share", "content"],
      effortMax: 2,
      valueMin: 0.5,
      incentivizableOnly: true,
    },
    suggestedPerk: {
      type: "free",
      valueRange: [0, 0],
      rationale: "Free small item (coffee, side, etc.) — feels personal, costs little marginal",
    },
  },
  {
    id: "viral_reach",
    label: "Viral reach (high effort, high value)",
    description:
      "Use when the user wants the SINGLE post that goes furthest. Prioritizes Reels, TikTok videos, and Collab Posts — high effort but high value-per-completion.",
    rules: {
      anyType: ["content"],
      anyPlatform: ["ig", "tt", "yt"],
      effortMax: 4,
      valueMin: 3,
      incentivizableOnly: true,
    },
    suggestedPerk: {
      type: "pct",
      valueRange: [25, 50],
      rationale: "Bigger discount justifies the bigger creative ask; conversion math still works at <1% redemption",
    },
  },
  {
    id: "in_store_traffic",
    label: "Drive in-store visits this week",
    description:
      "Use when the user has slow days or a soft launch. Prioritizes location-tagged posts that signal 'I'm here right now' to the poster's friends.",
    rules: {
      anyType: ["content"],
      alwaysInclude: ["ig_st", "ig_sl", "ig_ss", "tt_vd", "fb_ck"],
      effortMax: 2,
      incentivizableOnly: true,
    },
    suggestedPerk: {
      type: "dol",
      valueRange: [3, 5],
      rationale: "Small dollar amount — covers an add-on item, motivates the in-the-moment post",
    },
  },
  {
    id: "online_orders",
    label: "Drive online / delivery orders",
    description:
      "Use when the user has online ordering and wants to push that channel specifically. Prioritizes screenshots-of-order content + DoorDash / Uber Eats reviews.",
    rules: {
      anyType: ["content", "review"],
      anyPlatform: ["ig", "tt", "ub", "dd"],
      effortMax: 2,
    },
    suggestedPerk: {
      type: "pct",
      valueRange: [10, 20],
      rationale: "Discount on next online order — cheap to fulfill, easy to attribute via promo code",
    },
  },
  {
    id: "low_effort_starter",
    label: "Lowest-friction first campaign",
    description:
      "Use as the default when the user has never run a campaign and just says 'help me get started'. Picks ONE action with effort ≤ 2 and broad platform coverage.",
    rules: {
      anyType: ["content", "share"],
      anyPlatform: ["ig", "fb"],
      effortMax: 2,
      incentivizableOnly: true,
    },
    suggestedPerk: {
      type: "pct",
      valueRange: [10, 15],
      rationale: "Conservative starter — small enough that absorbing 50 redemptions costs less than one Yelp ad",
    },
  },
  {
    id: "high_engagement_post",
    label: "High-engagement single post",
    description:
      "Use when the user wants the ONE post likely to get the most likes / comments. Prioritizes Reels and Carousels with proven engagement-per-impression.",
    rules: {
      anyType: ["content"],
      alwaysInclude: ["ig_rl", "ig_fc", "tt_vd", "ig_cb"],
      valueMin: 3,
      incentivizableOnly: true,
    },
    suggestedPerk: {
      type: "pct",
      valueRange: [15, 25],
      rationale: "Mid-tier — engagement is correlated with creator effort, so the perk should match",
    },
  },
  {
    id: "ftc_compliant_review",
    label: "Reviews that are FTC-safe",
    description:
      "Use when the user is in a regulated industry (financial, medical, legal) where review-incentivization is risky. Routes to non-conditional, disclosure-strict review actions only.",
    rules: {
      anyType: ["review"],
      anyPlatform: ["go", "yp", "tr"],
      incentivizableOnly: false,
    },
    suggestedPerk: {
      type: "free",
      valueRange: [0, 0],
      rationale: "Free token gift unconditional on review valence; counsel-reviewed safe pattern",
    },
  },
];

const GOALS_BY_ID = new Map(GOALS.map((g) => [g.id, g]));

export function listGoals(): GoalDefinition[] {
  return GOALS;
}

export function findGoal(id: string): GoalDefinition | null {
  return GOALS_BY_ID.get(id as Goal) ?? null;
}

export interface ScoredAction {
  platformId: string;
  platformName: string;
  platformIcon: string;
  actionId: string;
  label: string;
  type: ActionTypeUnion;
  effort: number;
  value: number;
  incentivizable: boolean;
  /** 0..1 — how strongly this action serves the goal. */
  goalFit: number;
}

/**
 * Resolve a goal to a ranked list of actions. Score = the action's
 * value field × goal-specific multipliers (alwaysInclude bonus,
 * effort cap penalty, etc.). The result is sorted descending so
 * the agent can take the top N as recommendations.
 */
export function getActionsForGoal(goalId: string, options: { limit?: number } = {}): ScoredAction[] {
  const goal = findGoal(goalId);
  if (!goal) return [];
  const limit = options.limit ?? 10;
  const rules = goal.rules;

  const platformIcon = (id: string) => PLATFORMS.find((p) => p.id === id)?.icon ?? "📌";
  const platformName = (id: string) => PLATFORMS.find((p) => p.id === id)?.name ?? id;

  const scored: ScoredAction[] = [];
  for (const action of ALL_ACTIONS) {
    if (rules.exclude?.includes(action.id)) continue;
    const isAlwaysIncluded = rules.alwaysInclude?.includes(action.id);
    const matchesType = !rules.anyType || rules.anyType.includes(action.type);
    const matchesPlatform = !rules.anyPlatform || rules.anyPlatform.includes(action.platformId);
    const passesEffort = rules.effortMax === undefined || action.effort <= rules.effortMax;
    const passesValue = rules.valueMin === undefined || action.value >= rules.valueMin;
    const passesIncentiv = !rules.incentivizableOnly || action.incentivizable;

    if (!isAlwaysIncluded && !(matchesType && matchesPlatform && passesEffort && passesValue && passesIncentiv)) {
      continue;
    }

    // Score: base value, +alwaysInclude bonus, scaled to 0..1.
    let score = action.value;
    if (isAlwaysIncluded) score *= 1.5;
    // Normalize: max action value across the library is ~10 (Google Detailed Review w/ Photos).
    const goalFit = Math.min(1, score / 10);

    scored.push({
      platformId: action.platformId,
      platformName: platformName(action.platformId),
      platformIcon: platformIcon(action.platformId),
      actionId: action.id,
      label: action.label,
      type: action.type,
      effort: action.effort,
      value: action.value,
      incentivizable: action.incentivizable,
      goalFit,
    });
  }

  scored.sort((a, b) => b.goalFit - a.goalFit);
  return scored.slice(0, limit);
}
