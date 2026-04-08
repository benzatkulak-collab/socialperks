/**
 * Shared types and helpers for repository sub-modules
 * ────────────────────────────────────────────────────
 * Base interfaces, pagination, store access, and utility functions
 * shared across all repository implementations.
 */

import { db, InMemoryConnection } from "../connection";

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
export function tryGetStore() {
  if (db instanceof InMemoryConnection) {
    return db.store;
  }
  return null;
}

export const useSQL = () => !(db instanceof InMemoryConnection);

// ─── Helpers ────────────────────────────────────────────────────────────────

export function paginate<T>(
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

export function generateId(): string {
  return crypto.randomUUID();
}

/** Convert a JS array to Postgres TEXT[] literal format: {val1,val2} */
export function toPgArray(arr: unknown[]): string {
  return "{" + arr.map(v => {
    const s = String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${s}"`;
  }).join(",") + "}";
}

// Re-export db for use in sub-modules
export { db };
