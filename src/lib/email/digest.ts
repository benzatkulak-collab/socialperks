// ==============================================================================
// Social Perks -- Weekly Performance Digest Email
//
// Generates and sends weekly digest emails to businesses with active campaigns.
// Summarizes submissions, completions, marketing value, and top campaigns.
// ==============================================================================

import { escapeHtml } from "@/lib/security/sanitize";
import { campaignManager } from "@/lib/campaign-state-machine";
import type { CampaignLifecycle } from "@/lib/campaign-state-machine";
import { getSubmissionsForCampaign } from "@/lib/submissions";
import { eventStore } from "@/lib/events";

// -- Types --------------------------------------------------------------------

export interface DigestData {
  businessId: string;
  businessName: string;
  email: string;
  period: { start: string; end: string };
  submissions: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  completions: number;
  marketingValue: number;
  topCampaign: { name: string; completions: number } | null;
  activeCampaigns: number;
  weekOverWeekChange: number;
}

// -- Constants ----------------------------------------------------------------

const AVERAGE_MARKETING_VALUE_PER_COMPLETION = 12.5;
const DASHBOARD_URL = "https://socialperks.app/dashboard";
const CREATE_CAMPAIGN_URL = "https://socialperks.app/campaigns/new";

// -- Digest Data Builder ------------------------------------------------------

/**
 * Build digest data for a business by aggregating campaign and submission data
 * from the past week.
 */
export function buildDigestData(
  businessId: string,
  businessName: string,
  email: string
): DigestData {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const period = {
    start: weekAgo.toISOString().split("T")[0],
    end: now.toISOString().split("T")[0],
  };

  // Get all campaigns for this business
  const campaigns = campaignManager.listByBusiness(businessId);
  const activeCampaigns = campaigns.filter((c) => c.state === "active").length;

  // Resolve campaign names from event store
  const campaignNames = resolveCampaignNames(campaigns);

  // Aggregate submissions from all business campaigns within the period
  const thisWeek = aggregateSubmissions(campaigns, weekAgo, now);
  const lastWeek = aggregateSubmissions(campaigns, twoWeeksAgo, weekAgo);

  // Calculate week-over-week change
  const weekOverWeekChange =
    lastWeek.approved === 0
      ? thisWeek.approved > 0
        ? 100
        : 0
      : Math.round(
          ((thisWeek.approved - lastWeek.approved) / lastWeek.approved) * 100
        );

  // Find top-performing campaign this week
  const topCampaign = findTopCampaign(
    thisWeek.campaignCompletions,
    campaignNames
  );

  // Estimate marketing value ($12.50 average per approved completion)
  const marketingValue = Math.round(
    thisWeek.approved * AVERAGE_MARKETING_VALUE_PER_COMPLETION * 100
  ) / 100;

  return {
    businessId,
    businessName,
    email,
    period,
    submissions: {
      total: thisWeek.total,
      approved: thisWeek.approved,
      rejected: thisWeek.rejected,
      pending: thisWeek.pending,
    },
    completions: thisWeek.approved,
    marketingValue,
    topCampaign,
    activeCampaigns,
    weekOverWeekChange,
  };
}

// -- Aggregation Helpers ------------------------------------------------------

interface AggregatedSubmissions {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  campaignCompletions: Map<string, number>;
}

function aggregateSubmissions(
  campaigns: CampaignLifecycle[],
  from: Date,
  to: Date
): AggregatedSubmissions {
  const result: AggregatedSubmissions = {
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    campaignCompletions: new Map(),
  };

  for (const campaign of campaigns) {
    // Fetch all submissions for this campaign (unpaginated with large perPage)
    const { submissions } = getSubmissionsForCampaign(
      campaign.id,
      {},
      1,
      50_000
    );

    const filtered = submissions.filter((s) => {
      const submittedAt = new Date(s.submittedAt);
      return submittedAt >= from && submittedAt < to;
    });

    let campaignApproved = 0;

    for (const sub of filtered) {
      result.total++;
      if (sub.status === "approved") {
        result.approved++;
        campaignApproved++;
      } else if (sub.status === "rejected") {
        result.rejected++;
      } else if (sub.status === "pending") {
        result.pending++;
      }
    }

    if (campaignApproved > 0) {
      result.campaignCompletions.set(campaign.id, campaignApproved);
    }
  }

  return result;
}

function resolveCampaignNames(
  campaigns: CampaignLifecycle[]
): Map<string, string> {
  const names = new Map<string, string>();

  for (const campaign of campaigns) {
    // Look up the campaign.created event to find the name
    const events = eventStore.query({
      type: "campaign.created",
      entityId: campaign.id,
    });

    if (events.length > 0) {
      const name = events[0].data?.name;
      if (typeof name === "string") {
        names.set(campaign.id, name);
      }
    }

    // Fallback: use campaign ID if no name found
    if (!names.has(campaign.id)) {
      names.set(campaign.id, campaign.id);
    }
  }

  return names;
}

function findTopCampaign(
  completions: Map<string, number>,
  names: Map<string, string>
): { name: string; completions: number } | null {
  if (completions.size === 0) return null;

  let topId = "";
  let topCount = 0;

  for (const entry of Array.from(completions.entries())) {
    if (entry[1] > topCount) {
      topId = entry[0];
      topCount = entry[1];
    }
  }

  return {
    name: names.get(topId) ?? topId,
    completions: topCount,
  };
}

// -- HTML Template ------------------------------------------------------------

/**
 * Generate the digest email HTML and subject line.
 */
export function generateDigestHtml(data: DigestData): {
  subject: string;
  html: string;
  text: string;
} {
  const safeName = escapeHtml(data.businessName);

  // Subject line
  const subject =
    data.completions > 0
      ? `Your week: ${data.completions} completion${data.completions !== 1 ? "s" : ""}, $${data.marketingValue.toLocaleString()} in marketing value`
      : "Your weekly digest -- your campaigns are waiting!";

  // Trend indicator
  const trendArrow =
    data.weekOverWeekChange > 0
      ? "&#9650;" // up triangle
      : data.weekOverWeekChange < 0
        ? "&#9660;" // down triangle
        : "&#9644;"; // horizontal line
  const trendColor =
    data.weekOverWeekChange > 0
      ? "#34D399"
      : data.weekOverWeekChange < 0
        ? "#F87171"
        : "#94A3B8";
  const trendText = `${trendArrow} ${Math.abs(data.weekOverWeekChange)}% week over week`;

  // Build body sections
  const zeroState = data.completions === 0 && data.activeCampaigns === 0;

  const metricsSection = zeroState
    ? buildZeroStateHtml()
    : buildMetricsHtml(data, trendColor, trendText);

  const body = `
<h1 style="color: #22D3EE; font-family: 'Instrument Serif', serif; font-style: italic; margin: 0 0 8px 0;">Weekly Digest</h1>
<p style="color: #94A3B8; line-height: 1.6; margin: 0 0 24px 0;">Hi ${safeName}, here's how your campaigns performed from ${escapeHtml(data.period.start)} to ${escapeHtml(data.period.end)}.</p>
${metricsSection}
<p style="color: #64748B; font-size: 12px; margin-top: 32px; border-top: 1px solid #2D3348; padding-top: 16px;">You're receiving this because you have active campaigns on Social Perks.</p>`;

  const html = wrapDigestHtml(body);

  // Plain text fallback
  const text = buildPlainText(data, zeroState);

  return { subject, html, text };
}

function buildMetricsHtml(
  data: DigestData,
  trendColor: string,
  trendText: string
): string {
  const topCampaignSection = data.topCampaign
    ? `
<div style="background-color: #0C0F1A; border-radius: 8px; padding: 16px; margin-top: 16px; border-left: 3px solid #FBBF24;">
  <p style="color: #FBBF24; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; font-weight: 600;">Top Campaign</p>
  <p style="color: #E2E8F0; font-size: 16px; margin: 0; font-weight: 600;">${escapeHtml(data.topCampaign.name)}</p>
  <p style="color: #94A3B8; font-size: 14px; margin: 4px 0 0 0;">${data.topCampaign.completions} completion${data.topCampaign.completions !== 1 ? "s" : ""} this week</p>
</div>`
    : "";

  return `
<div style="background-color: #0C0F1A; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 12px; text-align: center; width: 25%;">
        <p style="color: #22D3EE; font-family: 'JetBrains Mono', monospace; font-size: 24px; margin: 0; font-weight: 700;">${data.completions}</p>
        <p style="color: #94A3B8; font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">Completions</p>
      </td>
      <td style="padding: 8px 12px; text-align: center; width: 25%;">
        <p style="color: #34D399; font-family: 'JetBrains Mono', monospace; font-size: 24px; margin: 0; font-weight: 700;">$${data.marketingValue.toLocaleString()}</p>
        <p style="color: #94A3B8; font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">Mktg Value</p>
      </td>
      <td style="padding: 8px 12px; text-align: center; width: 25%;">
        <p style="color: #E2E8F0; font-family: 'JetBrains Mono', monospace; font-size: 24px; margin: 0; font-weight: 700;">${data.submissions.total}</p>
        <p style="color: #94A3B8; font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">Submissions</p>
      </td>
      <td style="padding: 8px 12px; text-align: center; width: 25%;">
        <p style="color: #E2E8F0; font-family: 'JetBrains Mono', monospace; font-size: 24px; margin: 0; font-weight: 700;">${data.activeCampaigns}</p>
        <p style="color: #94A3B8; font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">Active</p>
      </td>
    </tr>
  </table>
</div>

<div style="background-color: #0C0F1A; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 4px 0;">
        <span style="color: #94A3B8; font-size: 13px;">Approved</span>
      </td>
      <td style="padding: 4px 0; text-align: right;">
        <span style="color: #34D399; font-family: 'JetBrains Mono', monospace; font-size: 13px;">${data.submissions.approved}</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 4px 0;">
        <span style="color: #94A3B8; font-size: 13px;">Rejected</span>
      </td>
      <td style="padding: 4px 0; text-align: right;">
        <span style="color: #F87171; font-family: 'JetBrains Mono', monospace; font-size: 13px;">${data.submissions.rejected}</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 4px 0;">
        <span style="color: #94A3B8; font-size: 13px;">Pending</span>
      </td>
      <td style="padding: 4px 0; text-align: right;">
        <span style="color: #FBBF24; font-family: 'JetBrains Mono', monospace; font-size: 13px;">${data.submissions.pending}</span>
      </td>
    </tr>
  </table>
  <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #2D3348;">
    <span style="color: ${trendColor}; font-size: 13px;">${trendText}</span>
  </div>
</div>

${topCampaignSection}

<div style="text-align: center; margin-top: 24px;">
  <a href="${DASHBOARD_URL}" style="display: inline-block; padding: 12px 24px; background-color: #22D3EE; color: #0C0F1A; border-radius: 8px; text-decoration: none; font-weight: 600;">View Full Analytics &#8594;</a>
</div>`;
}

function buildZeroStateHtml(): string {
  return `
<div style="background-color: #0C0F1A; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 16px;">
  <p style="color: #FBBF24; font-size: 32px; margin: 0 0 12px 0;">&#128640;</p>
  <p style="color: #E2E8F0; font-size: 18px; margin: 0 0 8px 0; font-weight: 600;">Your campaigns are waiting!</p>
  <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Create your first campaign and start turning customers into your marketing team.</p>
  <a href="${CREATE_CAMPAIGN_URL}" style="display: inline-block; padding: 12px 24px; background-color: #22D3EE; color: #0C0F1A; border-radius: 8px; text-decoration: none; font-weight: 600;">Create Your First Campaign &#8594;</a>
</div>`;
}

function buildPlainText(data: DigestData, zeroState: boolean): string {
  if (zeroState) {
    return [
      `Weekly Digest for ${data.businessName}`,
      `Period: ${data.period.start} to ${data.period.end}`,
      "",
      "Your campaigns are waiting! Create your first campaign and start turning customers into your marketing team.",
      "",
      `Create a campaign: ${CREATE_CAMPAIGN_URL}`,
    ].join("\n");
  }

  const lines = [
    `Weekly Digest for ${data.businessName}`,
    `Period: ${data.period.start} to ${data.period.end}`,
    "",
    `Completions: ${data.completions}`,
    `Marketing Value: $${data.marketingValue.toLocaleString()}`,
    `Total Submissions: ${data.submissions.total} (${data.submissions.approved} approved, ${data.submissions.rejected} rejected, ${data.submissions.pending} pending)`,
    `Active Campaigns: ${data.activeCampaigns}`,
    `Week-over-week: ${data.weekOverWeekChange > 0 ? "+" : ""}${data.weekOverWeekChange}%`,
  ];

  if (data.topCampaign) {
    lines.push(
      "",
      `Top Campaign: ${data.topCampaign.name} (${data.topCampaign.completions} completions)`
    );
  }

  lines.push("", `View full analytics: ${DASHBOARD_URL}`);
  return lines.join("\n");
}

// -- HTML Wrapper (matches existing email style) ------------------------------

function wrapDigestHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'DM Sans', Arial, sans-serif; background-color: #0C0F1A; color: #E2E8F0; padding: 24px;">
<div style="max-width: 600px; margin: 0 auto; background-color: #1A1F36; border-radius: 12px; padding: 32px; border: 1px solid #2D3348;">
${body}
</div>
</body>
</html>`;
}
