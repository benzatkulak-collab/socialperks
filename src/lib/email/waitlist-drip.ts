/**
 * Waitlist nurture sequence — day-3 + day-7 follow-ups.
 *
 * The waitlist API (src/app/api/v1/waitlist/route.ts) sends an
 * immediate confirmation. This module produces the day-3 and day-7
 * email payloads that a scheduled job (Vercel Cron, GitHub Actions,
 * or a future internal scheduler) can pick up.
 *
 * Until persistence is wired (Phase 3 of the launch-readiness plan),
 * the waitlist is in-memory and a redeploy resets the cohort. So the
 * scheduled job below is a no-op at the moment — but the email
 * templates and shape are here for the day this lights up.
 */

import { ConsoleEmailProvider, ResendEmailProvider, type EmailProvider } from "./index";

export interface DripEntry {
  email: string;
  businessName?: string;
  city?: string;
  vertical: string;
  createdAt: string;
}

export interface DripEmail {
  subject: string;
  text: string;
  html: string;
}

function getProvider(): EmailProvider {
  return process.env.RESEND_API_KEY ? new ResendEmailProvider() : new ConsoleEmailProvider();
}

// ─── Templates ──────────────────────────────────────────────────────────────

export function day3Template(entry: DripEntry): DripEmail {
  const greeting = entry.businessName ? `Hi ${entry.businessName}` : "Hi there";
  return {
    subject: "How does Social Perks actually work? (3 minute read)",
    text: `${greeting},

You signed up for early access a few days ago. Here's the 3-minute version of how it works.

1. You set a perk — say 15% off the next visit.
2. Customers complete a small action — post a story, tag you, share a TikTok.
3. We verify the post happened, then they get the perk.
4. You get real social proof from real customers, not paid influencers.

If you'd rather see it in action, hit reply and tell me which platform matters most for your shop. I'll send you a 60-second walkthrough that's specific to it.

— Social Perks
`,
    html: `<p>${greeting},</p>
<p>You signed up for early access a few days ago. Here's the 3-minute version of how it works.</p>
<ol>
  <li>You set a perk — say <strong>15% off the next visit</strong>.</li>
  <li>Customers complete a small action — post a story, tag you, share a TikTok.</li>
  <li>We verify the post happened, then they get the perk.</li>
  <li>You get real social proof from real customers, not paid influencers.</li>
</ol>
<p>If you'd rather see it in action, hit reply and tell me which platform matters most for your shop. I'll send you a 60-second walkthrough that's specific to it.</p>
<p>— Social Perks</p>`,
  };
}

export function day7Template(entry: DripEntry): DripEmail {
  const greeting = entry.businessName ? `Hi ${entry.businessName}` : "Hi";
  const cityLine = entry.city
    ? ` in ${entry.city}`
    : "";
  return {
    subject: "Quick check-in: still interested?",
    text: `${greeting},

It's been about a week since you joined the early-access list. We're hand-picking the first 10 coffee shops${cityLine} to onboard, and I want to make sure you don't get lost in the queue.

If you're still interested, just reply with one word: "yes". I'll move you up.

If now's not the right time, no worries — reply with "later" and I'll pause.

If you want to keep getting these but we can drop the priority slot, no action needed.

— Social Perks
`,
    html: `<p>${greeting},</p>
<p>It's been about a week since you joined the early-access list. We're hand-picking the first 10 coffee shops${cityLine} to onboard, and I want to make sure you don't get lost in the queue.</p>
<p>If you're still interested, just reply with one word: <strong>"yes"</strong>. I'll move you up.</p>
<p>If now's not the right time, no worries — reply with <strong>"later"</strong> and I'll pause.</p>
<p>— Social Perks</p>`,
  };
}

// ─── Runner ─────────────────────────────────────────────────────────────────

export async function sendDripBatch(entries: DripEntry[], stage: "day3" | "day7"): Promise<{ sent: number; failed: number }> {
  const provider = getProvider();
  const template = stage === "day3" ? day3Template : day7Template;
  let sent = 0;
  let failed = 0;
  for (const entry of entries) {
    try {
      const t = template(entry);
      const result = await provider.send({
        to: entry.email,
        subject: t.subject,
        text: t.text,
        html: t.html,
      });
      if (result.success) sent += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { sent, failed };
}

/**
 * Pick out waitlist entries that are due for a given drip stage.
 * day3 fires between day 3 and day 4; day7 fires between day 7 and day 8.
 */
export function dueForStage(entries: DripEntry[], stage: "day3" | "day7", now = Date.now()): DripEntry[] {
  const dayMs = 24 * 60 * 60 * 1000;
  const window: [number, number] = stage === "day3" ? [3 * dayMs, 4 * dayMs] : [7 * dayMs, 8 * dayMs];
  return entries.filter((e) => {
    const age = now - new Date(e.createdAt).getTime();
    return age >= window[0] && age < window[1];
  });
}
