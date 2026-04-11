export const typeDefs = /* GraphQL */ `
  type Query {
    # Campaigns
    campaigns(page: Int, perPage: Int, status: String): CampaignConnection!
    campaign(id: ID!): Campaign

    # Submissions
    submissions(page: Int, perPage: Int, status: String, campaignId: ID): SubmissionConnection!
    submission(id: ID!): Submission

    # Businesses
    business(id: ID!): Business
    businesses(page: Int, perPage: Int): BusinessConnection!

    # Influencers
    influencers(page: Int, perPage: Int, tier: String): InfluencerConnection!
    influencer(id: ID!): Influencer

    # Pricing & Actions
    pricing(businessType: String, businessSize: String): PricingData!
    actions: [Action!]!

    # Analytics
    analytics(businessId: ID!): AnalyticsSnapshot!

    # Health
    health: HealthStatus!
  }

  type CampaignConnection {
    items: [Campaign!]!
    total: Int!
    page: Int!
    perPage: Int!
  }

  type SubmissionConnection {
    items: [Submission!]!
    total: Int!
    page: Int!
    perPage: Int!
  }

  type BusinessConnection {
    items: [Business!]!
    total: Int!
    page: Int!
    perPage: Int!
  }

  type InfluencerConnection {
    items: [Influencer!]!
    total: Int!
    page: Int!
    perPage: Int!
  }

  type Campaign {
    id: ID!
    name: String!
    description: String!
    actions: [String!]!
    discountValue: Float!
    discountType: String!
    status: String!
    tier: String
    completionCount: Int!
    budgetCap: Float
    budgetUsed: Float!
    expiresAt: String
    createdAt: String!
  }

  type Submission {
    id: ID!
    campaignId: ID!
    userId: ID!
    actionId: String!
    proofUrl: String!
    proofType: String!
    status: String!
    platformId: String
    submittedAt: String!
    reviewedAt: String
  }

  type Business {
    id: ID!
    name: String!
    type: String!
    email: String!
    industry: String
    size: String!
    plan: String!
    campaignCount: Int!
    verified: Boolean!
    createdAt: String!
  }

  type Influencer {
    id: ID!
    displayName: String!
    bio: String!
    followerCount: Int!
    engagementRate: Float!
    niches: [String!]!
    location: String!
    tier: String!
    verified: Boolean!
    campaignsCompleted: Int!
    createdAt: String!
  }

  type Action {
    id: String!
    label: String!
    type: String!
    effort: Int!
    value: Float!
    platformId: String!
  }

  type PricingData {
    tiers: [PricingTier!]!
  }

  type PricingTier {
    name: String!
    basePrice: Float!
    description: String!
  }

  type AnalyticsSnapshot {
    totalCampaigns: Int!
    activeCampaigns: Int!
    totalSubmissions: Int!
    approvalRate: Float!
    totalPerksAwarded: Int!
    totalPerkValue: Float!
  }

  type HealthStatus {
    status: String!
    timestamp: String!
    version: String!
  }
`;
