// ==============================================================================
// Social Perks -- Email Drip Sequence Engine
//
// Automated email sequences for business and influencer onboarding.
// Tracks sent state in-memory (migration-ready for Postgres + Prisma).
// ==============================================================================

import { escapeHtml } from "@/lib/security/sanitize";

// -- Types --------------------------------------------------------------------

export interface DripStep {
  delayDays: number;
  templateFn: (user: DripUser) => { subject: string; html: string };
  condition?: (user: DripUser) => boolean;
}

export interface DripUser {
  id: string;
  email: string;
  name: string;
  role: "business" | "influencer";
  businessType?: string;
  signupDate: string;
  hasCampaigns: boolean;
  campaignCount: number;
  plan: string;
}

export interface DueEmail {
  user: DripUser;
  step: DripStep;
  stepIndex: number;
}

// -- HTML Wrapper (matches email/index.ts style) ------------------------------

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'DM Sans', Arial, sans-serif; background-color: #0C0F1A; color: #E2E8F0; padding: 24px;">
<div style="max-width: 600px; margin: 0 auto; background-color: #1A1F36; border-radius: 12px; padding: 32px; border: 1px solid #2D3348;">
${body}
<p style="color: #64748B; font-size: 12px; margin-top: 32px; border-top: 1px solid #2D3348; padding-top: 16px;">You're receiving this because you signed up for Social Perks. <a href="https://socialperks.app/settings/notifications" style="color: #64748B;">Unsubscribe</a></p>
</div>
</body>
</html>`;
}

function ctaButton(text: string, href: string, color = "#22D3EE"): string {
  return `<a href="${escapeHtml(href)}" style="display: inline-block; padding: 12px 24px; background-color: ${color}; color: #0C0F1A; border-radius: 8px; text-decoration: none; font-weight: 600;">${escapeHtml(text)}</a>`;
}

// -- Business Drip Templates --------------------------------------------------

function businessDay1(user: DripUser): { subject: string; html: string } {
  const safeName = escapeHtml(user.name);
  return {
    subject: "Your first campaign in 60 seconds",
    html: wrapHtml(
      `<h1 style="color: #22D3EE; font-family: 'Instrument Serif', serif; font-style: italic;">Ready to grow, ${safeName}?</h1>
<p style="color: #94A3B8; line-height: 1.6;">Creating your first campaign takes less than a minute. Here's how:</p>
<ol style="color: #94A3B8; line-height: 1.8;">
  <li><strong style="color: #E2E8F0;">Pick a platform</strong> -- Instagram, Google Reviews, TikTok, or any of our 15 supported platforms</li>
  <li><strong style="color: #E2E8F0;">Choose an action</strong> -- post a review, share a story, tag your business</li>
  <li><strong style="color: #E2E8F0;">Set the perk</strong> -- discount, freebie, or cash back</li>
</ol>
<p style="color: #94A3B8; line-height: 1.6;">That's it. Your customers do the marketing, you reward them for it.</p>
${ctaButton("Create Your First Campaign", "https://socialperks.app/dashboard?action=new-campaign")}`
    ),
  };
}

function businessDay3NoCampaigns(user: DripUser): { subject: string; html: string } {
  const safeName = escapeHtml(user.name);
  return {
    subject: "Don't miss out -- create your first campaign today",
    html: wrapHtml(
      `<h1 style="color: #FBBF24; font-family: 'Instrument Serif', serif; font-style: italic;">Still setting up, ${safeName}?</h1>
<p style="color: #94A3B8; line-height: 1.6;">Businesses that launch their first campaign within the first week see <strong style="color: #34D399;">3x more engagement</strong> in their first month.</p>
<p style="color: #94A3B8; line-height: 1.6;">We've pre-built campaign templates for your industry -- just pick one and customize it in seconds.</p>
<p style="color: #94A3B8; line-height: 1.6;">No credit card required. Start with a free campaign and see the results for yourself.</p>
${ctaButton("Launch a Campaign Now", "https://socialperks.app/dashboard?action=new-campaign", "#FBBF24")}`
    ),
  };
}

function businessDay7CaseStudy(user: DripUser): { subject: string; html: string } {
  const safeName = escapeHtml(user.name);
  const industry = user.businessType ? escapeHtml(user.businessType) : "local";
  return {
    subject: `How ${industry} businesses use Social Perks`,
    html: wrapHtml(
      `<h1 style="color: #22D3EE; font-family: 'Instrument Serif', serif; font-style: italic;">Real results from ${industry} businesses</h1>
<p style="color: #94A3B8; line-height: 1.6;">Hi ${safeName}, here's what businesses like yours are achieving with Social Perks:</p>
<div style="background-color: #0C0F1A; border-radius: 8px; padding: 20px; margin: 16px 0; border-left: 3px solid #34D399;">
  <p style="color: #E2E8F0; margin: 0 0 8px 0; font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700;">+147%</p>
  <p style="color: #94A3B8; margin: 0;">average increase in social media mentions within the first month</p>
</div>
<div style="background-color: #0C0F1A; border-radius: 8px; padding: 20px; margin: 16px 0; border-left: 3px solid #22D3EE;">
  <p style="color: #E2E8F0; margin: 0 0 8px 0; font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700;">$4.20</p>
  <p style="color: #94A3B8; margin: 0;">average return for every $1 spent on perk rewards</p>
</div>
<div style="background-color: #0C0F1A; border-radius: 8px; padding: 20px; margin: 16px 0; border-left: 3px solid #FBBF24;">
  <p style="color: #E2E8F0; margin: 0 0 8px 0; font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700;">89%</p>
  <p style="color: #94A3B8; margin: 0;">of customers complete at least one marketing action</p>
</div>
<p style="color: #94A3B8; line-height: 1.6;">See detailed benchmarks for your industry on your dashboard.</p>
${ctaButton("View Industry Benchmarks", "https://socialperks.app/dashboard?tab=benchmarks")}`
    ),
  };
}

function businessDay14Upgrade(user: DripUser): { subject: string; html: string } {
  const safeName = escapeHtml(user.name);
  return {
    subject: "Unlock more with Social Perks Pro",
    html: wrapHtml(
      `<h1 style="color: #22D3EE; font-family: 'Instrument Serif', serif; font-style: italic;">Ready to scale, ${safeName}?</h1>
<p style="color: #94A3B8; line-height: 1.6;">You've been using Social Perks for two weeks. Here's what Pro unlocks:</p>
<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
  <tr style="border-bottom: 1px solid #2D3348;">
    <td style="padding: 12px; color: #94A3B8;">Feature</td>
    <td style="padding: 12px; color: #94A3B8; text-align: center;">Free</td>
    <td style="padding: 12px; color: #22D3EE; text-align: center; font-weight: 600;">Pro</td>
  </tr>
  <tr style="border-bottom: 1px solid #2D3348;">
    <td style="padding: 12px; color: #E2E8F0;">Active campaigns</td>
    <td style="padding: 12px; color: #94A3B8; text-align: center;">3</td>
    <td style="padding: 12px; color: #22D3EE; text-align: center;">Unlimited</td>
  </tr>
  <tr style="border-bottom: 1px solid #2D3348;">
    <td style="padding: 12px; color: #E2E8F0;">AI campaign generation</td>
    <td style="padding: 12px; color: #94A3B8; text-align: center;">--</td>
    <td style="padding: 12px; color: #22D3EE; text-align: center;">Included</td>
  </tr>
  <tr style="border-bottom: 1px solid #2D3348;">
    <td style="padding: 12px; color: #E2E8F0;">Analytics & reporting</td>
    <td style="padding: 12px; color: #94A3B8; text-align: center;">Basic</td>
    <td style="padding: 12px; color: #22D3EE; text-align: center;">Advanced</td>
  </tr>
  <tr>
    <td style="padding: 12px; color: #E2E8F0;">Influencer matching</td>
    <td style="padding: 12px; color: #94A3B8; text-align: center;">--</td>
    <td style="padding: 12px; color: #22D3EE; text-align: center;">Included</td>
  </tr>
</table>
<p style="color: #94A3B8; line-height: 1.6;">Pro pays for itself with just one successful campaign. See the ROI calculator on our pricing page.</p>
${ctaButton("See Pro Plans", "https://socialperks.app/pricing")}`
    ),
  };
}

// -- Influencer Drip Templates ------------------------------------------------

function influencerDay1(user: DripUser): { subject: string; html: string } {
  const safeName = escapeHtml(user.name);
  return {
    subject: "Start earning with Social Perks",
    html: wrapHtml(
      `<h1 style="color: #34D399; font-family: 'Instrument Serif', serif; font-style: italic;">Welcome aboard, ${safeName}!</h1>
<p style="color: #94A3B8; line-height: 1.6;">Here's how to start earning perks and cash back:</p>
<ol style="color: #94A3B8; line-height: 1.8;">
  <li><strong style="color: #E2E8F0;">Browse campaigns</strong> -- find brands that match your audience</li>
  <li><strong style="color: #E2E8F0;">Complete the action</strong> -- post, review, share, or engage as specified</li>
  <li><strong style="color: #E2E8F0;">Submit proof</strong> -- upload a screenshot or link</li>
  <li><strong style="color: #E2E8F0;">Get rewarded</strong> -- perks are added to your wallet automatically</li>
</ol>
<p style="color: #94A3B8; line-height: 1.6;">Top creators earn over <strong style="color: #34D399;">$500/month</strong> through Social Perks campaigns.</p>
${ctaButton("Discover Campaigns", "https://socialperks.app/discover", "#34D399")}`
    ),
  };
}

function influencerDay3Profile(user: DripUser): { subject: string; html: string } {
  const safeName = escapeHtml(user.name);
  return {
    subject: "Complete your profile to get better campaigns",
    html: wrapHtml(
      `<h1 style="color: #22D3EE; font-family: 'Instrument Serif', serif; font-style: italic;">Stand out, ${safeName}</h1>
<p style="color: #94A3B8; line-height: 1.6;">Creators with complete profiles get matched with <strong style="color: #E2E8F0;">2x more campaigns</strong>. Here's what to add:</p>
<ul style="color: #94A3B8; line-height: 1.8;">
  <li><strong style="color: #E2E8F0;">Profile photo</strong> -- businesses want to see who they're working with</li>
  <li><strong style="color: #E2E8F0;">Connected platforms</strong> -- link your Instagram, TikTok, YouTube, etc.</li>
  <li><strong style="color: #E2E8F0;">Rate card</strong> -- set your preferred perk types and minimum values</li>
  <li><strong style="color: #E2E8F0;">Niche tags</strong> -- food, fitness, fashion, tech, or local business</li>
</ul>
<p style="color: #94A3B8; line-height: 1.6;">A complete profile also helps our AI match you with the right opportunities.</p>
${ctaButton("Complete Your Profile", "https://socialperks.app/profile/edit")}`
    ),
  };
}

function influencerDay7Opportunities(user: DripUser): { subject: string; html: string } {
  const safeName = escapeHtml(user.name);
  return {
    subject: "Top earning opportunities this week",
    html: wrapHtml(
      `<h1 style="color: #34D399; font-family: 'Instrument Serif', serif; font-style: italic;">This week's top perks, ${safeName}</h1>
<p style="color: #94A3B8; line-height: 1.6;">New campaigns are live and waiting for creators like you. Here are this week's highlights:</p>
<div style="background-color: #0C0F1A; border-radius: 8px; padding: 20px; margin: 16px 0; border-left: 3px solid #34D399;">
  <p style="color: #E2E8F0; margin: 0 0 4px 0; font-weight: 600;">Google Review Campaigns</p>
  <p style="color: #94A3B8; margin: 0;">Quick reviews for local businesses -- earn $5-$15 per review</p>
</div>
<div style="background-color: #0C0F1A; border-radius: 8px; padding: 20px; margin: 16px 0; border-left: 3px solid #22D3EE;">
  <p style="color: #E2E8F0; margin: 0 0 4px 0; font-weight: 600;">Instagram Story Shares</p>
  <p style="color: #94A3B8; margin: 0;">Tag and share for discounts up to 30% at partner businesses</p>
</div>
<div style="background-color: #0C0F1A; border-radius: 8px; padding: 20px; margin: 16px 0; border-left: 3px solid #FBBF24;">
  <p style="color: #E2E8F0; margin: 0 0 4px 0; font-weight: 600;">TikTok Content Creation</p>
  <p style="color: #94A3B8; margin: 0;">Premium perks for original video content -- highest payouts</p>
</div>
<p style="color: #94A3B8; line-height: 1.6;">New campaigns are added daily. Check back often for fresh opportunities.</p>
${ctaButton("Browse All Campaigns", "https://socialperks.app/discover", "#34D399")}`
    ),
  };
}

// -- Sequence Definitions -----------------------------------------------------

export const businessSequence: DripStep[] = [
  // Day 0: Welcome email is handled by auth route -- skip
  {
    delayDays: 1,
    templateFn: businessDay1,
  },
  {
    delayDays: 3,
    templateFn: businessDay3NoCampaigns,
    condition: (user) => !user.hasCampaigns,
  },
  {
    delayDays: 7,
    templateFn: businessDay7CaseStudy,
  },
  {
    delayDays: 14,
    templateFn: businessDay14Upgrade,
    // Skip the upgrade nudge for anyone already on the middle/top tier.
    // Checkout stores "professional"; "pro" kept as a defensive alias so a
    // legacy value can't accidentally re-trigger the nag for a paying user.
    condition: (user) =>
      user.plan !== "professional" &&
      user.plan !== "pro" &&
      user.plan !== "enterprise",
  },
];

export const influencerSequence: DripStep[] = [
  {
    delayDays: 1,
    templateFn: influencerDay1,
  },
  {
    delayDays: 3,
    templateFn: influencerDay3Profile,
  },
  {
    delayDays: 7,
    templateFn: influencerDay7Opportunities,
  },
];

// -- Sent State Tracking (in-memory, migration-ready for Postgres) ------------

const sentState = new Map<string, Set<number>>();

function sentKey(userId: string): string {
  return userId;
}

export function markSent(userId: string, stepIndex: number): void {
  const key = sentKey(userId);
  if (!sentState.has(key)) {
    sentState.set(key, new Set());
  }
  sentState.get(key)!.add(stepIndex);
}

export function hasSent(userId: string, stepIndex: number): boolean {
  const key = sentKey(userId);
  return sentState.get(key)?.has(stepIndex) ?? false;
}

/** Reset all sent state -- used in tests */
export function resetSentState(): void {
  sentState.clear();
}

// -- Core Engine --------------------------------------------------------------

function daysSinceSignup(signupDate: string, now?: Date): number {
  const signup = new Date(signupDate);
  const current = now ?? new Date();
  const diffMs = current.getTime() - signup.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getSequenceForRole(role: "business" | "influencer"): DripStep[] {
  return role === "business" ? businessSequence : influencerSequence;
}

/**
 * Returns all drip emails that are due for the given users.
 * An email is "due" when:
 *   1. The user has been signed up for >= delayDays
 *   2. The step's condition (if any) returns true
 *   3. The email has not already been sent (via hasSent)
 *
 * @param users - Array of drip users to check
 * @param now - Optional override for current time (for testing)
 */
export function getDueEmails(users: DripUser[], now?: Date): DueEmail[] {
  const due: DueEmail[] = [];
  const currentDate = now ?? new Date();

  for (const user of users) {
    const sequence = getSequenceForRole(user.role);
    const elapsed = daysSinceSignup(user.signupDate, currentDate);

    for (let i = 0; i < sequence.length; i++) {
      const step = sequence[i];

      // Not enough time has passed
      if (elapsed < step.delayDays) continue;

      // Already sent
      if (hasSent(user.id, i)) continue;

      // Condition check (skip if condition returns false)
      if (step.condition && !step.condition(user)) continue;

      due.push({ user, step, stepIndex: i });
    }
  }

  return due;
}
