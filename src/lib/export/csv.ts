/**
 * CSV generation utility.
 * Handles escaping, UTF-8 BOM for Excel compatibility.
 */
export function generateCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel

  function escapeCell(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const headerRow = headers.map(escapeCell).join(',');
  const dataRows = rows.map(row => row.map(escapeCell).join(','));

  return BOM + [headerRow, ...dataRows].join('\r\n');
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Request-Id': crypto.randomUUID(),
    },
  });
}
