import type { Context } from "hono";

export function apiResponse<T>(c: Context, data: T, status: number = 200, headers?: Record<string, string>) {
  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      c.header(k, v);
    }
  }
  return c.json({ success: true, data }, status as 200);
}

export function apiError(c: Context, code: string, message: string, status: number = 400) {
  return c.json({ success: false, error: { code, message } }, status as 400);
}

export function parsePagination(params: URLSearchParams) {
  const rawPage = parseInt(params.get("page") ?? "1");
  const rawPerPage = parseInt(params.get("perPage") ?? "20");
  const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
  const perPage = Math.min(100, Math.max(1, Number.isFinite(rawPerPage) ? rawPerPage : 20));
  return { page, perPage, offset: (page - 1) * perPage };
}

export function paginationMeta(total: number, page: number, perPage: number) {
  const totalPages = Math.ceil(total / perPage);
  return { page, perPage, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}
