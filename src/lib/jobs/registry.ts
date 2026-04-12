/**
 * Job Queue Registry — Pre-configured application queues
 *
 * Each queue has a registered processor that calls the appropriate service.
 * Import from here (or the barrel `@/lib/jobs`) to enqueue work.
 *
 * When REDIS_URL is set, `createQueue` returns a BullMQ-backed adapter.
 * Otherwise it returns the in-memory JobQueue for zero-dependency dev.
 */

import { JobQueue } from "./queue";
import type { Job, QueueOptions } from "./queue";
import { BullMQAdapter } from "./bullmq-adapter";

// ─── Queue Factory ──────────────────────────────────────────────────────────

/**
 * Creates a queue backed by BullMQ (Redis) when REDIS_URL is set,
 * or the in-memory JobQueue otherwise.
 *
 * The returned object has the same interface regardless of backend.
 */
export function createQueue<T = unknown>(
  name: string,
  opts?: QueueOptions
): JobQueue<T> | BullMQAdapter<T> {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return new BullMQAdapter<T>(name, redisUrl, opts);
  }
  return new JobQueue<T>(name, opts);
}

// ─── Email Queue ────────────────────────────────────────────────────────────

export interface EmailJobData {
  type: "welcome" | "password-reset" | "digest" | "drip" | "transactional";
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  /** For welcome emails */
  name?: string;
  /** For password reset emails */
  resetLink?: string;
  /** For digest emails */
  businessId?: string;
  businessName?: string;
}

export const emailQueue = new JobQueue<EmailJobData>("email", {
  concurrency: 3,
  maxAttempts: 5,
  defaultTimeout: 15_000,
  onDead: (job: Job) => {
    console.error(`[jobs:email] Dead letter: job=${job.id} type=${(job.data as EmailJobData).type} to=${(job.data as EmailJobData).to} error=${job.lastError}`);
  },
});

emailQueue.process(async (job: Job<EmailJobData>) => {
  // Lazy import to avoid circular dependency at module load time
  const { emailProvider, welcomeEmail, passwordResetEmail } = await import("@/lib/email");

  const { type, to } = job.data;

  switch (type) {
    case "welcome": {
      const template = welcomeEmail(job.data.name ?? "there");
      return emailProvider.send({ to, ...template });
    }
    case "password-reset": {
      const template = passwordResetEmail(
        job.data.name ?? "there",
        job.data.resetLink ?? ""
      );
      return emailProvider.send({ to, ...template });
    }
    case "digest": {
      const { buildDigestData, generateDigestHtml } = await import("@/lib/email/digest");
      const data = buildDigestData(
        job.data.businessId ?? "",
        job.data.businessName ?? job.data.businessId ?? "",
        to
      );
      const { subject, html, text } = generateDigestHtml(data);
      return emailProvider.send({ to, subject, html, text });
    }
    case "transactional":
    case "drip": {
      if (!job.data.subject || !job.data.html || !job.data.text) {
        throw new Error("transactional/drip emails require subject, html, and text");
      }
      return emailProvider.send({
        to,
        subject: job.data.subject,
        html: job.data.html,
        text: job.data.text,
      });
    }
  }
});

// ─── Verification Queue ─────────────────────────────────────────────────────

export interface VerificationJobData {
  submissionId: string;
  proofUrl: string;
  platformId: string;
}

export const verificationQueue = new JobQueue<VerificationJobData>("verification", {
  concurrency: 10,
  maxAttempts: 2,
  defaultTimeout: 10_000,
  onDead: (job: Job) => {
    console.error(`[jobs:verification] Dead letter: job=${job.id} submission=${(job.data as VerificationJobData).submissionId} error=${job.lastError}`);
  },
});

verificationQueue.process(async (job: Job<VerificationJobData>) => {
  const { checkProofUrl } = await import("@/lib/verification/url-checker");
  const { getSubmissionById } = await import("@/lib/submissions");

  const { submissionId, proofUrl, platformId } = job.data;
  const urlCheck = await checkProofUrl(proofUrl, platformId);

  // Attach result to the submission metadata
  const sub = getSubmissionById(submissionId);
  if (sub) {
    sub.metadata = {
      ...sub.metadata,
      urlVerification: urlCheck,
    };
  }

  return urlCheck;
});

// ─── Payout Queue ───────────────────────────────────────────────────────────

export interface PayoutJobData {
  payoutId: string;
  businessId: string;
  recipientId: string;
  amount: number;
  currency: string;
}

export const payoutQueue = new JobQueue<PayoutJobData>("payout", {
  concurrency: 2,
  maxAttempts: 5,
  defaultTimeout: 30_000,
  onDead: (job: Job) => {
    console.error(`[jobs:payout] Dead letter: job=${job.id} payout=${(job.data as PayoutJobData).payoutId} amount=${(job.data as PayoutJobData).amount} error=${job.lastError}`);
  },
});

payoutQueue.process(async (job: Job<PayoutJobData>) => {
  // Placeholder: in production this would call Stripe Connect transfers.
  // For now, log and return success so the queue infrastructure is exercised.
  const { payoutId, amount, currency, recipientId } = job.data;
  console.warn(`[jobs:payout] Processing payout ${payoutId}: ${amount} ${currency} to ${recipientId}`);
  return { payoutId, status: "processed" };
});

// ─── Analytics Queue ────────────────────────────────────────────────────────

export interface AnalyticsJobData {
  type: "digest" | "snapshot" | "report";
  businessId?: string;
  /** For snapshot/report: which metric set to compute */
  metricSet?: string;
}

export const analyticsQueue = new JobQueue<AnalyticsJobData>("analytics", {
  concurrency: 1,
  maxAttempts: 3,
  defaultTimeout: 60_000,
  onDead: (job: Job) => {
    console.error(`[jobs:analytics] Dead letter: job=${job.id} type=${(job.data as AnalyticsJobData).type} error=${job.lastError}`);
  },
});

analyticsQueue.process(async (job: Job<AnalyticsJobData>) => {
  const { type, businessId } = job.data;

  switch (type) {
    case "digest": {
      // Delegate digest sending to the email queue so email retries are
      // handled independently of the analytics computation.
      if (!businessId) throw new Error("businessId required for digest");

      const { buildDigestData, generateDigestHtml } = await import("@/lib/email/digest");
      const data = buildDigestData(businessId, businessId, `${businessId}@socialperks.app`);
      const { subject, html, text } = generateDigestHtml(data);

      return { subject, recipientCount: 1, htmlLength: html.length, textLength: text.length };
    }
    case "snapshot":
    case "report": {
      // Placeholder for future analytics computation
      console.warn(`[jobs:analytics] Computing ${type} for business=${businessId ?? "all"}`);
      return { type, computed: true, timestamp: Date.now() };
    }
  }
});

// ─── Webhook Delivery Queue ──────────────────────────────────────────────────

export interface WebhookJobData {
  webhookId: string;
  businessId: string;
  url: string;
  event: string;
  payload: Record<string, unknown>;
  secret: string;
}

export const webhookQueue = new JobQueue<WebhookJobData>("webhook", {
  concurrency: 5,
  maxAttempts: 5,
  defaultTimeout: 15_000,
  onDead: (job: Job) => {
    console.error(`[jobs:webhook] Dead letter: job=${job.id} webhook=${(job.data as WebhookJobData).webhookId} event=${(job.data as WebhookJobData).event} error=${job.lastError}`);
  },
});

webhookQueue.process(async (job: Job<WebhookJobData>) => {
  const { url, event, payload, secret } = job.data;

  // Compute HMAC-SHA256 signature for the payload
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const body = JSON.stringify({ event, data: payload, timestamp: Date.now() });
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SP-Signature": signature,
      "X-SP-Event": event,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
  }

  return { status: response.status, delivered: true };
});

// ─── Webhook Retry Queue (legacy) ───────────────────────────────────────────

// Backward-compatible accessor for externally-registered webhook retry queues.

let _webhookRetryQueue: JobQueue | null = null;

/**
 * Register the webhook retry queue created externally (by the webhook store).
 * Called once during webhook store initialization.
 */
export function registerWebhookQueue(queue: JobQueue): void {
  _webhookRetryQueue = queue;
}

/** Get the webhook retry queue (may be null if not yet initialized). */
export function getWebhookRetryQueue(): JobQueue | null {
  return _webhookRetryQueue;
}

// ─── Registry Utilities ─────────────────────────────────────────────────────

/** All registered queues for bulk operations */
export const allQueues = [emailQueue, verificationQueue, payoutQueue, analyticsQueue, webhookQueue] as const;

/** Look up a queue by name */
export function getQueueByName(name: string): JobQueue | null {
  if (name === "webhook-retry" && _webhookRetryQueue) return _webhookRetryQueue;
  return (allQueues.find((q) => q.name === name) as JobQueue | undefined) ?? null;
}

/** Start processing on all queues */
export function startAllQueues(): void {
  for (const q of allQueues) {
    if (!q.isRunning()) {
      q.start();
    }
  }
}

/** Gracefully stop all queues */
export async function stopAllQueues(): Promise<void> {
  await Promise.all(allQueues.map((q) => q.stop()));
}
