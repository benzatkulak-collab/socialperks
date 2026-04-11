import { NextRequest } from 'next/server';
import { err, requireAuth, parseBody } from '@/app/api/v1/_shared';
import { generateCSV, csvResponse } from '@/lib/export/csv';
import { generatePDFHTML, pdfHTMLResponse } from '@/lib/export/pdf';

interface ExportRequest {
  format: 'csv' | 'pdf';
  entity: 'campaigns' | 'submissions' | 'analytics' | 'earnings';
  filters?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const body = await parseBody<ExportRequest>(req);
  if (body instanceof Response) return body;

  const { format, entity } = body;
  if (!format || !entity) return err('MISSING_PARAMS', 'format and entity are required', 400);
  if (!['csv', 'pdf'].includes(format)) return err('INVALID_FORMAT', 'Format must be csv or pdf', 400);

  // Generate sample/demo data based on entity
  const { headers, rows, title } = getExportData(entity);

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${entity}-export-${timestamp}`;

  if (format === 'csv') {
    return csvResponse(`${filename}.csv`, generateCSV(headers, rows));
  }

  return pdfHTMLResponse(`${filename}.html`, generatePDFHTML(title, headers, rows, {
    subtitle: `${entity.charAt(0).toUpperCase() + entity.slice(1)} Report`,
  }));
}

function getExportData(entity: string): { headers: string[]; rows: (string | number | null)[][]; title: string } {
  switch (entity) {
    case 'campaigns':
      return {
        title: 'Campaigns Report',
        headers: ['Name', 'Status', 'Completions', 'Budget Used', 'Created'],
        rows: [
          ['Summer Instagram Push', 'active', 45, '$234.50', '2024-03-01'],
          ['Google Review Drive', 'active', 23, '$115.00', '2024-03-05'],
          ['TikTok Challenge', 'paused', 12, '$89.00', '2024-02-28'],
          ['Yelp Review Campaign', 'ended', 67, '$335.00', '2024-02-15'],
          ['LinkedIn Thought Leader', 'active', 8, '$64.00', '2024-03-10'],
        ],
      };
    case 'submissions':
      return {
        title: 'Submissions Report',
        headers: ['Campaign', 'User', 'Action', 'Status', 'Submitted'],
        rows: [
          ['Summer Push', 'priya@demo.com', 'Instagram Story', 'approved', '2024-03-12'],
          ['Review Drive', 'marcus@demo.com', 'Google Review', 'pending', '2024-03-13'],
          ['TikTok Challenge', 'style@demo.com', 'TikTok Video', 'approved', '2024-03-11'],
        ],
      };
    case 'analytics':
      return {
        title: 'Analytics Report',
        headers: ['Metric', 'This Week', 'Last Week', 'Change'],
        rows: [
          ['Total Campaigns', '12', '10', '+20%'],
          ['Submissions', '156', '132', '+18%'],
          ['Approval Rate', '87%', '82%', '+5%'],
          ['Perks Awarded', '134', '108', '+24%'],
          ['Total Value', '$2,450', '$1,980', '+24%'],
        ],
      };
    case 'earnings':
      return {
        title: 'Earnings Report',
        headers: ['Campaign', 'Business', 'Amount', 'Status', 'Date'],
        rows: [
          ['Summer Push', 'Sunrise Yoga', '$15.00', 'paid', '2024-03-12'],
          ['Review Drive', 'Sol Cafe', '$25.00', 'pending', '2024-03-13'],
          ['TikTok Challenge', 'Glow Studio', '$20.00', 'paid', '2024-03-11'],
        ],
      };
    default:
      return { title: 'Export', headers: ['Data'], rows: [['No data available']] };
  }
}
