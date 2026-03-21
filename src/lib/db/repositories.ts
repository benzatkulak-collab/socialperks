/**
 * Repository Layer for Social Perks
 * ──────────────────────────────────
 * Typed repositories for each main entity.
 * Supports both InMemoryConnection (dev/test) and Postgres (production).
 * When `db` is an InMemoryConnection the repositories use the in-memory
 * store directly; otherwise they issue parameterized SQL via `db.query()`.
 */

import type {
  BusinessPlan,
  BusinessSize,
  CampaignStatus,
  CampaignTier,
  DiscountType,
  InfluencerTier,
  ProofType,
  SubmissionStatus,
  UserRole,
} from "../types";
import { db, InMemoryConnection } from "./connection";

// ─── Base Types ─────────────────────────────────────────────────────────────

export interface PaginationOptions {
  page?: number;
  perPage?: number;
  orderBy?: string;
  order?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface Repository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>;
  findMany(
    filter: Record<string, unknown>,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<T>>;
  create(input: CreateInput): Promise<T>;
  update(id: string, input: UpdateInput): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

// ─── Store Access ───────────────────────────────────────────────────────────

/**
 * Try to get the in-memory store from the singleton connection.
 * Returns null when running against real Postgres.
 */
function tryGetStore() {
  if (db instanceof InMemoryConnection) {
    return db.store;
  }
  return null;
}

const useSQL = () => !(db instanceof InMemoryConnection);

// ─── Helpers ────────────────────────────────────────────────────────────────

function paginate<T>(
  result: { rows: Record<string, unknown>[]; total: number },
  page: number,
  perPage: number,
): PaginatedResult<T> {
  return {
    data: result.rows as T[],
    total: result.total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(result.total / perPage)),
  };
}

function generateId(): string {
  return crypto.randomUUID();
}

/** Convert a JS array to Postgres TEXT[] literal format: {val1,val2} */
function toPgArray(arr: unknown[]): string {
  return "{" + arr.map(v => {
    const s = String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${s}"`;
  }).join(",") + "}";
}

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════

export interface BusinessRow {
  id: string;
  name: string;
  type: string;
  email: string;
  pin: string | null;
  avatar: string;
  industry: string | null;
  size: BusinessSize;
  location: string | null;
  website: string | null;
  social_links: unknown[];
  plan: BusinessPlan;
  description: string | null;
  avg_rating: number | null;
  campaign_count: number;
  verified: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateBusinessInput {
  name: string;
  type: string;
  email: string;
  pin?: string;
  avatar?: string;
  industry?: string;
  size?: BusinessSize;
  location?: string;
  website?: string;
  social_links?: unknown[];
  plan?: BusinessPlan;
  description?: string;
}

export interface UpdateBusinessInput {
  name?: string;
  type?: string;
  email?: string;
  pin?: string;
  avatar?: string;
  industry?: string;
  size?: BusinessSize;
  location?: string;
  website?: string;
  social_links?: unknown[];
  plan?: BusinessPlan;
  description?: string;
  avg_rating?: number;
  campaign_count?: number;
  verified?: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

export interface BusinessFilter {
  type?: string;
  plan?: BusinessPlan;
  size?: BusinessSize;
  industry?: string;
  verified?: boolean;
  location?: string;
  search?: string;
}

export class BusinessRepository
  implements Repository<BusinessRow, CreateBusinessInput, UpdateBusinessInput>
{
  private readonly table = "businesses";

  async findById(id: string): Promise<BusinessRow | null> {
    const store = tryGetStore();
    if (store) {
      const row = store.selectById(this.table, id);
      if (!row || row.deleted_at) return null;
      return row as unknown as BusinessRow;
    }

    const result = await db.query<BusinessRow>(
      `SELECT * FROM businesses WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<BusinessRow | null> {
    const store = tryGetStore();
    if (store) {
      const result = store.selectMany(this.table, {
        email,
        deleted_at: { $isNull: true },
      });
      return (result.rows[0] as unknown as BusinessRow) ?? null;
    }

    const result = await db.query<BusinessRow>(
      `SELECT * FROM businesses WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findMany(
    filter: BusinessFilter = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<BusinessRow>> {
    const store = tryGetStore();
    if (store) {
      const where: Record<string, unknown> = {
        deleted_at: { $isNull: true },
      };

      if (filter.type) where.type = filter.type;
      if (filter.plan) where.plan = filter.plan;
      if (filter.size) where.size = filter.size;
      if (filter.industry) where.industry = filter.industry;
      if (filter.verified !== undefined) where.verified = filter.verified;
      if (filter.location) where.location = filter.location;
      if (filter.search) where.name = { $contains: filter.search };

      const page = options.page ?? 1;
      const perPage = options.perPage ?? 50;
      const result = store.selectMany(this.table, where, {
        page,
        perPage,
        orderBy: options.orderBy ?? "created_at",
        order: options.order ?? "desc",
      });

      return paginate<BusinessRow>(result, page, perPage);
    }

    // SQL path
    const conditions: string[] = ["deleted_at IS NULL"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filter.type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(filter.type);
    }
    if (filter.plan) {
      conditions.push(`plan = $${paramIndex++}`);
      params.push(filter.plan);
    }
    if (filter.size) {
      conditions.push(`size = $${paramIndex++}`);
      params.push(filter.size);
    }
    if (filter.industry) {
      conditions.push(`industry = $${paramIndex++}`);
      params.push(filter.industry);
    }
    if (filter.verified !== undefined) {
      conditions.push(`verified = $${paramIndex++}`);
      params.push(filter.verified);
    }
    if (filter.location) {
      conditions.push(`location = $${paramIndex++}`);
      params.push(filter.location);
    }
    if (filter.search) {
      conditions.push(`name ILIKE '%' || $${paramIndex++} || '%'`);
      params.push(filter.search);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy = options.orderBy ?? "created_at";
    const order = options.order === "asc" ? "ASC" : "DESC";
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 50;
    const limit = perPage;
    const offset = (page - 1) * limit;

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM businesses ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0");

    const dataResult = await db.query<BusinessRow>(
      `SELECT * FROM businesses ${whereClause} ORDER BY ${orderBy} ${order} LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return {
      data: dataResult.rows,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  async create(input: CreateBusinessInput): Promise<BusinessRow> {
    const store = tryGetStore();
    const now = new Date().toISOString();
    const id = generateId();

    if (store) {
      const row = store.insert(this.table, {
        id,
        name: input.name,
        type: input.type,
        email: input.email,
        pin: input.pin ?? null,
        avatar: input.avatar ?? "",
        industry: input.industry ?? null,
        size: input.size ?? "small",
        location: input.location ?? null,
        website: input.website ?? null,
        social_links: input.social_links ?? [],
        plan: input.plan ?? "free",
        description: input.description ?? null,
        avg_rating: null,
        campaign_count: 0,
        verified: false,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      return row as unknown as BusinessRow;
    }

    const result = await db.query<BusinessRow>(
      `INSERT INTO businesses (id, name, type, email, pin, avatar, industry, size, location, website, social_links, plan, description, avg_rating, campaign_count, verified, stripe_customer_id, stripe_subscription_id, created_at, updated_at, deleted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING *`,
      [
        id,
        input.name,
        input.type,
        input.email,
        input.pin ?? null,
        input.avatar ?? "",
        input.industry ?? null,
        input.size ?? "small",
        input.location ?? null,
        input.website ?? null,
        JSON.stringify(input.social_links ?? []),
        input.plan ?? "free",
        input.description ?? null,
        null,
        0,
        false,
        null,
        null,
        now,
        now,
        null,
      ],
    );
    return result.rows[0];
  }

  async update(
    id: string,
    input: UpdateBusinessInput,
  ): Promise<BusinessRow | null> {
    const store = tryGetStore();
    if (store) {
      const existing = store.selectById(this.table, id);
      if (!existing || existing.deleted_at) return null;
      const updated = store.update(this.table, id, { ...input });
      return updated as unknown as BusinessRow;
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(input.name);
    }
    if (input.type !== undefined) {
      sets.push(`type = $${idx++}`);
      params.push(input.type);
    }
    if (input.email !== undefined) {
      sets.push(`email = $${idx++}`);
      params.push(input.email);
    }
    if (input.pin !== undefined) {
      sets.push(`pin = $${idx++}`);
      params.push(input.pin);
    }
    if (input.avatar !== undefined) {
      sets.push(`avatar = $${idx++}`);
      params.push(input.avatar);
    }
    if (input.industry !== undefined) {
      sets.push(`industry = $${idx++}`);
      params.push(input.industry);
    }
    if (input.size !== undefined) {
      sets.push(`size = $${idx++}`);
      params.push(input.size);
    }
    if (input.location !== undefined) {
      sets.push(`location = $${idx++}`);
      params.push(input.location);
    }
    if (input.website !== undefined) {
      sets.push(`website = $${idx++}`);
      params.push(input.website);
    }
    if (input.social_links !== undefined) {
      sets.push(`social_links = $${idx++}`);
      params.push(JSON.stringify(input.social_links));
    }
    if (input.plan !== undefined) {
      sets.push(`plan = $${idx++}`);
      params.push(input.plan);
    }
    if (input.description !== undefined) {
      sets.push(`description = $${idx++}`);
      params.push(input.description);
    }
    if (input.avg_rating !== undefined) {
      sets.push(`avg_rating = $${idx++}`);
      params.push(input.avg_rating);
    }
    if (input.campaign_count !== undefined) {
      sets.push(`campaign_count = $${idx++}`);
      params.push(input.campaign_count);
    }
    if (input.verified !== undefined) {
      sets.push(`verified = $${idx++}`);
      params.push(input.verified);
    }
    if (input.stripe_customer_id !== undefined) {
      sets.push(`stripe_customer_id = $${idx++}`);
      params.push(input.stripe_customer_id);
    }
    if (input.stripe_subscription_id !== undefined) {
      sets.push(`stripe_subscription_id = $${idx++}`);
      params.push(input.stripe_subscription_id);
    }

    if (sets.length === 0) return this.findById(id);

    sets.push(`updated_at = $${idx++}`);
    params.push(new Date().toISOString());
    params.push(id);

    const result = await db.query<BusinessRow>(
      `UPDATE businesses SET ${sets.join(", ")} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      params,
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const store = tryGetStore();
    if (store) {
      return store.softDelete(this.table, id);
    }

    const result = await db.query(
      `UPDATE businesses SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL`,
      [new Date().toISOString(), id],
    );
    return result.rowCount > 0;
  }

  /** Hard-delete (for tests). */
  async hardDelete(id: string): Promise<boolean> {
    const store = tryGetStore();
    if (store) {
      return store.delete(this.table, id);
    }

    const result = await db.query(
      `DELETE FROM businesses WHERE id = $1`,
      [id],
    );
    return result.rowCount > 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INFLUENCER REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════

export interface InfluencerRow {
  id: string;
  user_id: string;
  display_name: string;
  bio: string;
  follower_count: number;
  engagement_rate: number;
  niches: string[];
  location: string;
  rate_card: Record<string, unknown>;
  portfolio: unknown[];
  verified: boolean;
  tier: InfluencerTier;
  avg_response_time_hours: number | null;
  completion_rate: number | null;
  campaigns_completed: number;
  stripe_connect_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateInfluencerInput {
  user_id: string;
  display_name: string;
  bio?: string;
  follower_count?: number;
  engagement_rate?: number;
  niches?: string[];
  location?: string;
  rate_card?: Record<string, unknown>;
  portfolio?: unknown[];
  tier?: InfluencerTier;
}

export interface UpdateInfluencerInput {
  display_name?: string;
  bio?: string;
  follower_count?: number;
  engagement_rate?: number;
  niches?: string[];
  location?: string;
  rate_card?: Record<string, unknown>;
  portfolio?: unknown[];
  verified?: boolean;
  tier?: InfluencerTier;
  avg_response_time_hours?: number;
  completion_rate?: number;
  campaigns_completed?: number;
  stripe_connect_id?: string;
}

export interface InfluencerFilter {
  tier?: InfluencerTier;
  verified?: boolean;
  location?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  maxEngagementRate?: number;
  search?: string;
}

export class InfluencerRepository
  implements
    Repository<InfluencerRow, CreateInfluencerInput, UpdateInfluencerInput>
{
  private readonly table = "influencers";

  async findById(id: string): Promise<InfluencerRow | null> {
    const store = tryGetStore();
    if (store) {
      const row = store.selectById(this.table, id);
      if (!row || row.deleted_at) return null;
      return row as unknown as InfluencerRow;
    }

    const result = await db.query<InfluencerRow>(
      `SELECT * FROM influencers WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByUserId(userId: string): Promise<InfluencerRow | null> {
    const store = tryGetStore();
    if (store) {
      const result = store.selectMany(this.table, {
        user_id: userId,
        deleted_at: { $isNull: true },
      });
      return (result.rows[0] as unknown as InfluencerRow) ?? null;
    }

    const result = await db.query<InfluencerRow>(
      `SELECT * FROM influencers WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async findMany(
    filter: InfluencerFilter = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<InfluencerRow>> {
    const store = tryGetStore();
    if (store) {
      const where: Record<string, unknown> = {
        deleted_at: { $isNull: true },
      };

      if (filter.tier) where.tier = filter.tier;
      if (filter.verified !== undefined) where.verified = filter.verified;
      if (filter.location) where.location = filter.location;
      if (filter.search) where.display_name = { $contains: filter.search };
      if (
        filter.minFollowers !== undefined ||
        filter.maxFollowers !== undefined
      ) {
        const fc: Record<string, unknown> = {};
        if (filter.minFollowers !== undefined) fc.$gte = filter.minFollowers;
        if (filter.maxFollowers !== undefined) fc.$lte = filter.maxFollowers;
        where.follower_count = fc;
      }
      if (
        filter.minEngagementRate !== undefined ||
        filter.maxEngagementRate !== undefined
      ) {
        const er: Record<string, unknown> = {};
        if (filter.minEngagementRate !== undefined)
          er.$gte = filter.minEngagementRate;
        if (filter.maxEngagementRate !== undefined)
          er.$lte = filter.maxEngagementRate;
        where.engagement_rate = er;
      }

      const page = options.page ?? 1;
      const perPage = options.perPage ?? 50;
      const result = store.selectMany(this.table, where, {
        page,
        perPage,
        orderBy: options.orderBy ?? "created_at",
        order: options.order ?? "desc",
      });

      return paginate<InfluencerRow>(result, page, perPage);
    }

    // SQL path
    const conditions: string[] = ["deleted_at IS NULL"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filter.tier) {
      conditions.push(`tier = $${paramIndex++}`);
      params.push(filter.tier);
    }
    if (filter.verified !== undefined) {
      conditions.push(`verified = $${paramIndex++}`);
      params.push(filter.verified);
    }
    if (filter.location) {
      conditions.push(`location = $${paramIndex++}`);
      params.push(filter.location);
    }
    if (filter.search) {
      conditions.push(`display_name ILIKE '%' || $${paramIndex++} || '%'`);
      params.push(filter.search);
    }
    if (filter.minFollowers !== undefined) {
      conditions.push(`follower_count >= $${paramIndex++}`);
      params.push(filter.minFollowers);
    }
    if (filter.maxFollowers !== undefined) {
      conditions.push(`follower_count <= $${paramIndex++}`);
      params.push(filter.maxFollowers);
    }
    if (filter.minEngagementRate !== undefined) {
      conditions.push(`engagement_rate >= $${paramIndex++}`);
      params.push(filter.minEngagementRate);
    }
    if (filter.maxEngagementRate !== undefined) {
      conditions.push(`engagement_rate <= $${paramIndex++}`);
      params.push(filter.maxEngagementRate);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy = options.orderBy ?? "created_at";
    const order = options.order === "asc" ? "ASC" : "DESC";
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 50;
    const limit = perPage;
    const offset = (page - 1) * limit;

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM influencers ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0");

    const dataResult = await db.query<InfluencerRow>(
      `SELECT * FROM influencers ${whereClause} ORDER BY ${orderBy} ${order} LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return {
      data: dataResult.rows,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  async create(input: CreateInfluencerInput): Promise<InfluencerRow> {
    const store = tryGetStore();
    const now = new Date().toISOString();
    const id = generateId();

    if (store) {
      const row = store.insert(this.table, {
        id,
        user_id: input.user_id,
        display_name: input.display_name,
        bio: input.bio ?? "",
        follower_count: input.follower_count ?? 0,
        engagement_rate: input.engagement_rate ?? 0,
        niches: input.niches ?? [],
        location: input.location ?? "",
        rate_card: input.rate_card ?? {},
        portfolio: input.portfolio ?? [],
        verified: false,
        tier: input.tier ?? "micro",
        avg_response_time_hours: null,
        completion_rate: null,
        campaigns_completed: 0,
        stripe_connect_id: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      return row as unknown as InfluencerRow;
    }

    const result = await db.query<InfluencerRow>(
      `INSERT INTO influencers (id, user_id, display_name, bio, follower_count, engagement_rate, niches, location, rate_card, portfolio, verified, tier, avg_response_time_hours, completion_rate, campaigns_completed, stripe_connect_id, created_at, updated_at, deleted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
      [
        id,
        input.user_id,
        input.display_name,
        input.bio ?? "",
        input.follower_count ?? 0,
        input.engagement_rate ?? 0,
        toPgArray(input.niches ?? []),
        input.location ?? "",
        JSON.stringify(input.rate_card ?? {}),
        JSON.stringify(input.portfolio ?? []),
        false,
        input.tier ?? "micro",
        null,
        null,
        0,
        null,
        now,
        now,
        null,
      ],
    );
    return result.rows[0];
  }

  async update(
    id: string,
    input: UpdateInfluencerInput,
  ): Promise<InfluencerRow | null> {
    const store = tryGetStore();
    if (store) {
      const existing = store.selectById(this.table, id);
      if (!existing || existing.deleted_at) return null;
      const updated = store.update(this.table, id, { ...input });
      return updated as unknown as InfluencerRow;
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.display_name !== undefined) {
      sets.push(`display_name = $${idx++}`);
      params.push(input.display_name);
    }
    if (input.bio !== undefined) {
      sets.push(`bio = $${idx++}`);
      params.push(input.bio);
    }
    if (input.follower_count !== undefined) {
      sets.push(`follower_count = $${idx++}`);
      params.push(input.follower_count);
    }
    if (input.engagement_rate !== undefined) {
      sets.push(`engagement_rate = $${idx++}`);
      params.push(input.engagement_rate);
    }
    if (input.niches !== undefined) {
      sets.push(`niches = $${idx++}`);
      params.push(toPgArray(input.niches));
    }
    if (input.location !== undefined) {
      sets.push(`location = $${idx++}`);
      params.push(input.location);
    }
    if (input.rate_card !== undefined) {
      sets.push(`rate_card = $${idx++}`);
      params.push(JSON.stringify(input.rate_card));
    }
    if (input.portfolio !== undefined) {
      sets.push(`portfolio = $${idx++}`);
      params.push(JSON.stringify(input.portfolio));
    }
    if (input.verified !== undefined) {
      sets.push(`verified = $${idx++}`);
      params.push(input.verified);
    }
    if (input.tier !== undefined) {
      sets.push(`tier = $${idx++}`);
      params.push(input.tier);
    }
    if (input.avg_response_time_hours !== undefined) {
      sets.push(`avg_response_time_hours = $${idx++}`);
      params.push(input.avg_response_time_hours);
    }
    if (input.completion_rate !== undefined) {
      sets.push(`completion_rate = $${idx++}`);
      params.push(input.completion_rate);
    }
    if (input.campaigns_completed !== undefined) {
      sets.push(`campaigns_completed = $${idx++}`);
      params.push(input.campaigns_completed);
    }
    if (input.stripe_connect_id !== undefined) {
      sets.push(`stripe_connect_id = $${idx++}`);
      params.push(input.stripe_connect_id);
    }

    if (sets.length === 0) return this.findById(id);

    sets.push(`updated_at = $${idx++}`);
    params.push(new Date().toISOString());
    params.push(id);

    const result = await db.query<InfluencerRow>(
      `UPDATE influencers SET ${sets.join(", ")} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      params,
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const store = tryGetStore();
    if (store) {
      return store.softDelete(this.table, id);
    }

    const result = await db.query(
      `UPDATE influencers SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL`,
      [new Date().toISOString(), id],
    );
    return result.rowCount > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const store = tryGetStore();
    if (store) {
      return store.delete(this.table, id);
    }

    const result = await db.query(
      `DELETE FROM influencers WHERE id = $1`,
      [id],
    );
    return result.rowCount > 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMPAIGN REPOSITORY (Launched Campaigns)
// ═══════════════════════════════════════════════════════════════════════════

export interface CampaignRow {
  id: string;
  business_id: string;
  name: string;
  description: string;
  actions: string[];
  discount_value: number;
  discount_type: DiscountType;
  guidelines: string | null;
  max_completions: number | null;
  expires_in_days: number;
  use_tiers: boolean;
  status: CampaignStatus;
  from_suggestion: string | null;
  completion_count: number;
  budget_cap: number | null;
  budget_used: number;
  ftc_disclosures: string[];
  tags: string[];
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignInput {
  business_id: string;
  name: string;
  description: string;
  actions: string[];
  discount_value: number;
  discount_type: DiscountType;
  guidelines?: string;
  max_completions?: number | null;
  expires_in_days: number;
  use_tiers?: boolean;
  from_suggestion?: string;
  budget_cap?: number | null;
  ftc_disclosures?: string[];
  tags?: string[];
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  actions?: string[];
  discount_value?: number;
  discount_type?: DiscountType;
  guidelines?: string;
  max_completions?: number | null;
  expires_in_days?: number;
  use_tiers?: boolean;
  status?: CampaignStatus;
  completion_count?: number;
  budget_cap?: number | null;
  budget_used?: number;
  ftc_disclosures?: string[];
  tags?: string[];
}

export interface CampaignFilter {
  business_id?: string;
  status?: CampaignStatus;
  tier?: CampaignTier;
  search?: string;
  from_suggestion?: string;
}

export class CampaignRepository
  implements Repository<CampaignRow, CreateCampaignInput, UpdateCampaignInput>
{
  private readonly table = "launched_campaigns";

  async findById(id: string): Promise<CampaignRow | null> {
    const store = tryGetStore();
    if (store) {
      const row = store.selectById(this.table, id);
      if (!row) return null;
      return row as unknown as CampaignRow;
    }

    const result = await db.query<CampaignRow>(
      `SELECT * FROM launched_campaigns WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findMany(
    filter: CampaignFilter = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<CampaignRow>> {
    const store = tryGetStore();
    if (store) {
      const where: Record<string, unknown> = {};

      if (filter.business_id) where.business_id = filter.business_id;
      if (filter.status) where.status = filter.status;
      if (filter.from_suggestion)
        where.from_suggestion = filter.from_suggestion;
      if (filter.search) where.name = { $contains: filter.search };

      const page = options.page ?? 1;
      const perPage = options.perPage ?? 50;
      const result = store.selectMany(this.table, where, {
        page,
        perPage,
        orderBy: options.orderBy ?? "created_at",
        order: options.order ?? "desc",
      });

      return paginate<CampaignRow>(result, page, perPage);
    }

    // SQL path
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filter.business_id) {
      conditions.push(`business_id = $${paramIndex++}`);
      params.push(filter.business_id);
    }
    if (filter.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filter.status);
    }
    if (filter.from_suggestion) {
      conditions.push(`from_suggestion = $${paramIndex++}`);
      params.push(filter.from_suggestion);
    }
    if (filter.search) {
      conditions.push(`name ILIKE '%' || $${paramIndex++} || '%'`);
      params.push(filter.search);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy = options.orderBy ?? "created_at";
    const order = options.order === "asc" ? "ASC" : "DESC";
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 50;
    const limit = perPage;
    const offset = (page - 1) * limit;

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM launched_campaigns ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0");

    const dataResult = await db.query<CampaignRow>(
      `SELECT * FROM launched_campaigns ${whereClause} ORDER BY ${orderBy} ${order} LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return {
      data: dataResult.rows,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  async findByBusinessId(
    businessId: string,
    status?: CampaignStatus,
  ): Promise<CampaignRow[]> {
    const result = await this.findMany(
      { business_id: businessId, status },
      { perPage: 1000 },
    );
    return result.data;
  }

  async create(input: CreateCampaignInput): Promise<CampaignRow> {
    const store = tryGetStore();
    const now = new Date().toISOString();
    const id = generateId();
    const expiresAt = new Date(
      Date.now() + input.expires_in_days * 24 * 60 * 60 * 1000,
    ).toISOString();

    if (store) {
      const row = store.insert(this.table, {
        id,
        business_id: input.business_id,
        name: input.name,
        description: input.description,
        actions: input.actions,
        discount_value: input.discount_value,
        discount_type: input.discount_type,
        guidelines: input.guidelines ?? null,
        max_completions: input.max_completions ?? null,
        expires_in_days: input.expires_in_days,
        use_tiers: input.use_tiers ?? false,
        status: "active" as CampaignStatus,
        from_suggestion: input.from_suggestion ?? null,
        completion_count: 0,
        budget_cap: input.budget_cap ?? null,
        budget_used: 0,
        ftc_disclosures: input.ftc_disclosures ?? [],
        tags: input.tags ?? [],
        expires_at: expiresAt,
        created_at: now,
        updated_at: now,
      });
      return row as unknown as CampaignRow;
    }

    const result = await db.query<CampaignRow>(
      `INSERT INTO launched_campaigns (id, business_id, name, description, actions, discount_value, discount_type, guidelines, max_completions, expires_in_days, use_tiers, status, from_suggestion, completion_count, budget_cap, budget_used, ftc_disclosures, tags, expires_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING *`,
      [
        id,
        input.business_id,
        input.name,
        input.description,
        toPgArray(input.actions),
        input.discount_value,
        input.discount_type,
        input.guidelines ?? null,
        input.max_completions ?? null,
        input.expires_in_days,
        input.use_tiers ?? false,
        "active",
        input.from_suggestion ?? null,
        0,
        input.budget_cap ?? null,
        0,
        toPgArray(input.ftc_disclosures ?? []),
        toPgArray(input.tags ?? []),
        expiresAt,
        now,
        now,
      ],
    );
    return result.rows[0];
  }

  async update(
    id: string,
    input: UpdateCampaignInput,
  ): Promise<CampaignRow | null> {
    const store = tryGetStore();
    if (store) {
      const existing = store.selectById(this.table, id);
      if (!existing) return null;
      const updated = store.update(this.table, id, { ...input });
      return updated as unknown as CampaignRow;
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(input.name);
    }
    if (input.description !== undefined) {
      sets.push(`description = $${idx++}`);
      params.push(input.description);
    }
    if (input.actions !== undefined) {
      sets.push(`actions = $${idx++}`);
      params.push(toPgArray(input.actions));
    }
    if (input.discount_value !== undefined) {
      sets.push(`discount_value = $${idx++}`);
      params.push(input.discount_value);
    }
    if (input.discount_type !== undefined) {
      sets.push(`discount_type = $${idx++}`);
      params.push(input.discount_type);
    }
    if (input.guidelines !== undefined) {
      sets.push(`guidelines = $${idx++}`);
      params.push(input.guidelines);
    }
    if (input.max_completions !== undefined) {
      sets.push(`max_completions = $${idx++}`);
      params.push(input.max_completions);
    }
    if (input.expires_in_days !== undefined) {
      sets.push(`expires_in_days = $${idx++}`);
      params.push(input.expires_in_days);
    }
    if (input.use_tiers !== undefined) {
      sets.push(`use_tiers = $${idx++}`);
      params.push(input.use_tiers);
    }
    if (input.status !== undefined) {
      sets.push(`status = $${idx++}`);
      params.push(input.status);
    }
    if (input.completion_count !== undefined) {
      sets.push(`completion_count = $${idx++}`);
      params.push(input.completion_count);
    }
    if (input.budget_cap !== undefined) {
      sets.push(`budget_cap = $${idx++}`);
      params.push(input.budget_cap);
    }
    if (input.budget_used !== undefined) {
      sets.push(`budget_used = $${idx++}`);
      params.push(input.budget_used);
    }
    if (input.ftc_disclosures !== undefined) {
      sets.push(`ftc_disclosures = $${idx++}`);
      params.push(toPgArray(input.ftc_disclosures));
    }
    if (input.tags !== undefined) {
      sets.push(`tags = $${idx++}`);
      params.push(toPgArray(input.tags));
    }

    if (sets.length === 0) return this.findById(id);

    sets.push(`updated_at = $${idx++}`);
    params.push(new Date().toISOString());
    params.push(id);

    const result = await db.query<CampaignRow>(
      `UPDATE launched_campaigns SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      params,
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const store = tryGetStore();
    if (store) {
      // Campaigns use status-based lifecycle, not soft-delete.
      // Setting status to "ended" is the logical delete.
      const row = store.selectById(this.table, id);
      if (!row) return false;
      store.update(this.table, id, { status: "ended" });
      return true;
    }

    const result = await db.query(
      `UPDATE launched_campaigns SET status = 'ended', updated_at = $1 WHERE id = $2`,
      [new Date().toISOString(), id],
    );
    return result.rowCount > 0;
  }

  /** Hard-delete (for tests). */
  async hardDelete(id: string): Promise<boolean> {
    const store = tryGetStore();
    if (store) {
      return store.delete(this.table, id);
    }

    const result = await db.query(
      `DELETE FROM launched_campaigns WHERE id = $1`,
      [id],
    );
    return result.rowCount > 0;
  }

  /** Increment the completion count atomically. */
  async incrementCompletions(
    id: string,
    budgetUsedDelta: number = 0,
  ): Promise<CampaignRow | null> {
    const store = tryGetStore();
    if (store) {
      const existing = store.selectById(this.table, id);
      if (!existing) return null;
      const updated = store.update(this.table, id, {
        completion_count: ((existing.completion_count as number) ?? 0) + 1,
        budget_used:
          ((existing.budget_used as number) ?? 0) + budgetUsedDelta,
      });
      return updated as unknown as CampaignRow;
    }

    const result = await db.query<CampaignRow>(
      `UPDATE launched_campaigns SET completion_count = completion_count + 1, budget_used = budget_used + $1 WHERE id = $2 RETURNING *`,
      [budgetUsedDelta, id],
    );
    return result.rows[0] ?? null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBMISSION REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════

export interface SubmissionRow {
  id: string;
  campaign_id: string;
  user_id: string;
  action_id: string;
  proof_url: string;
  proof_type: ProofType;
  status: SubmissionStatus;
  platform_id: string | null;
  metrics: Record<string, unknown> | null;
  auto_verified: boolean;
  review_note: string | null;
  reviewed_by: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  expires_at: string | null;
}

export interface CreateSubmissionInput {
  campaign_id: string;
  user_id: string;
  action_id: string;
  proof_url: string;
  proof_type: ProofType;
  platform_id?: string;
  metrics?: Record<string, unknown>;
  auto_verified?: boolean;
}

export interface UpdateSubmissionInput {
  status?: SubmissionStatus;
  review_note?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  metrics?: Record<string, unknown>;
  auto_verified?: boolean;
}

export interface SubmissionFilter {
  campaign_id?: string;
  user_id?: string;
  status?: SubmissionStatus;
  platform_id?: string;
  action_id?: string;
  auto_verified?: boolean;
}

export class SubmissionRepository
  implements
    Repository<SubmissionRow, CreateSubmissionInput, UpdateSubmissionInput>
{
  private readonly table = "campaign_submissions";

  async findById(id: string): Promise<SubmissionRow | null> {
    const store = tryGetStore();
    if (store) {
      const row = store.selectById(this.table, id);
      if (!row) return null;
      return row as unknown as SubmissionRow;
    }

    const result = await db.query<SubmissionRow>(
      `SELECT * FROM campaign_submissions WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findMany(
    filter: SubmissionFilter = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<SubmissionRow>> {
    const store = tryGetStore();
    if (store) {
      const where: Record<string, unknown> = {};

      if (filter.campaign_id) where.campaign_id = filter.campaign_id;
      if (filter.user_id) where.user_id = filter.user_id;
      if (filter.status) where.status = filter.status;
      if (filter.platform_id) where.platform_id = filter.platform_id;
      if (filter.action_id) where.action_id = filter.action_id;
      if (filter.auto_verified !== undefined)
        where.auto_verified = filter.auto_verified;

      const page = options.page ?? 1;
      const perPage = options.perPage ?? 50;
      const result = store.selectMany(this.table, where, {
        page,
        perPage,
        orderBy: options.orderBy ?? "submitted_at",
        order: options.order ?? "desc",
      });

      return paginate<SubmissionRow>(result, page, perPage);
    }

    // SQL path
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filter.campaign_id) {
      conditions.push(`campaign_id = $${paramIndex++}`);
      params.push(filter.campaign_id);
    }
    if (filter.user_id) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(filter.user_id);
    }
    if (filter.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filter.status);
    }
    if (filter.platform_id) {
      conditions.push(`platform_id = $${paramIndex++}`);
      params.push(filter.platform_id);
    }
    if (filter.action_id) {
      conditions.push(`action_id = $${paramIndex++}`);
      params.push(filter.action_id);
    }
    if (filter.auto_verified !== undefined) {
      conditions.push(`auto_verified = $${paramIndex++}`);
      params.push(filter.auto_verified);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy = options.orderBy ?? "submitted_at";
    const order = options.order === "asc" ? "ASC" : "DESC";
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 50;
    const limit = perPage;
    const offset = (page - 1) * limit;

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM campaign_submissions ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0");

    const dataResult = await db.query<SubmissionRow>(
      `SELECT * FROM campaign_submissions ${whereClause} ORDER BY ${orderBy} ${order} LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return {
      data: dataResult.rows,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  async findByCampaignId(
    campaignId: string,
    status?: SubmissionStatus,
  ): Promise<SubmissionRow[]> {
    const result = await this.findMany(
      { campaign_id: campaignId, status },
      { perPage: 1000 },
    );
    return result.data;
  }

  async create(input: CreateSubmissionInput): Promise<SubmissionRow> {
    const store = tryGetStore();
    const now = new Date().toISOString();
    const id = generateId();

    if (store) {
      const row = store.insert(this.table, {
        id,
        campaign_id: input.campaign_id,
        user_id: input.user_id,
        action_id: input.action_id,
        proof_url: input.proof_url,
        proof_type: input.proof_type,
        status: "pending" as SubmissionStatus,
        platform_id: input.platform_id ?? null,
        metrics: input.metrics ?? null,
        auto_verified: input.auto_verified ?? false,
        review_note: null,
        reviewed_by: null,
        submitted_at: now,
        reviewed_at: null,
        expires_at: null,
      });
      return row as unknown as SubmissionRow;
    }

    const result = await db.query<SubmissionRow>(
      `INSERT INTO campaign_submissions (id, campaign_id, user_id, action_id, proof_url, proof_type, status, platform_id, metrics, auto_verified, review_note, reviewed_by, submitted_at, reviewed_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        id,
        input.campaign_id,
        input.user_id,
        input.action_id,
        input.proof_url,
        input.proof_type,
        "pending",
        input.platform_id ?? null,
        JSON.stringify(input.metrics ?? null),
        input.auto_verified ?? false,
        null,
        null,
        now,
        null,
        null,
      ],
    );
    return result.rows[0];
  }

  async update(
    id: string,
    input: UpdateSubmissionInput,
  ): Promise<SubmissionRow | null> {
    const store = tryGetStore();
    if (store) {
      const existing = store.selectById(this.table, id);
      if (!existing) return null;
      const updated = store.update(this.table, id, { ...input });
      return updated as unknown as SubmissionRow;
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.status !== undefined) {
      sets.push(`status = $${idx++}`);
      params.push(input.status);
    }
    if (input.review_note !== undefined) {
      sets.push(`review_note = $${idx++}`);
      params.push(input.review_note);
    }
    if (input.reviewed_by !== undefined) {
      sets.push(`reviewed_by = $${idx++}`);
      params.push(input.reviewed_by);
    }
    if (input.reviewed_at !== undefined) {
      sets.push(`reviewed_at = $${idx++}`);
      params.push(input.reviewed_at);
    }
    if (input.metrics !== undefined) {
      sets.push(`metrics = $${idx++}`);
      params.push(JSON.stringify(input.metrics));
    }
    if (input.auto_verified !== undefined) {
      sets.push(`auto_verified = $${idx++}`);
      params.push(input.auto_verified);
    }

    if (sets.length === 0) return this.findById(id);

    params.push(id);

    const result = await db.query<SubmissionRow>(
      `UPDATE campaign_submissions SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      params,
    );
    return result.rows[0] ?? null;
  }

  /** Approve a submission with an optional reviewer note. */
  async approve(
    id: string,
    reviewedBy: string,
    note?: string,
  ): Promise<SubmissionRow | null> {
    return this.update(id, {
      status: "approved",
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_note: note,
    });
  }

  /** Reject a submission with a reason. */
  async reject(
    id: string,
    reviewedBy: string,
    note: string,
  ): Promise<SubmissionRow | null> {
    return this.update(id, {
      status: "rejected",
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_note: note,
    });
  }

  async delete(id: string): Promise<boolean> {
    const store = tryGetStore();
    if (store) {
      return store.delete(this.table, id);
    }

    const result = await db.query(
      `DELETE FROM campaign_submissions WHERE id = $1`,
      [id],
    );
    return result.rowCount > 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USER REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  role: UserRole;
  business_id: string | null;
  influencer_id: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  email_verified_at: string | null;
  last_login_at: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password_hash?: string;
  role?: UserRole;
  business_id?: string;
  influencer_id?: string;
  avatar_url?: string;
  preferences?: Record<string, unknown>;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  password_hash?: string;
  role?: UserRole;
  business_id?: string | null;
  influencer_id?: string | null;
  avatar_url?: string;
  email_verified?: boolean;
  email_verified_at?: string;
  last_login_at?: string;
  preferences?: Record<string, unknown>;
}

export interface UserFilter {
  role?: UserRole;
  business_id?: string;
  email_verified?: boolean;
  search?: string;
}

export class UserRepository
  implements Repository<UserRow, CreateUserInput, UpdateUserInput>
{
  private readonly table = "users";

  async findById(id: string): Promise<UserRow | null> {
    const store = tryGetStore();
    if (store) {
      const row = store.selectById(this.table, id);
      if (!row || row.deleted_at) return null;
      return row as unknown as UserRow;
    }

    const result = await db.query<UserRow>(
      `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const store = tryGetStore();
    if (store) {
      const result = store.selectMany(this.table, {
        email,
        deleted_at: { $isNull: true },
      });
      return (result.rows[0] as unknown as UserRow) ?? null;
    }

    const result = await db.query<UserRow>(
      `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findMany(
    filter: UserFilter = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<UserRow>> {
    const store = tryGetStore();
    if (store) {
      const where: Record<string, unknown> = {
        deleted_at: { $isNull: true },
      };

      if (filter.role) where.role = filter.role;
      if (filter.business_id) where.business_id = filter.business_id;
      if (filter.email_verified !== undefined)
        where.email_verified = filter.email_verified;
      if (filter.search) where.name = { $contains: filter.search };

      const page = options.page ?? 1;
      const perPage = options.perPage ?? 50;
      const result = store.selectMany(this.table, where, {
        page,
        perPage,
        orderBy: options.orderBy ?? "created_at",
        order: options.order ?? "desc",
      });

      return paginate<UserRow>(result, page, perPage);
    }

    // SQL path
    const conditions: string[] = ["deleted_at IS NULL"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filter.role) {
      conditions.push(`role = $${paramIndex++}`);
      params.push(filter.role);
    }
    if (filter.business_id) {
      conditions.push(`business_id = $${paramIndex++}`);
      params.push(filter.business_id);
    }
    if (filter.email_verified !== undefined) {
      conditions.push(`email_verified = $${paramIndex++}`);
      params.push(filter.email_verified);
    }
    if (filter.search) {
      conditions.push(`name ILIKE '%' || $${paramIndex++} || '%'`);
      params.push(filter.search);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy = options.orderBy ?? "created_at";
    const order = options.order === "asc" ? "ASC" : "DESC";
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 50;
    const limit = perPage;
    const offset = (page - 1) * limit;

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0");

    const dataResult = await db.query<UserRow>(
      `SELECT * FROM users ${whereClause} ORDER BY ${orderBy} ${order} LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return {
      data: dataResult.rows,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  async findByBusinessId(businessId: string): Promise<UserRow[]> {
    const result = await this.findMany(
      { business_id: businessId },
      { perPage: 1000 },
    );
    return result.data;
  }

  async create(input: CreateUserInput): Promise<UserRow> {
    const store = tryGetStore();
    const now = new Date().toISOString();
    const id = generateId();

    if (store) {
      const row = store.insert(this.table, {
        id,
        email: input.email,
        name: input.name,
        password_hash: input.password_hash ?? null,
        role: input.role ?? "business_owner",
        business_id: input.business_id ?? null,
        influencer_id: input.influencer_id ?? null,
        avatar_url: input.avatar_url ?? null,
        email_verified: false,
        email_verified_at: null,
        last_login_at: null,
        preferences: input.preferences ?? {},
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
      return row as unknown as UserRow;
    }

    const result = await db.query<UserRow>(
      `INSERT INTO users (id, email, name, password_hash, role, business_id, influencer_id, avatar_url, email_verified, email_verified_at, last_login_at, preferences, created_at, updated_at, deleted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        id,
        input.email,
        input.name,
        input.password_hash ?? null,
        input.role ?? "business_owner",
        input.business_id ?? null,
        input.influencer_id ?? null,
        input.avatar_url ?? null,
        false,
        null,
        null,
        JSON.stringify(input.preferences ?? {}),
        now,
        now,
        null,
      ],
    );
    return result.rows[0];
  }

  async update(id: string, input: UpdateUserInput): Promise<UserRow | null> {
    const store = tryGetStore();
    if (store) {
      const existing = store.selectById(this.table, id);
      if (!existing || existing.deleted_at) return null;
      const updated = store.update(this.table, id, { ...input });
      return updated as unknown as UserRow;
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.email !== undefined) {
      sets.push(`email = $${idx++}`);
      params.push(input.email);
    }
    if (input.name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(input.name);
    }
    if (input.password_hash !== undefined) {
      sets.push(`password_hash = $${idx++}`);
      params.push(input.password_hash);
    }
    if (input.role !== undefined) {
      sets.push(`role = $${idx++}`);
      params.push(input.role);
    }
    if (input.business_id !== undefined) {
      sets.push(`business_id = $${idx++}`);
      params.push(input.business_id);
    }
    if (input.influencer_id !== undefined) {
      sets.push(`influencer_id = $${idx++}`);
      params.push(input.influencer_id);
    }
    if (input.avatar_url !== undefined) {
      sets.push(`avatar_url = $${idx++}`);
      params.push(input.avatar_url);
    }
    if (input.email_verified !== undefined) {
      sets.push(`email_verified = $${idx++}`);
      params.push(input.email_verified);
    }
    if (input.email_verified_at !== undefined) {
      sets.push(`email_verified_at = $${idx++}`);
      params.push(input.email_verified_at);
    }
    if (input.last_login_at !== undefined) {
      sets.push(`last_login_at = $${idx++}`);
      params.push(input.last_login_at);
    }
    if (input.preferences !== undefined) {
      sets.push(`preferences = $${idx++}`);
      params.push(JSON.stringify(input.preferences));
    }

    if (sets.length === 0) return this.findById(id);

    sets.push(`updated_at = $${idx++}`);
    params.push(new Date().toISOString());
    params.push(id);

    const result = await db.query<UserRow>(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      params,
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const store = tryGetStore();
    if (store) {
      return store.softDelete(this.table, id);
    }

    const result = await db.query(
      `UPDATE users SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL`,
      [new Date().toISOString(), id],
    );
    return result.rowCount > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const store = tryGetStore();
    if (store) {
      return store.delete(this.table, id);
    }

    const result = await db.query(
      `DELETE FROM users WHERE id = $1`,
      [id],
    );
    return result.rowCount > 0;
  }

  /** Record a login timestamp. */
  async recordLogin(id: string): Promise<UserRow | null> {
    return this.update(id, { last_login_at: new Date().toISOString() });
  }

  /** Verify a user's email. */
  async verifyEmail(id: string): Promise<UserRow | null> {
    return this.update(id, {
      email_verified: true,
      email_verified_at: new Date().toISOString(),
    });
  }
}

// ─── Singleton Instances ────────────────────────────────────────────────────

export const businessRepo = new BusinessRepository();
export const influencerRepo = new InfluencerRepository();
export const campaignRepo = new CampaignRepository();
export const submissionRepo = new SubmissionRepository();
export const userRepo = new UserRepository();
