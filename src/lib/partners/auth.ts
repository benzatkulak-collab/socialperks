/**
 * Per-request partner authentication. The key's hash is looked up in the
 * database on every call: no in-process map, no module-level cache, so a
 * revoked key is refused on its very next use on any instance.
 */
import { db } from "@/lib/db/connection";
import { captureError } from "@/lib/monitoring";
import { hashPartnerKey, parsePartnerKey } from "./keys";

export type PartnerAuth =
  | { ok: true; partner: { id: string; name: string } }
  | { ok: false; reason: "invalid" | "unavailable" };

export async function authenticatePartner(req: Request): Promise<PartnerAuth> {
  const header = req.headers.get("authorization");
  const match = header ? /^Bearer (\S+)$/.exec(header) : null;
  if (!match || !parsePartnerKey(match[1])) return { ok: false, reason: "invalid" };

  try {
    const result = await db.query<{ id: string; name: string }>(
      "select id, name from partners where key_hash = $1 and revoked_at is null",
      [hashPartnerKey(match[1])],
    );
    const row = result.rows[0];
    return row ? { ok: true, partner: { id: row.id, name: row.name } } : { ok: false, reason: "invalid" };
  } catch (e) {
    // The lookup failed; the key was never judged. "unavailable" (a 503), never
    // "invalid" (a 401): a partner told "refused" would rotate a good key.
    captureError(new Error(e instanceof Error ? e.message : "key lookup failed"), { source: "partners.auth" });
    return { ok: false, reason: "unavailable" };
  }
}
