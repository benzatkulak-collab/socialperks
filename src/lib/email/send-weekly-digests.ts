// ==============================================================================
// Social Perks — Weekly Digest Sender (cron orchestrator)
//
// WHY THIS EXISTS
// ───────────────
// The weekly performance digest (buildDigestData + generateDigestHtml) was
// fully built but NOTHING ever sent it — the audit's #1 missing retention
// mechanic. The job-queue worker is never started in serverless, so this
// orchestrator DIRECT-SENDS (same pattern the billing webhook uses for its
// transactional emails).
//
// DURABILITY: a cron runs on a cold serverless instance with empty in-memory
// state, so we hydrate from Postgres first — hydrateSubmissions() loads the
// submission cache and loadLifecyclesForBusiness() loads each business's
// campaigns into campaignManager — before buildDigestData reads them. Without
// this every digest would show a false zero-state.
// ==============================================================================

import { businessRepo } from "@/lib/db/repositories";
import { campaignManager } from "@/lib/campaign-state-machine";
import { loadLifecyclesForBusiness } from "@/lib/campaign-state-machine/persist";
import { hydrateSubmissions } from "@/lib/submissions";
import { emailProvider } from "@/lib/email";
import { buildDigestData, generateDigestHtml, type DigestData } from "@/lib/email/digest";
import { captureError } from "@/lib/monitoring";
import { UNLIMITED_BUDGET, type TimeBudget } from "@/lib/cron/time-budget";

export interface DigestRunResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  /** True when the time budget ran out before every business was handled. */
  more: boolean;
  /** Id of the last business handled; pass back as `after` to resume. */
  cursor?: string;
}

/**
 * Order businesses by id and drop those at or before `after`, so a run that
 * stopped at its time budget can resume where it left off.
 */
export function businessesAfter<T extends { id: string }>(rows: T[], after?: string): T[] {
  const sorted = [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return after ? sorted.filter((b) => b.id > after) : sorted;
}

/**
 * Eligibility for the weekly digest. Send only to businesses with an email AND
 * at least one active campaign — never weekly-blast inactive signups (spam +
 * CAN-SPAM exposure); re-engaging dead accounts is the onboarding drip's job.
 */
export function shouldSendWeeklyDigest(
  data: Pick<DigestData, "email" | "activeCampaigns">,
): boolean {
  return Boolean(data.email) && data.activeCampaigns > 0;
}

/**
 * Build and direct-send the weekly digest to every eligible business.
 * Best-effort per business: one failure never aborts the run. Returns counts
 * for the cron route to log.
 */
export async function sendWeeklyDigests(
  opts: { budget?: TimeBudget; after?: string } = {},
): Promise<DigestRunResult> {
  const budget = opts.budget ?? UNLIMITED_BUDGET;
  const result: DigestRunResult = { processed: 0, sent: 0, skipped: 0, failed: 0, more: false };

  // Hydrate durable submission state once for the whole run.
  try {
    await hydrateSubmissions();
  } catch (e) {
    captureError(e, { source: "send-weekly-digests.hydrateSubmissions" });
  }

  // Page through all (non-deleted) businesses. A large perPage is fine at the
  // current scale; switch to true pagination if the base grows past a few k.
  const businesses = await businessRepo.findMany({}, { perPage: 100_000 });

  const queue = businessesAfter(businesses.data, opts.after);

  for (const biz of queue) {
    // Netlify Free stops a function at 10s: stop here and let the scheduler
    // call again with `after` set to the last business we handled.
    if (budget.expired()) {
      result.more = true;
      break;
    }
    result.processed++;
    result.cursor = biz.id;
    try {
      // Load this business's campaigns from Postgres into the state machine so
      // buildDigestData's campaignManager.listByBusiness() sees them.
      const lifecycles = await loadLifecyclesForBusiness(biz.id);
      for (const lc of lifecycles) campaignManager.register(lc);

      const data = buildDigestData(biz.id, biz.name, biz.email);
      if (!shouldSendWeeklyDigest(data)) {
        result.skipped++;
        continue;
      }

      const { subject, html, text } = generateDigestHtml(data);
      await emailProvider.send({ to: biz.email, subject, html, text });
      result.sent++;
    } catch (e) {
      result.failed++;
      captureError(e, { source: "send-weekly-digests.perBusiness", businessId: biz.id });
    }
  }

  return result;
}
