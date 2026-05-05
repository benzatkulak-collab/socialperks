/**
 * AI generation limit enforcement helper for routes under /api/v1/ai/*.
 *
 * The /generate route inlines this check; this helper extracts the
 * pattern so the other AI routes (campaign-agent, quick-start, recommend,
 * review) can adopt the same gating without duplicating the response
 * shape and 403 wiring.
 *
 * Usage in a route handler:
 *
 *   const limited = enforceAiLimit(user);
 *   if (limited) return limited;
 *   // ... do AI work ...
 *   recordAiUse(user);
 */

import { NextResponse } from "next/server";
import type { AuthUser } from "../_shared";
import {
  buildPlanLimitError,
  checkAiGenerationLimit,
  getBusinessPlan,
  recordAiGeneration,
} from "@/lib/billing/enforcement";

/**
 * Returns a 403 NextResponse if the caller has hit their AI generation
 * limit for the month, or null if they're under the limit.
 *
 * Uses user.businessId when present, falling back to user.id so that
 * users without an attached business (rare) still get rate-limited
 * coherently against their own quota.
 */
export function enforceAiLimit(user: AuthUser): NextResponse | null {
  const businessId = user.businessId ?? user.id;
  const plan = getBusinessPlan(businessId);
  const check = checkAiGenerationLimit(businessId, plan);
  if (check.allowed) return null;

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const body = buildPlanLimitError(
    `${planLabel} plan allows ${check.limit} AI generation${check.limit === 1 ? "" : "s"} per month. Upgrade for more.`,
    check.limit,
    check.current,
    plan
  );
  return NextResponse.json(body, { status: 403 });
}

/**
 * Increment the AI usage counter for this caller. Call on the success
 * path, after the AI work completes. Idempotent if called multiple
 * times — each call adds 1.
 */
export function recordAiUse(user: AuthUser): void {
  const businessId = user.businessId ?? user.id;
  recordAiGeneration(businessId);
}
