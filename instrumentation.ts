/**
 * Next.js instrumentation hook — runs once when the server boots.
 *
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * We use it for one thing: env validation. When the server starts, we
 * inventory what's configured and what isn't, log a structured report,
 * and surface anything blocking. The point is to catch "deploy went
 * green but a feature is broken because someone rotated a key" — which
 * silently kills a production system.
 */

export async function register(): Promise<void> {
  // The validation module pulls in `process` etc., but Next runs this
  // in both Node and edge runtimes. Gate to the Node runtime so the
  // edge runtime doesn't try to do server validation.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { validateAndLog } = await import("./src/lib/env-validation");
    validateAndLog();
  } catch (e) {
    // Don't let validation errors crash the boot. The readiness probe
    // will surface the issue separately.
    console.error("[instrumentation] env validation failed to run:", e);
  }
}
