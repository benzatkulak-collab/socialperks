/**
 * Shared magic-link token store. Lives outside the route directory
 * because Next.js disallows arbitrary exports from `route.ts` files
 * (only specific symbols like GET/POST/runtime are valid).
 *
 * In-memory MVP. Swap for Redis or a `magic_link_tokens` table once
 * DATABASE_URL is wired and the user count justifies persistence
 * across redeploys.
 */

export interface MagicLinkRecord {
  email: string;
  businessName?: string;
  expiresAt: number;
  used: boolean;
}

export const magicLinks = new Map<string, MagicLinkRecord>();

export const TOKEN_TTL_MS = 15 * 60 * 1000;

export function pruneExpired(): void {
  const now = Date.now();
  for (const [token, record] of magicLinks.entries()) {
    if (record.expiresAt < now) magicLinks.delete(token);
  }
}
