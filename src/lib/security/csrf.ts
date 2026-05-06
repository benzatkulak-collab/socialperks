import { randomBytes, createHmac } from 'crypto';

let _csrfSecret: string | undefined;
function getCsrfSecret(): string {
  if (_csrfSecret) return _csrfSecret;
  const secret = process.env.CSRF_SECRET || process.env.AUTH_SECRET;
  if (secret) {
    _csrfSecret = secret;
    return _csrfSecret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: CSRF_SECRET or AUTH_SECRET environment variable must be set in production");
  }
  console.warn("[CSRF] WARNING: Using default dev secret. Set CSRF_SECRET for production.");
  _csrfSecret = "dev-only-unsafe-csrf-secret";
  return _csrfSecret;
}
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

export function generateCsrfToken(sessionId: string): string {
  const timestamp = Date.now().toString(36);
  const nonce = randomBytes(16).toString('hex');
  const payload = `${sessionId}.${timestamp}.${nonce}`;
  const signature = createHmac('sha256', getCsrfSecret()).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export function validateCsrfToken(token: string, sessionId: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 4) return false;
  const [tokenSessionId, timestamp, nonce, signature] = parts;
  if (tokenSessionId !== sessionId) return false;
  const age = Date.now() - parseInt(timestamp, 36);
  if (age > TOKEN_EXPIRY || age < 0) return false;
  const expected = createHmac('sha256', getCsrfSecret()).update(`${tokenSessionId}.${timestamp}.${nonce}`).digest('hex');
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Server-side single-use store for OAuth state tokens. The OAuth
 * callback at /api/v1/oauth/[platform] previously validated state by
 * comparing it to itself (the sessionId came from the same token),
 * which is a tautology.
 *
 * Use these helpers from the OAuth start route to record a pending
 * flow, and from the callback to consume it. Once consumed, the state
 * cannot be replayed.
 *
 * In-memory only — for cross-instance safety, replays would need a
 * Postgres-backed pending_oauth_flows table. The 1-hour TTL bounds
 * the risk in the meantime.
 */
interface PendingFlow {
  userId: string;
  platformId: string;
  expiresAt: number;
}
const _pendingFlows = new Map<string, PendingFlow>();

export function recordPendingOAuthFlow(state: string, userId: string, platformId: string): void {
  _pendingFlows.set(state, {
    userId,
    platformId,
    expiresAt: Date.now() + TOKEN_EXPIRY,
  });
  // Opportunistic prune.
  if (_pendingFlows.size > 1000) {
    const now = Date.now();
    for (const [k, v] of _pendingFlows) {
      if (v.expiresAt < now) _pendingFlows.delete(k);
    }
  }
}

/**
 * Atomic consume — returns the flow if present and not-expired, then
 * deletes it (single-use). Returns null on any failure (unknown state,
 * expired, or platform mismatch).
 */
export function consumePendingOAuthFlow(state: string, expectedPlatformId: string): { userId: string } | null {
  const flow = _pendingFlows.get(state);
  if (!flow) return null;
  _pendingFlows.delete(state);
  if (flow.expiresAt < Date.now()) return null;
  if (flow.platformId !== expectedPlatformId) return null;
  return { userId: flow.userId };
}
