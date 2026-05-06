/**
 * URL safety guard — SSRF prevention.
 *
 * Use before any server-side `fetch(userControlledUrl, ...)`. Blocks:
 *   - non-https schemes (so attackers can't pivot to file://, http://, etc.)
 *   - private/internal IPs (RFC1918, loopback, link-local, IPv6 ULAs/loopback)
 *   - cloud metadata endpoints (AWS/GCP/Azure 169.254.169.254 and IPv6 fd00:ec2::254)
 *   - hostnames that resolve to any of the above (DNS rebinding)
 *
 * Two functions:
 *   - `isSafeUrl(url)` — synchronous, only validates scheme + literal-IP host.
 *     Use when you can't afford a DNS lookup or need a quick reject.
 *   - `assertSafeUrl(url)` — async, also resolves hostname and re-validates
 *     against private IPs after DNS. Use before actually fetching.
 */

import { promises as dns } from "node:dns";

const ALLOWED_SCHEMES = new Set(["https:"]);

/** RFC1918 + RFC6598 + loopback + link-local IPv4 ranges. */
function isPrivateIPv4(ip: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return false;
  const [, a, b, c, d] = m.map(Number);
  if (a === 0) return true; // 0.0.0.0/8 (current network)
  if (a === 10) return true; // 10.0.0.0/8 — RFC1918
  if (a === 127) return true; // 127.0.0.0/8 — loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 — RFC6598
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 — link-local + AWS metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 — RFC1918
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 — RFC1918
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a === 224 && b >= 0 && b <= 239) return true; // multicast — 224.0.0.0/4 covers many
  if (a >= 240) return true; // 240.0.0.0/4 — reserved + 255.255.255.255 broadcast
  void d;
  return false;
}

/** Loopback + ULAs + link-local + 6to4-of-private IPv6. */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
  if (lower.startsWith("fe80:")) return true; // link-local fe80::/10
  if (lower.startsWith("ff")) return true; // multicast
  // Embedded IPv4-mapped: ::ffff:a.b.c.d
  const m = /^::ffff:(.+)$/.exec(lower);
  if (m && isPrivateIPv4(m[1])) return true;
  return false;
}

function isPrivateLiteralIp(host: string): boolean {
  // Strip [brackets] from IPv6 literal hosts (URL.host gives raw form).
  const h = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  if (isPrivateIPv4(h)) return true;
  if (isPrivateIPv6(h)) return true;
  return false;
}

/**
 * Synchronous shallow check: scheme allowlist + literal-IP host check.
 * Does NOT resolve DNS — use `assertSafeUrl` for fetch-time validation.
 *
 * Returns null on safe, error string on unsafe.
 */
export function isSafeUrl(url: string): null | string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "URL is not parseable";
  }
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return `URL scheme '${parsed.protocol}' is not allowed (must be https)`;
  }
  // Disallow embedded credentials (foo:bar@host) — both leakable and a CSRF
  // amplifier when forwarded.
  if (parsed.username || parsed.password) {
    return "URL must not embed credentials";
  }
  if (isPrivateLiteralIp(parsed.hostname)) {
    return "URL host resolves to a private/internal IP";
  }
  return null;
}

/**
 * Resolve hostname and reject if any A/AAAA record points at a private
 * IP. Use before any server-side fetch with a user-controlled URL.
 * Throws on unsafe; returns the resolved IPs on safe (caller can pin to
 * one of them to defeat DNS rebinding between resolve and fetch).
 *
 * Note: there's still a race window. For full DNS-rebinding protection,
 * pass `lookup` option to fetch and pin to the resolved IP.
 */
export async function assertSafeUrl(
  url: string
): Promise<{ url: URL; ips: string[] }> {
  const shallow = isSafeUrl(url);
  if (shallow) throw new Error(`Unsafe URL: ${shallow}`);
  const parsed = new URL(url);
  // If already a literal IP, no DNS resolution needed.
  if (/^\[?[\da-f:.]+\]?$/i.test(parsed.hostname)) {
    return { url: parsed, ips: [parsed.hostname] };
  }
  let ips: string[];
  try {
    const records = await dns.lookup(parsed.hostname, { all: true });
    ips = records.map((r) => r.address);
  } catch (e) {
    throw new Error(`Unsafe URL: hostname does not resolve (${e instanceof Error ? e.message : e})`);
  }
  for (const ip of ips) {
    if (isPrivateLiteralIp(ip)) {
      throw new Error(`Unsafe URL: hostname resolves to private IP ${ip}`);
    }
  }
  return { url: parsed, ips };
}
