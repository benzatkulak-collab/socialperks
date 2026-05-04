/**
 * Database Schema Definition for Social Perks
 * ─────────────────────────────────────────────
 * This maps directly to a Prisma schema.
 * When ready to migrate: convert these to schema.prisma format.
 *
 * Conventions:
 * - All tables use UUID primary keys
 * - All timestamps are ISO 8601 stored as TIMESTAMPTZ
 * - Soft deletes via deleted_at where applicable
 * - snake_case for column names (Prisma will map to camelCase in the client)
 * - Foreign keys always have ON DELETE behavior specified
 */

// ─── Column Type Helpers ─────────────────────────────────────────────────────

type ColumnType =
  | "uuid"
  | "text"
  | "varchar(255)"
  | "varchar(50)"
  | "varchar(100)"
  | "int"
  | "bigint"
  | "decimal(10,2)"
  | "decimal(5,4)"
  | "float"
  | "boolean"
  | "timestamptz"
  | "jsonb"
  | "text[]";

interface Column {
  readonly type: ColumnType;
  readonly nullable: boolean;
  readonly default?: string;
  readonly references?: {
    readonly table: string;
    readonly column: string;
    readonly onDelete: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
  };
}

interface Index {
  readonly columns: readonly string[];
  readonly unique: boolean;
  readonly name?: string;
}

interface Relation {
  readonly type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  readonly table: string;
  readonly foreignKey: string;
  readonly description?: string;
}

interface TableDef {
  readonly columns: Readonly<Record<string, Column>>;
  readonly indexes: readonly Index[];
  readonly relations: readonly Relation[];
}

// ─── Schema Definition ───────────────────────────────────────────────────────

export const SCHEMA = {

  // ═══════════════════════════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════════════════════════

  users: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      email: { type: "varchar(255)", nullable: false },
      name: { type: "varchar(255)", nullable: false },
      password_hash: { type: "text", nullable: true },
      role: { type: "varchar(50)", nullable: false, default: "'business_owner'" },
      business_id: {
        type: "uuid",
        nullable: true,
        references: { table: "businesses", column: "id", onDelete: "SET NULL" },
      },
      influencer_id: {
        type: "uuid",
        nullable: true,
        references: { table: "influencers", column: "id", onDelete: "SET NULL" },
      },
      avatar_url: { type: "text", nullable: true },
      email_verified: { type: "boolean", nullable: false, default: "false" },
      email_verified_at: { type: "timestamptz", nullable: true },
      last_login_at: { type: "timestamptz", nullable: true },
      preferences: { type: "jsonb", nullable: false, default: "'{}'" },
      created_at: { type: "timestamptz", nullable: false, default: "now()" },
      updated_at: { type: "timestamptz", nullable: false, default: "now()" },
      deleted_at: { type: "timestamptz", nullable: true },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "users_pkey" },
      { columns: ["email"], unique: true, name: "users_email_unique" },
      { columns: ["role"], unique: false, name: "users_role_idx" },
      { columns: ["business_id"], unique: false, name: "users_business_id_idx" },
      { columns: ["influencer_id"], unique: false, name: "users_influencer_id_idx" },
      { columns: ["created_at"], unique: false, name: "users_created_at_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "businesses", foreignKey: "business_id", description: "User belongs to a business (for owners and managers)" },
      { type: "one-to-one", table: "influencers", foreignKey: "influencer_id", description: "User has an influencer profile" },
      { type: "one-to-many", table: "campaign_submissions", foreignKey: "user_id", description: "User has many submissions" },
      { type: "one-to-many", table: "perk_wallets", foreignKey: "user_id", description: "User has many perk wallets (one per business)" },
      { type: "one-to-many", table: "notifications", foreignKey: "user_id", description: "User has many notifications" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSINESSES
  // ═══════════════════════════════════════════════════════════════════════════

  businesses: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      name: { type: "varchar(255)", nullable: false },
      type: { type: "varchar(255)", nullable: false },
      email: { type: "varchar(255)", nullable: false },
      pin: { type: "varchar(100)", nullable: true },
      avatar: { type: "text", nullable: false, default: "''" },
      industry: { type: "varchar(100)", nullable: true },
      size: { type: "varchar(50)", nullable: false, default: "'small'" },
      location: { type: "varchar(255)", nullable: true },
      website: { type: "text", nullable: true },
      social_links: { type: "jsonb", nullable: false, default: "'[]'" },
      plan: { type: "varchar(50)", nullable: false, default: "'free'" },
      description: { type: "text", nullable: true },
      avg_rating: { type: "decimal(5,4)", nullable: true },
      campaign_count: { type: "int", nullable: false, default: "0" },
      verified: { type: "boolean", nullable: false, default: "false" },
      stripe_customer_id: { type: "varchar(255)", nullable: true },
      stripe_subscription_id: { type: "varchar(255)", nullable: true },
      created_at: { type: "timestamptz", nullable: false, default: "now()" },
      updated_at: { type: "timestamptz", nullable: false, default: "now()" },
      deleted_at: { type: "timestamptz", nullable: true },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "businesses_pkey" },
      { columns: ["email"], unique: true, name: "businesses_email_unique" },
      { columns: ["type"], unique: false, name: "businesses_type_idx" },
      { columns: ["industry"], unique: false, name: "businesses_industry_idx" },
      { columns: ["size"], unique: false, name: "businesses_size_idx" },
      { columns: ["plan"], unique: false, name: "businesses_plan_idx" },
      { columns: ["location"], unique: false, name: "businesses_location_idx" },
      { columns: ["verified"], unique: false, name: "businesses_verified_idx" },
      { columns: ["created_at"], unique: false, name: "businesses_created_at_idx" },
    ],
    relations: [
      { type: "one-to-many", table: "users", foreignKey: "business_id", description: "Business has many team members" },
      { type: "one-to-many", table: "launched_campaigns", foreignKey: "business_id", description: "Business has many campaigns" },
      { type: "one-to-many", table: "perk_wallets", foreignKey: "business_id", description: "Business has many customer wallets" },
      { type: "one-to-many", table: "api_keys", foreignKey: "business_id", description: "Business has many API keys" },
      { type: "one-to-many", table: "webhooks", foreignKey: "business_id", description: "Business has many webhooks" },
      { type: "one-to-many", table: "platform_connections", foreignKey: "business_id", description: "Business has many platform connections" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INFLUENCERS
  // ═══════════════════════════════════════════════════════════════════════════

  influencers: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      user_id: {
        type: "uuid",
        nullable: false,
        references: { table: "users", column: "id", onDelete: "CASCADE" },
      },
      display_name: { type: "varchar(255)", nullable: false },
      bio: { type: "text", nullable: false, default: "''" },
      follower_count: { type: "int", nullable: false, default: "0" },
      engagement_rate: { type: "decimal(5,4)", nullable: false, default: "0" },
      niches: { type: "text[]", nullable: false, default: "'{}'" },
      location: { type: "varchar(255)", nullable: false, default: "''" },
      rate_card: { type: "jsonb", nullable: false, default: "'{}'" },
      portfolio: { type: "jsonb", nullable: false, default: "'[]'" },
      verified: { type: "boolean", nullable: false, default: "false" },
      tier: { type: "varchar(50)", nullable: false, default: "'micro'" },
      avg_response_time_hours: { type: "float", nullable: true },
      completion_rate: { type: "decimal(5,4)", nullable: true },
      campaigns_completed: { type: "int", nullable: false, default: "0" },
      stripe_connect_id: { type: "varchar(255)", nullable: true },
      created_at: { type: "timestamptz", nullable: false, default: "now()" },
      updated_at: { type: "timestamptz", nullable: false, default: "now()" },
      deleted_at: { type: "timestamptz", nullable: true },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "influencers_pkey" },
      { columns: ["user_id"], unique: true, name: "influencers_user_id_unique" },
      { columns: ["tier"], unique: false, name: "influencers_tier_idx" },
      { columns: ["follower_count"], unique: false, name: "influencers_follower_count_idx" },
      { columns: ["engagement_rate"], unique: false, name: "influencers_engagement_rate_idx" },
      { columns: ["verified"], unique: false, name: "influencers_verified_idx" },
      { columns: ["location"], unique: false, name: "influencers_location_idx" },
      { columns: ["created_at"], unique: false, name: "influencers_created_at_idx" },
    ],
    relations: [
      { type: "one-to-one", table: "users", foreignKey: "user_id", description: "Influencer belongs to a user account" },
      { type: "one-to-many", table: "influencer_platforms", foreignKey: "influencer_id", description: "Influencer has many platform connections" },
      { type: "one-to-many", table: "campaign_submissions", foreignKey: "user_id", description: "Influencer has many submissions (via user)" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INFLUENCER PLATFORMS
  // ═══════════════════════════════════════════════════════════════════════════

  influencer_platforms: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      influencer_id: {
        type: "uuid",
        nullable: false,
        references: { table: "influencers", column: "id", onDelete: "CASCADE" },
      },
      platform_id: { type: "varchar(50)", nullable: false },
      handle: { type: "varchar(255)", nullable: false },
      followers: { type: "int", nullable: false, default: "0" },
      engagement_rate: { type: "decimal(5,4)", nullable: false, default: "0" },
      verified: { type: "boolean", nullable: false, default: "false" },
      profile_url: { type: "text", nullable: true },
      last_synced_at: { type: "timestamptz", nullable: true },
      created_at: { type: "timestamptz", nullable: false, default: "now()" },
      updated_at: { type: "timestamptz", nullable: false, default: "now()" },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "influencer_platforms_pkey" },
      { columns: ["influencer_id", "platform_id"], unique: true, name: "influencer_platforms_influencer_platform_unique" },
      { columns: ["influencer_id"], unique: false, name: "influencer_platforms_influencer_id_idx" },
      { columns: ["platform_id"], unique: false, name: "influencer_platforms_platform_id_idx" },
      { columns: ["handle"], unique: false, name: "influencer_platforms_handle_idx" },
      { columns: ["followers"], unique: false, name: "influencer_platforms_followers_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "influencers", foreignKey: "influencer_id", description: "Platform connection belongs to an influencer" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPAIGNS (AI-suggested templates, stored for reuse)
  // ═══════════════════════════════════════════════════════════════════════════

  campaigns: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      name: { type: "varchar(255)", nullable: false },
      description: { type: "text", nullable: false },
      actions: { type: "text[]", nullable: false },
      discount_value: { type: "decimal(10,2)", nullable: false },
      discount_type: { type: "varchar(50)", nullable: false },
      category: { type: "varchar(100)", nullable: false },
      tier: { type: "varchar(50)", nullable: false },
      ai_reason: { type: "text", nullable: false },
      business_type: { type: "varchar(255)", nullable: true },
      created_at: { type: "timestamptz", nullable: false, default: "now()" },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "campaigns_pkey" },
      { columns: ["tier"], unique: false, name: "campaigns_tier_idx" },
      { columns: ["category"], unique: false, name: "campaigns_category_idx" },
      { columns: ["business_type"], unique: false, name: "campaigns_business_type_idx" },
    ],
    relations: [
      { type: "one-to-many", table: "launched_campaigns", foreignKey: "from_suggestion", description: "Template used by many launched campaigns" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LAUNCHED CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════════════════

  launched_campaigns: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      business_id: {
        type: "uuid",
        nullable: false,
        references: { table: "businesses", column: "id", onDelete: "CASCADE" },
      },
      name: { type: "varchar(255)", nullable: false },
      description: { type: "text", nullable: false },
      actions: { type: "text[]", nullable: false },
      discount_value: { type: "decimal(10,2)", nullable: false },
      discount_type: { type: "varchar(50)", nullable: false },
      guidelines: { type: "text", nullable: true },
      max_completions: { type: "int", nullable: true },
      expires_in_days: { type: "int", nullable: false },
      use_tiers: { type: "boolean", nullable: false, default: "false" },
      status: { type: "varchar(50)", nullable: false, default: "'active'" },
      from_suggestion: {
        type: "uuid",
        nullable: true,
        references: { table: "campaigns", column: "id", onDelete: "SET NULL" },
      },
      completion_count: { type: "int", nullable: false, default: "0" },
      budget_cap: { type: "decimal(10,2)", nullable: true },
      budget_used: { type: "decimal(10,2)", nullable: false, default: "0" },
      ftc_disclosures: { type: "text[]", nullable: false, default: "'{}'" },
      tags: { type: "text[]", nullable: false, default: "'{}'" },
      expires_at: { type: "timestamptz", nullable: true },
      created_at: { type: "timestamptz", nullable: false, default: "now()" },
      updated_at: { type: "timestamptz", nullable: false, default: "now()" },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "launched_campaigns_pkey" },
      { columns: ["business_id"], unique: false, name: "launched_campaigns_business_id_idx" },
      { columns: ["status"], unique: false, name: "launched_campaigns_status_idx" },
      { columns: ["business_id", "status"], unique: false, name: "launched_campaigns_business_status_idx" },
      { columns: ["from_suggestion"], unique: false, name: "launched_campaigns_from_suggestion_idx" },
      { columns: ["expires_at"], unique: false, name: "launched_campaigns_expires_at_idx" },
      { columns: ["created_at"], unique: false, name: "launched_campaigns_created_at_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "businesses", foreignKey: "business_id", description: "Campaign belongs to a business" },
      { type: "many-to-one", table: "campaigns", foreignKey: "from_suggestion", description: "Campaign was created from a suggestion" },
      { type: "one-to-many", table: "campaign_submissions", foreignKey: "campaign_id", description: "Campaign has many submissions" },
      { type: "one-to-many", table: "earned_perks", foreignKey: "campaign_id", description: "Campaign generates many perks" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPAIGN SUBMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  campaign_submissions: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      campaign_id: {
        type: "uuid",
        nullable: false,
        references: { table: "launched_campaigns", column: "id", onDelete: "CASCADE" },
      },
      user_id: {
        type: "uuid",
        nullable: false,
        references: { table: "users", column: "id", onDelete: "CASCADE" },
      },
      action_id: { type: "varchar(50)", nullable: false },
      proof_url: { type: "text", nullable: false },
      proof_type: { type: "varchar(50)", nullable: false },
      status: { type: "varchar(50)", nullable: false, default: "'pending'" },
      platform_id: { type: "varchar(50)", nullable: true },
      metrics: { type: "jsonb", nullable: true },
      auto_verified: { type: "boolean", nullable: false, default: "false" },
      review_note: { type: "text", nullable: true },
      reviewed_by: {
        type: "uuid",
        nullable: true,
        references: { table: "users", column: "id", onDelete: "SET NULL" },
      },
      submitted_at: { type: "timestamptz", nullable: false, default: "now()" },
      reviewed_at: { type: "timestamptz", nullable: true },
      expires_at: { type: "timestamptz", nullable: true },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "campaign_submissions_pkey" },
      { columns: ["campaign_id"], unique: false, name: "campaign_submissions_campaign_id_idx" },
      { columns: ["user_id"], unique: false, name: "campaign_submissions_user_id_idx" },
      { columns: ["status"], unique: false, name: "campaign_submissions_status_idx" },
      { columns: ["campaign_id", "user_id", "action_id"], unique: true, name: "campaign_submissions_unique_action" },
      { columns: ["campaign_id", "status"], unique: false, name: "campaign_submissions_campaign_status_idx" },
      { columns: ["submitted_at"], unique: false, name: "campaign_submissions_submitted_at_idx" },
      { columns: ["platform_id"], unique: false, name: "campaign_submissions_platform_id_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "launched_campaigns", foreignKey: "campaign_id", description: "Submission belongs to a campaign" },
      { type: "many-to-one", table: "users", foreignKey: "user_id", description: "Submission belongs to a user" },
      { type: "many-to-one", table: "users", foreignKey: "reviewed_by", description: "Submission reviewed by a user" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PERK WALLETS
  // ═══════════════════════════════════════════════════════════════════════════

  perk_wallets: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      user_id: {
        type: "uuid",
        nullable: false,
        references: { table: "users", column: "id", onDelete: "CASCADE" },
      },
      business_id: {
        type: "uuid",
        nullable: false,
        references: { table: "businesses", column: "id", onDelete: "CASCADE" },
      },
      total_available: { type: "decimal(10,2)", nullable: false, default: "0" },
      total_lifetime: { type: "decimal(10,2)", nullable: false, default: "0" },
      created_at: { type: "timestamptz", nullable: false, default: "now()" },
      updated_at: { type: "timestamptz", nullable: false, default: "now()" },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "perk_wallets_pkey" },
      { columns: ["user_id", "business_id"], unique: true, name: "perk_wallets_user_business_unique" },
      { columns: ["user_id"], unique: false, name: "perk_wallets_user_id_idx" },
      { columns: ["business_id"], unique: false, name: "perk_wallets_business_id_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "users", foreignKey: "user_id", description: "Wallet belongs to a user" },
      { type: "many-to-one", table: "businesses", foreignKey: "business_id", description: "Wallet is for a specific business" },
      { type: "one-to-many", table: "earned_perks", foreignKey: "wallet_id", description: "Wallet contains many earned perks" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EARNED PERKS
  // ═══════════════════════════════════════════════════════════════════════════

  earned_perks: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      wallet_id: {
        type: "uuid",
        nullable: false,
        references: { table: "perk_wallets", column: "id", onDelete: "CASCADE" },
      },
      campaign_id: {
        type: "uuid",
        nullable: false,
        references: { table: "launched_campaigns", column: "id", onDelete: "CASCADE" },
      },
      submission_id: {
        type: "uuid",
        nullable: true,
        references: { table: "campaign_submissions", column: "id", onDelete: "SET NULL" },
      },
      value: { type: "decimal(10,2)", nullable: false },
      type: { type: "varchar(50)", nullable: false },
      status: { type: "varchar(50)", nullable: false, default: "'available'" },
      description: { type: "text", nullable: true },
      redemption_code: { type: "varchar(100)", nullable: true },
      earned_at: { type: "timestamptz", nullable: false, default: "now()" },
      redeemed_at: { type: "timestamptz", nullable: true },
      expires_at: { type: "timestamptz", nullable: false },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "earned_perks_pkey" },
      { columns: ["wallet_id"], unique: false, name: "earned_perks_wallet_id_idx" },
      { columns: ["campaign_id"], unique: false, name: "earned_perks_campaign_id_idx" },
      { columns: ["status"], unique: false, name: "earned_perks_status_idx" },
      { columns: ["redemption_code"], unique: true, name: "earned_perks_redemption_code_unique" },
      { columns: ["expires_at"], unique: false, name: "earned_perks_expires_at_idx" },
      { columns: ["wallet_id", "status"], unique: false, name: "earned_perks_wallet_status_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "perk_wallets", foreignKey: "wallet_id", description: "Perk belongs to a wallet" },
      { type: "many-to-one", table: "launched_campaigns", foreignKey: "campaign_id", description: "Perk was earned from a campaign" },
      { type: "many-to-one", table: "campaign_submissions", foreignKey: "submission_id", description: "Perk was earned from a specific submission" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // API KEYS
  // ═══════════════════════════════════════════════════════════════════════════

  api_keys: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      business_id: {
        type: "uuid",
        nullable: true,
        references: { table: "businesses", column: "id", onDelete: "CASCADE" },
      },
      agent_name: { type: "varchar(255)", nullable: false },
      key_hash: { type: "varchar(255)", nullable: false },
      key_prefix: { type: "varchar(50)", nullable: false },
      permissions: { type: "text[]", nullable: false, default: "'{}'" },
      rate_limit: { type: "int", nullable: false, default: "60" },
      total_requests: { type: "bigint", nullable: false, default: "0" },
      requests_today: { type: "int", nullable: false, default: "0" },
      requests_this_month: { type: "int", nullable: false, default: "0" },
      last_reset_date: { type: "timestamptz", nullable: false, default: "now()" },
      active: { type: "boolean", nullable: false, default: "true" },
      last_used_at: { type: "timestamptz", nullable: true },
      expires_at: { type: "timestamptz", nullable: true },
      created_at: { type: "timestamptz", nullable: false, default: "now()" },
      updated_at: { type: "timestamptz", nullable: false, default: "now()" },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "api_keys_pkey" },
      { columns: ["key_hash"], unique: true, name: "api_keys_key_hash_unique" },
      { columns: ["key_prefix"], unique: false, name: "api_keys_key_prefix_idx" },
      { columns: ["business_id"], unique: false, name: "api_keys_business_id_idx" },
      { columns: ["active"], unique: false, name: "api_keys_active_idx" },
      { columns: ["expires_at"], unique: false, name: "api_keys_expires_at_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "businesses", foreignKey: "business_id", description: "API key belongs to a business (or platform if null)" },
      { type: "one-to-many", table: "agent_queries", foreignKey: "api_key_id", description: "API key has many queries" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOKS
  // ═══════════════════════════════════════════════════════════════════════════

  webhooks: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      business_id: {
        type: "uuid",
        nullable: false,
        references: { table: "businesses", column: "id", onDelete: "CASCADE" },
      },
      url: { type: "text", nullable: false },
      events: { type: "text[]", nullable: false },
      active: { type: "boolean", nullable: false, default: "true" },
      secret: { type: "varchar(255)", nullable: false },
      failure_count: { type: "int", nullable: false, default: "0" },
      last_success_at: { type: "timestamptz", nullable: true },
      last_failure_at: { type: "timestamptz", nullable: true },
      last_failure_reason: { type: "text", nullable: true },
      created_at: { type: "timestamptz", nullable: false, default: "now()" },
      updated_at: { type: "timestamptz", nullable: false, default: "now()" },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "webhooks_pkey" },
      { columns: ["business_id"], unique: false, name: "webhooks_business_id_idx" },
      { columns: ["active"], unique: false, name: "webhooks_active_idx" },
      { columns: ["business_id", "active"], unique: false, name: "webhooks_business_active_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "businesses", foreignKey: "business_id", description: "Webhook belongs to a business" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  analytics_events: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      type: { type: "varchar(100)", nullable: false },
      entity_id: { type: "uuid", nullable: false },
      entity_type: { type: "varchar(50)", nullable: false },
      data: { type: "jsonb", nullable: false, default: "'{}'" },
      user_id: {
        type: "uuid",
        nullable: true,
        references: { table: "users", column: "id", onDelete: "SET NULL" },
      },
      session_id: { type: "varchar(255)", nullable: true },
      source: { type: "varchar(50)", nullable: true },
      ip_address: { type: "varchar(50)", nullable: true },
      user_agent: { type: "text", nullable: true },
      timestamp: { type: "timestamptz", nullable: false, default: "now()" },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "analytics_events_pkey" },
      { columns: ["type"], unique: false, name: "analytics_events_type_idx" },
      { columns: ["entity_id", "entity_type"], unique: false, name: "analytics_events_entity_idx" },
      { columns: ["user_id"], unique: false, name: "analytics_events_user_id_idx" },
      { columns: ["session_id"], unique: false, name: "analytics_events_session_id_idx" },
      { columns: ["timestamp"], unique: false, name: "analytics_events_timestamp_idx" },
      { columns: ["type", "timestamp"], unique: false, name: "analytics_events_type_timestamp_idx" },
      { columns: ["source"], unique: false, name: "analytics_events_source_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "users", foreignKey: "user_id", description: "Event triggered by a user" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  notifications: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      user_id: {
        type: "uuid",
        nullable: false,
        references: { table: "users", column: "id", onDelete: "CASCADE" },
      },
      type: { type: "varchar(100)", nullable: false },
      title: { type: "varchar(255)", nullable: false },
      body: { type: "text", nullable: false },
      read: { type: "boolean", nullable: false, default: "false" },
      action_url: { type: "text", nullable: true },
      entity_id: { type: "uuid", nullable: true },
      entity_type: { type: "varchar(50)", nullable: true },
      read_at: { type: "timestamptz", nullable: true },
      created_at: { type: "timestamptz", nullable: false, default: "now()" },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "notifications_pkey" },
      { columns: ["user_id"], unique: false, name: "notifications_user_id_idx" },
      { columns: ["user_id", "read"], unique: false, name: "notifications_user_read_idx" },
      { columns: ["type"], unique: false, name: "notifications_type_idx" },
      { columns: ["created_at"], unique: false, name: "notifications_created_at_idx" },
      { columns: ["entity_id", "entity_type"], unique: false, name: "notifications_entity_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "users", foreignKey: "user_id", description: "Notification belongs to a user" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT SESSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  agent_sessions: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      api_key_id: {
        type: "uuid",
        nullable: false,
        references: { table: "api_keys", column: "id", onDelete: "CASCADE" },
      },
      agent_name: { type: "varchar(255)", nullable: false },
      agent_type: { type: "varchar(100)", nullable: true },
      ip_address: { type: "varchar(50)", nullable: true },
      user_agent: { type: "text", nullable: true },
      total_queries: { type: "int", nullable: false, default: "0" },
      total_response_ms: { type: "bigint", nullable: false, default: "0" },
      started_at: { type: "timestamptz", nullable: false, default: "now()" },
      last_activity_at: { type: "timestamptz", nullable: false, default: "now()" },
      ended_at: { type: "timestamptz", nullable: true },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "agent_sessions_pkey" },
      { columns: ["api_key_id"], unique: false, name: "agent_sessions_api_key_id_idx" },
      { columns: ["agent_name"], unique: false, name: "agent_sessions_agent_name_idx" },
      { columns: ["started_at"], unique: false, name: "agent_sessions_started_at_idx" },
      { columns: ["last_activity_at"], unique: false, name: "agent_sessions_last_activity_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "api_keys", foreignKey: "api_key_id", description: "Session authenticated by an API key" },
      { type: "one-to-many", table: "agent_queries", foreignKey: "session_id", description: "Session has many queries" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  agent_queries: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      session_id: {
        type: "uuid",
        nullable: false,
        references: { table: "agent_sessions", column: "id", onDelete: "CASCADE" },
      },
      api_key_id: {
        type: "uuid",
        nullable: false,
        references: { table: "api_keys", column: "id", onDelete: "CASCADE" },
      },
      endpoint: { type: "varchar(255)", nullable: false },
      method: { type: "varchar(100)", nullable: false },
      request_body: { type: "jsonb", nullable: true },
      response_status: { type: "int", nullable: false },
      response_body_preview: { type: "text", nullable: true },
      response_ms: { type: "int", nullable: false },
      error: { type: "text", nullable: true },
      timestamp: { type: "timestamptz", nullable: false, default: "now()" },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "agent_queries_pkey" },
      { columns: ["session_id"], unique: false, name: "agent_queries_session_id_idx" },
      { columns: ["api_key_id"], unique: false, name: "agent_queries_api_key_id_idx" },
      { columns: ["endpoint"], unique: false, name: "agent_queries_endpoint_idx" },
      { columns: ["response_status"], unique: false, name: "agent_queries_response_status_idx" },
      { columns: ["timestamp"], unique: false, name: "agent_queries_timestamp_idx" },
      { columns: ["endpoint", "timestamp"], unique: false, name: "agent_queries_endpoint_timestamp_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "agent_sessions", foreignKey: "session_id", description: "Query belongs to a session" },
      { type: "many-to-one", table: "api_keys", foreignKey: "api_key_id", description: "Query authenticated by an API key" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PLATFORM CONNECTIONS (OAuth tokens for social platform APIs)
  // ═══════════════════════════════════════════════════════════════════════════

  platform_connections: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      business_id: {
        type: "uuid",
        nullable: true,
        references: { table: "businesses", column: "id", onDelete: "CASCADE" },
      },
      influencer_id: {
        type: "uuid",
        nullable: true,
        references: { table: "influencers", column: "id", onDelete: "CASCADE" },
      },
      platform_id: { type: "varchar(50)", nullable: false },
      platform_user_id: { type: "varchar(255)", nullable: true },
      handle: { type: "varchar(255)", nullable: true },
      access_token_encrypted: { type: "text", nullable: true },
      refresh_token_encrypted: { type: "text", nullable: true },
      token_expires_at: { type: "timestamptz", nullable: true },
      scopes: { type: "text[]", nullable: false, default: "'{}'" },
      status: { type: "varchar(50)", nullable: false, default: "'active'" },
      last_synced_at: { type: "timestamptz", nullable: true },
      sync_error: { type: "text", nullable: true },
      metadata: { type: "jsonb", nullable: false, default: "'{}'" },
      created_at: { type: "timestamptz", nullable: false, default: "now()" },
      updated_at: { type: "timestamptz", nullable: false, default: "now()" },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "platform_connections_pkey" },
      { columns: ["business_id", "platform_id"], unique: true, name: "platform_connections_business_platform_unique" },
      { columns: ["influencer_id", "platform_id"], unique: true, name: "platform_connections_influencer_platform_unique" },
      { columns: ["business_id"], unique: false, name: "platform_connections_business_id_idx" },
      { columns: ["influencer_id"], unique: false, name: "platform_connections_influencer_id_idx" },
      { columns: ["platform_id"], unique: false, name: "platform_connections_platform_id_idx" },
      { columns: ["status"], unique: false, name: "platform_connections_status_idx" },
      { columns: ["token_expires_at"], unique: false, name: "platform_connections_token_expires_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "businesses", foreignKey: "business_id", description: "Connection belongs to a business" },
      { type: "many-to-one", table: "influencers", foreignKey: "influencer_id", description: "Connection belongs to an influencer" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WAITLIST — pre-onboarding lead capture
  // ═══════════════════════════════════════════════════════════════════════════

  waitlist: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      email: { type: "varchar(255)", nullable: false },
      business_name: { type: "varchar(255)", nullable: true },
      city: { type: "varchar(100)", nullable: true },
      vertical: { type: "varchar(50)", nullable: false, default: "'other'" },
      referrer: { type: "text", nullable: true },
      ip: { type: "varchar(100)", nullable: true },
      // Drip stages: tracks which nurture emails have been sent so the
      // scheduler doesn't double-send.
      day3_sent_at: { type: "timestamptz", nullable: true },
      day7_sent_at: { type: "timestamptz", nullable: true },
      contacted_at: { type: "timestamptz", nullable: true },
      onboarded_at: { type: "timestamptz", nullable: true },
      created_at: { type: "timestamptz", nullable: false, default: "now()" },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "waitlist_pkey" },
      { columns: ["email"], unique: true, name: "waitlist_email_unique" },
      { columns: ["vertical"], unique: false, name: "waitlist_vertical_idx" },
      { columns: ["created_at"], unique: false, name: "waitlist_created_idx" },
    ],
    relations: [],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERRALS — businesses + influencers can share invite codes
  // Part of the viral-loop platform layer.
  // ═══════════════════════════════════════════════════════════════════════════

  referral_codes: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      // The actor who owns this code. Either business_id OR influencer_id is set, never both.
      business_id: {
        type: "uuid",
        nullable: true,
        references: { table: "businesses", column: "id", onDelete: "CASCADE" },
      },
      influencer_id: {
        type: "uuid",
        nullable: true,
        references: { table: "influencers", column: "id", onDelete: "CASCADE" },
      },
      code: { type: "varchar(50)", nullable: false },
      // Lifecycle metrics surfaced in the owner's dashboard.
      uses_count: { type: "int", nullable: false, default: "0" },
      conversions_count: { type: "int", nullable: false, default: "0" },
      reward_unlocked: { type: "boolean", nullable: false, default: "false" },
      created_at: { type: "timestamptz", nullable: false, default: "now()" },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "referral_codes_pkey" },
      { columns: ["code"], unique: true, name: "referral_codes_code_unique" },
      { columns: ["business_id"], unique: false, name: "referral_codes_business_idx" },
      { columns: ["influencer_id"], unique: false, name: "referral_codes_influencer_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "businesses", foreignKey: "business_id", description: "Code belongs to a business" },
      { type: "many-to-one", table: "influencers", foreignKey: "influencer_id", description: "Code belongs to an influencer" },
    ],
  },

  referral_attributions: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      code: { type: "varchar(50)", nullable: false },
      // The thing that got created via this code (one is set).
      attributed_business_id: {
        type: "uuid",
        nullable: true,
        references: { table: "businesses", column: "id", onDelete: "CASCADE" },
      },
      attributed_influencer_id: {
        type: "uuid",
        nullable: true,
        references: { table: "influencers", column: "id", onDelete: "CASCADE" },
      },
      attributed_email: { type: "varchar(255)", nullable: true },
      attributed_at: { type: "timestamptz", nullable: false, default: "now()" },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "referral_attributions_pkey" },
      { columns: ["code"], unique: false, name: "referral_attrs_code_idx" },
      { columns: ["attributed_business_id"], unique: false, name: "referral_attrs_business_idx" },
      { columns: ["attributed_influencer_id"], unique: false, name: "referral_attrs_influencer_idx" },
    ],
    relations: [],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSINESS SUBSCRIPTIONS — durable Stripe subscription state
  // (was an in-memory Map in src/lib/billing/store.ts)
  // ═══════════════════════════════════════════════════════════════════════════

  business_subscriptions: {
    columns: {
      id: { type: "uuid", nullable: false, default: "gen_random_uuid()" },
      business_id: {
        type: "uuid",
        nullable: false,
        references: { table: "businesses", column: "id", onDelete: "CASCADE" },
      },
      stripe_customer_id: { type: "varchar(100)", nullable: false },
      stripe_subscription_id: { type: "varchar(100)", nullable: false },
      plan: { type: "varchar(50)", nullable: false }, // starter | professional | enterprise
      billing_period: { type: "varchar(50)", nullable: false }, // monthly | annual
      status: { type: "varchar(50)", nullable: false }, // active | past_due | canceled | trialing
      current_period_start: { type: "timestamptz", nullable: false },
      current_period_end: { type: "timestamptz", nullable: false },
      cancel_at_period_end: { type: "boolean", nullable: false, default: "false" },
      created_at: { type: "timestamptz", nullable: false, default: "now()" },
      updated_at: { type: "timestamptz", nullable: false, default: "now()" },
    },
    indexes: [
      { columns: ["id"], unique: true, name: "business_subscriptions_pkey" },
      { columns: ["stripe_subscription_id"], unique: true, name: "business_subs_stripe_sub_unique" },
      { columns: ["business_id"], unique: false, name: "business_subs_business_idx" },
      { columns: ["stripe_customer_id"], unique: false, name: "business_subs_stripe_customer_idx" },
      { columns: ["status"], unique: false, name: "business_subs_status_idx" },
    ],
    relations: [
      { type: "many-to-one", table: "businesses", foreignKey: "business_id", description: "Subscription belongs to a business" },
    ],
  },

} as const satisfies Record<string, TableDef>;

// ─── Helper Types ────────────────────────────────────────────────────────────

/** Extract table names from the schema. */
export type TableName = keyof typeof SCHEMA;

/** Extract column names for a given table. */
export type ColumnName<T extends TableName> = keyof (typeof SCHEMA)[T]["columns"];

/** Total number of tables in the schema. */
export const TABLE_COUNT = Object.keys(SCHEMA).length;

/** List all table names. */
export const TABLE_NAMES = Object.keys(SCHEMA) as TableName[];
