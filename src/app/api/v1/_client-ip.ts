import type { NextRequest } from "next/server";

/**
 * Resolve the client's IP from request headers.
 *
 * SECURITY: Previously trusted the leftmost X-Forwarded-For value, which
 * is attacker-spoofable. Order:
 *   1. `x-nf-client-connection-ip`: production runs on Netlify with
 *      Cloudflare DNS-only (grey cloud), and Netlify sets this to the
 *      visitor's address. It comes first because, without the Cloudflare
 *      proxy, a client could send its own `cf-connecting-ip`.
 *   2. `cf-connecting-ip`: set by the Cloudflare proxy (orange cloud) on
 *      any other host, e.g. the Docker image on a container host.
 *   3. `x-real-ip`, `x-vercel-forwarded-for` (legacy Vercel host), and
 *      only finally XFF (spoofable but better than 'unknown').
 */
export function getClientIp(req: NextRequest): string {
  const netlifyIp = req.headers.get("x-nf-client-connection-ip");
  if (netlifyIp) return netlifyIp.trim();
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const vercelXff = req.headers.get("x-vercel-forwarded-for");
  if (vercelXff) return vercelXff.split(",")[0]?.trim() ?? "unknown";
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown";
  return "unknown";
}
