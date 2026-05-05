/**
 * Post-purchase SMS pipeline.
 *
 * The flywheel: customer pays → ~2 hours later they get a friendly
 * SMS with the perk QR link → they post → friends scan and become
 * customers.
 *
 * POS webhooks (Square / Toast / Clover) call `enqueuePostPurchaseSms`
 * after a verified payment event. This module owns the delay timer,
 * opt-out tracking, persistence, and the templated message body.
 *
 * Persistence model
 * ─────────────────
 * When DATABASE_URL is set, the `sms_queue` table is the source of
 * truth. The in-memory ring buffer is a process-local read cache and
 * a same-process fast-path for delays under 60s (so test endpoints
 * still fire immediately). The `drainPending()` function — invoked
 * by the Vercel cron at /api/v1/cron/sms-drain — selects due rows
 * and delivers them. setTimeout is unreliable across the short-lived
 * Vercel function lifetime, so the cron is the production code path.
 *
 * When DATABASE_URL is unset, the ring buffer + setTimeout is the
 * source of truth (local dev, no cron needed).
 */

import { sendSms } from "@/lib/notifications/channels";
import { db, InMemoryConnection } from "@/lib/db/connection";

const usingDb = !(db instanceof InMemoryConnection);

// ─── Constants ───────────────────────────────────────────────────────────────

export const SMS_OPT_OUT_FOOTER = "\n\nReply STOP to opt out.";

const RING_BUFFER_SIZE = 500;

/** Below this threshold we also schedule a setTimeout for low-latency
 *  in-process delivery (test endpoints, dev). Above it we rely on the
 *  cron drain because the function instance won't live that long. */
const FAST_PATH_THRESHOLD_MS = 60_000;

/** Drain batch size — keep below the rate-limit headroom for Twilio. */
const DRAIN_BATCH_SIZE = 100;

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

export interface DrainResult {
  drained: number;
  sent: number;
  failed: number;
  skipped: number;
}

interface SmsQueueRow {
  id: string;
  business_id: string;
  business_name: string;
  campaign_id: string;
  customer_phone: string;
  purchase_amount: string | number;
  body: string;
  enqueued_at: string;
  scheduled_for: string;
  status: QueuedSms["status"];
  attempts: number;
  last_error: string | null;
  sent_at: string | null;
}

function rowToQueuedSms(row: SmsQueueRow): QueuedSms {
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.business_name,
    campaignId: row.campaign_id,
    customerPhone: row.customer_phone,
    purchaseAmount: Number(row.purchase_amount),
    body: row.body,
    enqueuedAt: new Date(row.enqueued_at).toISOString(),
    scheduledFor: new Date(row.scheduled_for).toISOString(),
    status: row.status,
    error: row.last_error ?? undefined,
  };
}

// ─── In-memory state ─────────────────────────────────────────────────────────
//
// Ring buffer = read cache when usingDb, source of truth otherwise.
// Opt-out set is persisted (compliance — we must honor STOP forever).

const ringBuffer: QueuedSms[] = [];
const optedOut = new Set<string>();

function pushToRing(entry: QueuedSms): void {
  ringBuffer.push(entry);
  if (ringBuffer.length > RING_BUFFER_SIZE) {
    ringBuffer.splice(0, ringBuffer.length - RING_BUFFER_SIZE);
  }
}

function updateRingEntry(id: string, patch: Partial<QueuedSms>): void {
  const idx = ringBuffer.findIndex((e) => e.id === id);
  if (idx >= 0) {
    ringBuffer[idx] = { ...ringBuffer[idx], ...patch };
  }
}

// Warm the opt-out cache from Postgres on cold start. Best-effort.
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

// ─── Persistence helpers ─────────────────────────────────────────────────────

async function persistQueueRow(entry: QueuedSms): Promise<void> {
  if (!usingDb) return;
  try {
    await db.query(
      `INSERT INTO sms_queue (
         id, business_id, business_name, campaign_id, customer_phone,
         purchase_amount, body, enqueued_at, scheduled_for, status, attempts
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0)
       ON CONFLICT (id) DO NOTHING`,
      [
        entry.id,
        entry.businessId,
        entry.businessName,
        entry.campaignId,
        entry.customerPhone,
        entry.purchaseAmount,
        entry.body,
        entry.enqueuedAt,
        entry.scheduledFor,
        entry.status,
      ],
    );
  } catch (e) {
    console.error("[sms] queue persist failed:", e);
  }
}

async function markRowSent(id: string): Promise<void> {
  if (!usingDb) return;
  try {
    await db.query(
      `UPDATE sms_queue
          SET status = 'sent',
              sent_at = NOW(),
              attempts = attempts + 1,
              last_error = NULL
        WHERE id = $1`,
      [id],
    );
  } catch (e) {
    console.error("[sms] mark-sent failed:", e);
  }
}

async function markRowFailed(id: string, error: string): Promise<void> {
  if (!usingDb) return;
  try {
    await db.query(
      `UPDATE sms_queue
          SET status = 'failed',
              attempts = attempts + 1,
              last_error = $2
        WHERE id = $1`,
      [id, error],
    );
  } catch (e) {
    console.error("[sms] mark-failed failed:", e);
  }
}

async function markRowSkipped(id: string): Promise<void> {
  if (!usingDb) return;
  try {
    await db.query(
      `UPDATE sms_queue
          SET status = 'skipped_opted_out'
        WHERE id = $1`,
      [id],
    );
  } catch (e) {
    console.error("[sms] mark-skipped failed:", e);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * List queued SMS. When DATABASE_URL is set, reads from the table so
 * the dashboard reflects state across redeploys / multiple instances.
 * The in-memory ring is consulted as a 0-latency fallback if the
 * query fails.
 */
export async function listQueuedSms(businessId?: string): Promise<QueuedSms[]> {
  if (!usingDb) {
    if (!businessId) return [...ringBuffer];
    return ringBuffer.filter((e) => e.businessId === businessId);
  }
  try {
    const result = businessId
      ? await db.query<SmsQueueRow>(
          `SELECT * FROM sms_queue
            WHERE business_id = $1
            ORDER BY enqueued_at DESC
            LIMIT 500`,
          [businessId],
        )
      : await db.query<SmsQueueRow>(
          `SELECT * FROM sms_queue
            ORDER BY enqueued_at DESC
            LIMIT 500`,
        );
    return result.rows.map(rowToQueuedSms);
  } catch (e) {
    console.error("[sms] list query failed; falling back to ring:", e);
    if (!businessId) return [...ringBuffer];
    return ringBuffer.filter((e2) => e2.businessId === businessId);
  }
}

/**
 * Enqueue a post-purchase SMS. Returns a QueuedSms snapshot.
 *
 * Synchronous return (no Promise) — the persistence write is fired
 * in the background so POS webhook handlers don't pay the round-trip
 * latency on the hot path. If persistence fails, the in-memory entry
 * still records the attempt and we fall back to the setTimeout path.
 */
export function enqueuePostPurchaseSms(args: EnqueueArgs): QueuedSms {
  const delayMinutes = args.delayMinutes ?? 120;
  const perkText = args.perkText ?? "next one";
  const claimUrl = `${SITE_URL}/c/${args.campaignId}?ref=sms`;

  const messageBody =
    `Hey from ${args.businessName}! Thanks for stopping by. ` +
    `Post about us on IG/TikTok and we'll cover your ${perkText}: ${claimUrl}` +
    SMS_OPT_OUT_FOOTER;

  const now = new Date();
  const delayMs = Math.max(0, delayMinutes * 60_000);
  const entry: QueuedSms = {
    id: `sms_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    businessId: args.businessId,
    businessName: args.businessName,
    campaignId: args.campaignId,
    customerPhone: args.customerPhone,
    purchaseAmount: args.purchaseAmount,
    body: messageBody,
    enqueuedAt: now.toISOString(),
    scheduledFor: new Date(now.getTime() + delayMs).toISOString(),
    status: "pending",
  };

  pushToRing(entry);

  // If recipient is already opted out, mark, persist, and skip.
  if (isOptedOut(args.customerPhone)) {
    entry.status = "skipped_opted_out";
    void persistQueueRow(entry);
    return entry;
  }

  // Persist (write-through). Fire-and-forget — the cron will see the
  // row even if the in-process timer fails to fire.
  void persistQueueRow(entry);

  // Same-process fast path for short delays (test endpoints, dev).
  // For production 2-hour delays this timer probably won't fire
  // (Vercel function will exit) — that's fine, the cron picks it up.
  if (delayMs < FAST_PATH_THRESHOLD_MS) {
    setTimeout(() => {
      void deliver(entry.id);
    }, delayMs);
  }

  return entry;
}

/**
 * Deliver a single queued message by id. Updates both the in-memory
 * ring entry and the persisted row. Idempotent enough — the cron
 * filters on status='pending' so a double-fire just no-ops the second
 * time at the SQL level.
 */
async function deliver(id: string): Promise<void> {
  // Look up the entry. Memory first (fast path), DB fallback so the
  // cron drain works even after a redeploy nuked the ring.
  let entry = ringBuffer.find((e) => e.id === id) ?? null;
  if (!entry && usingDb) {
    try {
      const result = await db.query<SmsQueueRow>(
        `SELECT * FROM sms_queue WHERE id = $1 LIMIT 1`,
        [id],
      );
      const row = result.rows[0];
      if (row) entry = rowToQueuedSms(row);
    } catch (e) {
      console.error("[sms] deliver lookup failed:", e);
    }
  }
  if (!entry) return;

  // Re-check opt-out — they could have unsubscribed during the delay.
  if (isOptedOut(entry.customerPhone)) {
    updateRingEntry(id, { status: "skipped_opted_out" });
    await markRowSkipped(id);
    return;
  }

  try {
    const result = await sendSms({ to: entry.customerPhone, body: entry.body });
    if (result.success) {
      updateRingEntry(id, { status: "sent", error: undefined });
      await markRowSent(id);
    } else {
      const reason = result.error ?? "unknown";
      updateRingEntry(id, { status: "failed", error: reason });
      await markRowFailed(id, reason);
    }
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown";
    updateRingEntry(id, { status: "failed", error: reason });
    await markRowFailed(id, reason);
  }
}

/**
 * Drain pending rows whose `scheduled_for` has passed. Called by the
 * Vercel cron tick. No-op when DATABASE_URL is unset (local dev uses
 * the setTimeout fast-path for everything).
 */
export async function drainPending(): Promise<DrainResult> {
  const result: DrainResult = { drained: 0, sent: 0, failed: 0, skipped: 0 };

  if (!usingDb) return result;

  // Make sure opt-outs are loaded before we send anything.
  await hydrateOptOuts();

  let rows: SmsQueueRow[] = [];
  try {
    const select = await db.query<SmsQueueRow>(
      `SELECT * FROM sms_queue
        WHERE status = 'pending'
          AND scheduled_for <= NOW()
        ORDER BY scheduled_for ASC
        LIMIT $1`,
      [DRAIN_BATCH_SIZE],
    );
    rows = select.rows;
  } catch (e) {
    console.error("[sms] drain select failed:", e);
    return result;
  }

  for (const row of rows) {
    result.drained += 1;
    const entry = rowToQueuedSms(row);

    // Re-check opt-out at delivery time.
    if (isOptedOut(entry.customerPhone)) {
      await markRowSkipped(entry.id);
      updateRingEntry(entry.id, { status: "skipped_opted_out" });
      result.skipped += 1;
      continue;
    }

    try {
      const send = await sendSms({ to: entry.customerPhone, body: entry.body });
      if (send.success) {
        await markRowSent(entry.id);
        updateRingEntry(entry.id, { status: "sent", error: undefined });
        result.sent += 1;
      } else {
        const reason = send.error ?? "unknown";
        await markRowFailed(entry.id, reason);
        updateRingEntry(entry.id, { status: "failed", error: reason });
        result.failed += 1;
      }
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      await markRowFailed(entry.id, reason);
      updateRingEntry(entry.id, { status: "failed", error: reason });
      result.failed += 1;
    }
  }

  return result;
}
