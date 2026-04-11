import crypto from "crypto";

// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Custom Auth System
// Password hashing using Node.js built-in scrypt (no external deps needed).
// Session management with in-memory store (production: Redis or DB-backed).
// ══════════════════════════════════════════════════════════════════════════════

// ─── Password Hashing ────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey));
    });
  });
}

// ─── Session Token Generation ────────────────────────────────────────────────

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ─── Session Types ───────────────────────────────────────────────────────────

interface Session {
  id: string;
  token: string;
  userId: string;
  userRole: "business" | "influencer" | "enterprise";
  businessId: string | null;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
}

// ─── Session Store ───────────────────────────────────────────────────────────

class SessionStore {
  private sessions = new Map<string, Session>();
  private readonly maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  private createCounter = 0;

  create(
    userId: string,
    userRole: Session["userRole"],
    email: string,
    businessId: string | null,
    ipAddress: string | null = null,
    userAgent: string | null = null,
  ): Session {
    this.createCounter += 1;
    // Prune expired sessions every 100th create to avoid unbounded Map growth
    if (this.createCounter % 100 === 0) {
      this.pruneExpired();
    }
    const token = generateSessionToken();
    const now = Date.now();
    const session: Session = {
      id: crypto.randomUUID(),
      token,
      userId,
      userRole,
      businessId,
      email,
      ipAddress,
      userAgent,
      createdAt: now,
      lastActiveAt: now,
      expiresAt: now + this.maxAge,
    };
    this.sessions.set(token, session);
    return session;
  }

  get(token: string): Session | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) { this.sessions.delete(token); return null; }
    return session;
  }

  destroy(token: string): boolean {
    return this.sessions.delete(token);
  }

  /** Remove all expired sessions from the store. */
  pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [token, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
        pruned += 1;
      }
    }
    if (pruned > 0) {
      console.info(`[SessionStore] Pruned ${pruned} expired session(s). Active: ${this.sessions.size}`);
    }
    return pruned;
  }

  /** List all active (non-expired) sessions for a given user. */
  listByUser(userId: string): Session[] {
    const now = Date.now();
    const result: Session[] = [];
    for (const [token, session] of this.sessions) {
      if (session.userId === userId && now <= session.expiresAt) {
        result.push(session);
      } else if (now > session.expiresAt) {
        // Clean up expired sessions as we go
        this.sessions.delete(token);
      }
    }
    return result;
  }

  /** Revoke a specific session by session ID (not token). Returns true if found and revoked. */
  revoke(sessionId: string, userId: string): boolean {
    for (const [token, session] of this.sessions) {
      if (session.id === sessionId && session.userId === userId) {
        this.sessions.delete(token);
        return true;
      }
    }
    return false;
  }

  /** Revoke all sessions for a user, optionally keeping the session matching exceptToken. Returns count revoked. */
  revokeAll(userId: string, exceptToken?: string): number {
    let count = 0;
    for (const [token, session] of this.sessions) {
      if (session.userId === userId && token !== exceptToken) {
        this.sessions.delete(token);
        count += 1;
      }
    }
    return count;
  }
}

export const sessionStore = new SessionStore();
export type { Session };

// ─── JWT Utilities ─────────────────────────────────────────────────────────

const JWT_SECRET = (() => {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: AUTH_SECRET environment variable must be set in production");
  }
  console.warn("[AUTH] WARNING: Using default dev secret. Set AUTH_SECRET for production.");
  return "dev-only-unsafe-secret-do-not-use-in-prod";
})();
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

interface JWTPayload {
  sub: string;
  role: string;
  email: string;
  businessId: string | null;
  type: "access" | "refresh";
  iat: number;
  exp: number;
}

function base64urlEncode(data: string): string {
  return Buffer.from(data).toString("base64url");
}

function base64urlDecode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

export function signJWT(payload: Omit<JWTPayload, "iat" | "exp">, expiresIn: number = ACCESS_TOKEN_EXPIRY): string {
  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = { ...payload, iat: now, exp: now + expiresIn };
  const body = base64urlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");

    // Constant-time comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload: JWTPayload = JSON.parse(base64urlDecode(body));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

export function createTokenPair(userId: string, role: string, email: string, businessId: string | null): { accessToken: string; refreshToken: string } {
  const base = { sub: userId, role, email, businessId };
  return {
    accessToken: signJWT({ ...base, type: "access" }, ACCESS_TOKEN_EXPIRY),
    refreshToken: signJWT({ ...base, type: "refresh" }, REFRESH_TOKEN_EXPIRY),
  };
}

export { JWT_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY };
export type { JWTPayload };
