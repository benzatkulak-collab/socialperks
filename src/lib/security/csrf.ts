import { randomBytes, createHmac } from 'crypto';

const CSRF_SECRET = (() => {
  const secret = process.env.CSRF_SECRET || process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: CSRF_SECRET or AUTH_SECRET environment variable must be set in production");
  }
  console.warn("[CSRF] WARNING: Using default dev secret. Set CSRF_SECRET for production.");
  return "dev-only-unsafe-csrf-secret";
})();
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

export function generateCsrfToken(sessionId: string): string {
  const timestamp = Date.now().toString(36);
  const nonce = randomBytes(16).toString('hex');
  const payload = `${sessionId}.${timestamp}.${nonce}`;
  const signature = createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
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
  const expected = createHmac('sha256', CSRF_SECRET).update(`${tokenSessionId}.${timestamp}.${nonce}`).digest('hex');
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}
