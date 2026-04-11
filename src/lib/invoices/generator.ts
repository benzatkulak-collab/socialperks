/**
 * Invoice HTML generator for downloadable billing statements.
 */

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  business: { name: string; email: string; address?: string };
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  plan: string;
  period: string;
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${item.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">$${item.unitPrice.toFixed(2)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">$${item.total.toFixed(2)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${data.invoiceNumber}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:40px;color:#1f2937}
h1{color:#0891b2;font-size:28px;margin:0}
table{width:100%;border-collapse:collapse;margin:24px 0}
th{padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb}
.total-row td{font-weight:700;border-top:2px solid #0891b2;font-size:18px}
.header{display:flex;justify-content:space-between;margin-bottom:40px}
.meta{color:#6b7280;font-size:14px;line-height:1.8}
@media print{body{margin:20px}}
</style></head><body>
<div class="header">
  <div><h1>Social Perks</h1><p style="color:#6b7280;margin:4px 0 0;">Invoice</p></div>
  <div style="text-align:right" class="meta">
    <p><strong>Invoice #</strong> ${data.invoiceNumber}</p>
    <p><strong>Date:</strong> ${data.date}</p>
    <p><strong>Due:</strong> ${data.dueDate}</p>
  </div>
</div>
<div class="meta" style="margin-bottom:24px">
  <p><strong>Bill To:</strong></p>
  <p>${data.business.name}</p>
  <p>${data.business.email}</p>
  ${data.business.address ? `<p>${data.business.address}</p>` : ''}
  <p style="margin-top:8px"><strong>Plan:</strong> ${data.plan} &mdash; ${data.period}</p>
</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${itemRows}
    <tr><td colspan="3" style="padding:10px 12px;text-align:right;">Subtotal</td><td style="padding:10px 12px;text-align:right;">$${data.subtotal.toFixed(2)}</td></tr>
    <tr><td colspan="3" style="padding:10px 12px;text-align:right;">Tax</td><td style="padding:10px 12px;text-align:right;">$${data.tax.toFixed(2)}</td></tr>
    <tr class="total-row"><td colspan="3" style="padding:12px;text-align:right;">Total Due</td><td style="padding:12px;text-align:right;color:#0891b2;">$${data.total.toFixed(2)}</td></tr>
  </tbody>
</table>
<p style="color:#9ca3af;font-size:12px;margin-top:40px;border-top:1px solid #e5e7eb;padding-top:16px;">Social Perks &mdash; Thank you for your business.</p>
</body></html>`;
}
