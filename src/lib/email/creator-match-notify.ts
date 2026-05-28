/**
 * Creator-side notification when a matching campaign launches (Phase 20).
 *
 * Triggered by the campaign-launch flow (or a scheduled sweep) — picks
 * top-N matched influencers via the matching engine, sends them an
 * email via the existing email provider. Dedupes via the per-creator
 * `notified_campaign_ids` set so a creator can't get spammed.
 */

import { ConsoleEmailProvider, ResendEmailProvider, type EmailProvider } from "./index";
import { db, InMemoryConnection } from "@/lib/db/connection";

interface NotifyArgs {
  campaignId: string;
  campaignName: string;
  businessName: string;
  perkText: string;
  matches: Array<{ id: string; email: string; displayName: string }>;
  baseUrl?: string;
}

const usingDb = !(db instanceof InMemoryConnection);
const memoryDedup = new Set<string>(); // `${campaignId}:${influencerId}`

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
profile is a strong match — only 1 email per business per week.

— Social Perks
`;
    const html = `<p>Hey ${m.displayName},</p>
<p>A campaign just launched that matches your platforms + niches:</p>
<p><strong>${args.businessName}</strong> — ${args.perkText}<br/>
<a href="${baseUrl}/c/${args.campaignId}">${baseUrl}/c/${args.campaignId}</a></p>
<p>You can submit a post and claim the perk. We notified you because your profile is a strong match — only 1 email per business per week.</p>
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
  if (usingDb) {
    try {
      const result = await db.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM notifications WHERE id = $1
         ) AS exists`,
        [`match-notify:${key}`],
      );
      return result.rows[0]?.exists === true;
    } catch {
      return memoryDedup.has(key);
    }
  }
  return memoryDedup.has(key);
}

async function markNotified(key: string): Promise<void> {
  if (usingDb) {
    try {
      await db.query(
        `INSERT INTO notifications (id, user_id, type, channel, subject, body, status, created_at)
         VALUES ($1, $2, 'match-notify', 'email', '', '', 'sent', NOW())
         ON CONFLICT (id) DO NOTHING`,
        [`match-notify:${key}`, key.split(":")[1]],
      );
      return;
    } catch {
      memoryDedup.add(key);
      return;
    }
  }
  memoryDedup.add(key);
}
