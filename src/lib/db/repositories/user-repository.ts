/**
 * User Repository
 * ───────────────
 * CRUD operations for the users table.
 */

import type { UserRole } from "../../types";
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

// ─── Repository ─────────────────────────────────────────────────────────────

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
