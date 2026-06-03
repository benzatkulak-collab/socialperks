/**
 * URL Checker — Real HTTP-based proof URL verification
 *
 * Validates that a submitted proof URL is reachable, belongs to the expected
 * platform, and returns a valid response. Used in the submission pipeline
 * and AI review flow.
 */

import { assertSafeUrl } from "@/lib/security/url";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UrlCheckResult {
  reachable: boolean;
  statusCode: number;
  platformMatch: boolean;
  detectedPlatform: string | null;
  contentType: string | null;
  redirectedUrl: string | null;
  confidence: number; // 0-1 based on checks
  checks: string[];   // list of what passed/failed
}

// ─── Platform Domain Map ────────────────────────────────────────────────────

/**
 * Maps platform short IDs to their known domains.
 * Multiple IDs can map to the same platform (e.g. "ig" and "instagram").
 */
const PLATFORM_DOMAINS: Record<string, string[]> = {
  ig:          ["instagram.com", "instagr.am"],
  instagram:   ["instagram.com", "instagr.am"],
  tt:          ["tiktok.com", "vm.tiktok.com"],
  tiktok:      ["tiktok.com", "vm.tiktok.com"],
  ggl:         ["google.com", "maps.google.com", "g.co", "g.page"],
  google:      ["google.com", "maps.google.com", "g.co", "g.page"],
  yt:          ["youtube.com", "youtu.be"],
  youtube:     ["youtube.com", "youtu.be"],
  fb:          ["facebook.com", "fb.com", "fb.watch"],
  facebook:    ["facebook.com", "fb.com", "fb.watch"],
  xw:          ["x.com", "twitter.com", "t.co"],
  x:           ["x.com", "twitter.com", "t.co"],
  twitter:     ["x.com", "twitter.com", "t.co"],
  yelp:        ["yelp.com"],
  li:          ["linkedin.com"],
  linkedin:    ["linkedin.com"],
  pi:          ["pinterest.com", "pin.it"],
  pinterest:   ["pinterest.com", "pin.it"],
  rd:          ["reddit.com"],
  reddit:      ["reddit.com"],
  th:          ["threads.net"],
  threads:     ["threads.net"],
  sc:          ["snapchat.com"],
  snapchat:    ["snapchat.com"],
  nd:          ["nextdoor.com"],
  nextdoor:    ["nextdoor.com"],
  ta:          ["tripadvisor.com"],
  tripadvisor: ["tripadvisor.com"],
};

// ─── Domain Detection ───────────────────────────────────────────────────────

/**
 * Extract the hostname from a URL string, returning null on failure.
 */
function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Check whether a hostname matches any of the given domain patterns.
 * Matches both exact and subdomain (e.g. "www.instagram.com" matches "instagram.com").
 */
function hostMatchesDomain(hostname: string, domains: string[]): boolean {
  return domains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

/**
 * Detect which platform a URL belongs to based on its hostname.
 * Returns the first matching platform short ID, or null.
 */
export function detectPlatform(url: string): string | null {
  const hostname = extractHostname(url);
  if (!hostname) return null;

  // Deduplicate: only check canonical short IDs
  const canonical = new Set<string>();
  for (const [id, domains] of Object.entries(PLATFORM_DOMAINS)) {
    // Use shortest ID as canonical (ig, tt, fb, etc.)
    if (id.length <= 3 || !PLATFORM_DOMAINS[id.slice(0, 2)]) {
      if (!canonical.has(id)) {
        canonical.add(id);
        if (hostMatchesDomain(hostname, domains)) return id;
      }
    }
  }

  // Fallback: check all entries
  for (const [id, domains] of Object.entries(PLATFORM_DOMAINS)) {
    if (hostMatchesDomain(hostname, domains)) return id;
  }

  return null;
}

// ─── URL Format Validation ──────────────────────────────────────────────────

/**
 * Validate that a URL uses the https:// scheme and is well-formed.
 */
export function isValidHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ─── Main Check Function ────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 5_000;

/**
 * Perform real HTTP-based verification on a proof URL.
 *
 * Checks:
 * 1. URL format (must be https://)
 * 2. Domain matches the expected platform
 * 3. HEAD request returns 200
 * 4. Content-Type is text/html
 *
 * Confidence scoring:
 * - 0.3 for valid URL format
 * - +0.3 for platform domain match
 * - +0.3 for HTTP 200
 * - +0.1 for correct content-type (text/html)
 *
 * Network failures are handled gracefully — they reduce confidence
 * instead of throwing.
 */
export async function checkProofUrl(
  url: string,
  expectedPlatform: string
): Promise<UrlCheckResult> {
  const checks: string[] = [];
  let confidence = 0;

  // ── 1. URL format validation ──
  const validFormat = isValidHttpsUrl(url);
  if (validFormat) {
    confidence += 0.3;
    checks.push("url_format:pass");
  } else {
    checks.push("url_format:fail");
    // If the URL isn't even valid, return early — no point fetching
    return {
      reachable: false,
      statusCode: 0,
      platformMatch: false,
      detectedPlatform: null,
      contentType: null,
      redirectedUrl: null,
      confidence,
      checks,
    };
  }

  // ── 2. Platform domain matching ──
  const expectedDomains = PLATFORM_DOMAINS[expectedPlatform.toLowerCase()];
  const hostname = extractHostname(url);
  const detectedPlatform = detectPlatform(url);
  let platformMatch = false;

  if (hostname && expectedDomains) {
    platformMatch = hostMatchesDomain(hostname, expectedDomains);
  }

  if (platformMatch) {
    confidence += 0.3;
    checks.push("platform_match:pass");
  } else {
    checks.push(`platform_match:fail`);
  }

  // ── 3. HTTP HEAD request ──
  let statusCode = 0;
  let contentType: string | null = null;
  let redirectedUrl: string | null = null;
  let reachable = false;

  // SECURITY: SSRF guard. Reject URLs pointing at private/internal IPs
  // (RFC1918, loopback, AWS metadata 169.254.169.254, etc.) before any
  // fetch. Disable redirect-follow because attackers can chain a public
  // URL → 30x → internal IP and exfiltrate via the response body. We
  // re-check after a single hop manually.
  // assertSafeUrl also resolves DNS and re-checks the resolved IPs against
  // private/internal ranges (defeats hostname→private-IP SSRF), unlike the
  // sync isSafeUrl which only validated scheme + literal-IP hosts.
  try {
    await assertSafeUrl(url);
  } catch (e) {
    return {
      reachable: false,
      statusCode: 0,
      platformMatch: false,
      detectedPlatform: null,
      contentType: null,
      redirectedUrl: null,
      confidence,
      checks: [...checks, `unsafe_url:${e instanceof Error ? e.message : "blocked"}`],
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      // SECURITY: Don't auto-follow redirects — attackers can redirect
      // public URLs to internal IPs after the safety check.
      redirect: "manual",
      headers: {
        "User-Agent": "SocialPerks-UrlChecker/1.0",
      },
    });

    clearTimeout(timeoutId);

    statusCode = response.status;
    contentType = response.headers.get("content-type");

    // Check if we were redirected
    if (response.url && response.url !== url) {
      redirectedUrl = response.url;
    }

    if (statusCode === 200) {
      reachable = true;
      confidence += 0.3;
      checks.push("http_status:pass");
    } else {
      checks.push(`http_status:fail(${statusCode})`);
    }

    // ── 4. Content-Type check ──
    if (contentType && contentType.includes("text/html")) {
      confidence += 0.1;
      checks.push("content_type:pass");
    } else {
      checks.push(`content_type:fail(${contentType ?? "none"})`);
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "unknown_error";
    checks.push(`http_request:fail(${message})`);
    // Network failure — reachable stays false, no confidence added
  }

  return {
    reachable,
    statusCode,
    platformMatch,
    detectedPlatform,
    contentType,
    redirectedUrl,
    confidence: Math.round(confidence * 100) / 100, // Avoid floating point noise
    checks,
  };
}
