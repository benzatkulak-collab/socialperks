/**
 * GET /api/v1/leads/export — CSV export of current user's leads.
 *
 * Returns Content-Type: text/csv with all fields flattened.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { err, requireAuth, rateLimit, withTiming } from "../../_shared";
import { getLeads } from "@/lib/leads/store";
import type { Lead } from "@/lib/leads/types";

const COLUMNS: (keyof Lead)[] = [
  "id",
  "businessName",
  "industry",
  "city",
  "state",
  "address",
  "phone",
  "website",
  "googleReviewCount",
  "googleRating",
  "hasInstagram",
  "instagramHandle",
  "lastInstagramPostDate",
  "hasResponseToReviews",
  "fitScore",
  "outreachStatus",
  "notes",
  "collectedAt",
];

function escapeCsv(value: unknown): string {
  if (value === undefined || value === null) return "";
  const str = Array.isArray(value) ? value.join("; ") : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const GET = withTiming(async (req: NextRequest) => {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const rl = rateLimit(req, "standard");
  if (rl) return rl;

  const ownerId = (user as { id: string }).id;
  const leads = await getLeads({ ownerId });

  if (leads.length === 0) {
    return err("NO_LEADS", "No leads to export yet", 404);
  }

  const header = [...COLUMNS, "fitReasons"].join(",");
  const rows = leads.map((lead) => {
    const cells = COLUMNS.map((col) => escapeCsv(lead[col]));
    cells.push(escapeCsv(lead.fitReasons));
    return cells.join(",");
  });
  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="social-perks-leads-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
      "X-Request-Id": crypto.randomUUID(),
    },
  });
});
