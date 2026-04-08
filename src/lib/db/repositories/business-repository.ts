/**
 * Business Repository
 * ───────────────────
 * CRUD operations for the businesses table.
 */

import type { BusinessPlan, BusinessSize } from "../../types";
import {
  type PaginatedResult,
  type PaginationOptions,
  type Repository,
  db,
  generateId,
  paginate,
  tryGetStore,
} from "./shared";

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Repository ─────────────────────────────────────────────────────────────

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
