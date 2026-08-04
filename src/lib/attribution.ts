/**
 * First-touch marketing attribution.
 *
 * Purpose
 * -------
 * We fire funnel events (signup_completed, checkout_completed, …) through
 * src/lib/analytics.ts, but until now those events carried NO channel
 * information — so PostHog could tell us the conversion *rate* but never
 * *which acquisition channel* produced a paying customer. That is the one
 * question you need to answer to decide where to spend acquisition effort.
 *
 * Design
 * ------
 * - We capture the marketing context on the visitor's FIRST touch (utm_*,
 *   gclid/fbclid, external referrer host, landing path) and persist it in a
 *   90-day cookie. First-touch wins: a later visit with different params does
 *   NOT overwrite it, so the credited channel is the one that originally
 *   acquired the visitor, not the last click before they converted.
 * - `getAttribution()` is read on every `track()` call and merged into the
 *   event props, so signup/checkout/activation events all carry the origin.
 *   It returns `{}` during SSR or when no cookie is set, so it never changes
 *   event shape in tests or on a cold first render.
 * - Zero network, zero dependency. Just a cookie + URL parse.
 */

const ATTRIBUTION_COOKIE = "sp-attribution";
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

/** The attribution fields we persist, in a stable order. */
const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "referrer_host",
  "landing_path",
] as const;

type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
export type Attribution = Partial<Record<AttributionKey, string>>;

/**
 * Route families whose next path segment is a credential, not an id.
 * `/perk/<token>` carries the signed perk magic-link bearer token and
 * `/ref/<code>` carries a referral code — neither may ever be persisted
 * to a JS-readable cookie or shipped to a third-party analytics vendor.
 */
const SECRET_PATH_PREFIXES = new Set([
  "perk",
  "ref",
  "r",
  "invite",
  "verify",
  "reset",
  "magic",
]);

/**
 * Heuristic: does this path segment look like a secret rather than a slug?
 * Catches long hex / base64url / uuid-ish blobs so a NEW token-bearing route
 * added later is redacted by default instead of silently leaking. Real
 * marketing slugs ("coffee-shops", "best-ugc-tools") stay intact — they are
 * short, lowercase, and hyphen-separated.
 */
function looksLikeSecret(segment: string): boolean {
  if (segment.length < 20) return false;
  return /^[A-Za-z0-9_-]+$/.test(segment) && /[0-9]/.test(segment) && /[A-Za-z]/.test(segment);
}

/**
 * Reduce a landing URL path to something safe to persist and send to
 * analytics. Keeps the route family (the part with attribution value —
 * "they landed on a perk claim link") and replaces credential segments
 * with a constant placeholder.
 */
export function sanitizeLandingPath(pathname: string): string {
  const segments = pathname.split("/");
  const out: string[] = [];
  let redactRest = false;
  for (const seg of segments) {
    if (!seg) {
      out.push(seg);
      continue;
    }
    if (redactRest || looksLikeSecret(seg)) {
      out.push(":redacted");
      redactRest = false;
      continue;
    }
    out.push(seg);
    if (SECRET_PATH_PREFIXES.has(seg.toLowerCase())) redactRest = true;
  }
  return out.join("/").slice(0, 200);
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]+)`),
  );
  return match ? match[1] : null;
}

/**
 * Capture first-touch attribution into a cookie. No-op on the server, and a
 * no-op on every visit after the first (the cookie already exists). Safe to
 * call on every page mount.
 */
export function captureFirstTouch(): void {
  if (typeof window === "undefined") return;
  // First touch wins — never overwrite an existing attribution.
  if (readCookie(ATTRIBUTION_COOKIE)) return;

  const params = new URLSearchParams(window.location.search);
  const data: Attribution = {};

  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const) {
    const v = params.get(key);
    if (v) data[key] = v.slice(0, 200);
  }
  const gclid = params.get("gclid");
  if (gclid) data.gclid = gclid.slice(0, 200);
  const fbclid = params.get("fbclid");
  if (fbclid) data.fbclid = fbclid.slice(0, 200);

  // External referrer host distinguishes organic-search / social / direct
  // even when no UTM tags are present (e.g. an organic Google click).
  try {
    if (document.referrer) {
      const refHost = new URL(document.referrer).host;
      if (refHost && refHost !== window.location.host) {
        data.referrer_host = refHost.slice(0, 200);
      }
    }
  } catch {
    /* malformed referrer — ignore */
  }
  // NEVER persist the raw path: /perk/<token> carries a signed bearer token
  // and this cookie is JS-readable, 90-day, and mirrored into PostHog as both
  // an event property and a person property.
  data.landing_path = sanitizeLandingPath(window.location.pathname);

  try {
    const value = encodeURIComponent(JSON.stringify(data));
    document.cookie = `${ATTRIBUTION_COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
  } catch {
    /* cookie disabled — attribution simply won't persist */
  }
}

/**
 * Read the persisted first-touch attribution as flat string props, ready to
 * merge into an analytics event or person profile. Returns `{}` on the server
 * or when nothing was captured — so callers can always spread it safely.
 */
export function getAttribution(): Record<string, string> {
  const raw = readCookie(ATTRIBUTION_COOKIE);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const key of ATTRIBUTION_KEYS) {
      const v = parsed[key];
      if (typeof v === "string" && v) out[key] = v;
    }
    return out;
  } catch {
    return {};
  }
}
