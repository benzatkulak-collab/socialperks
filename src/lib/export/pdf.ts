/**
 * Simple PDF generation using HTML-to-PDF approach.
 * For server-side rendering of tabular data as downloadable PDF.
 */
export function generatePDFHTML(title: string, headers: string[], rows: (string | number | null | undefined)[][], options?: { subtitle?: string; generatedAt?: string }): string {
  const now = options?.generatedAt || new Date().toISOString().split('T')[0];

  const tableRows = rows.map(row =>
    `<tr>${row.map(cell => `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${cell ?? ''}</td>`).join('')}</tr>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; color: #1f2937; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${options?.subtitle ? `<p class="subtitle">${options.subtitle}</p>` : ''}
  <p class="subtitle">Generated on ${now}</p>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">Social Perks &mdash; Export Report</div>
</body>
</html>`;
}

export function pdfHTMLResponse(filename: string, html: string): Response {
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Request-Id': crypto.randomUUID(),
    },
  });
}
