/**
 * Postgres write-through layer for the in-memory webhookStore.
 *
 * Why a separate module instead of inline in index.ts:
 *   - The in-memory WebhookStore class is stable and well-tested. We
 *     don't want to entangle DB error handling with its delivery
 *     logic.
 *   - This module is null-safe: when DATABASE_URL is unset, every
 *     export is a no-op. Local dev keeps working unchanged.
 *   - Hydration on cold start is one explicit call; the existing
 *     webhookStore singleton calls `hydrate(webhookStore)` once after
 *     instantiation.
 *
 * Field-name mapping:
 *   webhooks table  →  WebhookEndpoint
 *     id             →  id
 *     business_id    →  businessId
 *     url            →  url
 *     events         →  events (text[] ↔ string[])
 *     active boolean →  status: 'active'|'inactive'   (we lose 'failing' on DB; recompute on hydrate)
 *     secret         →  secret
 *     failure_count  →  failureCount
 *     last_success_at→  lastSuccess
 *     last_failure_at→  lastFailure
 *     created_at     →  createdAt
 *
 *   webhook_deliveries table  →  WebhookDelivery
 *     id            →  id
 *     webhook_id    →  webhookId
 *     event_type    →  eventType
 *     payload       →  payload
 *     status        →  status
 *     status_code   →  statusCode
 *     attempts      →  attempts
 *     max_attempts  →  maxAttempts
 *     next_retry    →  nextRetry
 *     response      →  response
 *     error         →  error
 *     created_at    →  createdAt
 *     delivered_at  →  deliveredAt
 */

import { db, InMemoryConnection } from "@/lib/db/connection";
import type { WebhookDelivery, WebhookEndpoint } from "./index";

const usingDb = !(db instanceof InMemoryConnection);

interface EndpointRow {
  id: string;
  business_id: string;
  url: string;
  events: string[] | string;
  active: boolean;
  secret: string;
  failure_count: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_failure_reason: string | null;
  created_at: string;
}

interface DeliveryRow {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: unknown;
  status: WebhookDelivery["status"];
  status_code: number | null;
  attempts: number;
  max_attempts: number;
  next_retry: string | null;
  response: string | null;
  error: string | null;
  created_at: string;
  delivered_at: string | null;
}

function rowToEndpoint(row: EndpointRow, failingThreshold: number): WebhookEndpoint {
  const events = Array.isArray(row.events)
    ? row.events
    : typeof row.events === "string"
    ? row.events.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  return {
    id: row.id,
    businessId: row.business_id,
    url: row.url,
    events,
    secret: row.secret,
    // The DB stores active/inactive only; we recompute "failing" from
    // failure_count on load so the in-memory state matches what the
    // existing dispatch logic expects.
    status: !row.active
      ? "inactive"
      : row.failure_count >= failingThreshold
      ? "failing"
      : "active",
    failureCount: row.failure_count,
    lastTriggered: row.last_success_at ?? row.last_failure_at ?? null,
    lastSuccess: row.last_success_at,
    lastFailure: row.last_failure_at,
    createdAt: row.created_at,
  };
}

function rowToDelivery(row: DeliveryRow): WebhookDelivery {
  return {
    id: row.id,
    webhookId: row.webhook_id,
    eventType: row.event_type,
    payload: row.payload,
    status: row.status,
    statusCode: row.status_code,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    nextRetry: row.next_retry,
    response: row.response,
    error: row.error,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Fire-and-forget: persist a newly registered endpoint. */
export async function persistEndpoint(endpoint: WebhookEndpoint): Promise<void> {
  if (!usingDb) return;
  try {
    await db.query(
      `INSERT INTO webhooks
         (id, business_id, url, events, active, secret, failure_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (id) DO UPDATE
         SET url = EXCLUDED.url,
             events = EXCLUDED.events,
             active = EXCLUDED.active,
             updated_at = NOW()`,
      [
        endpoint.id,
        endpoint.businessId,
        endpoint.url,
        endpoint.events,
        endpoint.status !== "inactive",
        endpoint.secret,
        endpoint.failureCount,
        endpoint.createdAt,
      ],
    );
  } catch (e) {
    console.error("[webhooks/persistence] persist endpoint failed:", e);
  }
}

/** Fire-and-forget: update endpoint state after a delivery attempt. */
export async function updateEndpointState(endpoint: WebhookEndpoint): Promise<void> {
  if (!usingDb) return;
  try {
    await db.query(
      `UPDATE webhooks
          SET active = $2,
              failure_count = $3,
              last_success_at = $4,
              last_failure_at = $5,
              updated_at = NOW()
        WHERE id = $1`,
      [
        endpoint.id,
        endpoint.status !== "inactive",
        endpoint.failureCount,
        endpoint.lastSuccess,
        endpoint.lastFailure,
      ],
    );
  } catch (e) {
    console.error("[webhooks/persistence] update endpoint failed:", e);
  }
}

/** Fire-and-forget: persist a delivery row. */
export async function persistDelivery(delivery: WebhookDelivery): Promise<void> {
  if (!usingDb) return;
  try {
    await db.query(
      `INSERT INTO webhook_deliveries
         (id, webhook_id, event_type, payload, status, status_code, attempts, max_attempts,
          next_retry, response, error, created_at, delivered_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE
         SET status = EXCLUDED.status,
             status_code = EXCLUDED.status_code,
             attempts = EXCLUDED.attempts,
             next_retry = EXCLUDED.next_retry,
             response = EXCLUDED.response,
             error = EXCLUDED.error,
             delivered_at = EXCLUDED.delivered_at`,
      [
        delivery.id,
        delivery.webhookId,
        delivery.eventType,
        JSON.stringify(delivery.payload),
        delivery.status,
        delivery.statusCode,
        delivery.attempts,
        delivery.maxAttempts,
        delivery.nextRetry,
        delivery.response,
        delivery.error,
        delivery.createdAt,
        delivery.deliveredAt,
      ],
    );
  } catch (e) {
    console.error("[webhooks/persistence] persist delivery failed:", e);
  }
}

export async function loadAllEndpoints(failingThreshold = 3): Promise<WebhookEndpoint[]> {
  if (!usingDb) return [];
  try {
    const result = await db.query<EndpointRow>(`SELECT * FROM webhooks`);
    return result.rows.map((row) => rowToEndpoint(row, failingThreshold));
  } catch (e) {
    console.error("[webhooks/persistence] load endpoints failed:", e);
    return [];
  }
}

/**
 * Load all deliveries that may still need work — pending or failed
 * with a future retry. Used on cold start so the cron drain has the
 * full picture, not just whatever happened in this process.
 */
export async function loadPendingDeliveries(): Promise<WebhookDelivery[]> {
  if (!usingDb) return [];
  try {
    const result = await db.query<DeliveryRow>(
      `SELECT * FROM webhook_deliveries
        WHERE status IN ('pending', 'failed')`,
    );
    return result.rows.map(rowToDelivery);
  } catch (e) {
    console.error("[webhooks/persistence] load deliveries failed:", e);
    return [];
  }
}

/** Convenience for the cron route — returns pending+due rows. */
export async function loadDueDeliveries(maxBatch = 100): Promise<WebhookDelivery[]> {
  if (!usingDb) return [];
  try {
    const result = await db.query<DeliveryRow>(
      `SELECT * FROM webhook_deliveries
        WHERE status IN ('pending', 'failed')
          AND (next_retry IS NULL OR next_retry <= NOW())
        ORDER BY next_retry NULLS FIRST
        LIMIT $1`,
      [maxBatch],
    );
    return result.rows.map(rowToDelivery);
  } catch (e) {
    console.error("[webhooks/persistence] load due deliveries failed:", e);
    return [];
  }
}
