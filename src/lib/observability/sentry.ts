/**
 * Sentry scaffold — config + lazy boot, DSN-driven activation.
 *
 * No `@sentry/nextjs` dependency yet (we don't want to add 200kb to
 * the bundle until the DSN is set and we're actually capturing
 * errors). Instead, this module:
 *
 *   1. Reads `SENTRY_DSN` from env. If unset, every helper is a no-op
 *      and we don't import the SDK at all.
 *   2. If set, lazily imports `@sentry/nextjs` on first use and
 *      forwards calls. The Next.js bundler will only include the SDK
 *      in the chunks that actually call this module.
 *
 * Wire-up steps when you're ready to enable:
 *   1. `npm install @sentry/nextjs`
 *   2. Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` on Vercel
 *   3. Add `Sentry.captureException(err)` in critical error paths,
 *      or just call `report(err)` from this module
 *   4. (Optional) wrap `next.config.ts` with `withSentryConfig` for
 *      automatic source-map upload — requires SENTRY_AUTH_TOKEN
 *
 * Why DIY scaffold instead of `@sentry/nextjs` from day one:
 *   - The package adds ~150kb to the client bundle even when unused.
 *   - We want the OPTION of Sentry without the COST until we need it.
 *   - The interface here is identical to Sentry's API, so the day we
 *     swap to the real SDK no callsites change.
 */

interface CaptureOptions {
  level?: "fatal" | "error" | "warning" | "info" | "debug";
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id?: string; email?: string };
}

const DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENABLED = !!DSN;

// We type the lazy SDK as a minimal shape rather than `typeof
// import("@sentry/nextjs")` because the package isn't a runtime
// dependency yet — TypeScript can't resolve types for a package that
// isn't installed. The day someone runs `npm install @sentry/nextjs`,
// the runtime import works without changing this type.
interface SentryShape {
  captureException(err: unknown, opts?: unknown): void;
  captureMessage(msg: string, opts?: unknown): void;
  addBreadcrumb(crumb: unknown): void;
}

let lazySentry: SentryShape | null = null;
let lazySentryAttempted = false;

async function getSentry(): Promise<SentryShape | null> {
  if (!ENABLED) return null;
  if (lazySentry) return lazySentry;
  if (lazySentryAttempted) return null;
  lazySentryAttempted = true;
  try {
    // String-built specifier so the bundler doesn't try to resolve the
    // package at build time. Once @sentry/nextjs is installed, this
    // import succeeds at runtime.
    const pkg = "@sentry/nextjs";
    const mod = (await import(/* webpackIgnore: true */ pkg)) as SentryShape;
    lazySentry = mod;
    return mod;
  } catch {
    if (!ENABLED) return null;
    console.warn(
      "[sentry] SENTRY_DSN is set but @sentry/nextjs is not installed. Run `npm install @sentry/nextjs` to enable error capture.",
    );
    return null;
  }
}

/** Capture an exception. No-op if Sentry not configured. */
export async function report(err: unknown, opts?: CaptureOptions): Promise<void> {
  if (!ENABLED) {
    // In dev/no-DSN mode, fall through to console so errors aren't lost.
    console.error("[error]", err, opts);
    return;
  }
  const Sentry = await getSentry();
  if (!Sentry) {
    console.error("[error — sentry-not-installed]", err, opts);
    return;
  }
  Sentry.captureException(err, {
    level: opts?.level ?? "error",
    tags: opts?.tags,
    extra: opts?.extra,
    user: opts?.user,
  });
}

/** Capture a structured message (not an exception). */
export async function reportMessage(msg: string, opts?: CaptureOptions): Promise<void> {
  if (!ENABLED) {
    console.info("[event]", msg, opts);
    return;
  }
  const Sentry = await getSentry();
  if (!Sentry) return;
  Sentry.captureMessage(msg, {
    level: opts?.level ?? "info",
    tags: opts?.tags,
    extra: opts?.extra,
  });
}

/** Add structured breadcrumb context for the next error. */
export async function breadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!ENABLED) return;
  const Sentry = await getSentry();
  if (!Sentry) return;
  Sentry.addBreadcrumb({ category, message, data, level: "info" });
}

/** Whether Sentry is wired up (useful for conditional features). */
export function isEnabled(): boolean {
  return ENABLED;
}
