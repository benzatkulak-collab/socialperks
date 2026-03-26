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
  token: string;
  userId: string;
  userRole: "business" | "influencer" | "enterprise";
  businessId: string | null;
  email: string;
  createdAt: number;
  expiresAt: number;
}

// ─── Session Store ───────────────────────────────────────────────────────────
// Uses Postgres when DATABASE_URL is set, falls back to in-memory Map.

class SessionStore {
  private sessions = new Map<string, Session>();
  private readonly maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  private createCounter = 0;
  private db: import("../db/connection").DatabaseConnection | null = null;
  private dbInitialized = false;

  private async getDb() {
    if (!this.dbInitialized) {
      this.dbInitialized = true;
      if (process.env.DATABASE_URL) {
        try {
          const { db } = await import("../db/connection");
          this.db = db;
        } catch {
          // DB not available — fall back to in-memory
        }
      }
    }
    return this.db;
  }

  create(userId: string, userRole: Session["userRole"], email: string, businessId: string | null): Session {
    this.createCounter += 1;
    if (this.createCounter % 100 === 0) this.pruneExpired();

    const token = generateSessionToken();
    const now = Date.now();
    const session: Session = { token, userId, userRole, businessId, email, createdAt: now, expiresAt: now + this.maxAge };

    // Write to in-memory (immediate availability)
    this.sessions.set(token, session);

    // Write to Postgres in background (non-blocking)
    this.getDb().then((db) => {
      if (db) {
        db.query(
          `INSERT INTO sessions (token, user_id, user_role, business_id, email, created_at, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (token) DO NOTHING`,
          [token, userId, userRole, businessId, email, new Date(now).toISOString(), new Date(now + this.maxAge).toISOString()]
        ).catch((err) => console.error("[SessionStore] DB write failed:", err));
      }
    });

    return session;
  }

  get(token: string): Session | null {
    // Try in-memory first (fast path)
    const session = this.sessions.get(token);
    if (session) {
      if (Date.now() > session.expiresAt) { this.sessions.delete(token); return null; }
      return session;
    }
    // In-memory miss — the token might exist in Postgres from a previous process.
    // Sync lookup not possible here (returns null, but the async restore happens below).
    return null;
  }

  /** Async version that checks Postgres if in-memory misses. */
  async getAsync(token: string): Promise<Session | null> {
    const inMemory = this.get(token);
    if (inMemory) return inMemory;

    const db = await this.getDb();
    if (!db) return null;

    try {
      const result = await db.query<{ user_id: string; user_role: string; business_id: string | null; email: string; created_at: string; expires_at: string }>(
        `SELECT user_id, user_role, business_id, email, created_at, expires_at
         FROM sessions WHERE token = $1 AND expires_at > NOW()`,
        [token]
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      const session: Session = {
        token,
        userId: row.user_id,
        userRole: row.user_role as Session["userRole"],
        businessId: row.business_id,
        email: row.email,
        createdAt: new Date(row.created_at).getTime(),
        expiresAt: new Date(row.expires_at).getTime(),
      };
      // Restore to in-memory cache
      this.sessions.set(token, session);
      return session;
    } catch {
      return null;
    }
  }

  destroy(token: string): boolean {
    const existed = this.sessions.delete(token);
    this.getDb().then((db) => {
      if (db) {
        db.query(`DELETE FROM sessions WHERE token = $1`, [token])
          .catch((err) => console.error("[SessionStore] DB delete failed:", err));
      }
    });
    return existed;
  }

  pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [t, s] of this.sessions) {
      if (now > s.expiresAt) { this.sessions.delete(t); pruned += 1; }
    }
    // Also prune in Postgres
    this.getDb().then((db) => {
      if (db) {
        db.query(`DELETE FROM sessions WHERE expires_at < NOW()`)
          .catch((err) => console.error("[SessionStore] DB prune failed:", err));
      }
    });
    if (pruned > 0) console.info(`[SessionStore] Pruned ${pruned} expired session(s). Active: ${this.sessions.size}`);
    return pruned;
  }
}

export const sessionStore = new SessionStore();
export type { Session };

// ─── JWT Utilities ─────────────────────────────────────────────────────────

const JWT_SECRET = process.env.AUTH_SECRET || "dev-secret-change-in-production";
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
