/**
 * Acquisition Agent ("L5" — fully autonomous account driver)
 *
 * Works the very top of the funnel: scans the waitlist (pre-signup leads)
 * and drives them toward creating an account.
 *
 * Why it exists — the gap it fills:
 *   The waitlist-drip cron only fires fixed day-3 and day-7 nurture
 *   emails. Any lead not onboarded by day 8 then falls into a black
 *   hole — no further nurture, and no prioritization of warm leads over
 *   cold ones. This agent closes that gap. Each run it pulls leads that
 *   haven't converted (onboarded_at IS NULL) and that it hasn't already
 *   personally worked (contacted_at IS NULL), scores them by conversion
 *   potential, and — in live mode — enqueues a personalized "your slot
 *   is ready" invite, marking waitlist.contacted_at so it never
 *   double-sends. In dry-run it only emits decisions for an admin to
 *   inspect on /admin/agents.
 *
 * Autonomy: starts in dry-run per the control-plane convention. An admin
 * flips it to "live" once they've reviewed the decision log; from there
 * it runs unattended via the /api/v1/cron/agents tick.
 *
 * Data source: the DB-backed `waitlist` table (same source the drip cron
 * reads). With no DATABASE_URL (local dev) the in-memory waitlist isn't
 * reachable from here, so the agent gracefully scans nothing — identical
 * posture to the drip crons.
 */

import type { Agent, AgentDecision } from "./types";

export interface WaitlistLead {
  email: string;
  businessName?: string;
  city?: string;
  vertical: string;
  referrer?: string;
  createdAt: string;
}

/** The vertical we onboard first — leads in it score higher (ICP fit). */
const TARGET_VERTICAL = "coffee_shops";

/**
 * Pull un-converted, not-yet-agent-contacted leads, oldest first so the
 * backlog the day-3/day-7 drip left behind surfaces. Returns [] when no
 * durable DB is configured (mirrors the drip cron's posture).
 */
async function fetchUncontactedLeads(limit: number): Promise<WaitlistLead[]> {
  try {
    const { db, InMemoryConnection } = await import("@/lib/db/connection");
    if (db instanceof InMemoryConnection) return [];
    const result = await db.query<{
      email: string;
      business_name: string | null;
      city: string | null;
      vertical: string;
      referrer: string | null;
      created_at: string;
    }>(
      `SELECT email, business_name, city, vertical, referrer, created_at
       FROM waitlist
       WHERE onboarded_at IS NULL
         AND contacted_at IS NULL
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit],
    );
    return result.rows.map((r) => ({
      email: r.email,
      businessName: r.business_name ?? undefined,
      city: r.city ?? undefined,
      vertical: r.vertical,
      referrer: r.referrer ?? undefined,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

/** Stamp contacted_at so a converted/worked lead isn't emailed again. */
async function markContacted(email: string): Promise<void> {
  try {
    const { db, InMemoryConnection } = await import("@/lib/db/connection");
    if (db instanceof InMemoryConnection) return;
    await db.query(`UPDATE waitlist SET contacted_at = NOW() WHERE email = $1`, [email]);
  } catch {
    // Best-effort: a missed mark only risks one extra email next run.
  }
}

/**
 * Score a lead's conversion potential in [0,1].
 * Exported for unit testing; production callers should use the agent's run().
 *   base 0.30  — they raised their hand by joining the list
 *   +0.30      — arrived via a referrer (warm intro / partner channel)
 *   +0.20      — in our ICP vertical (onboarded first)
 *   +0.10      — gave a business name (higher intent / complete profile)
 *   +0.05      — gave a city (lets us localize the pitch)
 *   -0.15      — sat past the cold cutoff (interest has likely cooled)
 */
export function scoreLead(
  lead: WaitlistLead,
  nowMs: number,
  maxAgeDays: number,
): { confidence: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0.3;

  if (lead.referrer && lead.referrer.trim().length > 0) {
    score += 0.3;
    reasons.push("referred");
  }
  if (lead.vertical === TARGET_VERTICAL) {
    score += 0.2;
    reasons.push("ICP vertical");
  }
  if (lead.businessName) {
    score += 0.1;
    reasons.push("named business");
  }
  if (lead.city) {
    score += 0.05;
    reasons.push("city known");
  }

  const ageDays = (nowMs - new Date(lead.createdAt).getTime()) / 86_400_000;
  if (ageDays > maxAgeDays) {
    score -= 0.15;
    reasons.push(`aged ${Math.round(ageDays)}d`);
  }

  return { confidence: Math.max(0, Math.min(1, score)), reasons };
}

/** Personalized early-access invite. Enqueued as a generic "drip" email. */
function inviteEmail(lead: WaitlistLead): { subject: string; html: string; text: string } {
  const name = lead.businessName ?? "there";
  const cityClause = lead.city
    ? `We're onboarding shops in ${lead.city} right now`
    : "We're opening up early-access slots right now";
  const subject = "Your Social Perks early-access slot is ready";
  const text = `Hi ${name},

${cityClause}, and a spot just opened for you.

You can set up your first perk in about 60 seconds: pick a reward (say 15% off), choose the action customers take (a story, a tag, a review), and we handle the rest — including verifying the post actually happened.

Claim your slot: https://socialperks.app

— The Social Perks team`;
  const html = `<p>Hi ${name},</p>
<p>${cityClause}, and a spot just opened for you.</p>
<p>You can set up your first perk in about 60 seconds: pick a reward (say <strong>15% off</strong>), choose the action customers take (a story, a tag, a review), and we handle the rest — including verifying the post actually happened.</p>
<p><a href="https://socialperks.app" style="display:inline-block;padding:12px 24px;background-color:#22D3EE;color:#0C0F1A;border-radius:8px;text-decoration:none;font-weight:600;">Claim your slot</a></p>
<p>— The Social Perks team</p>`;
  return { subject, html, text };
}

export const acquisitionAgent: Agent = {
  id: "acquisition-agent",
  name: "Acquisition Agent",
  description:
    "Works the waitlist top-of-funnel: scores pre-signup leads and sends personalized early-access invites to drive new account signups.",
  defaultMode: "dry-run",
  intervalSeconds: 86400, // daily — the funnel moves slowly and emails shouldn't nag
  config: {
    threshold: { min: 0.3, max: 1, default: 0.55, step: 0.05 },
    maxActionsPerRun: { min: 1, max: 200, default: 25 },
    custom: {
      maxAgeDays: {
        label: "Treat leads older than N days as cold",
        min: 7,
        max: 120,
        default: 30,
        step: 1,
      },
    },
  },
  async run(ctx) {
    const maxAgeDays = ctx.config.custom.maxAgeDays;
    const nowMs = new Date(ctx.now).getTime();

    // Over-fetch relative to the action cap so scoring can prioritize the
    // best candidates out of the backlog; the registry slices to
    // maxActionsPerRun after we sort by confidence.
    const fetchLimit = Math.min(ctx.config.maxActionsPerRun * 4, 500);
    const leads = await fetchUncontactedLeads(fetchLimit);

    // Lazy-import the email queue so dry-run runs don't pay for it.
    const jobsMod = ctx.live ? await import("@/lib/jobs/registry").catch(() => null) : null;

    const decisions: AgentDecision[] = [];

    for (const lead of leads) {
      const { confidence, reasons } = scoreLead(lead, nowMs, maxAgeDays);

      let executed = false;
      if (ctx.live && jobsMod && confidence >= ctx.config.threshold) {
        try {
          const tmpl = inviteEmail(lead);
          jobsMod.emailQueue.add({
            type: "drip",
            to: lead.email,
            subject: tmpl.subject,
            html: tmpl.html,
            text: tmpl.text,
          });
          await markContacted(lead.email);
          executed = true;
        } catch {
          // Queue/DB hiccup shouldn't kill the run — leave unexecuted so
          // the lead is retried on the next tick.
        }
      }

      decisions.push({
        targetId: lead.email,
        action: "send-early-access-invite",
        confidence,
        executed,
        reason: reasons.length ? reasons.join(", ") : "list signup only",
        meta: {
          businessName: lead.businessName,
          city: lead.city,
          vertical: lead.vertical,
          referred: Boolean(lead.referrer),
          ageDays: Math.round((nowMs - new Date(lead.createdAt).getTime()) / 86_400_000),
        },
      });
    }

    // Highest-confidence opportunities first so they survive the
    // maxActionsPerRun slice and lead the /admin/agents decision list.
    decisions.sort((a, b) => b.confidence - a.confidence);
    return decisions;
  },
};
