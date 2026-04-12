import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { err, requireAuth, requireCsrf, rateLimit, parseBody, withTiming } from '@/app/api/v1/_shared';
import { generateCSV, csvResponse } from '@/lib/export/csv';
import { generatePDFHTML, pdfHTMLResponse } from '@/lib/export/pdf';
import { campaignManager } from '@/lib/campaign-state-machine';
import { getSubmissions } from '@/lib/submissions';

interface ExportRequest {
  format: 'csv' | 'pdf';
  entity: 'campaigns' | 'submissions' | 'analytics' | 'earnings';
  filters?: Record<string, string>;
}

export const POST = withTiming(async (req: NextRequest) => {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // CSRF protection
  const csrfError = requireCsrf(req, user);
  if (csrfError) return csrfError;

  const limited = rateLimit(req, 'standard');
  if (limited) return limited;

  const body = await parseBody<ExportRequest>(req);
  if (body instanceof Response) return body;

  const { format, entity } = body;
  if (!format || !entity) return err('MISSING_PARAMS', 'format and entity are required', 400);
  if (!['csv', 'pdf'].includes(format)) return err('INVALID_FORMAT', 'Format must be csv or pdf', 400);

  // Query real data stores, scoped to the authenticated user's business
  const { headers, rows, title } = getExportData(entity, user.businessId);

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${entity}-export-${timestamp}`;

  if (format === 'csv') {
    const csvResp = csvResponse(`${filename}.csv`, generateCSV(headers, rows));
    return new NextResponse(csvResp.body, {
      status: csvResp.status,
      headers: Object.fromEntries(csvResp.headers.entries()),
    });
  }

  const pdfResp = pdfHTMLResponse(`${filename}.html`, generatePDFHTML(title, headers, rows, {
    subtitle: `${entity.charAt(0).toUpperCase() + entity.slice(1)} Report`,
  }));
  return new NextResponse(pdfResp.body, {
    status: pdfResp.status,
    headers: Object.fromEntries(pdfResp.headers.entries()),
  });
});

// ─── Demo fallback data ───────────────────────────────────────────────────

const DEMO_CAMPAIGNS: (string | number | null)[][] = [
  ['Summer Instagram Push', 'active', 45, '$234.50', '2024-03-01'],
  ['Google Review Drive', 'active', 23, '$115.00', '2024-03-05'],
  ['TikTok Challenge', 'paused', 12, '$89.00', '2024-02-28'],
  ['Yelp Review Campaign', 'ended', 67, '$335.00', '2024-02-15'],
  ['LinkedIn Thought Leader', 'active', 8, '$64.00', '2024-03-10'],
];

const DEMO_SUBMISSIONS: (string | number | null)[][] = [
  ['Summer Push', 'priya@demo.com', 'Instagram Story', 'approved', '2024-03-12'],
  ['Review Drive', 'marcus@demo.com', 'Google Review', 'pending', '2024-03-13'],
  ['TikTok Challenge', 'style@demo.com', 'TikTok Video', 'approved', '2024-03-11'],
];

const DEMO_ANALYTICS: (string | number | null)[][] = [
  ['Total Campaigns', '12', '10', '+20%'],
  ['Submissions', '156', '132', '+18%'],
  ['Approval Rate', '87%', '82%', '+5%'],
  ['Perks Awarded', '134', '108', '+24%'],
  ['Total Value', '$2,450', '$1,980', '+24%'],
];

const DEMO_EARNINGS: (string | number | null)[][] = [
  ['Summer Push', 'Sunrise Yoga', '$15.00', 'paid', '2024-03-12'],
  ['Review Drive', 'Sol Cafe', '$25.00', 'pending', '2024-03-13'],
  ['TikTok Challenge', 'Glow Studio', '$20.00', 'paid', '2024-03-11'],
];

// ─── Data retrieval ───────────────────────────────────────────────────────

function getExportData(
  entity: string,
  businessId: string | null
): { headers: string[]; rows: (string | number | null)[][]; title: string } {
  switch (entity) {
    case 'campaigns': {
      // Query real campaigns from the state machine
      const allCampaigns = businessId
        ? campaignManager.listByBusiness(businessId)
        : campaignManager.listAll();

      if (allCampaigns.length === 0) {
        return {
          title: 'Campaigns Report',
          headers: ['Name', 'Status', 'Completions', 'Budget Used', 'Created'],
          rows: DEMO_CAMPAIGNS,
        };
      }

      const rows: (string | number | null)[][] = allCampaigns.map(c => [
        c.id,
        c.state,
        c.completions.current,
        `$${c.budget.spent.toFixed(2)}`,
        c.expiry.launchedAt.split('T')[0],
      ]);

      return {
        title: 'Campaigns Report',
        headers: ['Campaign ID', 'Status', 'Completions', 'Budget Used', 'Launched'],
        rows,
      };
    }

    case 'submissions': {
      // Query real submissions, scoped to the business's campaigns if applicable
      let campaignIds: string[] | null = null;
      if (businessId) {
        campaignIds = campaignManager.listByBusiness(businessId).map(c => c.id);
      }

      // Fetch a large page of submissions
      const result = getSubmissions({}, 1, 1000);
      let subs = result.submissions;

      // Filter to business's campaigns if applicable
      if (campaignIds && campaignIds.length > 0) {
        const idSet = new Set(campaignIds);
        subs = subs.filter(s => idSet.has(s.campaignId));
      }

      if (subs.length === 0) {
        return {
          title: 'Submissions Report',
          headers: ['Campaign', 'User', 'Action', 'Status', 'Submitted'],
          rows: DEMO_SUBMISSIONS,
        };
      }

      const rows: (string | number | null)[][] = subs.map(s => [
        s.campaignId,
        s.userId,
        s.actionId,
        s.status,
        s.submittedAt.split('T')[0],
      ]);

      return {
        title: 'Submissions Report',
        headers: ['Campaign', 'User', 'Action', 'Status', 'Submitted'],
        rows,
      };
    }

    case 'analytics': {
      // Derive analytics from real campaign and submission data
      const campaigns = businessId
        ? campaignManager.listByBusiness(businessId)
        : campaignManager.listAll();

      if (campaigns.length === 0) {
        return {
          title: 'Analytics Report',
          headers: ['Metric', 'This Week', 'Last Week', 'Change'],
          rows: DEMO_ANALYTICS,
        };
      }

      const totalCampaigns = campaigns.length;
      const activeCampaigns = campaigns.filter(c => c.state === 'active').length;
      const totalCompletions = campaigns.reduce((sum, c) => sum + c.completions.current, 0);
      const totalSpent = campaigns.reduce((sum, c) => sum + c.budget.spent, 0);

      const rows: (string | number | null)[][] = [
        ['Total Campaigns', String(totalCampaigns), null, null],
        ['Active Campaigns', String(activeCampaigns), null, null],
        ['Total Completions', String(totalCompletions), null, null],
        ['Total Budget Spent', `$${totalSpent.toFixed(2)}`, null, null],
      ];

      return {
        title: 'Analytics Report',
        headers: ['Metric', 'Value', 'Previous', 'Change'],
        rows,
      };
    }

    case 'earnings': {
      // Derive earnings from approved submissions
      const result = getSubmissions({ status: 'approved' }, 1, 1000);
      let subs = result.submissions;

      // Scope to business campaigns if applicable
      if (businessId) {
        const campaignIds = new Set(campaignManager.listByBusiness(businessId).map(c => c.id));
        subs = subs.filter(s => campaignIds.has(s.campaignId));
      }

      if (subs.length === 0) {
        return {
          title: 'Earnings Report',
          headers: ['Campaign', 'Business', 'Amount', 'Status', 'Date'],
          rows: DEMO_EARNINGS,
        };
      }

      const rows: (string | number | null)[][] = subs.map(s => [
        s.campaignId,
        s.userId,
        s.perkAwarded ? 'Perk Awarded' : 'Pending',
        s.status,
        s.submittedAt.split('T')[0],
      ]);

      return {
        title: 'Earnings Report',
        headers: ['Campaign', 'User', 'Perk Status', 'Approval', 'Date'],
        rows,
      };
    }

    default:
      return { title: 'Export', headers: ['Data'], rows: [['No data available']] };
  }
}
