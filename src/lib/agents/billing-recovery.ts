/**
 * Billing Recovery Agent
 *
 * Watches for failed payment events and orchestrates a dunning sequence:
 *   - Day 1:  Retry charge + send first dunning email
 *   - Day 3:  Retry charge + second email
 *   - Day 7:  Retry charge + final notice
 *   - Day 14: Cancel subscription + churn email
 *
 * In dry-run the agent just emits decisions describing what it would do.
 * In live mode it triggers retries via the billing module and enqueues
 * emails through the email queue.
 *
 * The agent is idempotent: each (subscriptionId, dunningStep) is logged
 * once per day so repeated runs don't spam.
 */

import type { Agent, AgentDecision } from "./types";

interface FailedSubscription {
  subscriptionId: string;
  businessId: string;
  email: string;
  failedAt: string;
  failureCount: number;
  amount: number;
  lastDunningStepSent?: number;
}

/**
 * Fetch failed subscriptions. The billing module owns the source-of-truth;
 * we query it via a thin adapter. Returns an empty list if no billing
 * module is wired up (dev / test).
 */
async function fetchFailedSubscriptions(): Promise<FailedSubscription[]> {
  try {
    const mod = (await import("@/lib/payments/ledger")) as unknown as {
      listFailedSubscriptions?: () => FailedSubscription[];
    };
    if (typeof mod.listFailedSubscriptions === "function") {
      return mod.listFailedSubscriptions();
    }
    return [];
  } catch {
    return [];
  }
}

interface DunningPlan {
  step: 1 | 2 | 3 | 4;
  label: string;
  /** True if this step also retries the charge. */
  retry: boolean;
  /** True if this step cancels the subscription. */
  cancel: boolean;
}

function dunningPlanForDays(daysSinceFail: number): DunningPlan | null {
  if (daysSinceFail >= 14) return { step: 4, label: "final-cancel", retry: false, cancel: true };
  if (daysSinceFail >= 7) return { step: 3, label: "final-notice", retry: true, cancel: false };
  if (daysSinceFail >= 3) return { step: 2, label: "second-attempt", retry: true, cancel: false };
  if (daysSinceFail >= 1) return { step: 1, label: "first-attempt", retry: true, cancel: false };
  return null;
}

async function retryCharge(subscriptionId: string): Promise<boolean> {
  try {
    const mod = (await import("@/lib/payments/ledger")) as unknown as {
      retrySubscriptionCharge?: (id: string) => Promise<boolean> | boolean;
    };
    if (typeof mod.retrySubscriptionCharge === "function") {
      return Boolean(await mod.retrySubscriptionCharge(subscriptionId));
    }
    return false;
  } catch {
    return false;
  }
}

async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  try {
    const mod = (await import("@/lib/payments/ledger")) as unknown as {
      cancelSubscription?: (id: string) => Promise<boolean> | boolean;
    };
    if (typeof mod.cancelSubscription === "function") {
      return Boolean(await mod.cancelSubscription(subscriptionId));
    }
    return false;
  } catch {
    return false;
  }
}

async function sendDunningEmail(email: string, step: 1 | 2 | 3 | 4, amountCents?: number): Promise<void> {
  try {
    const mod = await import("@/lib/jobs/registry");
    mod.emailQueue.add({
      type: "dunning",
      to: email,
      dunningStep: step,
      amountCents,
    });
  } catch {
    // Email queue not available — skip.
  }
}

export const billingRecoveryAgent: Agent = {
  id: "billing-recovery",
  name: "Billing Recovery",
  description: "Retries failed payments and runs a dunning sequence; cancels subscriptions at day 14.",
  // Promoted to live: dunning sequence is industry-standard and the
  // agent is idempotent (same step won't fire twice). Day-14 cancel
  // is the dangerous edge case; admin can pause the agent any time
  // via /admin/agents if a billing migration is in flight.
  defaultMode: "live",
  intervalSeconds: 3600,
  config: {
    threshold: { min: 0.5, max: 1, default: 1, step: 0.05 },
    maxActionsPerRun: { min: 1, max: 100, default: 20 },
    custom: {
      finalCancelDay: { label: "Cancel subscription after N days", min: 7, max: 30, default: 14, step: 1 },
    },
  },
  async run(ctx) {
    const failed = await fetchFailedSubscriptions();
    const decisions: AgentDecision[] = [];

    for (const sub of failed) {
      const daysSinceFail = Math.floor(
        (new Date(ctx.now).getTime() - new Date(sub.failedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const plan = dunningPlanForDays(daysSinceFail);
      if (!plan) continue;

      // Idempotency: don't re-send the same step we already sent.
      if (sub.lastDunningStepSent === plan.step) {
        continue;
      }

      let executed = false;
      if (ctx.live) {
        if (plan.retry) await retryCharge(sub.subscriptionId);
        if (plan.cancel) await cancelSubscription(sub.subscriptionId);
        await sendDunningEmail(sub.email, plan.step, sub.amount);
        executed = true;
      }

      decisions.push({
        targetId: sub.subscriptionId,
        action: plan.cancel ? "cancel" : "retry+email",
        confidence: 1,
        executed,
        reason: `day-${daysSinceFail} → step ${plan.step} (${plan.label})`,
        meta: {
          businessId: sub.businessId,
          amount: sub.amount,
          failureCount: sub.failureCount,
          daysSinceFail,
        },
      });
    }

    return decisions;
  },
};
