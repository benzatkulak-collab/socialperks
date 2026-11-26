#!/usr/bin/env tsx
/**
 * Founder's partner tool: make a partner key and grant it businesses.
 *
 *   DATABASE_URL=postgresql://... npm run partner -- create --name "<name>"
 *   npm run partner -- businesses
 *   npm run partner -- grant --partner <id> --business <biz_id> --by <founder email>
 *   npm run partner -- revoke --partner <id> --business <biz_id>
 *
 * Prints only the new key (once), ids, and lists. The key is never stored:
 * only its SHA-256 reaches the database.
 */
import { generatePartnerKey } from "../src/lib/partners/keys";
import { db, InMemoryConnection } from "../src/lib/db/connection";

export type PartnerCommand =
  | { command: "create"; name: string }
  | { command: "businesses" }
  | { command: "grant"; partner: string; business: string; by: string }
  | { command: "revoke"; partner: string; business: string };

const USAGE =
  "usage: partner create --name <name> | businesses | " +
  "grant --partner <id> --business <biz_id> --by <email> | " +
  "revoke --partner <id> --business <biz_id>";

function flags(rest: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 2) {
    const k = rest[i];
    const v = rest[i + 1];
    if (!k?.startsWith("--") || v === undefined || v.startsWith("--")) {
      throw new Error(`Bad arguments near "${k ?? ""}". ${USAGE}`);
    }
    out[k.slice(2)] = v;
  }
  return out;
}

function need(f: Record<string, string>, name: string): string {
  const v = f[name]?.trim();
  if (!v) throw new Error(`Missing --${name}. ${USAGE}`);
  return v;
}

export function parseArgs(argv: string[]): PartnerCommand {
  const [command, ...rest] = argv;
  switch (command) {
    case "create": {
      const f = flags(rest);
      return { command, name: need(f, "name") };
    }
    case "businesses":
      return { command };
    case "grant": {
      const f = flags(rest);
      return { command, partner: need(f, "partner"), business: need(f, "business"), by: need(f, "by") };
    }
    case "revoke": {
      const f = flags(rest);
      return { command, partner: need(f, "partner"), business: need(f, "business") };
    }
    default:
      throw new Error(USAGE);
  }
}

function requireBizId(id: string) {
  if (!/^biz_/.test(id)) throw new Error(`Business id must start with biz_ (got "${id}")`);
}

export async function run(argv: string[]): Promise<{ stdout: string }> {
  const cmd = parseArgs(argv);
  const lines: string[] = [];

  switch (cmd.command) {
    case "create": {
      const { key, prefix, hash } = generatePartnerKey();
      const res = await db.query<{ id: string }>(
        "insert into partners (name, key_hash, key_prefix) values ($1, $2, $3) returning id",
        [cmd.name, hash, prefix],
      );
      lines.push(`Partner id: ${res.rows[0]?.id}`);
      lines.push(`Key (shown once, store it now): ${key}`);
      break;
    }
    case "businesses": {
      const res = await db.query<{ business_id: string; name: string }>(
        "select business_id, name from auth_users where business_id is not null order by name",
        [],
      );
      for (const r of res.rows) lines.push(`${r.business_id}\t${r.name}`);
      if (res.rows.length === 0) lines.push("(no businesses)");
      break;
    }
    case "grant": {
      requireBizId(cmd.business);
      const found = await db.query(
        "select 1 from auth_users where business_id = $1 limit 1",
        [cmd.business],
      );
      if (found.rows.length === 0) throw new Error(`Business ${cmd.business} not found in auth_users`);
      await db.query(
        "insert into partner_businesses (partner_id, business_id, granted_by) values ($1, $2, $3) " +
          "on conflict (partner_id, business_id) do update set revoked_at = null, granted_by = excluded.granted_by, granted_at = now()",
        [cmd.partner, cmd.business, cmd.by],
      );
      lines.push(`Granted ${cmd.business} to partner ${cmd.partner}`);
      break;
    }
    case "revoke": {
      requireBizId(cmd.business);
      await db.query(
        "update partner_businesses set revoked_at = now() where partner_id = $1 and business_id = $2 and revoked_at is null",
        [cmd.partner, cmd.business],
      );
      lines.push(`Revoked ${cmd.business} from partner ${cmd.partner}`);
      break;
    }
  }
  return { stdout: lines.join("\n") + "\n" };
}

if (process.argv[1]?.endsWith("partner.ts") && !process.env.VITEST) {
  Promise.resolve()
    .then(() => {
      if (db instanceof InMemoryConnection) {
        throw new Error("DATABASE_URL is not set: refusing to run against the in-memory database.");
      }
      return run(process.argv.slice(2));
    })
    .then((r) => {
      process.stdout.write(r.stdout);
      process.exit(0);
    })
    .catch((e: unknown) => {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    });
}
