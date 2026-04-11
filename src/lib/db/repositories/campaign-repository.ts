/**
 * Campaign Repository
 * ───────────────────
 * CRUD operations for the launched_campaigns table.
 */

import type { CampaignStatus, CampaignTier, DiscountType } from "../../types";
import { prisma } from "@/lib/db/prisma";
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

// ─── Repository ─────────────────────────────────────────────────────────────

export class CampaignRepository
  implements Repository<CampaignRow, CreateCampaignInput, UpdateCampaignInput>
{
  private readonly table = "launched_campaigns";

  async findById(id: string): Promise<CampaignRow | null> {
    if (prisma) {
      const row = await prisma.launchedCampaign.findUnique({ where: { id } });
      return row ? (row as unknown as CampaignRow) : null;
    }

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
    if (prisma) {
      const page = options.page ?? 1;
      const perPage = options.perPage ?? 50;
      const orderBy = options.orderBy ?? "created_at";
      const order = options.order ?? "desc";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};

      if (filter.business_id) where.businessId = filter.business_id;
      if (filter.status) where.status = filter.status;
      if (filter.from_suggestion) where.fromSuggestion = filter.from_suggestion;
      if (filter.search) where.name = { contains: filter.search, mode: "insensitive" };

      const [data, total] = await Promise.all([
        prisma.launchedCampaign.findMany({
          where,
          orderBy: { [orderBy]: order },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        prisma.launchedCampaign.count({ where }),
      ]);

      return {
        data: data as unknown as CampaignRow[],
        total,
        page,
        perPage,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      };
    }

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
    if (prisma) {
      const expiresAt = new Date(
        Date.now() + input.expires_in_days * 24 * 60 * 60 * 1000,
      );
      const row = await prisma.launchedCampaign.create({
        data: {
          businessId: input.business_id,
          name: input.name,
          description: input.description,
          actions: input.actions,
          discountValue: input.discount_value,
          discountType: input.discount_type,
          guidelines: input.guidelines ?? null,
          maxCompletions: input.max_completions ?? null,
          expiresInDays: input.expires_in_days,
          useTiers: input.use_tiers ?? false,
          status: "active",
          fromSuggestion: input.from_suggestion ?? null,
          budgetCap: input.budget_cap ?? null,
          ftcDisclosures: input.ftc_disclosures ?? [],
          tags: input.tags ?? [],
          expiresAt,
        },
      });
      return row as unknown as CampaignRow;
    }

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
    if (prisma) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = {};
        if (input.name !== undefined) data.name = input.name;
        if (input.description !== undefined) data.description = input.description;
        if (input.actions !== undefined) data.actions = input.actions;
        if (input.discount_value !== undefined) data.discountValue = input.discount_value;
        if (input.discount_type !== undefined) data.discountType = input.discount_type;
        if (input.guidelines !== undefined) data.guidelines = input.guidelines;
        if (input.max_completions !== undefined) data.maxCompletions = input.max_completions;
        if (input.expires_in_days !== undefined) data.expiresInDays = input.expires_in_days;
        if (input.use_tiers !== undefined) data.useTiers = input.use_tiers;
        if (input.status !== undefined) data.status = input.status;
        if (input.completion_count !== undefined) data.completionCount = input.completion_count;
        if (input.budget_cap !== undefined) data.budgetCap = input.budget_cap;
        if (input.budget_used !== undefined) data.budgetUsed = input.budget_used;
        if (input.ftc_disclosures !== undefined) data.ftcDisclosures = input.ftc_disclosures;
        if (input.tags !== undefined) data.tags = input.tags;

        if (Object.keys(data).length === 0) return this.findById(id);

        const row = await prisma.launchedCampaign.update({
          where: { id },
          data,
        });
        return row as unknown as CampaignRow;
      } catch {
        return null;
      }
    }

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
    if (prisma) {
      try {
        // Campaigns use status-based lifecycle, not soft-delete.
        // Setting status to "ended" is the logical delete.
        await prisma.launchedCampaign.update({
          where: { id },
          data: { status: "ended", updatedAt: new Date() },
        });
        return true;
      } catch {
        return false;
      }
    }

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
    if (prisma) {
      try {
        await prisma.launchedCampaign.delete({ where: { id } });
        return true;
      } catch {
        return false;
      }
    }

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
    if (prisma) {
      try {
        const row = await prisma.launchedCampaign.update({
          where: { id },
          data: {
            completionCount: { increment: 1 },
            budgetUsed: { increment: budgetUsedDelta },
          },
        });
        return row as unknown as CampaignRow;
      } catch {
        return null;
      }
    }

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
