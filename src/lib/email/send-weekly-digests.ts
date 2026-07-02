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

export interface DigestRunResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
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
export async function sendWeeklyDigests(): Promise<DigestRunResult> {
  const result: DigestRunResult = { processed: 0, sent: 0, skipped: 0, failed: 0 };

  // Hydrate durable submission state once for the whole run.
  try {
    await hydrateSubmissions();
  } catch (e) {
    captureError(e, { source: "send-weekly-digests.hydrateSubmissions" });
  }

  // Page through all (non-deleted) businesses. A large perPage is fine at the
  // current scale; switch to true pagination if the base grows past a few k.
  const businesses = await businessRepo.findMany({}, { perPage: 100_000 });

  for (const biz of businesses.data) {
    result.processed++;
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
