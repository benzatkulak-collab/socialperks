/**
 * Compliance Watchdog Agent
 *
 * Scans recent approved submissions and checks the proof URL / content
 * (when available) for FTC compliance signals. Flags submissions that
 * appear to be missing required disclosures.
 *
 * In live mode the agent could:
 *   - Revoke a perk that was awarded based on non-compliant content
 *   - Send a "please add disclosure" email to the user
 *   - Mark the submission as conditional pending fix
 *
 * For now we emit decisions and let humans act on them. Live mode is
 * still allowed but defaults to noop until the compliance side effects
 * are spec'd.
 */

import type { Agent, AgentDecision } from "./types";

interface Submission {
  id: string;
  campaignId: string;
  userId: string;
  status: string;
  proofUrl: string;
  proofType?: string;
  submittedAt: string;
  reviewedAt?: string;
}

/** Common FTC disclosure markers — hashtags & phrases. */
const DISCLOSURE_MARKERS = [
  "#ad",
  "#sponsored",
  "#partner",
  "#paidpartnership",
  "paid partnership",
  "in partnership with",
  "sponsored by",
  "thanks to",
];

async function fetchRecentApproved(maxAgeDays = 7): Promise<Submission[]> {
  try {
    const mod = await import("@/lib/submissions");
    const result = mod.getSubmissions({ status: "approved" }, 1, 500);
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    return result.submissions
      .filter((s) => new Date(s.submittedAt).getTime() >= cutoff)
      .map((s) => ({
        id: s.id,
        campaignId: s.campaignId,
        userId: s.userId,
        status: s.status,
        proofUrl: s.proofUrl,
        proofType: s.proofType,
        submittedAt: s.submittedAt,
        reviewedAt: s.reviewedAt ?? undefined,
      }));
  } catch {
    return [];
  }
}

/**
 * Inspect the proof URL itself for disclosure markers. This is a
 * conservative heuristic — many platforms put captions in metadata
 * that we can't fetch without API access. False negatives are
 * preferred over false positives (we don't want to revoke legitimate
 * perks).
 */
function checkDisclosure(sub: Submission): { compliant: boolean; signals: string[] } {
  const signals: string[] = [];
  const blob = sub.proofUrl.toLowerCase();

  const hasMarker = DISCLOSURE_MARKERS.some((m) => blob.includes(m.toLowerCase()));
  if (hasMarker) {
    signals.push("disclosure-marker-in-url");
    return { compliant: true, signals };
  }

  // If the URL is just a bare profile or post link (no caption visible)
  // we can't determine compliance — treat as unknown rather than
  // non-compliant.
  if (/^https?:\/\/(www\.)?(instagram|tiktok|twitter|x|youtube|facebook)\.com\//i.test(sub.proofUrl)) {
    signals.push("bare-platform-url-content-not-verifiable");
    return { compliant: true, signals };
  }

  signals.push("no-disclosure-marker-found");
  return { compliant: false, signals };
}

export const complianceWatchdogAgent: Agent = {
  id: "compliance-watchdog",
  name: "Compliance Watchdog",
  description: "Scans approved submissions for FTC disclosure markers; flags ones missing required disclosures.",
  defaultMode: "dry-run",
  intervalSeconds: 3600,
  config: {
    threshold: { min: 0.5, max: 1, default: 0.9, step: 0.05 },
    maxActionsPerRun: { min: 1, max: 100, default: 25 },
    custom: {
      lookbackDays: { label: "How many days back to scan", min: 1, max: 30, default: 7, step: 1 },
    },
  },
  async run(ctx) {
    const lookbackDays = ctx.config.custom.lookbackDays;
    const approved = await fetchRecentApproved(lookbackDays);
    const decisions: AgentDecision[] = [];

    for (const sub of approved) {
      const { compliant, signals } = checkDisclosure(sub);
      if (compliant) continue; // healthy, no action

      decisions.push({
        targetId: sub.id,
        action: "flag-missing-disclosure",
        confidence: 0.9, // we're confident the marker is absent; we're not confident the content is non-compliant
        executed: false,
        reason: `disclosure marker not detected (${signals.join(", ")})`,
        meta: {
          campaignId: sub.campaignId,
          userId: sub.userId,
          proofUrl: sub.proofUrl,
          signals,
        },
      });
    }

    return decisions;
  },
};
