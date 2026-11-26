/**
 * Creator-side notification when a matching campaign launches (Phase 20).
 *
 * Triggered by the campaign-launch flow (or a scheduled sweep) — picks
 * top-N matched influencers via the matching engine, sends them an
 * email via the existing email provider. Dedupes per (campaign, creator)
 * via the durable `notify_dedup` table so a creator can't get spammed,
 * even across serverless cold starts.
 */

import { ConsoleEmailProvider, ResendEmailProvider, type EmailProvider } from "./index";
import { db, getInMemoryStore } from "@/lib/db/connection";
import { captureError } from "@/lib/monitoring";

interface NotifyArgs {
  campaignId: string;
  campaignName: string;
  businessName: string;
  perkText: string;
  matches: Array<{ id: string; email: string; displayName: string }>;
  baseUrl?: string;
}

const DEDUP_TABLE = "notify_dedup";

/** Namespaced dedup id for a `${campaignId}:${influencerId}` key. */
function dedupId(key: string): string {
  return `match-notify:${key}`;
}

function provider(): EmailProvider {
  return process.env.RESEND_API_KEY ? new ResendEmailProvider() : new ConsoleEmailProvider();
}

export async function notifyMatchedCreators(args: NotifyArgs): Promise<{ sent: number; skipped: number }> {
  const p = provider();
  const baseUrl =
    args.baseUrl ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://socialperks.app");

  let sent = 0;
  let skipped = 0;

  for (const m of args.matches) {
    const dedupKey = `${args.campaignId}:${m.id}`;
    if (await alreadyNotified(dedupKey)) {
      skipped += 1;
      continue;
    }
    const subject = `New match: ${args.businessName} (${args.perkText})`;
    const text = `Hey ${m.displayName},

A campaign just launched that matches your platforms + niches:

  ${args.businessName} — ${args.perkText}
  ${baseUrl}/c/${args.campaignId}

You can submit a post and claim the perk. We notified you because your
profile is a strong match — and we only email you once per campaign.

— Social Perks
`;
    const html = `<p>Hey ${m.displayName},</p>
<p>A campaign just launched that matches your platforms + niches:</p>
<p><strong>${args.businessName}</strong> — ${args.perkText}<br/>
<a href="${baseUrl}/c/${args.campaignId}">${baseUrl}/c/${args.campaignId}</a></p>
<p>You can submit a post and claim the perk. We notified you because your profile is a strong match — and we only email you once per campaign.</p>
<p>— Social Perks</p>`;
    try {
      const result = await p.send({ to: m.email, subject, text, html });
      if (result.success) {
        await markNotified(dedupKey);
        sent += 1;
      } else {
        skipped += 1;
      }
    } catch {
      skipped += 1;
    }
  }
  return { sent, skipped };
}

async function alreadyNotified(key: string): Promise<boolean> {
  const id = dedupId(key);
  const store = getInMemoryStore();
  if (store) return store.selectById(DEDUP_TABLE, id) != null;
  try {
    const result = await db.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM notify_dedup WHERE id = $1) AS exists`,
      [id],
    );
    return result.rows[0]?.exists === true;
  } catch (e) {
    // Best-effort: on a DB error, treat as "not yet notified" rather than
    // blocking the send. Worst case is a duplicate email, not a missed one.
    captureError(e, { source: "creator-match-notify.alreadyNotified" });
    return false;
  }
}

async function markNotified(key: string): Promise<void> {
  const id = dedupId(key);
  const store = getInMemoryStore();
  if (store) {
    if (!store.selectById(DEDUP_TABLE, id)) store.insert(DEDUP_TABLE, { id });
    return;
  }
  try {
    await db.query(
      `INSERT INTO notify_dedup (id, created_at) VALUES ($1, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [id],
    );
  } catch (e) {
    captureError(e, { source: "creator-match-notify.markNotified" });
  }
}
