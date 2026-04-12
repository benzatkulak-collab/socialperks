/**
 * Social Perks -- Sandbox Environment Manager
 *
 * Creates isolated sandbox environments with test data for development,
 * testing, and agent integration. Each sandbox gets a unique `sk_sandbox_...`
 * API key and all IDs are prefixed with `sandbox_` for isolation.
 *
 * Sandboxes expire after 24 hours and can be reset or destroyed on demand.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface SandboxTestData {
  businesses: string[];
  campaigns: string[];
  influencers: string[];
}

export interface Sandbox {
  id: string;
  apiKey: string;
  createdAt: Date;
  expiresAt: Date;
  testData: SandboxTestData;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SANDBOX_KEY_PREFIX = "sk_sandbox_";
const SANDBOX_ID_PREFIX = "sandbox_";
const SANDBOX_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_SANDBOXES = 50;

// ── Store ──────────────────────────────────────────────────────────────────

const sandboxes = new Map<string, Sandbox>();

/** Index: apiKey -> sandbox id (for fast lookup) */
const apiKeyIndex = new Map<string, string>();

// ── Helpers ────────────────────────────────────────────────────────────────

function generateSandboxId(): string {
  return `${SANDBOX_ID_PREFIX}${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function generateApiKey(): string {
  return `${SANDBOX_KEY_PREFIX}${crypto.randomUUID().replace(/-/g, "")}`;
}

function generateTestData(sandboxId: string): SandboxTestData {
  const prefix = sandboxId;
  return {
    businesses: [
      `${prefix}_biz_cafe`,
      `${prefix}_biz_gym`,
      `${prefix}_biz_salon`,
    ],
    campaigns: [
      `${prefix}_camp_review`,
      `${prefix}_camp_share`,
      `${prefix}_camp_ugc`,
    ],
    influencers: [
      `${prefix}_inf_alice`,
      `${prefix}_inf_bob`,
      `${prefix}_inf_charlie`,
    ],
  };
}

/**
 * Evict expired sandboxes from the store. Called automatically before
 * creating a new sandbox to keep memory bounded.
 */
function evictExpired(): void {
  const now = Date.now();
  for (const [id, sandbox] of sandboxes.entries()) {
    if (sandbox.expiresAt.getTime() <= now) {
      apiKeyIndex.delete(sandbox.apiKey);
      sandboxes.delete(id);
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Create a new sandbox environment with isolated test data.
 * Returns the sandbox with its API key and test credentials.
 */
export function createSandbox(): Sandbox {
  evictExpired();

  if (sandboxes.size >= MAX_SANDBOXES) {
    throw new Error(
      `Maximum number of sandboxes (${MAX_SANDBOXES}) reached. Destroy an existing sandbox first.`
    );
  }

  const now = new Date();
  const id = generateSandboxId();
  const apiKey = generateApiKey();

  const sandbox: Sandbox = {
    id,
    apiKey,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SANDBOX_TTL_MS),
    testData: generateTestData(id),
  };

  sandboxes.set(id, sandbox);
  apiKeyIndex.set(apiKey, id);

  return sandbox;
}

/**
 * Retrieve a sandbox by its API key.
 * Returns null if the key is invalid, the sandbox expired, or not found.
 */
export function getSandbox(apiKey: string): Sandbox | null {
  const id = apiKeyIndex.get(apiKey);
  if (!id) return null;

  const sandbox = sandboxes.get(id);
  if (!sandbox) {
    apiKeyIndex.delete(apiKey);
    return null;
  }

  // Check expiry
  if (sandbox.expiresAt.getTime() <= Date.now()) {
    apiKeyIndex.delete(apiKey);
    sandboxes.delete(id);
    return null;
  }

  return sandbox;
}

/**
 * Retrieve a sandbox by its ID.
 * Returns null if not found or expired.
 */
export function getSandboxById(id: string): Sandbox | null {
  const sandbox = sandboxes.get(id);
  if (!sandbox) return null;

  if (sandbox.expiresAt.getTime() <= Date.now()) {
    apiKeyIndex.delete(sandbox.apiKey);
    sandboxes.delete(id);
    return null;
  }

  return sandbox;
}

/**
 * Reset a sandbox to a fresh state: regenerate test data, reset expiry.
 * The API key remains the same.
 */
export function resetSandbox(id: string): void {
  const sandbox = sandboxes.get(id);
  if (!sandbox) {
    throw new Error(`Sandbox '${id}' not found`);
  }

  const now = new Date();
  sandbox.createdAt = now;
  sandbox.expiresAt = new Date(now.getTime() + SANDBOX_TTL_MS);
  sandbox.testData = generateTestData(id);
}

/**
 * Destroy a sandbox and release its resources.
 */
export function destroySandbox(id: string): void {
  const sandbox = sandboxes.get(id);
  if (!sandbox) {
    throw new Error(`Sandbox '${id}' not found`);
  }

  apiKeyIndex.delete(sandbox.apiKey);
  sandboxes.delete(id);
}

/**
 * Check if an API key belongs to a sandbox environment.
 * Does NOT validate whether the sandbox is active -- use `getSandbox` for that.
 */
export function isSandboxKey(apiKey: string): boolean {
  return apiKey.startsWith(SANDBOX_KEY_PREFIX);
}

/**
 * List all active (non-expired) sandboxes. For admin / monitoring.
 */
export function listSandboxes(): Sandbox[] {
  evictExpired();
  return Array.from(sandboxes.values());
}

/**
 * Return aggregate stats about the sandbox system.
 */
export function sandboxStats(): {
  active: number;
  maxAllowed: number;
  ttlHours: number;
} {
  evictExpired();
  return {
    active: sandboxes.size,
    maxAllowed: MAX_SANDBOXES,
    ttlHours: SANDBOX_TTL_MS / (60 * 60 * 1000),
  };
}
