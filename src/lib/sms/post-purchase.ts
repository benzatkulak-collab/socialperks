/**
 * Post-purchase SMS pipeline.
 *
 * The flywheel: customer pays → ~2 hours later they get a friendly
 * SMS with the perk QR link → they post → friends scan and become
 * customers.
 *
 * POS webhooks (Square / Toast / Clover) call `enqueuePostPurchaseSms`
 * after a verified payment event. This module owns the delay timer,
 * opt-out tracking, and the templated message body.
 *
 * Persistence: in-memory ring buffer + setTimeout for now.
 * TODO: write-through to a `sms_queue` table when DATABASE_URL is set
 * so server restarts don't drop pending sends, and so multi-instance
 * deployments don't double-send. See lib/db for the connection pattern.
 */

import { sendSms } from "@/lib/notifications/channels";
import { db, InMemoryConnection } from "@/lib/db/connection";

const usingDb = !(db instanceof InMemoryConnection);

// ─── Constants ───────────────────────────────────────────────────────────────

export const SMS_OPT_OUT_FOOTER = "\n\nReply STOP to opt out.";

const RING_BUFFER_SIZE = 500;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EnqueueArgs {
  businessId: string;
  businessName: string;
  campaignId: string;
  customerPhone: string;
  purchaseAmount: number;
  /** Default 120 = 2 hours. POS webhooks should leave at default; only
   *  test routes pass 0 to fire immediately. */
  delayMinutes?: number;
  /** Optional perk description ("next coffee", "next pastry"). */
  perkText?: string;
}

export interface QueuedSms {
  id: string;
  businessId: string;
  businessName: string;
  campaignId: string;
  customerPhone: string;
  purchaseAmount: number;
  body: string;
  enqueuedAt: string;
  scheduledFor: string;
  status: "pending" | "sent" | "failed" | "skipped_opted_out";
  error?: string;
}

// ─── In-memory state ─────────────────────────────────────────────────────────
//
// Ring buffer is process-local — pending sends DO get lost on a server
// restart. That's an accepted trade-off for the MVP because the post-
// purchase delay is 2 hours and Vercel functions are short-lived; a
// production-grade queue migrates these to a `sms_queue` table backed
// by a Vercel cron tick. Filed as a follow-up; see TODO at top of file.
//
// Opt-out set, by contrast, IS persisted (compliance — when someone
// replies STOP we must honor it forever, including across redeploys).

const ringBuffer: QueuedSms[] = [];
const optedOut = new Set<string>();

function pushToRing(entry: QueuedSms): void {
  ringBuffer.push(entry);
  if (ringBuffer.length > RING_BUFFER_SIZE) {
    ringBuffer.splice(0, ringBuffer.length - RING_BUFFER_SIZE);
  }
}

// Warm the opt-out cache from Postgres on cold start. Best-effort; a
// failure here doesn't break sends — `isOptedOut` will just miss
// recently-opted-out users until the cache loads. The pattern matches
// the api-keys/auto-issue layer.
let optOutsHydrated = false;
async function hydrateOptOuts(): Promise<void> {
  if (optOutsHydrated || !usingDb) {
    optOutsHydrated = true;
    return;
  }
  try {
    const result = await db.query<{ phone: string }>(`SELECT phone FROM sms_opt_outs`);
    for (const row of result.rows) optedOut.add(normalizePhone(row.phone));
  } catch (e) {
    console.error("[sms] opt-out hydration failed:", e);
  } finally {
    optOutsHydrated = true;
  }
}
// Kick off hydration immediately, but don't block module evaluation.
void hydrateOptOuts();

// ─── Opt-out helpers ─────────────────────────────────────────────────────────

/**
 * Record a STOP. Persists to Postgres when configured so it survives
 * redeploys — compliance requires we honor opt-outs forever, not just
 * for the current process lifetime.
 */
export async function markOptedOut(phone: string, reason?: string): Promise<void> {
  const normalized = normalizePhone(phone);
  optedOut.add(normalized);
  if (!usingDb) return;
  try {
    await db.query(
      `INSERT INTO sms_opt_outs (phone, reason)
       VALUES ($1, $2)
       ON CONFLICT (phone) DO NOTHING`,
      [normalized, reason ?? null],
    );
  } catch (e) {
    console.error("[sms] opt-out persist failed:", e);
  }
}

export function isOptedOut(phone: string): boolean {
  return optedOut.has(normalizePhone(phone));
}

function normalizePhone(phone: string): string {
  return phone.trim();
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function listQueuedSms(businessId?: string): QueuedSms[] {
  if (!businessId) return [...ringBuffer];
  return ringBuffer.filter((e) => e.businessId === businessId);
}

export function enqueuePostPurchaseSms(args: EnqueueArgs): QueuedSms {
  const delayMinutes = args.delayMinutes ?? 120;
  const perkText = args.perkText ?? "next one";
  const claimUrl = `${SITE_URL}/c/${args.campaignId}?ref=sms`;

  const messageBody =
    `Hey from ${args.businessName}! Thanks for stopping by. ` +
    `Post about us on IG/TikTok and we'll cover your ${perkText}: ${claimUrl}` +
    SMS_OPT_OUT_FOOTER;

  const now = new Date();
  const entry: QueuedSms = {
    id: `sms_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    businessId: args.businessId,
    businessName: args.businessName,
    campaignId: args.campaignId,
    customerPhone: args.customerPhone,
    purchaseAmount: args.purchaseAmount,
    body: messageBody,
    enqueuedAt: now.toISOString(),
    scheduledFor: new Date(now.getTime() + delayMinutes * 60_000).toISOString(),
    status: "pending",
  };

  pushToRing(entry);

  // If recipient is already opted out, mark and skip the send.
  if (isOptedOut(args.customerPhone)) {
    entry.status = "skipped_opted_out";
    return entry;
  }

  const timerMs = Math.max(0, delayMinutes * 60_000);
  setTimeout(() => {
    void deliver(entry);
  }, timerMs);

  return entry;
}

async function deliver(entry: QueuedSms): Promise<void> {
  // Re-check opt-out at delivery time — they could have unsubscribed
  // during the 2-hour delay window.
  if (isOptedOut(entry.customerPhone)) {
    entry.status = "skipped_opted_out";
    return;
  }
  try {
    const result = await sendSms({ to: entry.customerPhone, body: entry.body });
    if (result.success) {
      entry.status = "sent";
    } else {
      entry.status = "failed";
      entry.error = result.error;
    }
  } catch (e) {
    entry.status = "failed";
    entry.error = e instanceof Error ? e.message : "unknown";
  }
}
