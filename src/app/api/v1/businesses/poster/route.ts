/**
 * GET /api/v1/businesses/poster?campaignId=&businessName=&perk=
 *
 * Returns an 8.5"×11" printable SVG poster with QR code + brand-aware
 * call-to-action copy. Businesses print, tape to counter, customers
 * scan to claim.
 *
 * SVG over PDF here is intentional: SVG renders identically in any
 * browser, prints at native resolution, and doesn't require a PDF lib.
 * Browsers' built-in Print → Save as PDF gets the user the same artifact.
 *
 * QR is encoded inline as a 25×25 grid of <rect> elements — fast,
 * no external dependency, no font rendering risk on print.
 */

import type { NextRequest } from "next/server";
import QRCode from "qrcode";

export const runtime = "nodejs";

function escape(s: string, max = 80): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .slice(0, max);
}

// Real, scannable QR matrix from the `qrcode` package. Each cell is a module
// (true = dark). Error-correction level "M" tolerates ~15% occlusion (a logo
// or smudge on a printed poster) while staying compact.
function qrMatrix(text: string): boolean[][] {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const grid: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) row.push(data[r * size + c] === 1);
    grid.push(row);
  }
  return grid;
}

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const businessName = escape(params.get("businessName") ?? "Your Business", 80);
  const perk = escape(params.get("perk") ?? "A perk", 60);
  const campaignId = escape(params.get("campaignId") ?? "demo", 100);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://socialperks.app");
  const claimUrl = `${baseUrl}/c/${campaignId}`;

  const grid = qrMatrix(claimUrl);
  const qrSize = grid.length;
  // Keep the QR roughly 300px wide regardless of module count, so the poster
  // layout stays stable as the encoded URL length (and thus QR version) varies.
  const cell = Math.max(6, Math.round(300 / qrSize));
  const qrPx = qrSize * cell;
  const rects: string[] = [];
  for (let r = 0; r < qrSize; r++) {
    for (let c = 0; c < qrSize; c++) {
      if (grid[r][c]) {
        rects.push(`<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="#0C0F1A"/>`);
      }
    }
  }

  // 8.5"×11" at 96dpi = 816×1056. Use 850×1100 for a tiny print bleed.
  const W = 850;
  const H = 1100;
  const qrX = (W - qrPx) / 2;
  const qrY = 320;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Scan to claim">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>

  <text x="${W / 2}" y="80" font-family="Georgia, 'Instrument Serif', serif" font-style="italic" font-size="48" font-weight="400" fill="#0C0F1A" text-anchor="middle" letter-spacing="-1">${businessName}</text>

  <text x="${W / 2}" y="150" font-family="-apple-system, 'DM Sans', sans-serif" font-size="22" fill="#475569" text-anchor="middle">is giving you</text>

  <text x="${W / 2}" y="220" font-family="-apple-system, 'DM Sans', sans-serif" font-size="56" font-weight="700" fill="#0C0F1A" text-anchor="middle">${perk}</text>

  <text x="${W / 2}" y="270" font-family="-apple-system, 'DM Sans', sans-serif" font-size="22" fill="#475569" text-anchor="middle">for posting about us on social media.</text>

  <!-- QR frame -->
  <rect x="${qrX - 16}" y="${qrY - 16}" width="${qrPx + 32}" height="${qrPx + 32}" fill="#F1F5F9" rx="12"/>
  <g transform="translate(${qrX}, ${qrY})">
    ${rects.join("")}
  </g>

  <text x="${W / 2}" y="${qrY + qrPx + 70}" font-family="ui-monospace, 'JetBrains Mono', monospace" font-size="18" font-weight="600" fill="#0C0F1A" text-anchor="middle" letter-spacing="2">SCAN TO CLAIM</text>

  <text x="${W / 2}" y="${qrY + qrPx + 100}" font-family="ui-monospace, monospace" font-size="14" fill="#64748B" text-anchor="middle">or visit</text>

  <text x="${W / 2}" y="${qrY + qrPx + 125}" font-family="ui-monospace, monospace" font-size="16" font-weight="600" fill="#0EA5E9" text-anchor="middle">${escape(claimUrl, 80)}</text>

  <!-- How it works -->
  <text x="80" y="${H - 200}" font-family="-apple-system, 'DM Sans', sans-serif" font-size="14" font-weight="600" fill="#0C0F1A" letter-spacing="1">HOW IT WORKS</text>
  <line x1="80" y1="${H - 188}" x2="200" y2="${H - 188}" stroke="#0C0F1A" stroke-width="2"/>
  <text x="80" y="${H - 152}" font-family="-apple-system, 'DM Sans', sans-serif" font-size="16" fill="#0C0F1A">1. Scan the QR code with your phone camera.</text>
  <text x="80" y="${H - 124}" font-family="-apple-system, 'DM Sans', sans-serif" font-size="16" fill="#0C0F1A">2. Post on Instagram / TikTok / Facebook (we&#39;ll show you how).</text>
  <text x="80" y="${H - 96}" font-family="-apple-system, 'DM Sans', sans-serif" font-size="16" fill="#0C0F1A">3. Show this verified screen at the counter for your perk.</text>

  <!-- Footer -->
  <text x="${W / 2}" y="${H - 40}" font-family="ui-monospace, monospace" font-size="11" fill="#94A3B8" text-anchor="middle" letter-spacing="2">POWERED BY SOCIAL PERKS · FTC COMPLIANT</text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `inline; filename="poster-${campaignId.slice(-6)}.svg"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
