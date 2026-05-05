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

const ringBuffer: QueuedSms[] = [];
const optedOut = new Set<string>();

function pushToRing(entry: QueuedSms): void {
  ringBuffer.push(entry);
  if (ringBuffer.length > RING_BUFFER_SIZE) {
    ringBuffer.splice(0, ringBuffer.length - RING_BUFFER_SIZE);
  }
}

// ─── Opt-out helpers ─────────────────────────────────────────────────────────

export function markOptedOut(phone: string): void {
  optedOut.add(normalizePhone(phone));
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
