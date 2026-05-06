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

/**
 * Session store. Two-tier: in-memory cache (synchronous reads — required
 * by every API route's auth check) + Postgres write-through for
 * durability across cold starts.
 *
 * On cold start, the cache is empty. The first request from a user
 * with an existing valid JWT cookie will succeed via JWT verification
 * (no session needed); only legacy session-token-only callers see a
 * brief auth gap until hydration completes.
 *
 * The hydrate-on-boot pattern triggers at module load; it's
 * fire-and-forget because making auth async would require changing
 * every route handler.
 */
class SessionStore {
  private sessions = new Map<string, Session>();
  private readonly maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  private createCounter = 0;

  create(userId: string, userRole: Session["userRole"], email: string, businessId: string | null): Session {
    this.createCounter += 1;
    // Prune expired sessions every 100th create to avoid unbounded Map growth
    if (this.createCounter % 100 === 0) {
      this.pruneExpired();
    }
    const token = generateSessionToken();
    const now = Date.now();
    const session: Session = { token, userId, userRole, businessId, email, createdAt: now, expiresAt: now + this.maxAge };
    this.sessions.set(token, session);
    // Best-effort write-through. If DB write fails, session still works
    // for this process (and JWT cookie auth still works regardless).
    void persistSession(session).catch(() => { /* logged inside */ });
    return session;
  }

  get(token: string): Session | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      void destroySessionInDb(token);
      return null;
    }
    return session;
  }

  destroy(token: string): boolean {
    const removed = this.sessions.delete(token);
    if (removed) void destroySessionInDb(token);
    return removed;
  }

  /** Hydrate the cache from Postgres on cold start. Best-effort. */
  hydrate(rows: Array<Session>): void {
    for (const s of rows) {
      if (Date.now() < s.expiresAt) this.sessions.set(s.token, s);
    }
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
      console.warn(`[SessionStore] Pruned ${pruned} expired session(s). Active: ${this.sessions.size}`);
    }
    return pruned;
  }
}

export const sessionStore = new SessionStore();

// ─── Postgres write-through ─────────────────────────────────────────────────

async function persistSession(s: Session): Promise<void> {
  const { db, InMemoryConnection } = await import("@/lib/db/connection");
  if (db instanceof InMemoryConnection) return;
  try {
    await db.query(
      `INSERT INTO auth_sessions (token, user_id, user_role, email, business_id, created_at, expires_at, last_activity_at)
       VALUES ($1, $2, $3, $4, $5, to_timestamp($6/1000.0), to_timestamp($7/1000.0), now())
       ON CONFLICT (token) DO NOTHING`,
      [s.token, s.userId, s.userRole, s.email, s.businessId, s.createdAt, s.expiresAt]
    );
  } catch (e) {
    console.error("[sessions] persist failed:", e instanceof Error ? e.message : e);
  }
}

async function destroySessionInDb(token: string): Promise<void> {
  const { db, InMemoryConnection } = await import("@/lib/db/connection");
  if (db instanceof InMemoryConnection) return;
  try {
    await db.query(`DELETE FROM auth_sessions WHERE token = $1`, [token]);
  } catch (e) {
    console.error("[sessions] destroy failed:", e instanceof Error ? e.message : e);
  }
}

async function hydrateSessionsFromDb(): Promise<void> {
  const { db, InMemoryConnection } = await import("@/lib/db/connection");
  if (db instanceof InMemoryConnection) return;
  try {
    const result = await db.query<{
      token: string; user_id: string; user_role: Session["userRole"];
      email: string; business_id: string | null;
      created_at: string; expires_at: string;
    }>(`SELECT token, user_id, user_role, email, business_id, created_at, expires_at
        FROM auth_sessions WHERE expires_at > now()`);
    sessionStore.hydrate(
      result.rows.map((r) => ({
        token: r.token,
        userId: r.user_id,
        userRole: r.user_role,
        email: r.email,
        businessId: r.business_id,
        createdAt: new Date(r.created_at).getTime(),
        expiresAt: new Date(r.expires_at).getTime(),
      }))
    );
  } catch (e) {
    console.error("[sessions] hydrate failed:", e instanceof Error ? e.message : e);
  }
}

// Eager hydration at module load. Async — does not block first request.
void hydrateSessionsFromDb();
export type { Session };

// ─── JWT Utilities ─────────────────────────────────────────────────────────

let _jwtSecret: string | undefined;
function getJwtSecret(): string {
  if (_jwtSecret) return _jwtSecret;
  const secret = process.env.AUTH_SECRET;
  if (secret) {
    _jwtSecret = secret;
    return _jwtSecret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: AUTH_SECRET environment variable must be set in production");
  }
  console.warn("[AUTH] WARNING: Using default dev secret. Set AUTH_SECRET for production.");
  _jwtSecret = "dev-only-unsafe-secret-do-not-use-in-prod";
  return _jwtSecret;
}
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
    .createHmac("sha256", getJwtSecret())
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

/**
 * Verify a JWT and (optionally) check its `type` claim matches.
 *
 * SECURITY:
 *  - Pin alg=HS256: reject tokens whose header claims `alg` is anything else
 *    (defense against algorithm-confusion / alg=none attacks if the verifier
 *    is ever swapped).
 *  - Length-check signatures before timingSafeEqual to avoid the throw-then-
 *    catch path that produces a measurable timing side-channel for crafted
 *    short signatures.
 *  - Optional expectedType lets callers reject mismatches (a refresh token
 *    used as an access token, etc.).
 */
export function verifyJWT(token: string, expectedType?: "access" | "refresh"): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;

    // Pin algorithm to HS256.
    let alg: string | undefined;
    try {
      const headerObj = JSON.parse(base64urlDecode(header));
      alg = headerObj.alg;
    } catch {
      return null;
    }
    if (alg !== "HS256") return null;

    const expectedSig = crypto
      .createHmac("sha256", getJwtSecret())
      .update(`${header}.${body}`)
      .digest("base64url");

    // Length check before timingSafeEqual (which throws on length mismatch
    // and produces a timing side-channel through the catch path).
    if (signature.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload: JWTPayload = JSON.parse(base64urlDecode(body));

    // Optional type-check (refresh-vs-access).
    if (expectedType && payload.type !== expectedType) {
      return null;
    }

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

export { getJwtSecret, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY };
export type { JWTPayload };
