// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Analytics Engine
//
// All analytics are derived views computed from the event store.
// No separate analytics database — events are the source of truth.
// This is the "10-year" pattern: store events, compute views on demand.
// ══════════════════════════════════════════════════════════════════════════════

import { eventStore, type PlatformEvent } from "./events";
import { campaignManager } from "./campaign-state-machine";
import { findAction, findPlatform } from "./platforms";

// ─── Analytics Types ────────────────────────────────────────────────────────

export interface AnalyticsSnapshot {
  period: { start: string; end: string };
  campaigns: {
    active: number;
    total: number;
    completionRate: number;
  };
  submissions: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  perks: {
    awarded: number;
    redeemed: number;
    totalValue: number;
  };
  topPlatforms: PlatformAnalytics[];
  topCampaigns: CampaignAnalyticsSummary[];
}

export interface PlatformAnalytics {
  platformId: string;
  platformName: string;
  completions: number;
  value: number;
}

export interface CampaignAnalyticsSummary {
  campaignId: string;
  name: string;
  completions: number;
  roi: number;
}

export interface DetailedCampaignAnalytics {
  campaignId: string;
  name: string;
  state: string;
  launchedAt: string;
  submissions: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
  };
  completions: number;
  perksAwarded: number;
  totalPerkValue: number;
  budgetSpent: number;
  budgetAllocated: number;
  budgetUtilization: number;
  platformBreakdown: PlatformAnalytics[];
  dailyCompletions: DailyCount[];
  avgTimeToApproval: number | null;
  conversionRate: number;
}

export interface PlatformBreakdown {
  platformId: string;
  platformName: string;
  platformIcon: string;
  platformColor: string;
  totalCompletions: number;
  totalValue: number;
  topActions: ActionAnalytics[];
  avgCompletionRate: number;
}

export interface ActionAnalytics {
  actionId: string;
  actionLabel: string;
  completions: number;
  value: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface ROIAnalysis {
  /** Estimated total dollar cost of perks distributed (percentage perks estimated at $5 avg). */
  totalPerkCost: number;
  /** Estimated dollar value of marketing actions received (from action value table). */
  estimatedMarketingValue: number;
  /** ROI ratio: marketingValue / perkCost. Both values in dollars. */
  roi: number;
  costPerCompletion: number;
  valuePerCompletion: number;
  campaignCount: number;
  completionCount: number;
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Filter events to a specific business by checking the actorId or
 * the businessId field in event data.
 */
function filterByBusiness(
  events: PlatformEvent[],
  businessId: string
): PlatformEvent[] {
  return events.filter(
    (e) =>
      e.actorId === businessId ||
      e.data.businessId === businessId
  );
}

/**
 * Group events by date (YYYY-MM-DD).
 */
function groupByDate(events: PlatformEvent[]): Map<string, PlatformEvent[]> {
  const groups = new Map<string, PlatformEvent[]>();
  for (const e of events) {
    const date = e.timestamp.slice(0, 10); // YYYY-MM-DD
    const existing = groups.get(date);
    if (existing) {
      existing.push(e);
    } else {
      groups.set(date, [e]);
    }
  }
  return groups;
}

/**
 * Extract the platformId from a submission event's data.
 */
function getPlatformIdFromEvent(event: PlatformEvent): string | null {
  // Check event data for platformId or actionId
  if (typeof event.data.platformId === "string") {
    return event.data.platformId;
  }
  if (typeof event.data.actionId === "string") {
    const action = findAction(event.data.actionId as string);
    if (action) return action.platformId;
  }
  return null;
}

/**
 * Get the marketing value for an action.
 */
function getActionValue(actionId: string): number {
  const action = findAction(actionId);
  return action?.value ?? 0;
}

// ─── Business Analytics ─────────────────────────────────────────────────────

/**
 * Generate a comprehensive analytics snapshot for a business within a date range.
 * All data is computed from the event store — no caching, no separate DB.
 */
export function getBusinessAnalytics(
  businessId: string,
  startDate: string,
  endDate: string
): AnalyticsSnapshot {
  // Pull all events in the date range
  const allEvents = eventStore.query({ after: startDate, before: endDate });
  const businessEvents = filterByBusiness(allEvents, businessId);

  // ── Campaign metrics ──
  const campaignCreated = businessEvents.filter(
    (e) => e.type === "campaign.created"
  );
  const campaignLaunched = businessEvents.filter(
    (e) => e.type === "campaign.launched"
  );
  const campaignEnded = businessEvents.filter(
    (e) => e.type === "campaign.ended" || e.type === "campaign.expired"
  );

  // Active = launched but not ended/expired in this period
  const launchedIds = new Set(campaignLaunched.map((e) => e.entityId));
  const endedIds = new Set(campaignEnded.map((e) => e.entityId));
  const activeCampaignIds = new Set(
    [...launchedIds].filter((id) => !endedIds.has(id))
  );

  const totalCampaigns = campaignCreated.length;
  const activeCampaigns = activeCampaignIds.size;

  // ── Submission metrics ──
  const submissionCreated = businessEvents.filter(
    (e) => e.type === "submission.created"
  );
  const submissionApproved = businessEvents.filter(
    (e) => e.type === "submission.approved"
  );
  const submissionRejected = businessEvents.filter(
    (e) => e.type === "submission.rejected"
  );

  const totalSubmissions = submissionCreated.length;
  const approvedSubmissions = submissionApproved.length;
  const rejectedSubmissions = submissionRejected.length;
  const pendingSubmissions = Math.max(0, totalSubmissions - approvedSubmissions - rejectedSubmissions);

  const completionRate =
    totalSubmissions > 0 ? approvedSubmissions / totalSubmissions : 0;

  // ── Perk metrics ──
  const perkAwarded = businessEvents.filter(
    (e) => e.type === "perk.awarded"
  );
  const perkRedeemed = businessEvents.filter(
    (e) => e.type === "perk.redeemed"
  );
  const totalPerkValue = perkAwarded.reduce(
    (sum, e) => sum + ((e.data.value as number) ?? 0),
    0
  );

  // ── Platform breakdown ──
  const platformMap = new Map<
    string,
    { completions: number; value: number }
  >();

  for (const event of submissionApproved) {
    const platformId = getPlatformIdFromEvent(event);
    if (!platformId) continue;

    const existing = platformMap.get(platformId) ?? {
      completions: 0,
      value: 0,
    };
    existing.completions += 1;
    existing.value += getActionValue(
      (event.data.actionId as string) ?? ""
    );
    platformMap.set(platformId, existing);
  }

  const topPlatforms: PlatformAnalytics[] = [...platformMap.entries()]
    .map(([platformId, stats]) => {
      const platform = findPlatform(platformId);
      return {
        platformId,
        platformName: platform?.name ?? platformId,
        completions: stats.completions,
        value: Math.round(stats.value * 100) / 100,
      };
    })
    .sort((a, b) => b.completions - a.completions)
    .slice(0, 10);

  // ── Top campaigns ──
  const campaignCompletions = new Map<
    string,
    { name: string; completions: number; perkCost: number; marketingValue: number }
  >();

  for (const event of submissionApproved) {
    const campaignId = (event.data.campaignId as string) ?? event.entityId;
    const existing = campaignCompletions.get(campaignId) ?? {
      name: (event.data.campaignName as string) ?? campaignId,
      completions: 0,
      perkCost: 0,
      marketingValue: 0,
    };
    existing.completions += 1;
    existing.marketingValue += getActionValue(
      (event.data.actionId as string) ?? ""
    );
    campaignCompletions.set(campaignId, existing);
  }

  // Add perk costs from awarded events
  for (const event of perkAwarded) {
    const campaignId = (event.data.campaignId as string) ?? "";
    const existing = campaignCompletions.get(campaignId);
    if (existing) {
      existing.perkCost += (event.data.value as number) ?? 0;
    }
  }

  const topCampaigns: CampaignAnalyticsSummary[] = [
    ...campaignCompletions.entries(),
  ]
    .map(([campaignId, stats]) => ({
      campaignId,
      name: stats.name,
      completions: stats.completions,
      roi:
        stats.perkCost > 0
          ? Math.round((stats.marketingValue / stats.perkCost) * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.completions - a.completions)
    .slice(0, 10);

  return {
    period: { start: startDate, end: endDate },
    campaigns: {
      active: activeCampaigns,
      total: totalCampaigns,
      completionRate: Math.round(completionRate * 10000) / 100, // percentage with 2 decimals
    },
    submissions: {
      pending: pendingSubmissions,
      approved: approvedSubmissions,
      rejected: rejectedSubmissions,
      total: totalSubmissions,
    },
    perks: {
      awarded: perkAwarded.length,
      redeemed: perkRedeemed.length,
      totalValue: Math.round(totalPerkValue * 100) / 100,
    },
    topPlatforms,
    topCampaigns,
  };
}

// ─── Campaign Analytics ─────────────────────────────────────────────────────

/**
 * Detailed analytics for a single campaign, computed from its event history.
 */
export function getCampaignAnalytics(
  campaignId: string
): DetailedCampaignAnalytics | null {
  const events = eventStore.getEntityHistory(campaignId);
  if (events.length === 0) return null;

  // Also query events that reference this campaign in their data
  const allEvents = eventStore.query({});
  const relatedEvents = allEvents.filter(
    (e) =>
      e.entityId === campaignId || e.data.campaignId === campaignId
  );

  // Basic info from created/launched events
  const createdEvent = relatedEvents.find(
    (e) => e.type === "campaign.created"
  );
  const name = (createdEvent?.data.name as string) ?? campaignId;
  const launchedEvent = relatedEvents.find(
    (e) => e.type === "campaign.launched"
  );
  const launchedAt = launchedEvent?.timestamp ?? createdEvent?.timestamp ?? "";

  // State from the state machine (if available) or from events
  const lifecycle = campaignManager.getState(campaignId);
  const state = lifecycle?.state ?? "unknown";

  // Submission breakdown
  const submissions = relatedEvents.filter(
    (e) => e.type === "submission.created"
  );
  const approved = relatedEvents.filter(
    (e) => e.type === "submission.approved"
  );
  const rejected = relatedEvents.filter(
    (e) => e.type === "submission.rejected"
  );
  const expired = relatedEvents.filter(
    (e) => e.type === "submission.expired"
  );
  const pending =
    submissions.length - approved.length - rejected.length - expired.length;

  // Perk info
  const perkEvents = relatedEvents.filter(
    (e) => e.type === "perk.awarded"
  );
  const totalPerkValue = perkEvents.reduce(
    (sum, e) => sum + ((e.data.value as number) ?? 0),
    0
  );

  // Budget
  const budgetAllocated = lifecycle?.budget.allocated ?? 0;
  const budgetSpent = lifecycle?.budget.spent ?? totalPerkValue;
  const budgetUtilization =
    budgetAllocated > 0
      ? Math.round((budgetSpent / budgetAllocated) * 10000) / 100
      : 0;

  // Platform breakdown
  const platformMap = new Map<
    string,
    { completions: number; value: number }
  >();

  for (const event of approved) {
    const platformId = getPlatformIdFromEvent(event);
    if (!platformId) continue;

    const existing = platformMap.get(platformId) ?? {
      completions: 0,
      value: 0,
    };
    existing.completions += 1;
    existing.value += getActionValue(
      (event.data.actionId as string) ?? ""
    );
    platformMap.set(platformId, existing);
  }

  const platformBreakdown: PlatformAnalytics[] = [
    ...platformMap.entries(),
  ].map(([platformId, stats]) => {
    const platform = findPlatform(platformId);
    return {
      platformId,
      platformName: platform?.name ?? platformId,
      completions: stats.completions,
      value: Math.round(stats.value * 100) / 100,
    };
  });

  // Daily completions
  const approvedByDate = groupByDate(approved);
  const dailyCompletions: DailyCount[] = [...approvedByDate.entries()]
    .map(([date, events]) => ({ date, count: events.length }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Average time to approval
  let totalApprovalTime = 0;
  let approvalCount = 0;

  for (const approvalEvent of approved) {
    const submissionId = approvalEvent.entityId;
    const submissionEvent = relatedEvents.find(
      (e) =>
        e.type === "submission.created" && e.entityId === submissionId
    );
    if (submissionEvent) {
      const diff =
        new Date(approvalEvent.timestamp).getTime() -
        new Date(submissionEvent.timestamp).getTime();
      totalApprovalTime += diff;
      approvalCount += 1;
    }
  }

  const avgTimeToApproval =
    approvalCount > 0
      ? Math.round(totalApprovalTime / approvalCount / 60_000) // minutes
      : null;

  // Conversion rate: approved / total submissions
  const conversionRate =
    submissions.length > 0
      ? Math.round((approved.length / submissions.length) * 10000) / 100
      : 0;

  return {
    campaignId,
    name,
    state,
    launchedAt,
    submissions: {
      total: submissions.length,
      pending: Math.max(0, pending),
      approved: approved.length,
      rejected: rejected.length,
      expired: expired.length,
    },
    completions: approved.length,
    perksAwarded: perkEvents.length,
    totalPerkValue: Math.round(totalPerkValue * 100) / 100,
    budgetSpent: Math.round(budgetSpent * 100) / 100,
    budgetAllocated,
    budgetUtilization,
    platformBreakdown,
    dailyCompletions,
    avgTimeToApproval,
    conversionRate,
  };
}

// ─── Platform Breakdown ─────────────────────────────────────────────────────

/**
 * Which platforms perform best for a given business.
 * Computes completions, value, and top actions per platform.
 */
export function getPlatformBreakdown(
  businessId: string
): PlatformBreakdown[] {
  const allEvents = eventStore.query({});
  const businessEvents = filterByBusiness(allEvents, businessId);

  const approved = businessEvents.filter(
    (e) => e.type === "submission.approved"
  );
  const totalSubmissions = businessEvents.filter(
    (e) => e.type === "submission.created"
  );

  // Group by platform
  const platformMap = new Map<
    string,
    {
      completions: number;
      value: number;
      submissions: number;
      actions: Map<string, { completions: number; value: number }>;
    }
  >();

  // Count submissions per platform
  for (const event of totalSubmissions) {
    const platformId = getPlatformIdFromEvent(event);
    if (!platformId) continue;
    const existing = platformMap.get(platformId) ?? {
      completions: 0,
      value: 0,
      submissions: 0,
      actions: new Map(),
    };
    existing.submissions += 1;
    platformMap.set(platformId, existing);
  }

  // Count completions per platform + action
  for (const event of approved) {
    const platformId = getPlatformIdFromEvent(event);
    if (!platformId) continue;

    const existing = platformMap.get(platformId) ?? {
      completions: 0,
      value: 0,
      submissions: 0,
      actions: new Map(),
    };

    const actionId = (event.data.actionId as string) ?? "";
    const actionValue = getActionValue(actionId);

    existing.completions += 1;
    existing.value += actionValue;

    const actionStats = existing.actions.get(actionId) ?? {
      completions: 0,
      value: 0,
    };
    actionStats.completions += 1;
    actionStats.value += actionValue;
    existing.actions.set(actionId, actionStats);

    platformMap.set(platformId, existing);
  }

  return [...platformMap.entries()]
    .map(([platformId, stats]) => {
      const platform = findPlatform(platformId);

      const topActions: ActionAnalytics[] = [...stats.actions.entries()]
        .map(([actionId, actionStats]) => {
          const action = findAction(actionId);
          return {
            actionId,
            actionLabel: action?.label ?? actionId,
            completions: actionStats.completions,
            value: Math.round(actionStats.value * 100) / 100,
          };
        })
        .sort((a, b) => b.completions - a.completions)
        .slice(0, 5);

      return {
        platformId,
        platformName: platform?.name ?? platformId,
        platformIcon: platform?.icon ?? "",
        platformColor: platform?.color ?? "#666",
        totalCompletions: stats.completions,
        totalValue: Math.round(stats.value * 100) / 100,
        topActions,
        avgCompletionRate:
          stats.submissions > 0
            ? Math.round(
                (stats.completions / stats.submissions) * 10000
              ) / 100
            : 0,
      };
    })
    .sort((a, b) => b.totalCompletions - a.totalCompletions);
}

// ─── Completion Trend ───────────────────────────────────────────────────────

/**
 * Daily completion counts for the last N days.
 * Useful for trend charts and sparklines.
 */
export function getCompletionTrend(
  businessId: string,
  days: number = 30
): DailyCount[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days);

  const allEvents = eventStore.query({
    after: start.toISOString(),
  });
  const businessEvents = filterByBusiness(allEvents, businessId);
  const approved = businessEvents.filter(
    (e) => e.type === "submission.approved"
  );

  // Build a map of all dates in the range, initialized to 0
  const dateMap = new Map<string, number>();
  for (let d = 0; d < days; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    dateMap.set(date.toISOString().slice(0, 10), 0);
  }

  // Fill in actual counts
  for (const event of approved) {
    const date = event.timestamp.slice(0, 10);
    const current = dateMap.get(date);
    if (current !== undefined) {
      dateMap.set(date, current + 1);
    }
  }

  return [...dateMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── ROI Analysis ───────────────────────────────────────────────────────────

/**
 * Estimate ROI based on perk costs vs. estimated marketing value.
 *
 * Marketing value is computed from the action value table in platforms.ts —
 * each approved submission's action has a dollar value representing what
 * that marketing action would cost if purchased directly.
 */
export function getROI(businessId: string): ROIAnalysis {
  const allEvents = eventStore.query({});
  const businessEvents = filterByBusiness(allEvents, businessId);

  // Total perk cost (what the business gave away)
  // Only count dollar-type perks directly; percentage perks are estimated as $5 avg value
  const perkEvents = businessEvents.filter(
    (e) => e.type === "perk.awarded"
  );
  const totalPerkCost = perkEvents.reduce(
    (sum, e) => {
      const value = (e.data.value as number) ?? 0;
      const perkType = e.data.type as string;
      // Percentage perks don't have a direct dollar cost; estimate at $5 avg redemption value
      if (perkType === "pct") return sum + 5;
      return sum + value;
    },
    0
  );

  // Estimated marketing value (from action values)
  const approved = businessEvents.filter(
    (e) => e.type === "submission.approved"
  );
  const estimatedMarketingValue = approved.reduce((sum, e) => {
    const actionId = (e.data.actionId as string) ?? "";
    return sum + getActionValue(actionId);
  }, 0);

  const completionCount = approved.length;

  // Campaign count
  const campaignIds = new Set(
    businessEvents
      .filter((e) => e.type === "campaign.created")
      .map((e) => e.entityId)
  );

  const roi =
    totalPerkCost > 0
      ? Math.round((estimatedMarketingValue / totalPerkCost) * 100) / 100
      : 0;

  return {
    totalPerkCost: Math.round(totalPerkCost * 100) / 100,
    estimatedMarketingValue:
      Math.round(estimatedMarketingValue * 100) / 100,
    roi,
    costPerCompletion:
      completionCount > 0
        ? Math.round((totalPerkCost / completionCount) * 100) / 100
        : 0,
    valuePerCompletion:
      completionCount > 0
        ? Math.round((estimatedMarketingValue / completionCount) * 100) / 100
        : 0,
    campaignCount: campaignIds.size,
    completionCount,
  };
}

// ─── Aggregate Helpers ──────────────────────────────────────────────────────

/**
 * Get platform-wide stats computed from events.
 * Useful for the landing page stats bar.
 */
export function getPlatformWideStats(): {
  totalCampaigns: number;
  totalSubmissions: number;
  totalPerksAwarded: number;
  totalPerksRedeemed: number;
  totalUsers: number;
  totalAgentQueries: number;
} {
  return {
    totalCampaigns: eventStore.getEventCount("campaign.created"),
    totalSubmissions: eventStore.getEventCount("submission.created"),
    totalPerksAwarded: eventStore.getEventCount("perk.awarded"),
    totalPerksRedeemed: eventStore.getEventCount("perk.redeemed"),
    totalUsers: eventStore.getEventCount("user.signup"),
    totalAgentQueries: eventStore.getEventCount("agent.query"),
  };
}

/**
 * Get events-per-hour for the last N hours.
 * Useful for activity sparklines and monitoring.
 */
export function getActivityRate(
  hours: number = 24
): { hour: string; events: number }[] {
  const now = new Date();
  const result: { hour: string; events: number }[] = [];

  for (let h = hours - 1; h >= 0; h--) {
    const start = new Date(now);
    start.setHours(start.getHours() - h, 0, 0, 0);

    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    const count = eventStore.query({
      after: start.toISOString(),
      before: end.toISOString(),
    }).length;

    result.push({
      hour: start.toISOString().slice(0, 13) + ":00",
      events: count,
    });
  }

  return result;
}
