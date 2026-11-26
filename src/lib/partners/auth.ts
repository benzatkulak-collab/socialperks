/**
 * Per-request partner authentication. The key's hash is looked up in the
 * database on every call: no in-process map, no module-level cache, so a
 * revoked key is refused on its very next use on any instance.
 */
import { db } from "@/lib/db/connection";
import { hashPartnerKey, parsePartnerKey } from "./keys";

export type PartnerAuth =
  | { ok: true; partner: { id: string; name: string } }
  | { ok: false };

export async function authenticatePartner(req: Request): Promise<PartnerAuth> {
  const header = req.headers.get("authorization");
  const match = header ? /^Bearer (\S+)$/.exec(header) : null;
  if (!match || !parsePartnerKey(match[1])) return { ok: false };

  try {
    const result = await db.query<{ id: string; name: string }>(
      "select id, name from partners where key_hash = $1 and revoked_at is null",
      [hashPartnerKey(match[1])],
    );
    const row = result.rows[0];
    return row ? { ok: true, partner: { id: row.id, name: row.name } } : { ok: false };
  } catch {
    return { ok: false };
  }
}
