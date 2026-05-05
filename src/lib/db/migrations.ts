/**
 * Migration System for Social Perks
 * ──────────────────────────────────
 * Ordered, versioned migrations with up/down SQL.
 * Tracks applied migrations in a `_migrations` table.
 *
 * Usage:
 *   import { runPendingMigrations, rollback } from "./migrations";
 *   await runPendingMigrations(db);   // apply all pending
 *   await rollback(db, 1);            // undo the last 1 migration(s)
 */

import type { DatabaseConnection } from "./connection";
import { InMemoryConnection } from "./connection";

// ─── Migration Definition ───────────────────────────────────────────────────

export interface Migration {
  /** Numeric version, monotonically increasing. */
  version: number;
  /** Human-readable name. */
  name: string;
  /** SQL to apply the migration. */
  up: string;
  /** SQL to revert the migration. */
  down: string;
}

export interface AppliedMigration {
  version: number;
  name: string;
  applied_at: string;
}

// ─── Migration Registry ─────────────────────────────────────────────────────

export const MIGRATIONS: readonly Migration[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 001: Initial schema — all core tables
  // ═══════════════════════════════════════════════════════════════════════════
  {
    version: 1,
    name: "create_initial_schema",
    up: `
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── BUSINESSES ──────────────────────────────────────────────────────────────

CREATE TABLE businesses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  pin             VARCHAR(100),
  avatar          TEXT         NOT NULL DEFAULT '',
  industry        VARCHAR(100),
  size            VARCHAR(50)  NOT NULL DEFAULT 'small',
  location        VARCHAR(255),
  website         TEXT,
  social_links    JSONB        NOT NULL DEFAULT '[]',
  plan            VARCHAR(50)  NOT NULL DEFAULT 'free',
  description     TEXT,
  avg_rating      DECIMAL(5,4),
  campaign_count  INT          NOT NULL DEFAULT 0,
  verified        BOOLEAN      NOT NULL DEFAULT false,
  stripe_customer_id     VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX businesses_email_unique ON businesses (email);
CREATE INDEX businesses_type_idx ON businesses (type);
CREATE INDEX businesses_industry_idx ON businesses (industry);
CREATE INDEX businesses_size_idx ON businesses (size);
CREATE INDEX businesses_plan_idx ON businesses (plan);
CREATE INDEX businesses_location_idx ON businesses (location);
CREATE INDEX businesses_verified_idx ON businesses (verified);
CREATE INDEX businesses_created_at_idx ON businesses (created_at);

-- ─── INFLUENCERS (created before users due to FK from users) ─────────────────
-- Note: user_id FK added after users table is created.

CREATE TABLE influencers (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL,
  display_name             VARCHAR(255) NOT NULL,
  bio                      TEXT         NOT NULL DEFAULT '',
  follower_count           INT          NOT NULL DEFAULT 0,
  engagement_rate          DECIMAL(5,4) NOT NULL DEFAULT 0,
  niches                   TEXT[]       NOT NULL DEFAULT '{}',
  location                 VARCHAR(255) NOT NULL DEFAULT '',
  rate_card                JSONB        NOT NULL DEFAULT '{}',
  portfolio                JSONB        NOT NULL DEFAULT '[]',
  verified                 BOOLEAN      NOT NULL DEFAULT false,
  tier                     VARCHAR(50)  NOT NULL DEFAULT 'micro',
  avg_response_time_hours  FLOAT,
  completion_rate          DECIMAL(5,4),
  campaigns_completed      INT          NOT NULL DEFAULT 0,
  stripe_connect_id        VARCHAR(255),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ
);

CREATE INDEX influencers_tier_idx ON influencers (tier);
CREATE INDEX influencers_follower_count_idx ON influencers (follower_count);
CREATE INDEX influencers_engagement_rate_idx ON influencers (engagement_rate);
CREATE INDEX influencers_verified_idx ON influencers (verified);
CREATE INDEX influencers_location_idx ON influencers (location);
CREATE INDEX influencers_created_at_idx ON influencers (created_at);

-- ─── USERS ───────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  password_hash   TEXT,
  role            VARCHAR(50)  NOT NULL DEFAULT 'business_owner',
  business_id     UUID         REFERENCES businesses(id) ON DELETE SET NULL,
  influencer_id   UUID         REFERENCES influencers(id) ON DELETE SET NULL,
  avatar_url      TEXT,
  email_verified  BOOLEAN      NOT NULL DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  preferences     JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX users_email_unique ON users (email);
CREATE INDEX users_role_idx ON users (role);
CREATE INDEX users_business_id_idx ON users (business_id);
CREATE INDEX users_influencer_id_idx ON users (influencer_id);
CREATE INDEX users_created_at_idx ON users (created_at);

-- Now add the FK from influencers.user_id -> users.id
ALTER TABLE influencers
  ADD CONSTRAINT influencers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX influencers_user_id_unique ON influencers (user_id);

-- ─── INFLUENCER PLATFORMS ────────────────────────────────────────────────────

CREATE TABLE influencer_platforms (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id   UUID         NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  platform_id     VARCHAR(50)  NOT NULL,
  handle          VARCHAR(255) NOT NULL,
  followers       INT          NOT NULL DEFAULT 0,
  engagement_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
  verified        BOOLEAN      NOT NULL DEFAULT false,
  profile_url     TEXT,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX influencer_platforms_influencer_platform_unique
  ON influencer_platforms (influencer_id, platform_id);
CREATE INDEX influencer_platforms_influencer_id_idx ON influencer_platforms (influencer_id);
CREATE INDEX influencer_platforms_platform_id_idx ON influencer_platforms (platform_id);
CREATE INDEX influencer_platforms_handle_idx ON influencer_platforms (handle);
CREATE INDEX influencer_platforms_followers_idx ON influencer_platforms (followers);

-- ─── CAMPAIGNS (AI-suggested templates) ──────────────────────────────────────

CREATE TABLE campaigns (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  description     TEXT         NOT NULL,
  actions         TEXT[]       NOT NULL,
  discount_value  DECIMAL(10,2) NOT NULL,
  discount_type   VARCHAR(50)  NOT NULL,
  category        VARCHAR(100) NOT NULL,
  tier            VARCHAR(50)  NOT NULL,
  ai_reason       TEXT         NOT NULL,
  business_type   VARCHAR(255),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX campaigns_tier_idx ON campaigns (tier);
CREATE INDEX campaigns_category_idx ON campaigns (category);
CREATE INDEX campaigns_business_type_idx ON campaigns (business_type);

-- ─── LAUNCHED CAMPAIGNS ──────────────────────────────────────────────────────

CREATE TABLE launched_campaigns (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID         NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL,
  description      TEXT         NOT NULL,
  actions          TEXT[]       NOT NULL,
  discount_value   DECIMAL(10,2) NOT NULL,
  discount_type    VARCHAR(50)  NOT NULL,
  guidelines       TEXT,
  max_completions  INT,
  expires_in_days  INT          NOT NULL,
  use_tiers        BOOLEAN      NOT NULL DEFAULT false,
  status           VARCHAR(50)  NOT NULL DEFAULT 'active',
  from_suggestion  UUID         REFERENCES campaigns(id) ON DELETE SET NULL,
  completion_count INT          NOT NULL DEFAULT 0,
  budget_cap       DECIMAL(10,2),
  budget_used      DECIMAL(10,2) NOT NULL DEFAULT 0,
  ftc_disclosures  TEXT[]       NOT NULL DEFAULT '{}',
  tags             TEXT[]       NOT NULL DEFAULT '{}',
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX launched_campaigns_business_id_idx ON launched_campaigns (business_id);
CREATE INDEX launched_campaigns_status_idx ON launched_campaigns (status);
CREATE INDEX launched_campaigns_business_status_idx ON launched_campaigns (business_id, status);
CREATE INDEX launched_campaigns_from_suggestion_idx ON launched_campaigns (from_suggestion);
CREATE INDEX launched_campaigns_expires_at_idx ON launched_campaigns (expires_at);
CREATE INDEX launched_campaigns_created_at_idx ON launched_campaigns (created_at);

-- ─── CAMPAIGN SUBMISSIONS ────────────────────────────────────────────────────

CREATE TABLE campaign_submissions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID         NOT NULL REFERENCES launched_campaigns(id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_id     VARCHAR(50)  NOT NULL,
  proof_url     TEXT         NOT NULL,
  proof_type    VARCHAR(50)  NOT NULL,
  status        VARCHAR(50)  NOT NULL DEFAULT 'pending',
  platform_id   VARCHAR(50),
  metrics       JSONB,
  auto_verified BOOLEAN      NOT NULL DEFAULT false,
  review_note   TEXT,
  reviewed_by   UUID         REFERENCES users(id) ON DELETE SET NULL,
  submitted_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  reviewed_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ
);

CREATE INDEX campaign_submissions_campaign_id_idx ON campaign_submissions (campaign_id);
CREATE INDEX campaign_submissions_user_id_idx ON campaign_submissions (user_id);
CREATE INDEX campaign_submissions_status_idx ON campaign_submissions (status);
CREATE UNIQUE INDEX campaign_submissions_unique_action
  ON campaign_submissions (campaign_id, user_id, action_id);
CREATE INDEX campaign_submissions_campaign_status_idx ON campaign_submissions (campaign_id, status);
CREATE INDEX campaign_submissions_submitted_at_idx ON campaign_submissions (submitted_at);
CREATE INDEX campaign_submissions_platform_id_idx ON campaign_submissions (platform_id);

-- ─── PERK WALLETS ────────────────────────────────────────────────────────────

CREATE TABLE perk_wallets (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id     UUID         NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  total_available DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_lifetime  DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX perk_wallets_user_business_unique ON perk_wallets (user_id, business_id);
CREATE INDEX perk_wallets_user_id_idx ON perk_wallets (user_id);
CREATE INDEX perk_wallets_business_id_idx ON perk_wallets (business_id);

-- ─── EARNED PERKS ────────────────────────────────────────────────────────────

CREATE TABLE earned_perks (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       UUID         NOT NULL REFERENCES perk_wallets(id) ON DELETE CASCADE,
  campaign_id     UUID         NOT NULL REFERENCES launched_campaigns(id) ON DELETE CASCADE,
  submission_id   UUID         REFERENCES campaign_submissions(id) ON DELETE SET NULL,
  value           DECIMAL(10,2) NOT NULL,
  type            VARCHAR(50)  NOT NULL,
  status          VARCHAR(50)  NOT NULL DEFAULT 'available',
  description     TEXT,
  redemption_code VARCHAR(100),
  earned_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  redeemed_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ  NOT NULL
);

CREATE INDEX earned_perks_wallet_id_idx ON earned_perks (wallet_id);
CREATE INDEX earned_perks_campaign_id_idx ON earned_perks (campaign_id);
CREATE INDEX earned_perks_status_idx ON earned_perks (status);
CREATE UNIQUE INDEX earned_perks_redemption_code_unique ON earned_perks (redemption_code);
CREATE INDEX earned_perks_expires_at_idx ON earned_perks (expires_at);
CREATE INDEX earned_perks_wallet_status_idx ON earned_perks (wallet_id, status);

-- ─── API KEYS ────────────────────────────────────────────────────────────────

CREATE TABLE api_keys (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID         REFERENCES businesses(id) ON DELETE CASCADE,
  agent_name          VARCHAR(255) NOT NULL,
  key_hash            VARCHAR(255) NOT NULL,
  key_prefix          VARCHAR(50)  NOT NULL,
  permissions         TEXT[]       NOT NULL DEFAULT '{}',
  rate_limit          INT          NOT NULL DEFAULT 60,
  total_requests      BIGINT       NOT NULL DEFAULT 0,
  requests_today      INT          NOT NULL DEFAULT 0,
  requests_this_month INT          NOT NULL DEFAULT 0,
  last_reset_date     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  active              BOOLEAN      NOT NULL DEFAULT true,
  last_used_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX api_keys_key_hash_unique ON api_keys (key_hash);
CREATE INDEX api_keys_key_prefix_idx ON api_keys (key_prefix);
CREATE INDEX api_keys_business_id_idx ON api_keys (business_id);
CREATE INDEX api_keys_active_idx ON api_keys (active);
CREATE INDEX api_keys_expires_at_idx ON api_keys (expires_at);

-- ─── WEBHOOKS ────────────────────────────────────────────────────────────────

CREATE TABLE webhooks (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID         NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  url                 TEXT         NOT NULL,
  events              TEXT[]       NOT NULL,
  active              BOOLEAN      NOT NULL DEFAULT true,
  secret              VARCHAR(255) NOT NULL,
  failure_count       INT          NOT NULL DEFAULT 0,
  last_success_at     TIMESTAMPTZ,
  last_failure_at     TIMESTAMPTZ,
  last_failure_reason TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX webhooks_business_id_idx ON webhooks (business_id);
CREATE INDEX webhooks_active_idx ON webhooks (active);
CREATE INDEX webhooks_business_active_idx ON webhooks (business_id, active);

-- ─── ANALYTICS EVENTS ────────────────────────────────────────────────────────

CREATE TABLE analytics_events (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(100) NOT NULL,
  entity_id   UUID         NOT NULL,
  entity_type VARCHAR(50)  NOT NULL,
  data        JSONB        NOT NULL DEFAULT '{}',
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  session_id  VARCHAR(255),
  source      VARCHAR(50),
  ip_address  VARCHAR(50),
  user_agent  TEXT,
  timestamp   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX analytics_events_type_idx ON analytics_events (type);
CREATE INDEX analytics_events_entity_idx ON analytics_events (entity_id, entity_type);
CREATE INDEX analytics_events_user_id_idx ON analytics_events (user_id);
CREATE INDEX analytics_events_session_id_idx ON analytics_events (session_id);
CREATE INDEX analytics_events_timestamp_idx ON analytics_events (timestamp);
CREATE INDEX analytics_events_type_timestamp_idx ON analytics_events (type, timestamp);
CREATE INDEX analytics_events_source_idx ON analytics_events (source);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(100) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT         NOT NULL,
  read        BOOLEAN      NOT NULL DEFAULT false,
  action_url  TEXT,
  entity_id   UUID,
  entity_type VARCHAR(50),
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_id_idx ON notifications (user_id);
CREATE INDEX notifications_user_read_idx ON notifications (user_id, read);
CREATE INDEX notifications_type_idx ON notifications (type);
CREATE INDEX notifications_created_at_idx ON notifications (created_at);
CREATE INDEX notifications_entity_idx ON notifications (entity_id, entity_type);

-- ─── AGENT SESSIONS ──────────────────────────────────────────────────────────

CREATE TABLE agent_sessions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id       UUID         NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  agent_name       VARCHAR(255) NOT NULL,
  agent_type       VARCHAR(100),
  ip_address       VARCHAR(50),
  user_agent       TEXT,
  total_queries    INT          NOT NULL DEFAULT 0,
  total_response_ms BIGINT      NOT NULL DEFAULT 0,
  started_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  ended_at         TIMESTAMPTZ
);

CREATE INDEX agent_sessions_api_key_id_idx ON agent_sessions (api_key_id);
CREATE INDEX agent_sessions_agent_name_idx ON agent_sessions (agent_name);
CREATE INDEX agent_sessions_started_at_idx ON agent_sessions (started_at);
CREATE INDEX agent_sessions_last_activity_idx ON agent_sessions (last_activity_at);

-- ─── AGENT QUERIES ───────────────────────────────────────────────────────────

CREATE TABLE agent_queries (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID         NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  api_key_id            UUID         NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint              VARCHAR(255) NOT NULL,
  method                VARCHAR(100) NOT NULL,
  request_body          JSONB,
  response_status       INT          NOT NULL,
  response_body_preview TEXT,
  response_ms           INT          NOT NULL,
  error                 TEXT,
  timestamp             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX agent_queries_session_id_idx ON agent_queries (session_id);
CREATE INDEX agent_queries_api_key_id_idx ON agent_queries (api_key_id);
CREATE INDEX agent_queries_endpoint_idx ON agent_queries (endpoint);
CREATE INDEX agent_queries_response_status_idx ON agent_queries (response_status);
CREATE INDEX agent_queries_timestamp_idx ON agent_queries (timestamp);
CREATE INDEX agent_queries_endpoint_timestamp_idx ON agent_queries (endpoint, timestamp);

-- ─── PLATFORM CONNECTIONS ────────────────────────────────────────────────────

CREATE TABLE platform_connections (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID         REFERENCES businesses(id) ON DELETE CASCADE,
  influencer_id           UUID         REFERENCES influencers(id) ON DELETE CASCADE,
  platform_id             VARCHAR(50)  NOT NULL,
  platform_user_id        VARCHAR(255),
  handle                  VARCHAR(255),
  access_token_encrypted  TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at        TIMESTAMPTZ,
  scopes                  TEXT[]       NOT NULL DEFAULT '{}',
  status                  VARCHAR(50)  NOT NULL DEFAULT 'active',
  last_synced_at          TIMESTAMPTZ,
  sync_error              TEXT,
  metadata                JSONB        NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX platform_connections_business_platform_unique
  ON platform_connections (business_id, platform_id);
CREATE UNIQUE INDEX platform_connections_influencer_platform_unique
  ON platform_connections (influencer_id, platform_id);
CREATE INDEX platform_connections_business_id_idx ON platform_connections (business_id);
CREATE INDEX platform_connections_influencer_id_idx ON platform_connections (influencer_id);
CREATE INDEX platform_connections_platform_id_idx ON platform_connections (platform_id);
CREATE INDEX platform_connections_status_idx ON platform_connections (status);
CREATE INDEX platform_connections_token_expires_idx ON platform_connections (token_expires_at);

-- ─── MIGRATIONS TRACKING TABLE ───────────────────────────────────────────────
-- (This is created by the migration runner itself, but included here for
-- completeness if running the SQL manually.)

CREATE TABLE IF NOT EXISTS _migrations (
  version     INT          PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  applied_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
`,
    down: `
DROP TABLE IF EXISTS _migrations CASCADE;
DROP TABLE IF EXISTS platform_connections CASCADE;
DROP TABLE IF EXISTS agent_queries CASCADE;
DROP TABLE IF EXISTS agent_sessions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS earned_perks CASCADE;
DROP TABLE IF EXISTS perk_wallets CASCADE;
DROP TABLE IF EXISTS campaign_submissions CASCADE;
DROP TABLE IF EXISTS launched_campaigns CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS influencer_platforms CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS influencers CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 002: Add updated_at trigger function
  // ═══════════════════════════════════════════════════════════════════════════
  {
    version: 2,
    name: "add_updated_at_trigger",
    up: `
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER influencers_updated_at
  BEFORE UPDATE ON influencers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER influencer_platforms_updated_at
  BEFORE UPDATE ON influencer_platforms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER launched_campaigns_updated_at
  BEFORE UPDATE ON launched_campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER perk_wallets_updated_at
  BEFORE UPDATE ON perk_wallets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER platform_connections_updated_at
  BEFORE UPDATE ON platform_connections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`,
    down: `
DROP TRIGGER IF EXISTS platform_connections_updated_at ON platform_connections;
DROP TRIGGER IF EXISTS webhooks_updated_at ON webhooks;
DROP TRIGGER IF EXISTS api_keys_updated_at ON api_keys;
DROP TRIGGER IF EXISTS perk_wallets_updated_at ON perk_wallets;
DROP TRIGGER IF EXISTS launched_campaigns_updated_at ON launched_campaigns;
DROP TRIGGER IF EXISTS influencer_platforms_updated_at ON influencer_platforms;
DROP TRIGGER IF EXISTS influencers_updated_at ON influencers;
DROP TRIGGER IF EXISTS users_updated_at ON users;
DROP TRIGGER IF EXISTS businesses_updated_at ON businesses;
DROP FUNCTION IF EXISTS set_updated_at();
`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 003: Add GIN indexes for JSONB and array columns
  // ═══════════════════════════════════════════════════════════════════════════
  {
    version: 3,
    name: "add_gin_indexes",
    up: `
CREATE INDEX businesses_social_links_gin ON businesses USING gin (social_links);
CREATE INDEX influencers_niches_gin ON influencers USING gin (niches);
CREATE INDEX influencers_rate_card_gin ON influencers USING gin (rate_card);
CREATE INDEX launched_campaigns_actions_gin ON launched_campaigns USING gin (actions);
CREATE INDEX launched_campaigns_tags_gin ON launched_campaigns USING gin (tags);
CREATE INDEX analytics_events_data_gin ON analytics_events USING gin (data);
CREATE INDEX api_keys_permissions_gin ON api_keys USING gin (permissions);
CREATE INDEX webhooks_events_gin ON webhooks USING gin (events);
CREATE INDEX platform_connections_scopes_gin ON platform_connections USING gin (scopes);
CREATE INDEX platform_connections_metadata_gin ON platform_connections USING gin (metadata);
`,
    down: `
DROP INDEX IF EXISTS platform_connections_metadata_gin;
DROP INDEX IF EXISTS platform_connections_scopes_gin;
DROP INDEX IF EXISTS webhooks_events_gin;
DROP INDEX IF EXISTS api_keys_permissions_gin;
DROP INDEX IF EXISTS analytics_events_data_gin;
DROP INDEX IF EXISTS launched_campaigns_tags_gin;
DROP INDEX IF EXISTS launched_campaigns_actions_gin;
DROP INDEX IF EXISTS influencers_rate_card_gin;
DROP INDEX IF EXISTS influencers_niches_gin;
DROP INDEX IF EXISTS businesses_social_links_gin;
`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 004: Add sessions table for persistent auth sessions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    version: 4,
    name: "add_sessions_table",
    up: `
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('business', 'influencer', 'enterprise')),
  business_id TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_sessions_email ON sessions(email);
`,
    down: `
DROP TABLE IF EXISTS sessions;
`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 005: Agent-substrate persistence — magic-link tokens, dev-init email
  // map, and SMS opt-out registry. These were originally in-memory Maps;
  // any redeploy nuked them. Each table is small + write-mostly, so we
  // don't bother with caching tables — every read is a single indexed
  // lookup.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    version: 5,
    name: "add_agent_substrate_tables",
    up: `
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  token         TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  business_name TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  used          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_magic_link_tokens_email   ON magic_link_tokens(email);
CREATE INDEX idx_magic_link_tokens_expires ON magic_link_tokens(expires_at);

-- Email → business_id mapping for the agent-runnable signup flow at
-- POST /api/v1/dev/init. Idempotent: re-init with the same email
-- returns the same business_id (with a freshly-rotated API key).
CREATE TABLE IF NOT EXISTS dev_init_emails (
  email        TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  business_name TEXT,
  source        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_init_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_dev_init_emails_business_id ON dev_init_emails(business_id);

-- Phone numbers that have replied STOP to a Social Perks SMS. We
-- consult this BEFORE every send. Single-use of phone column as PK
-- keeps the interface trivial.
CREATE TABLE IF NOT EXISTS sms_opt_outs (
  phone       TEXT PRIMARY KEY,
  reason      TEXT,
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`,
    down: `
DROP TABLE IF EXISTS sms_opt_outs;
DROP TABLE IF EXISTS dev_init_emails;
DROP TABLE IF EXISTS magic_link_tokens;
`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 006: Persistent SMS queue. Replaces the in-memory ring buffer +
  // setTimeout used by the post-purchase pipeline. The partial index on
  // status='pending' keeps the cron drain query cheap as the table
  // accumulates historical rows over time.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    version: 6,
    name: "add_sms_queue_table",
    up: `
CREATE TABLE IF NOT EXISTS sms_queue (
  id              TEXT PRIMARY KEY,
  business_id     TEXT NOT NULL,
  business_name   TEXT NOT NULL,
  campaign_id     TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  purchase_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  body            TEXT NOT NULL,
  enqueued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for   TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sent','failed','skipped_opted_out')),
  attempts        INT NOT NULL DEFAULT 0,
  last_error      TEXT,
  sent_at         TIMESTAMPTZ
);
CREATE INDEX idx_sms_queue_pending ON sms_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_sms_queue_business ON sms_queue(business_id);
CREATE INDEX idx_sms_queue_customer ON sms_queue(customer_phone);
`,
    down: `
DROP INDEX IF EXISTS idx_sms_queue_customer;
DROP INDEX IF EXISTS idx_sms_queue_business;
DROP INDEX IF EXISTS idx_sms_queue_pending;
DROP TABLE IF EXISTS sms_queue;
`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 007: Webhook deliveries — track each attempt at each subscription so
  // we have a real retry queue + dead-letter visibility, separate from
  // the `webhooks` subscription table itself. The webhooks table tracks
  // current state of a subscription; this table tracks the audit trail
  // of every delivery attempt so we can:
  //   - retry failures with exponential backoff (cron drains pending)
  //   - show shop owners "your webhook to https://x failed 3 times"
  //   - hard-disable subscriptions after N consecutive failures
  // ═══════════════════════════════════════════════════════════════════════════
  {
    version: 7,
    name: "add_webhook_deliveries_table",
    up: `
-- Column names match the existing WebhookDelivery interface in
-- src/lib/webhooks/index.ts so Postgres rows can be hydrated into
-- the same in-memory shape without a translation layer. Status
-- enum mirrors the existing one: pending → delivered/failed/dead.
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id           TEXT PRIMARY KEY,
  webhook_id   TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  payload      JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','delivered','failed','dead')),
  status_code  INT,
  attempts     INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 6,
  next_retry   TIMESTAMPTZ,
  response     TEXT,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);
CREATE INDEX idx_webhook_deliveries_pending
  ON webhook_deliveries(next_retry)
  WHERE status = 'pending';
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_event   ON webhook_deliveries(event_type);
`,
    down: `
DROP INDEX IF EXISTS idx_webhook_deliveries_event;
DROP INDEX IF EXISTS idx_webhook_deliveries_webhook;
DROP INDEX IF EXISTS idx_webhook_deliveries_pending;
DROP TABLE IF EXISTS webhook_deliveries;
`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 008: Multi-tenant agent OAuth — Stripe-Connect-style flow.
  //
  // An agency-style AI agent (one developer building "marketing agent
  // for coffee shops" who has 50+ shop customers) shouldn't have to
  // store 50 distinct API keys. Instead they register one OAuth-style
  // app once, the shop owner clicks "Authorize {Agent} to manage my
  // perks" through our dashboard, and the agency gets a per-business
  // access token + refresh token.
  //
  // Three tables:
  //   agent_apps        — the registered agent (one per developer)
  //   agent_authorizations — per-business consent grants
  //   agent_access_tokens  — issued tokens (revocable)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    version: 8,
    name: "add_agent_oauth_tables",
    up: `
CREATE TABLE IF NOT EXISTS agent_apps (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL UNIQUE,
  client_secret_hash TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  homepage_url    TEXT,
  redirect_uris   TEXT[] NOT NULL,
  default_scopes  TEXT[] NOT NULL DEFAULT ARRAY['read'],
  owner_email     TEXT NOT NULL,
  owner_business_id TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','revoked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_agent_apps_client_id ON agent_apps(client_id);
CREATE INDEX idx_agent_apps_owner ON agent_apps(owner_email);

CREATE TABLE IF NOT EXISTS agent_authorizations (
  id              TEXT PRIMARY KEY,
  app_id          TEXT NOT NULL,
  business_id     TEXT NOT NULL,
  scopes          TEXT[] NOT NULL,
  authorized_by_user_id TEXT NOT NULL,
  authorized_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ,
  revoked_reason  TEXT,
  UNIQUE (app_id, business_id)
);
CREATE INDEX idx_agent_authorizations_app ON agent_authorizations(app_id);
CREATE INDEX idx_agent_authorizations_business ON agent_authorizations(business_id);
CREATE INDEX idx_agent_authorizations_active ON agent_authorizations(business_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS agent_access_tokens (
  id              TEXT PRIMARY KEY,
  authorization_id TEXT NOT NULL,
  access_token_hash TEXT NOT NULL UNIQUE,
  refresh_token_hash TEXT UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ,
  scopes          TEXT[] NOT NULL,
  last_used_at    TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_agent_access_tokens_authz ON agent_access_tokens(authorization_id);
CREATE INDEX idx_agent_access_tokens_expires ON agent_access_tokens(expires_at) WHERE revoked_at IS NULL;
`,
    down: `
DROP INDEX IF EXISTS idx_agent_access_tokens_expires;
DROP INDEX IF EXISTS idx_agent_access_tokens_authz;
DROP TABLE IF EXISTS agent_access_tokens;
DROP INDEX IF EXISTS idx_agent_authorizations_active;
DROP INDEX IF EXISTS idx_agent_authorizations_business;
DROP INDEX IF EXISTS idx_agent_authorizations_app;
DROP TABLE IF EXISTS agent_authorizations;
DROP INDEX IF EXISTS idx_agent_apps_owner;
DROP INDEX IF EXISTS idx_agent_apps_client_id;
DROP TABLE IF EXISTS agent_apps;
`,
  },
];

// ─── Migration Runner ───────────────────────────────────────────────────────

/**
 * In-memory record of applied migrations (used when running against
 * InMemoryConnection, which cannot execute SQL).
 */
const inMemoryApplied: AppliedMigration[] = [];

/**
 * Ensure the _migrations tracking table exists.
 */
async function ensureMigrationsTable(conn: DatabaseConnection): Promise<void> {
  if (conn instanceof InMemoryConnection) {
    // Nothing to do; we track in-memory.
    return;
  }
  await conn.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version     INT          PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      applied_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
    );
  `);
}

/**
 * Get the list of already-applied migration versions.
 */
async function getAppliedVersions(
  conn: DatabaseConnection,
): Promise<Set<number>> {
  if (conn instanceof InMemoryConnection) {
    return new Set(inMemoryApplied.map((m) => m.version));
  }
  const result = await conn.query<{ version: number }>(
    "SELECT version FROM _migrations ORDER BY version",
  );
  return new Set(result.rows.map((r) => r.version));
}

/**
 * Record a migration as applied.
 */
async function recordMigration(
  conn: DatabaseConnection,
  migration: Migration,
): Promise<void> {
  const now = new Date().toISOString();
  if (conn instanceof InMemoryConnection) {
    inMemoryApplied.push({
      version: migration.version,
      name: migration.name,
      applied_at: now,
    });
    return;
  }
  await conn.query(
    "INSERT INTO _migrations (version, name, applied_at) VALUES ($1, $2, $3)",
    [migration.version, migration.name, now],
  );
}

/**
 * Remove a migration record (on rollback).
 */
async function unrecordMigration(
  conn: DatabaseConnection,
  version: number,
): Promise<void> {
  if (conn instanceof InMemoryConnection) {
    const idx = inMemoryApplied.findIndex((m) => m.version === version);
    if (idx >= 0) inMemoryApplied.splice(idx, 1);
    return;
  }
  await conn.query("DELETE FROM _migrations WHERE version = $1", [version]);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Run all pending migrations in order.
 * Returns the list of migrations that were applied.
 */
export async function runPendingMigrations(
  conn: DatabaseConnection,
): Promise<AppliedMigration[]> {
  await ensureMigrationsTable(conn);
  const applied = await getAppliedVersions(conn);
  const pending = MIGRATIONS.filter((m) => !applied.has(m.version)).sort(
    (a, b) => a.version - b.version,
  );

  const results: AppliedMigration[] = [];

  for (const migration of pending) {
    if (!(conn instanceof InMemoryConnection)) {
      // Execute within a transaction so a failed migration doesn't leave
      // the database in a half-applied state.
      const tx = await conn.transaction("serializable");
      try {
        await tx.query(migration.up);
        await tx.commit();
      } catch (err) {
        await tx.rollback();
        throw new Error(
          `Migration ${migration.version} (${migration.name}) failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    // For InMemoryConnection, the SQL is a no-op; the migration is just tracked.

    await recordMigration(conn, migration);
    results.push({
      version: migration.version,
      name: migration.name,
      applied_at: new Date().toISOString(),
    });
  }

  return results;
}

/**
 * Roll back the last `count` migrations (most recent first).
 * Returns the list of migrations that were rolled back.
 */
export async function rollback(
  conn: DatabaseConnection,
  count: number = 1,
): Promise<AppliedMigration[]> {
  await ensureMigrationsTable(conn);
  const applied = await getAppliedVersions(conn);
  const toRollback = MIGRATIONS.filter((m) => applied.has(m.version))
    .sort((a, b) => b.version - a.version)
    .slice(0, count);

  const results: AppliedMigration[] = [];

  for (const migration of toRollback) {
    if (!(conn instanceof InMemoryConnection)) {
      const tx = await conn.transaction("serializable");
      try {
        await tx.query(migration.down);
        await tx.commit();
      } catch (err) {
        await tx.rollback();
        throw new Error(
          `Rollback of migration ${migration.version} (${migration.name}) failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    await unrecordMigration(conn, migration.version);
    results.push({
      version: migration.version,
      name: migration.name,
      applied_at: "", // not meaningful for rollbacks
    });
  }

  return results;
}

/**
 * Get the current migration status.
 */
export async function getMigrationStatus(
  conn: DatabaseConnection,
): Promise<{
  applied: AppliedMigration[];
  pending: Migration[];
  current: number;
  latest: number;
}> {
  await ensureMigrationsTable(conn);
  const appliedVersions = await getAppliedVersions(conn);

  const applied: AppliedMigration[] = [];
  if (conn instanceof InMemoryConnection) {
    applied.push(...inMemoryApplied);
  } else {
    const result = await conn.query<AppliedMigration>(
      "SELECT version, name, applied_at FROM _migrations ORDER BY version",
    );
    applied.push(...result.rows);
  }

  const pending = MIGRATIONS.filter(
    (m) => !appliedVersions.has(m.version),
  ).sort((a, b) => a.version - b.version);

  const current = applied.length > 0 ? Math.max(...applied.map((a) => a.version)) : 0;
  const latest =
    MIGRATIONS.length > 0
      ? Math.max(...MIGRATIONS.map((m) => m.version))
      : 0;

  return { applied, pending, current, latest };
}
