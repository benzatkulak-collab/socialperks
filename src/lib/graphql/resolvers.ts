export const resolvers = {
  Query: {
    health: () => ({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    }),

    campaigns: (_: unknown, args: { page?: number; perPage?: number; status?: string }) => {
      const page = args.page || 1;
      const perPage = Math.min(args.perPage || 20, 100);
      // In production, delegate to campaign repository
      return { items: [], total: 0, page, perPage };
    },

    campaign: (_: unknown, _args: { id: string }) => {
      // Delegate to campaign repository
      return null;
    },

    submissions: (_: unknown, args: { page?: number; perPage?: number; status?: string; campaignId?: string }) => {
      const page = args.page || 1;
      const perPage = Math.min(args.perPage || 20, 100);
      return { items: [], total: 0, page, perPage };
    },

    submission: (_: unknown, _args: { id: string }) => null,

    businesses: (_: unknown, args: { page?: number; perPage?: number }) => {
      const page = args.page || 1;
      const perPage = Math.min(args.perPage || 20, 100);
      return { items: [], total: 0, page, perPage };
    },

    business: (_: unknown, _args: { id: string }) => null,

    influencers: (_: unknown, args: { page?: number; perPage?: number; tier?: string }) => {
      const page = args.page || 1;
      const perPage = Math.min(args.perPage || 20, 100);
      return { items: [], total: 0, page, perPage };
    },

    influencer: (_: unknown, _args: { id: string }) => null,

    pricing: () => ({
      tiers: [
        { name: 'free', basePrice: 0, description: 'Basic features for getting started' },
        { name: 'starter', basePrice: 29, description: 'Essential tools for growing businesses' },
        { name: 'pro', basePrice: 79, description: 'Advanced features with AI recommendations' },
        { name: 'enterprise', basePrice: 199, description: 'Full platform with API access' },
      ],
    }),

    actions: () => {
      // Return empty array - in production, load from platforms.ts
      return [];
    },

    analytics: (_: unknown, _args: { businessId: string }) => ({
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalSubmissions: 0,
      approvalRate: 0,
      totalPerksAwarded: 0,
      totalPerkValue: 0,
    }),
  },
};
