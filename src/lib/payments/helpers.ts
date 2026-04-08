/**
 * Payment Processing System — Shared Helpers
 *
 * Utility functions used across all payment sub-modules.
 */

/** Generate a prefixed UUID identifier. */
export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** Round a number to 2 decimal places. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Return the current timestamp as an ISO string. */
export function nowISO(): string {
  return new Date().toISOString();
}
