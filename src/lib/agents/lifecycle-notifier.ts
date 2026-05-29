/**
 * Lifecycle Notifier Agent  (autonomy level 5)
 *
 * Fires the deterministic, 1:1 transactional notifications that should
 * follow specific platform events — "submission approved", "perk awarded",
 * "influencer accepted" — by reading the event stream and enqueueing one
 * email per qualifying event.
 *
 * Why L5 (safe to run fully autonomously): each send is a single,
 * idempotent reaction to one immutable event (deduped by event id), not a
 * discretionary decision. The worst case is one extra transactional email,
 * and the agent can only act when an event already fired, so it is
 * self-bounding.
 *
 * NOTE: L5 applies *only* to event-triggered transactional mail.
 * Discretionary marketing blasts stay at L3 — that's the Outreach Agent,
 * deliberately a different agent with a human-gated promotion path.
 *
 * Ships dry-run by default; flip to live from /admin/agents.
 */

import type { Agent, AgentDecision } from "./types";
import { eventStore } from "@/lib/events";
import type { EventType, PlatformEvent } from "@/lib/events";

/** Events that map to a transactional notification, and the human label. */
const NOTIFY_ON: Partial<Record<EventType, string>> = {
  "submission.approved": "submission-approved",
  "submission.rejected": "submission-rejected",
  "perk.awarded": "perk-awarded",
  "perk.expired": "perk-expiring",
  "influencer.accepted": "application-accepted",
};

/** Already-notified event ids — idempotency guard across runs. */
const notified = new Set<string>();
const NOTIFIED_MAX = 5000;

/**
 * Watermark: only events newer than the last run are considered. Null until
 * first activation, at which point we set it and emit nothing — no
 * historical backfill, so flipping the agent on can't blast a backlog.
 */
let lastCheckedAt: string | null = null;

function recipientEmail(event: PlatformEvent): string | null {
  const d = event.data as Record<string, unknown>;
  for (const key of ["email", "recipientEmail", "to", "userEmail"]) {
    const v = d[key];
    if (typeof v === "string" && v.includes("@")) return v;
  }
  return null;
}

async function enqueueEmail(to: string, label: string): Promise<boolean> {
  try {
    const jobs = await import("@/lib/jobs/registry");
    jobs.emailQueue.add({
      type: "transactional",
      to,
      subject: label.replace(/-/g, " "),
    });
    return true;
  } catch {
    return false;
  }
}

function rememberNotified(eventId: string): void {
  notified.add(eventId);
  if (notified.size > NOTIFIED_MAX) {
    // Keep the most-recent half when capacity is hit (cheap bound).
    const keep = Array.from(notified).slice(-Math.floor(NOTIFIED_MAX / 2));
    notified.clear();
    for (const id of keep) notified.add(id);
  }
}

export const lifecycleNotifierAgent: Agent = {
  id: "lifecycle-notifier",
  name: "Lifecycle Notifier",
  description:
    "Sends 1:1 transactional notifications off the event stream (submission/perk/influencer events). Idempotent, event-bound.",
  level: 5,
  defaultMode: "dry-run",
  intervalSeconds: 60,
  config: {
    threshold: { min: 0.5, max: 1, default: 1, step: 0.05 },
    maxActionsPerRun: { min: 1, max: 200, default: 50 },
  },
  async run(ctx) {
    const decisions: AgentDecision[] = [];

    // First activation: set the watermark, emit nothing (no backfill).
    if (lastCheckedAt === null) {
      lastCheckedAt = ctx.now;
      return decisions;
    }

    const since = lastCheckedAt;
    lastCheckedAt = ctx.now;

    let events: PlatformEvent[] = [];
    try {
      events = eventStore.query({ after: since, limit: 1000 });
    } catch {
      events = [];
    }

    for (const event of events) {
      const label = NOTIFY_ON[event.type];
      if (!label) continue; // not a notifiable event
      if (notified.has(event.id)) continue; // already sent (idempotent)

      const to = recipientEmail(event);
      let executed = false;
      if (to && ctx.live) {
        executed = await enqueueEmail(to, label);
        if (executed) rememberNotified(event.id);
      }

      decisions.push({
        targetId: event.id,
        action: `notify:${label}`,
        confidence: 1,
        executed,
        reason: to
          ? `${event.type} → transactional email to ${to}`
          : `${event.type} has no recipient email on the event (skipped)`,
        meta: { eventType: event.type, entityId: event.entityId, to: to ?? null },
      });
    }

    return decisions;
  },
};
