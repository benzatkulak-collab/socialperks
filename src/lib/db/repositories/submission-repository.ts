/**
 * Submission Repository
 * ─────────────────────
 * CRUD operations for the campaign_submissions table.
 */

import { safeOrderBy, safeOrder } from "../../security/order-by";
import type { ProofType, SubmissionStatus } from "../../types";
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

// ─── Repository ─────────────────────────────────────────────────────────────

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
    // SECURITY: Allowlist columns to prevent SQL injection via orderBy.
    const orderBy = safeOrderBy(
      options.orderBy,
      ["submitted_at", "reviewed_at", "status", "value_awarded_cents", "created_at"] as const,
      "submitted_at"
    );
    const order = safeOrder(options.order);
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
