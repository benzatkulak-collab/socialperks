/**
 * Newsletter subscriber store.
 *
 * In-memory implementation with case-insensitive dedupe by email.
 * Source tracks the entry point (e.g. "footer", "blog-post", "tools-page").
 *
 * Production: swap the Map for a Postgres-backed table.
 */

export interface Subscriber {
  id: string;
  email: string;
  source: string;
  subscribedAt: string; // ISO 8601
  confirmed: boolean;
}

const store = new Map<string, Subscriber>(); // key: lowercased email

/**
 * Capacity guard for the in-memory subscriber store. Production should
 * be on Postgres; until then we cap growth to keep memory bounded.
 */
const MAX_SUBSCRIBERS = 50_000;

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function newId(): string {
  // Avoid crypto.randomUUID import — match the pattern used elsewhere
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Subscribe an email to the newsletter.
 *
 * If the email already exists, the existing subscriber is returned with
 * `duplicate = true`. Source is not overwritten on re-subscription.
 */
export function subscribe(
  email: string,
  source = "unknown"
): { subscriber: Subscriber; duplicate: boolean } {
  const key = normalize(email);
  const existing = store.get(key);
  if (existing) {
    return { subscriber: existing, duplicate: true };
  }

  const subscriber: Subscriber = {
    id: newId(),
    email: key,
    source: source.trim() || "unknown",
    subscribedAt: new Date().toISOString(),
    // No confirmation flow yet; mark confirmed=false until we add double opt-in.
    confirmed: false,
  };

  // Evict oldest inserts when at capacity (Map iteration is insertion-order).
  while (store.size >= MAX_SUBSCRIBERS) {
    const firstKey = store.keys().next().value;
    if (firstKey === undefined) break;
    store.delete(firstKey);
  }

  store.set(key, subscriber);
  return { subscriber, duplicate: false };
}

/**
 * Return all subscribers ordered newest-first.
 */
export function getAll(): Subscriber[] {
  return Array.from(store.values()).sort((a, b) =>
    b.subscribedAt.localeCompare(a.subscribedAt)
  );
}

export function getCount(): number {
  return store.size;
}

/**
 * Breakdown of subscribers by source for admin reporting.
 */
export function getSourceBreakdown(): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const sub of store.values()) {
    breakdown[sub.source] = (breakdown[sub.source] ?? 0) + 1;
  }
  return breakdown;
}

/**
 * Test-only: wipe the store. Not exported in production code paths.
 */
export function _resetForTests(): void {
  store.clear();
}
