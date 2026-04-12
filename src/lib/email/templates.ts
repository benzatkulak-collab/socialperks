/**
 * Email templates for transactional notifications.
 * Uses HTML with inline styles for maximum email client compatibility.
 */

const BRAND_COLOR = '#22D3EE';
const BG_COLOR = '#0C0F1A';

function baseTemplate(title: string, content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;">
<div style="text-align:center;margin-bottom:32px;">
<h1 style="color:${BRAND_COLOR};font-size:24px;font-style:italic;margin:0;">Social Perks</h1>
</div>
<div style="background:#141828;border-radius:12px;padding:32px;border:1px solid rgba(255,255,255,0.06);">
<h2 style="color:#fff;font-size:20px;margin:0 0 16px;">${title}</h2>
${content}
</div>
<p style="color:rgba(255,255,255,0.3);font-size:12px;text-align:center;margin-top:24px;">Social Perks &mdash; Turn customers into your marketing team</p>
</div></body></html>`;
}

export function submissionApprovedEmail(data: { campaignName: string; perkValue: string; redemptionCode: string }) {
  return {
    subject: `Your submission was approved! Earn ${data.perkValue}`,
    html: baseTemplate('Submission Approved', `
      <p style="color:rgba(255,255,255,0.7);line-height:1.6;">Your submission for <strong style="color:#fff;">${data.campaignName}</strong> has been approved.</p>
      <div style="background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.2);border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
        <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 4px;">Your perk code</p>
        <p style="color:${BRAND_COLOR};font-size:28px;font-weight:700;letter-spacing:4px;margin:0;font-family:monospace;">${data.redemptionCode}</p>
        <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:4px 0 0;">Value: ${data.perkValue}</p>
      </div>
    `),
  };
}

export function submissionRejectedEmail(data: { campaignName: string; reason?: string }) {
  return {
    subject: `Submission update for ${data.campaignName}`,
    html: baseTemplate('Submission Not Approved', `
      <p style="color:rgba(255,255,255,0.7);line-height:1.6;">Your submission for <strong style="color:#fff;">${data.campaignName}</strong> was not approved.</p>
      ${data.reason ? `<p style="color:rgba(255,255,255,0.5);font-size:14px;margin-top:12px;"><strong>Reason:</strong> ${data.reason}</p>` : ''}
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin-top:12px;">You can submit again with updated proof.</p>
    `),
  };
}

export function campaignLaunchedEmail(data: { businessName: string; campaignName: string; perkValue: string }) {
  return {
    subject: `New campaign: ${data.campaignName} by ${data.businessName}`,
    html: baseTemplate('New Campaign Available', `
      <p style="color:rgba(255,255,255,0.7);line-height:1.6;"><strong style="color:#fff;">${data.businessName}</strong> just launched a new campaign.</p>
      <div style="background:rgba(52,211,153,0.08);border-left:3px solid #34D399;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;">
        <p style="color:#fff;font-weight:600;margin:0;">${data.campaignName}</p>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:4px 0 0;">Earn up to ${data.perkValue}</p>
      </div>
    `),
  };
}

export function perkEarnedEmail(data: { perkValue: string; businessName: string; code: string }) {
  return {
    subject: `You earned ${data.perkValue} from ${data.businessName}!`,
    html: baseTemplate('Perk Earned', `
      <p style="color:rgba(255,255,255,0.7);line-height:1.6;">You earned a perk from <strong style="color:#fff;">${data.businessName}</strong>.</p>
      <div style="background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.2);border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
        <p style="color:${BRAND_COLOR};font-size:32px;font-weight:700;margin:0;">${data.perkValue}</p>
        <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:8px 0 0;">Code: <span style="font-family:monospace;color:#fff;">${data.code}</span></p>
      </div>
    `),
  };
}

export function welcomeEmail(data: { name: string }) {
  return {
    subject: 'Welcome to Social Perks!',
    html: baseTemplate('Welcome', `
      <p style="color:rgba(255,255,255,0.7);line-height:1.6;">Hi <strong style="color:#fff;">${data.name}</strong>, welcome to Social Perks!</p>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;">Start turning your customers into your marketing team.</p>
    `),
  };
}
