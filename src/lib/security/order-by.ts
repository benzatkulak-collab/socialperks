/**
 * Allowlist-based ORDER BY validator.
 *
 * Five repository queries previously interpolated `options.orderBy`
 * directly into SQL ORDER BY clauses. No web route currently passes
 * user input there, but it's a latent SQL-injection foot-gun: any
 * future internal caller who forwards req.query.orderBy directly
 * would expose `; DROP TABLE` style attacks.
 *
 * Use `safeOrderBy(value, allowed, default_)` everywhere the column is
 * picked dynamically. Falls back to `default_` on unknown input rather
 * than throwing — repositories should be lenient about clients sending
 * malformed pagination options.
 */

export function safeOrderBy<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  default_: T
): T {
  if (typeof value !== "string") return default_;
  const found = allowed.find((c) => c === value);
  return found ?? default_;
}

export function safeOrder(value: string | undefined): "ASC" | "DESC" {
  return value === "asc" ? "ASC" : "DESC";
}

/**
 * Constant-time string compare. Use for ALL secret-vs-provided
 * comparisons (CRON_SECRET, WAITLIST_ADMIN_TOKEN, READINESS_TOKEN,
 * etc.) so timing analysis can't reveal the secret prefix-by-prefix.
 *
 * The length-mismatch fast path is itself constant-time because
 * lengths are not secret.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
