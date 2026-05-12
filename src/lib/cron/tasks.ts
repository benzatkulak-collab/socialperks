/**
 * Cron Tasks — Pure async functions executed by /api/v1/cron.
 *
 * Each task returns a {@link TaskResult}. Tasks MUST NOT throw — they capture
 * their own errors and append them to `errors` so a single failure doesn't
 * crash the whole cron run.
 *
 * To add a new task:
 *   1. Add a `task=foo` handler here.
 *   2. Register it in TASKS below.
 *   3. Add a GitHub Actions workflow (or extend an existing one) that hits
 *      `/api/v1/cron?task=foo&key=$CRON_SECRET` on the desired schedule.
 */

import { subscriptions } from "@/lib/billing/store";
import { campaignManager } from "@/lib/campaign-state-machine";
import { emailProvider } from "@/lib/email";
import { buildDigestData, generateDigestHtml } from "@/lib/email/digest";
import {
  getDueLessons,
  markLessonSent,
  listSubscribers,
} from "@/lib/courses/sender";
import { expirePerks } from "@/lib/perk-wallet";
import { getLeads, addLead } from "@/lib/leads/store";
import { searchPlaces } from "@/lib/leads/google-places";

export interface TaskResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
  notes?: string[];
}

function emptyResult(): TaskResult {
  return { processed: 0, succeeded: 0, failed: 0, errors: [], notes: [] };
}

function recordError(result: TaskResult, prefix: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  result.errors.push(`${prefix}: ${message}`);
  result.failed += 1;
}

// ─── trial-expiring ────────────────────────────────────────────────────────
// Find subscriptions in `trialing` status whose currentPeriodEnd is within the
// next 3 days and send a reminder email. Dedupes per (subscriptionId, UTC day)
// so a same-day re-run (manual trigger, scheduler hiccup) doesn't double-send.

const TRIAL_REMINDER_WINDOW_DAYS = 3;

// In-memory: key = `${subscriptionId}:${YYYY-MM-DD-UTC}`. Persists for the
// lifetime of the server process, which matches how the rest of the cron
// state is stored (see lastRuns below). For multi-instance deployments, move
// this to the subscriptions table as `lastTrialReminderSentAt`.
const trialReminderSentToday = new Set<string>();

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function runTrialExpiring(now: Date = new Date()): Promise<TaskResult> {
  const result = emptyResult();
  const windowMs = TRIAL_REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const cutoff = now.getTime() + windowMs;
  const todayKey = utcDateKey(now);

  for (const sub of subscriptions.values()) {
    if (sub.status !== "trialing") continue;
    const periodEnd = new Date(sub.currentPeriodEnd).getTime();
    if (Number.isNaN(periodEnd)) continue;
    if (periodEnd <= now.getTime()) continue; // already expired — skip
    if (periodEnd > cutoff) continue; // not in window yet

    const dedupKey = `${sub.id}:${todayKey}`;
    if (trialReminderSentToday.has(dedupKey)) {
      result.notes?.push(`skip ${sub.id}: already reminded ${todayKey}`);
      continue;
    }

    result.processed += 1;

    const daysLeft = Math.max(
      1,
      Math.ceil((periodEnd - now.getTime()) / (24 * 60 * 60 * 1000))
    );
    const subject = `Your Social Perks trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
    const html = `<!DOCTYPE html><html><body style="font-family:'DM Sans',Arial,sans-serif;background:#0C0F1A;color:#E2E8F0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#1A1F36;border-radius:12px;padding:32px;border:1px solid #2D3348">
<h1 style="color:#22D3EE;font-family:'Instrument Serif',serif;font-style:italic;margin-top:0">Your trial ends soon</h1>
<p style="color:#94A3B8;line-height:1.6">Heads up — your Social Perks ${sub.plan} trial ends in <strong style="color:#FBBF24">${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong>.</p>
<p style="color:#94A3B8;line-height:1.6">Add a payment method now so your campaigns keep running without interruption.</p>
<a href="https://socialperks.app/billing" style="display:inline-block;padding:12px 24px;background:#22D3EE;color:#0C0F1A;border-radius:8px;text-decoration:none;font-weight:600">Manage Billing</a>
</div></body></html>`;
    const text = `Your Social Perks ${sub.plan} trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Manage billing: https://socialperks.app/billing`;

    // We don't have a stored email on the Subscription — derive a fallback
    // address from the businessId. In production this would join to the
    // accounts table.
    const to = `${sub.businessId}@socialperks.app`;

    try {
      const send = await emailProvider.send({
        to,
        subject,
        html,
        text,
      });
      if (send.success) {
        trialReminderSentToday.add(dedupKey);
        result.succeeded += 1;
      } else {
        recordError(result, sub.id, send.error ?? "send returned !success");
      }
    } catch (e) {
      recordError(result, sub.id, e);
    }
  }

  return result;
}

// ─── weekly-digest ─────────────────────────────────────────────────────────
// Send the weekly stats email to every business that has at least one active
// campaign. Reuses `buildDigestData` / `generateDigestHtml` from the email
// module.

// In-memory: key = `${businessId}:${YYYY-Www}`. Same caveat as the trial set
// above — single-process scope; for HA deployments move to a real table.
const digestSentThisWeek = new Set<string>();

function isoWeekKey(d: Date): string {
  // ISO 8601 week date. Standard "year-week" key so two runs on Tue and Wed
  // of the same week dedupe to the same bucket.
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Thursday in current week determines the ISO year.
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function runWeeklyDigest(now: Date = new Date()): Promise<TaskResult> {
  const result = emptyResult();
  const active = campaignManager.listByState("active");
  const businessIds = new Set<string>();
  for (const c of active) businessIds.add(c.businessId);

  if (businessIds.size === 0) {
    result.notes?.push("No businesses with active campaigns — nothing to send.");
    return result;
  }

  const weekKey = isoWeekKey(now);

  for (const businessId of businessIds) {
    const dedupKey = `${businessId}:${weekKey}`;
    if (digestSentThisWeek.has(dedupKey)) {
      result.notes?.push(`skip ${businessId}: digest already sent for ${weekKey}`);
      continue;
    }

    result.processed += 1;
    // Without a joined accounts table we fall back to derived values; the API
    // POST /api/v1/digest accepts a body override for richer metadata, but
    // the scheduled run uses sensible defaults.
    const name = businessId;
    const email = `${businessId}@socialperks.app`;

    try {
      const data = buildDigestData(businessId, name, email);
      const { subject, html, text } = generateDigestHtml(data);
      const send = await emailProvider.send({ to: email, subject, html, text });
      if (send.success) {
        digestSentThisWeek.add(dedupKey);
        result.succeeded += 1;
      } else {
        recordError(result, businessId, send.error ?? "send returned !success");
      }
    } catch (e) {
      recordError(result, businessId, e);
    }
  }

  return result;
}

// ─── lead-status-sync ──────────────────────────────────────────────────────
// Refresh public stats (Google rating, review count) on stored leads.
// Capped to LEAD_SYNC_LIMIT per run so a daily cadence still gets to
// every lead within a reasonable rotation, and so we don't burn through the
// Google Places quota on a single run.

const LEAD_SYNC_LIMIT = 50;

export async function runLeadStatusSync(): Promise<TaskResult> {
  const result = emptyResult();

  let leads;
  try {
    leads = await getLeads({});
  } catch (e) {
    recordError(result, "getLeads", e);
    return result;
  }

  if (leads.length === 0) {
    result.notes?.push("No leads in store — nothing to refresh.");
    return result;
  }

  // Rotate so we touch the oldest-refreshed leads first. `collectedAt` is the
  // best signal we have without a dedicated lastRefreshedAt field.
  const sorted = [...leads].sort(
    (a, b) =>
      new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime()
  );
  const slice = sorted.slice(0, LEAD_SYNC_LIMIT);
  result.notes?.push(
    `Refreshing ${slice.length} of ${leads.length} leads this run`
  );

  for (const lead of slice) {
    result.processed += 1;
    try {
      const matches = await searchPlaces({
        industry: lead.industry,
        city: lead.city,
        state: lead.state,
      });
      // Best-effort match by business name (case-insensitive substring).
      const needle = lead.businessName.toLowerCase();
      const match = matches.find(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          needle.includes(p.name.toLowerCase())
      );

      if (!match) {
        // Not found this pass — count as succeeded (no-op) but note it.
        result.succeeded += 1;
        continue;
      }

      await addLead({
        ...lead,
        googleRating: match.rating,
        googleReviewCount: match.reviewCount,
        hasResponseToReviews: match.hasResponseToReviews,
      });
      result.succeeded += 1;
    } catch (e) {
      recordError(result, lead.id, e);
    }
  }

  return result;
}

// ─── newsletter-drip ───────────────────────────────────────────────────────
// Send the next due lesson to every course-drip subscriber whose 24h gap has
// elapsed. Pulls from `getDueLessons` and marks each lesson as sent so the
// state machine advances.

export async function runNewsletterDrip(now: Date = new Date()): Promise<TaskResult> {
  const result = emptyResult();
  let due: ReturnType<typeof getDueLessons>;
  try {
    due = getDueLessons(now);
  } catch (e) {
    recordError(result, "getDueLessons", e);
    return result;
  }

  for (const { subscriber, course, lesson } of due) {
    result.processed += 1;
    const subject = `[${course.title}] Day ${lesson.day}: ${lesson.subject}`;
    const ctaBlock = lesson.cta
      ? `<p style="color:#22D3EE;line-height:1.6;margin-top:16px"><strong>Next step:</strong> ${lesson.cta}</p>`
      : "";
    const html = `<!DOCTYPE html><html><body style="font-family:'DM Sans',Arial,sans-serif;background:#0C0F1A;color:#E2E8F0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#1A1F36;border-radius:12px;padding:32px;border:1px solid #2D3348">
<p style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px 0">${course.title} · Day ${lesson.day}</p>
<h1 style="color:#22D3EE;font-family:'Instrument Serif',serif;font-style:italic;margin:0 0 16px 0">${lesson.subject}</h1>
<div style="color:#94A3B8;line-height:1.6;white-space:pre-wrap">${lesson.body}</div>
${ctaBlock}
</div></body></html>`;
    const text = `${course.title} — Day ${lesson.day}: ${lesson.subject}\n\n${lesson.body}${lesson.cta ? `\n\nNext step: ${lesson.cta}` : ""}`;

    try {
      const send = await emailProvider.send({
        to: subscriber.email,
        subject,
        html,
        text,
      });
      if (send.success) {
        markLessonSent(subscriber.email, subscriber.courseSlug, lesson.day, now);
        result.succeeded += 1;
      } else {
        recordError(
          result,
          `${subscriber.email}/${course.slug}`,
          send.error ?? "send returned !success"
        );
      }
    } catch (e) {
      recordError(result, `${subscriber.email}/${course.slug}`, e);
    }
  }

  result.notes?.push(
    `Total course subscribers: ${listSubscribers().length}`
  );
  return result;
}

// ─── cleanup-expired ───────────────────────────────────────────────────────
// Expire perks past their expiresAt date and transition campaigns past their
// expiry to the appropriate terminal state. Both helpers are idempotent.

export async function runCleanupExpired(): Promise<TaskResult> {
  const result = emptyResult();

  try {
    const { expired: expiredPerkCount } = expirePerks();
    result.processed += expiredPerkCount;
    result.succeeded += expiredPerkCount;
    result.notes?.push(`Expired ${expiredPerkCount} perks`);
  } catch (e) {
    recordError(result, "expirePerks", e);
  }

  try {
    const { expired, ended } = campaignManager.checkAllExpiries();
    const total = expired.length + ended.length;
    result.processed += total;
    result.succeeded += total;
    result.notes?.push(
      `Campaigns expired: ${expired.length}, ended-while-paused: ${ended.length}`
    );
  } catch (e) {
    recordError(result, "campaignManager.checkAllExpiries", e);
  }

  return result;
}

// ─── Registry ──────────────────────────────────────────────────────────────

export type TaskName =
  | "trial-expiring"
  | "weekly-digest"
  | "lead-status-sync"
  | "newsletter-drip"
  | "cleanup-expired";

export const TASKS: Record<TaskName, () => Promise<TaskResult>> = {
  "trial-expiring": () => runTrialExpiring(),
  "weekly-digest": () => runWeeklyDigest(),
  "lead-status-sync": () => runLeadStatusSync(),
  "newsletter-drip": () => runNewsletterDrip(),
  "cleanup-expired": () => runCleanupExpired(),
};

export function isTaskName(name: string): name is TaskName {
  return name in TASKS;
}

// ─── Last-Run Tracking (in-memory) ─────────────────────────────────────────
// Stored here (not in the route) so the status endpoint can read it without
// triggering a cross-route import cycle.

export interface LastRunRecord {
  ranAt: string;
  durationMs: number;
  success: boolean;
  result: TaskResult;
}

const lastRuns = new Map<TaskName, LastRunRecord>();

export function recordLastRun(name: TaskName, record: LastRunRecord): void {
  lastRuns.set(name, record);
}

export function getLastRun(name: TaskName): LastRunRecord | undefined {
  return lastRuns.get(name);
}

export function getAllLastRuns(): Record<TaskName, LastRunRecord | null> {
  const out: Partial<Record<TaskName, LastRunRecord | null>> = {};
  for (const name of Object.keys(TASKS) as TaskName[]) {
    out[name] = lastRuns.get(name) ?? null;
  }
  return out as Record<TaskName, LastRunRecord | null>;
}
