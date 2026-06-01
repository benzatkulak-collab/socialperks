/**
 * Shared user store.
 *
 * Two-tier storage:
 *   1. In-memory Map<email, UserRecord> — synchronous reads, hot path
 *      used by every API route's auth check.
 *   2. Postgres write-through (when DATABASE_URL is set) — durability
 *      across cold starts, multi-instance consistency.
 *
 * On boot the store hydrates from Postgres first, then layers seed
 * users for any email not yet persisted. Reads are always from the
 * map; writes go to both. Best-effort writes — a Postgres failure
 * doesn't fail the operation, it's just logged.
 */

import { hashPassword } from "./index";
import { createSeedData } from "@social-perks/shared/seed";
import { db, InMemoryConnection } from "@/lib/db/connection";

export type UserRole = "business" | "influencer" | "enterprise" | "admin";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  businessId: string | null;
  /** ISO timestamp when account was suspended. null = active. */
  suspendedAt: string | null;
  /** Reason from admin who suspended; null when not suspended. */
  suspensionReason: string | null;
  /** ISO timestamp of account creation. */
  createdAt: string;
}

// ─── In-Memory Store ────────────────────────────────────────────────────────

const users = new Map<string, UserRecord>();

const usingDb = !(db instanceof InMemoryConnection);

// ─── Postgres Write-Through Helpers ─────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  business_id: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string;
}

/**
 * Best-effort persist. The auth_users table is the durability layer;
 * the in-memory map is always authoritative for synchronous reads
 * within a process. Failures are logged but don't propagate — auth
 * still works against the map.
 */
async function persistUser(record: UserRecord): Promise<void> {
  if (!usingDb) return;
  try {
    await db.query(
      `INSERT INTO auth_users (
         id, email, name, password_hash, role, business_id,
         suspended_at, suspension_reason, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO UPDATE SET
         name             = EXCLUDED.name,
         password_hash    = EXCLUDED.password_hash,
         role             = EXCLUDED.role,
         business_id      = EXCLUDED.business_id,
         suspended_at     = EXCLUDED.suspended_at,
         suspension_reason= EXCLUDED.suspension_reason`,
      [
        record.id,
        record.email,
        record.name,
        record.passwordHash,
        record.role,
        record.businessId,
        record.suspendedAt,
        record.suspensionReason,
        record.createdAt,
      ]
    );
  } catch (e) {
    console.error("[user-store] persist failed:", e instanceof Error ? e.message : e);
  }
}

/**
 * Hydrate the in-memory store from Postgres on boot. Idempotent; rows
 * already in the map are not overwritten so a fresh seed run can
 * layer in demo accounts after.
 */
async function hydrateFromDb(): Promise<void> {
  if (!usingDb) return;
  try {
    // Ensure the table exists with the columns we use. This is a
    // bootstrap convenience for dev — production should use a real
    // migration. IF NOT EXISTS makes it safe to run on every boot.
    await db.query(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id                varchar(64) NOT NULL,
        email             varchar(255) NOT NULL UNIQUE,
        name              varchar(255) NOT NULL,
        password_hash     text NOT NULL,
        role              varchar(50) NOT NULL DEFAULT 'business',
        business_id       varchar(64),
        suspended_at      timestamptz,
        suspension_reason text,
        created_at        timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (id)
      );
    `);

    // Lock the table down: enable RLS so the anon/authenticated PostgREST
    // roles can't reach password hashes via the Supabase REST API. The
    // app_prod owner this runs as bypasses RLS, so the app is unaffected.
    // Idempotent — a no-op if RLS is already enabled.
    await db.query(`ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;`);

    const result = await db.query<UserRow>(`SELECT * FROM auth_users`);
    for (const row of result.rows) {
      // Skip if the in-memory store already has this user (seeded admin etc.)
      if (users.has(row.email)) continue;
      users.set(row.email, {
        id: row.id,
        email: row.email,
        name: row.name,
        passwordHash: row.password_hash,
        role: row.role as UserRole,
        businessId: row.business_id,
        suspendedAt: row.suspended_at,
        suspensionReason: row.suspension_reason,
        createdAt: row.created_at,
      });
    }
  } catch (e) {
    console.error("[user-store] hydrate failed:", e instanceof Error ? e.message : e);
  }
}

// ─── Admin Bootstrap ────────────────────────────────────────────────────────

const ADMIN_EMAIL = "benzatkulak@gmail.com";
const ADMIN_NAME = "Platform Admin";
const ADMIN_USER_ID = "usr_admin_root";

// ─── Seeding ────────────────────────────────────────────────────────────────

let seeded = false;
let seedingPromise: Promise<void> | null = null;

export async function ensureUsersSeeded(): Promise<void> {
  if (seeded) return;
  if (seedingPromise) return seedingPromise;

  seedingPromise = (async () => {
    // Hydrate from Postgres FIRST so persisted users (e.g. signups from
    // prior process) are restored before seed data layers on top. The
    // seed loop below uses `users.has()` to skip emails that already
    // came from DB — so a real user's password changes survive cold start.
    await hydrateFromDb();

    // Admin first. Only seeded when ADMIN_PASSWORD is set — no default
    // credential is bundled in source. Without it, the admin login is
    // simply unavailable (a warning is logged) instead of shipping a
    // known, hardcoded password.
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.warn(
        `[AUTH] ADMIN_PASSWORD is not set — admin account (${ADMIN_EMAIL}) ` +
          `will not be seeded. Set ADMIN_PASSWORD to enable the admin login.`
      );
    } else {
      const passwordHash = await hashPassword(adminPassword);
      const now = new Date().toISOString();
      // If the admin row already came from DB, preserve its
      // passwordHash (it may have been rotated via admin reset).
      // The seed password is only used to bootstrap a fresh DB.
      const existing = users.get(ADMIN_EMAIL);
      const record: UserRecord = existing ?? {
        id: ADMIN_USER_ID,
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        role: "admin",
        businessId: null,
        suspendedAt: null,
        suspensionReason: null,
        createdAt: now,
      };
      users.set(ADMIN_EMAIL, record);
      if (!existing) void persistUser(record);
    }

    // SECURITY: demo accounts (yoga@demo.com … seeded with the public PIN
    // "1234" as their password) must never exist in production. PIN login is
    // already blocked in prod, but password login is not — so a seeded demo
    // account is a known-credentials backdoor. Only the admin is seeded here.
    if (process.env.NODE_ENV === "production") {
      seeded = true;
      return;
    }

    const seed = createSeedData();
    const now = new Date().toISOString();

    for (const biz of seed.businesses) {
      if (users.has(biz.email)) continue;
      const passwordHash = await hashPassword(biz.pin);
      const record: UserRecord = {
        id: biz.id,
        email: biz.email,
        name: biz.name,
        passwordHash,
        role: biz.size === "enterprise" ? "enterprise" : "business",
        businessId: biz.id,
        suspendedAt: null,
        suspensionReason: null,
        createdAt: now,
      };
      users.set(biz.email, record);
      void persistUser(record);
    }

    for (const inf of seed.influencers) {
      if (users.has(inf.email)) continue;
      const passwordHash = await hashPassword(inf.pin);
      const record: UserRecord = {
        id: inf.id,
        email: inf.email,
        name: inf.displayName,
        passwordHash,
        role: "influencer",
        businessId: null,
        suspendedAt: null,
        suspensionReason: null,
        createdAt: now,
      };
      users.set(inf.email, record);
      void persistUser(record);
    }

    seeded = true;
  })();

  return seedingPromise;
}

// ─── Read API ───────────────────────────────────────────────────────────────

export function getUserByEmail(email: string): UserRecord | undefined {
  return users.get(email.toLowerCase().trim());
}

export function getUserById(id: string): UserRecord | undefined {
  for (const user of users.values()) {
    if (user.id === id) return user;
  }
  return undefined;
}

/**
 * Find a user by their businessId (the `biz_<userId>` value set at signup
 * for business accounts). Public pages (/c, /b) use this to resolve a real
 * business's display name — real businesses live here in auth_users, NOT in
 * the seeded `businesses` table, so a businessRepo lookup would miss them and
 * render them as a nameless "Campaign". Synchronous map read; call
 * `ensureUsersSeeded()` first on a cold start so the map is hydrated from PG.
 */
export function getUserByBusinessId(businessId: string): UserRecord | undefined {
  for (const user of users.values()) {
    if (user.businessId === businessId) return user;
  }
  return undefined;
}

/**
 * Find a business user by the trailing chunk of their businessId — used by the
 * /b/[slug] profile page, whose slug encodes `…-{businessId.slice(-6)}`. Suffix
 * collisions are theoretically possible but vanishingly unlikely at current
 * scale; returns the first match. Call `ensureUsersSeeded()` first on a cold
 * start so the map is hydrated from Postgres.
 */
export function getUserByBusinessIdSuffix(suffix: string): UserRecord | undefined {
  for (const user of users.values()) {
    if (user.businessId && user.businessId.slice(-6) === suffix) return user;
  }
  return undefined;
}

export function hasUser(email: string): boolean {
  return users.has(email.toLowerCase().trim());
}

// ─── Write API ──────────────────────────────────────────────────────────────

export function putUser(record: UserRecord): Promise<void> {
  users.set(record.email.toLowerCase().trim(), record);
  // Return the persist promise so durability-critical callers (signup,
  // password reset) can `await` it. On serverless, a fire-and-forget
  // write is aborted when the function freezes after the HTTP response,
  // so the row never reaches Postgres unless the caller awaits. The map
  // write above is synchronous, so non-awaiting callers still see the
  // user immediately in-process.
  return persistUser(record);
}

export async function updateUser(
  email: string,
  patch: Partial<Omit<UserRecord, "id" | "email" | "createdAt">>
): Promise<UserRecord | null> {
  const key = email.toLowerCase().trim();
  const existing = users.get(key);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  users.set(key, updated);
  // Await the durable write so the mutation (suspend/unsuspend, role change,
  // password reset) is committed to Postgres before the caller responds. A
  // fire-and-forget write is aborted when a serverless function freezes after
  // the HTTP response — e.g. an admin suspend would update the in-memory map
  // but never reach the DB, so the account returns to active on the next cold
  // start (same bug fixed for putUser in #102). The map write above is
  // synchronous, so non-awaiting callers still see the change in-process.
  await persistUser(updated);
  return updated;
}

// ─── Admin Query API ────────────────────────────────────────────────────────

export interface UserListFilter {
  role?: UserRole;
  search?: string;
  suspended?: boolean;
  page?: number;
  perPage?: number;
}

export interface UserListResult {
  users: Omit<UserRecord, "passwordHash">[];
  total: number;
  page: number;
  perPage: number;
}

export function listUsers(filter: UserListFilter = {}): UserListResult {
  const page = Math.max(1, filter.page ?? 1);
  const perPage = Math.min(100, Math.max(1, filter.perPage ?? 25));
  const search = filter.search?.toLowerCase().trim();

  let all = Array.from(users.values());

  if (filter.role) {
    all = all.filter((u) => u.role === filter.role);
  }
  if (filter.suspended !== undefined) {
    all = all.filter((u) =>
      filter.suspended ? u.suspendedAt !== null : u.suspendedAt === null
    );
  }
  if (search) {
    all = all.filter(
      (u) =>
        u.email.toLowerCase().includes(search) ||
        u.name.toLowerCase().includes(search) ||
        u.id.toLowerCase().includes(search)
    );
  }

  all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const total = all.length;
  const start = (page - 1) * perPage;
  const page_ = all.slice(start, start + perPage);

  // Strip passwordHash before returning.
  const sanitized = page_.map(({ passwordHash: _pw, ...rest }) => rest);

  return { users: sanitized, total, page, perPage };
}

export function countUsers(): { total: number; byRole: Record<UserRole, number>; suspended: number } {
  const byRole: Record<UserRole, number> = { business: 0, influencer: 0, enterprise: 0, admin: 0 };
  let suspended = 0;
  for (const u of users.values()) {
    byRole[u.role] += 1;
    if (u.suspendedAt) suspended += 1;
  }
  return { total: users.size, byRole, suspended };
}
