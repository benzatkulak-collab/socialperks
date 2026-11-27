/**
 * Partner API keys: spp_live_<8 hex>_<32 hex>.
 * Only the SHA-256 hex of the whole key is stored. Never log a key.
 */
import { createHash, randomBytes } from "node:crypto";

const KEY_RE = /^spp_live_([0-9a-f]{8})_[0-9a-f]{32}$/;

export function hashPartnerKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generatePartnerKey(): { key: string; prefix: string; hash: string } {
  const prefix = randomBytes(4).toString("hex");
  const key = `spp_live_${prefix}_${randomBytes(16).toString("hex")}`;
  return { key, prefix, hash: hashPartnerKey(key) };
}

export function parsePartnerKey(raw: string): { prefix: string } | null {
  const m = KEY_RE.exec(raw);
  return m ? { prefix: m[1] } : null;
}
