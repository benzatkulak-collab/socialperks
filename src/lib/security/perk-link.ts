/**
 * Signed magic-link tokens for anonymous perk redemption.
 *
 * A customer who claims a perk through the public `/c` submit flow has no
 * account — they're an anonymous `cust_<hash>` id with no session. To let them
 * see and redeem their perk without signing up, we email them a link containing
 * an HMAC-signed token that encodes their userId. The token grants read + redeem
 * access to THAT user's own perks only and cannot be forged without the server
 * secret. This is the "last mile" of the value loop: post → approve → perk lands
 * on the customer's phone → redeem.
 */

import { createHmac } from "crypto";

let _secret: string | undefined;
function getSecret(): string {
  if (_secret) return _secret;
  const secret =
    process.env.PERK_LINK_SECRET || process.env.AUTH_SECRET || process.env.CSRF_SECRET;
  if (secret) return (_secret = secret);
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: PERK_LINK_SECRET or AUTH_SECRET must be set in production"
    );
  }
  console.warn(
    "[perk-link] WARNING: using dev secret. Set PERK_LINK_SECRET for production."
  );
  return (_secret = "dev-only-unsafe-perk-link-secret");
}

// Valid for 180 days — long enough for a customer to come back and redeem,
// bounded so a leaked link doesn't grant access forever. (The perk's own
// expiry is the real redemption window; this just caps link lifetime.)
const TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/** Create a URL-safe magic-link token for a customer's userId. */
export function signPerkToken(userId: string): string {
  const ts = Date.now().toString(36);
  const payload = `${userId}.${ts}`;
  return Buffer.from(`${payload}.${sign(payload)}`, "utf8").toString("base64url");
}

/** Verify a token; returns the userId if valid + unexpired, else null. */
export function verifyPerkToken(token: string): string | null {
  if (!token || typeof token !== "string") return null;

  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return null;
  }

  // decoded = `${userId}.${ts}.${signature}`
  const lastDot = decoded.lastIndexOf(".");
  if (lastDot < 0) return null;
  const payload = decoded.slice(0, lastDot);
  const signature = decoded.slice(lastDot + 1);

  // Constant-time signature comparison.
  const expected = sign(payload);
  if (expected.length !== signature.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  const sep = payload.lastIndexOf(".");
  if (sep < 0) return null;
  const userId = payload.slice(0, sep);
  const ts = parseInt(payload.slice(sep + 1), 36);
  if (!userId || !Number.isFinite(ts)) return null;

  const age = Date.now() - ts;
  if (age < 0 || age > TOKEN_TTL_MS) return null;

  return userId;
}

/** Absolute URL of the magic-link perk page for a customer's userId. */
export function perkLinkUrl(userId: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://socialperks.app";
  return `${base}/perk/${signPerkToken(userId)}`;
}
