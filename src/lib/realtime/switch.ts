/**
 * Whether this server holds realtime streams (GET /api/v1/events) open.
 *
 * REALTIME_EVENTS=on|off (also true/false, 1/0). When it is unset, or set to
 * anything else, production streams nothing, and development and tests do.
 *
 * Why production is off unless asked: production runs on Netlify Free, where
 * each request runs as a Lambda function billed for as long as it runs, at
 * 10 credits per GB-hour. A stream keeps its function running for as long as
 * the tab stays open, and the free plan's 300 credits a month pause the whole
 * site when they run out. A stream there would also hardly ever carry an
 * event: the publisher is in-process memory, and a Lambda instance runs one
 * request at a time, so the requests that publish (new submissions,
 * campaign changes) run on other instances. A host with one long-running
 * process (the Docker image, `next dev`) has neither problem.
 */
export function realtimeEventsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const setting = env.REALTIME_EVENTS?.trim().toLowerCase();
  if (setting === "on" || setting === "true" || setting === "1") return true;
  if (setting === "off" || setting === "false" || setting === "0") return false;
  return env.NODE_ENV !== "production";
}
