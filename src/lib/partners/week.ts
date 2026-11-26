// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Partner API read model: one week's numbers per granted business.
//
// Reads Postgres directly through `db`. Every query joins partner_businesses
// (unrevoked grant for this partner) in SQL; nothing is fetched and filtered in
// JS. Imports nothing that loads whole tables at module load (no submissions
// store, session store, api-keys or billing store). No customer data is ever
// selected: no user ids, handles, proof URLs, review notes or metadata.
// ══════════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db/connection";
import { findAction } from "@/lib/platforms";
import { getPlanLimits } from "@/lib/billing/plan-limits";
import { submissionLinks } from "@/lib/partners/links";

export interface PerkCounts { pct: number; dol: number; dolTotal: number }
export interface BusinessWeek {
  businessId: string; businessName: string;
  plan: { name: string; status: string | null; completionsThisMonth: number; completionsLimit: number | null };
  campaigns: { byState: Record<string, number>; live: number; nearCap: number; pastExpiry: number };
  submissions: {
    receivedByStatus: { pending: number; approved: number; rejected: number; expired: number };
    byPlatform: Record<string, number>; waitingNow: number; oldestWaitingSince: string | null;
  };
  perks: { awarded: PerkCounts; redeemed: PerkCounts; lapsed: number };
  latest: Array<{ id: string; submittedAt: string; status: string; platform: string; actionLabel: string;
                  campaignName: string; links: { console: string; portal: string } }>;
}

type Row = Record<string, unknown>;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const iso = (v: unknown): string => (v instanceof Date ? v : new Date(String(v))).toISOString();

// The grant join: only this partner's unrevoked grants. `$1` is the partner id.
// `$2` is a text[] of business ids, or null for every granted business.
const GRANT = (businessIdExpr: string) =>
  `join partner_businesses pb on pb.business_id = ${businessIdExpr} and pb.partner_id = $1 and pb.revoked_at is null and ($2::text[] is null or pb.business_id = any($2::text[]))`;

// Business name (one auth_users row, oldest first) and plan (first active or
// trialing subscription, as getBusinessPlan decides; else none, read as free).
const BUSINESSES_SQL = `
  select distinct on (u.business_id)
    u.business_id as business_id, u.name as name,
    s.plan as plan, s.status as plan_status, pb.granted_at as granted_at,
    coalesce(mu.completions, 0) as completions_this_month
  from auth_users u
  ${GRANT("u.business_id")}
  left join lateral (
    select bs.plan, bs.status from business_subscriptions bs
    where bs.business_id = u.business_id and bs.status in ('active', 'trialing')
    order by bs.created_at limit 1
  ) s on true
  left join monthly_usage mu on mu.business_id = u.business_id and mu.month = $3
  order by u.business_id, u.created_at`;

const CAMPAIGNS_SQL = `
  select c.business_id as business_id, c.state as state, count(*)::int as n,
    count(*) filter (where c.state = 'active' and c.expires_at > now())::int as live,
    count(*) filter (where c.state = 'active' and c.expires_at > now() and c.max_completions is not null and c.completions >= 0.8 * c.max_completions)::int as near_cap,
    count(*) filter (where c.state = 'active' and c.expires_at <= now())::int as past_expiry
  from launched_campaign_state c
  ${GRANT("c.business_id")}
  group by c.business_id, c.state`;

const RECEIVED_SQL = `
  select c.business_id as business_id, s.status as status, s.action_id as action_id, count(*)::int as n
  from campaign_submissions_v2 s
  join launched_campaign_state c on c.id = s.campaign_id
  ${GRANT("c.business_id")}
  where s.submitted_at >= $3 and s.submitted_at < $4
  group by c.business_id, s.status, s.action_id`;

const WAITING_SQL = `
  select c.business_id as business_id, count(*)::int as n, min(s.submitted_at) as oldest
  from campaign_submissions_v2 s
  join launched_campaign_state c on c.id = s.campaign_id
  ${GRANT("c.business_id")}
  where s.status = 'pending'
  group by c.business_id`;

const PERKS_SQL = `
  select p.business_id as business_id, p.type as type,
    count(*) filter (where p.earned_at >= $3 and p.earned_at < $4)::int as awarded,
    coalesce(sum(p.value) filter (where p.earned_at >= $3 and p.earned_at < $4), 0) as awarded_value,
    count(*) filter (where p.redeemed_at >= $3 and p.redeemed_at < $4)::int as redeemed,
    coalesce(sum(p.value) filter (where p.redeemed_at >= $3 and p.redeemed_at < $4), 0) as redeemed_value,
    count(*) filter (where p.status = 'available' and p.expires_at >= $3 and p.expires_at < $4)::int as lapsed
  from perk_wallet_entries p
  ${GRANT("p.business_id")}
  group by p.business_id, p.type`;

const LATEST_SQL = `
  select t.id, t.business_id, t.submitted_at, t.status, t.action_id, t.campaign_name from (
    select s.id as id, c.business_id as business_id, s.submitted_at as submitted_at, s.status as status,
      s.action_id as action_id, c.name as campaign_name,
      row_number() over (partition by c.business_id order by s.submitted_at desc, s.id desc) as rn
    from campaign_submissions_v2 s
    join launched_campaign_state c on c.id = s.campaign_id
    ${GRANT("c.business_id")}
    where s.submitted_at >= $3 and s.submitted_at < $4
  ) t
  where t.rn <= $5
  order by t.business_id, t.submitted_at desc, t.id desc`;

function currentMonthUtc(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function groupBy(rows: Row[]): Map<string, Row[]> {
  const m = new Map<string, Row[]>();
  for (const r of rows) {
    const k = String(r.business_id);
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return m;
}

export async function grantedBusinesses(
  partnerId: string,
): Promise<Array<{ id: string; name: string; plan: string; planStatus: string | null; grantedAt: string }>> {
  const { rows } = await db.query<Row>(BUSINESSES_SQL, [partnerId, null, currentMonthUtc()]);
  return rows.map((r) => ({
    id: String(r.business_id),
    name: String(r.name),
    plan: r.plan ? String(r.plan) : "free",
    planStatus: r.plan_status ? String(r.plan_status) : null,
    grantedAt: iso(r.granted_at),
  }));
}

export async function businessWeeks(
  partnerId: string,
  businessIds: string[] | "all",
  window: { from: Date; to: Date },
  latestLimit: number,
): Promise<BusinessWeek[]> {
  if (businessIds !== "all" && businessIds.length === 0) return [];
  const ids = businessIds === "all" ? null : businessIds;

  // Who is granted (and their plan) comes first: no granted business, no more queries.
  const { rows: bizRows } = await db.query<Row>(BUSINESSES_SQL, [partnerId, ids, currentMonthUtc()]);
  if (bizRows.length === 0) return [];

  const base = [partnerId, ids];
  const win = [...base, window.from, window.to];
  const [campaigns, received, waiting, perks, latest] = await Promise.all([
    db.query<Row>(CAMPAIGNS_SQL, base),
    db.query<Row>(RECEIVED_SQL, win),
    db.query<Row>(WAITING_SQL, base),
    db.query<Row>(PERKS_SQL, win),
    db.query<Row>(LATEST_SQL, [...win, latestLimit]),
  ]);

  const campaignsBy = groupBy(campaigns.rows);
  const receivedBy = groupBy(received.rows);
  const waitingBy = groupBy(waiting.rows);
  const perksBy = groupBy(perks.rows);
  const latestBy = groupBy(latest.rows);

  return bizRows.map((b): BusinessWeek => {
    const id = String(b.business_id);
    const planName = b.plan ? String(b.plan) : "free";
    const limit = getPlanLimits(planName).maxCompletionsPerMonth;

    const byState: Record<string, number> = {};
    let live = 0, nearCap = 0, pastExpiry = 0;
    for (const r of campaignsBy.get(id) ?? []) {
      byState[String(r.state)] = num(r.n);
      live += num(r.live);
      nearCap += num(r.near_cap);
      pastExpiry += num(r.past_expiry);
    }

    const receivedByStatus = { pending: 0, approved: 0, rejected: 0, expired: 0 };
    const byPlatform: Record<string, number> = {};
    for (const r of receivedBy.get(id) ?? []) {
      const status = String(r.status);
      if (status in receivedByStatus) receivedByStatus[status as keyof typeof receivedByStatus] += num(r.n);
      const platform = findAction(String(r.action_id))?.platformId ?? "unknown";
      byPlatform[platform] = (byPlatform[platform] ?? 0) + num(r.n);
    }
    const w = (waitingBy.get(id) ?? [])[0];

    const awarded: PerkCounts = { pct: 0, dol: 0, dolTotal: 0 };
    const redeemed: PerkCounts = { pct: 0, dol: 0, dolTotal: 0 };
    let lapsed = 0;
    for (const r of perksBy.get(id) ?? []) {
      lapsed += num(r.lapsed);
      if (r.type !== "pct" && r.type !== "dol") continue;
      const t = r.type as "pct" | "dol";
      awarded[t] += num(r.awarded);
      redeemed[t] += num(r.redeemed);
      if (t === "dol") {
        awarded.dolTotal += num(r.awarded_value);
        redeemed.dolTotal += num(r.redeemed_value);
      }
    }

    return {
      businessId: id,
      businessName: String(b.name),
      plan: {
        name: planName,
        status: b.plan_status ? String(b.plan_status) : null,
        completionsThisMonth: num(b.completions_this_month),
        completionsLimit: Number.isFinite(limit) ? limit : null,
      },
      campaigns: { byState, live, nearCap, pastExpiry },
      submissions: {
        receivedByStatus,
        byPlatform,
        waitingNow: w ? num(w.n) : 0,
        oldestWaitingSince: w && w.oldest ? iso(w.oldest) : null,
      },
      perks: { awarded, redeemed, lapsed },
      latest: (latestBy.get(id) ?? []).map((r) => {
        const action = findAction(String(r.action_id));
        return {
          id: String(r.id),
          submittedAt: iso(r.submitted_at),
          status: String(r.status),
          platform: action?.platformId ?? "unknown",
          actionLabel: action?.label ?? "Unknown action",
          campaignName: r.campaign_name ? String(r.campaign_name) : "",
          links: submissionLinks(String(r.id)),
        };
      }),
    };
  });
}
