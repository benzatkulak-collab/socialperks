// Response schemas for the partner API. Each route parses its own answer with
// one of these before sending, so a mapping bug fails loudly instead of
// reaching a partner. `BusinessWeek` mirrors the interface in ./week.ts.
import { z } from "zod";

const perkCounts = z.strictObject({ pct: z.number(), dol: z.number(), dolTotal: z.number() });

export const businessWeekSchema = z.strictObject({
  businessId: z.string(),
  businessName: z.string(),
  plan: z.strictObject({
    name: z.string(),
    status: z.string().nullable(),
    completionsThisMonth: z.number(),
    completionsLimit: z.number().nullable(),
  }),
  campaigns: z.strictObject({
    byState: z.record(z.string(), z.number()),
    live: z.number(),
    nearCap: z.number(),
    pastExpiry: z.number(),
  }),
  submissions: z.strictObject({
    receivedByStatus: z.strictObject({ pending: z.number(), approved: z.number(), rejected: z.number(), expired: z.number() }),
    byPlatform: z.record(z.string(), z.number()),
    waitingNow: z.number(),
    oldestWaitingSince: z.string().nullable(),
  }),
  perks: z.strictObject({ awarded: perkCounts, redeemed: perkCounts, lapsed: z.number() }),
  latest: z.array(
    z.strictObject({
      id: z.string(),
      submittedAt: z.string(),
      status: z.string(),
      platform: z.string(),
      actionLabel: z.string(),
      campaignName: z.string(),
      links: z.strictObject({ console: z.string(), portal: z.string() }),
    }),
  ),
});

const windowSchema = z.strictObject({ from: z.string(), to: z.string() });

export const partnerBusinessesResponse = z.strictObject({
  businesses: z.array(
    z.strictObject({
      id: z.string(),
      name: z.string(),
      plan: z.string(),
      planStatus: z.string().nullable(),
      grantedAt: z.string(),
    }),
  ),
});

export const partnerOverviewResponse = z.strictObject({
  window: windowSchema,
  businesses: z.array(businessWeekSchema),
});

export const partnerWeekResponse = z.strictObject({
  window: windowSchema,
  business: businessWeekSchema,
});
