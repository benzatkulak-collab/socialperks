/**
 * Influencer Repository
 * ─────────────────────
 * CRUD operations for the influencers table.
 */

import { safeOrderBy, safeOrder } from "../../security/order-by";
import type { InfluencerTier } from "../../types";
import {
  type PaginatedResult,
  type PaginationOptions,
  type Repository,
  db,
  generateId,
  paginate,
  toPgArray,
  tryGetStore,
} from "./shared";

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Repository ─────────────────────────────────────────────────────────────

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
    // SECURITY: Allowlist columns to prevent SQL injection via orderBy.
    const orderBy = safeOrderBy(
      options.orderBy,
      ["created_at", "updated_at", "display_name", "tier", "follower_count", "engagement_rate", "verified", "active"] as const,
      "created_at"
    );
    const order = safeOrder(options.order);
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
