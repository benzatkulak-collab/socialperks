/**
 * SocialPerksSDK — Fully Typed API Client
 *
 * Auto-generated from route definitions. Provides typed methods for every
 * Social Perks API endpoint with auth header management, CSRF tokens,
 * error handling, and retry logic.
 *
 * Usage:
 *   const sdk = new SocialPerksSDK({ baseUrl: "https://app.socialperks.app" });
 *   await sdk.login("user@example.com", "password");
 *   const campaigns = await sdk.listCampaigns({ state: "active" });
 */

// ─── SDK Types ──────────────────────────────────────────────────────────────

export interface SDKConfig {
  baseUrl: string;
  apiKey?: string;
  token?: string;
  /** Max retries for 5xx errors (default: 2) */
  retries?: number;
  /** Request timeout in ms (default: 10000) */
  timeout?: number;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface SDKError {
  code: string;
  message: string;
  status: number;
}

export class SocialPerksAPIError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(error: SDKError) {
    super(error.message);
    this.name = "SocialPerksAPIError";
    this.code = error.code;
    this.status = error.status;
  }
}

// ─── Response envelope ──────────────────────────────────────────────────────

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

// ─── Domain types (mirrors shared types but kept minimal for SDK portability) ─

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    businessId?: string;
  };
  token?: string;
}

export interface SDKUser {
  id: string;
  email: string;
  name: string;
  role: string;
  businessId?: string;
  influencerId?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface SDKCampaign {
  id: string;
  businessId: string;
  name: string;
  description: string;
  actions: string[];
  discountValue: number;
  discountType: "pct" | "dol";
  status: string;
  tier?: string;
  category?: string;
  guidelines?: string;
  maxCompletions?: number | null;
  budgetCap?: number | null;
  budgetUsed?: number;
  completionCount?: number;
  createdAt: string;
  tags?: string[];
}

export interface CreateCampaignInput {
  businessId: string;
  name: string;
  actions: string[];
  discountValue: number;
  discountType: "pct" | "dol";
  description?: string;
  guidelines?: string;
  maxCompletions?: number | null;
  expiresInDays?: number;
  useTiers?: boolean;
  budgetCap?: number | null;
  tags?: string[];
  tier?: string;
  businessType?: string;
  category?: string;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  guidelines?: string;
  status?: string;
  maxCompletions?: number | null;
  budgetCap?: number | null;
  tags?: string[];
}

export interface SDKSubmission {
  id: string;
  campaignId: string;
  userId: string;
  actionId: string;
  proof: string;
  proofType: string;
  status: string;
  reviewNote?: string;
  createdAt: string;
}

export interface CreateSubmissionInput {
  campaignId: string;
  userId: string;
  actionId: string;
  proof: string;
  proofType: "screenshot" | "url" | "video" | "api_verified";
  followerCount?: number;
}

export interface SDKProgram {
  id: string;
  businessId: string;
  name: string;
  description: string;
  type: string;
  status: string;
  tiers: unknown[];
  createdAt: string;
}

export interface CreateProgramInput {
  businessId: string;
  name: string;
  description: string;
  type: string;
  tiers: unknown[];
}

export interface MarketData {
  volume24h: number;
  activePairs: number;
  topOpportunities: unknown[];
}

export interface SDKOpportunity {
  id: string;
  campaignId: string;
  businessName: string;
  perkValue: number;
  actions: string[];
  category: string;
}

export interface SDKOrder {
  id: string;
  type: "buy" | "sell";
  status: string;
  amount: number;
  createdAt: string;
}

export interface PlaceOrderInput {
  type: "buy" | "sell";
  campaignId: string;
  amount: number;
  price?: number;
}

export interface BatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export interface GenerateInput {
  businessType: string;
  businessSize?: string;
  goals?: string[];
}

export interface GenerateResult {
  campaigns: Array<{
    id: string;
    name: string;
    description: string;
    actions: string[];
    discountValue: number;
    discountType: string;
    tier: string;
    aiReason: string;
  }>;
}

export interface SDKRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: number;
  impact: string;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  node: string;
  memory: { heapUsedMB: number; rssMB: number };
  database: { connected: boolean; latencyMs: number; poolSize: number };
}

// ─── SDK Class ──────────────────────────────────────────────────────────────

export class SocialPerksSDK {
  private baseUrl: string;
  private apiKey: string | undefined;
  private token: string | undefined;
  private csrfToken: string | undefined;
  private maxRetries: number;
  private timeoutMs: number;

  constructor(config: SDKConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.token = config.token;
    this.maxRetries = config.retries ?? 2;
    this.timeoutMs = config.timeout ?? 10000;
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  /** Set or clear the bearer token (e.g. after login/logout). */
  setToken(token: string | undefined): void {
    this.token = token;
  }

  /** Set or clear the API key. */
  setApiKey(apiKey: string | undefined): void {
    this.apiKey = apiKey;
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...extra,
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }
    if (this.csrfToken) {
      headers["X-CSRF-Token"] = this.csrfToken;
    }
    return headers;
  }

  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null) {
          url.searchParams.set(key, String(val));
        }
      }
    }
    return url.toString();
  }

  private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.status >= 500 && attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
          continue;
        }
        return response;
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        if (attempt === this.maxRetries) throw error;
        await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
      }
    }
    throw new SocialPerksAPIError({ code: "MAX_RETRIES", message: "Max retries exceeded", status: 0 });
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string | number | undefined>;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const fetchOptions: RequestInit = {
      method,
      headers: this.buildHeaders(options?.headers),
      credentials: "include" as RequestCredentials,
    };

    if (options?.body !== undefined) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await this.fetchWithRetry(url, fetchOptions);

    if (!response.ok) {
      let errorData: { error?: { code: string; message: string } } | null = null;
      try {
        errorData = await response.json();
      } catch {
        // Response body wasn't JSON
      }

      throw new SocialPerksAPIError({
        code: errorData?.error?.code ?? "HTTP_ERROR",
        message: errorData?.error?.message ?? `Request failed with status ${response.status}`,
        status: response.status,
      });
    }

    // Handle no-content responses
    if (response.status === 204) {
      return undefined as T;
    }

    const envelope: ApiEnvelope<T> = await response.json();
    if (!envelope.success) {
      throw new SocialPerksAPIError({
        code: envelope.error?.code ?? "UNKNOWN_ERROR",
        message: envelope.error?.message ?? "Unknown error",
        status: response.status,
      });
    }

    return envelope.data as T;
  }

  private async requestPaginated<T>(
    path: string,
    params?: Record<string, string | number | undefined>
  ): Promise<PaginatedResponse<T>> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, {
      method: "GET",
      headers: this.buildHeaders(),
      credentials: "include" as RequestCredentials,
    });

    if (!response.ok) {
      let errorData: { error?: { code: string; message: string } } | null = null;
      try {
        errorData = await response.json();
      } catch {
        // Response body wasn't JSON
      }
      throw new SocialPerksAPIError({
        code: errorData?.error?.code ?? "HTTP_ERROR",
        message: errorData?.error?.message ?? `Request failed with status ${response.status}`,
        status: response.status,
      });
    }

    const envelope: ApiEnvelope<T[]> = await response.json();
    if (!envelope.success) {
      throw new SocialPerksAPIError({
        code: envelope.error?.code ?? "UNKNOWN_ERROR",
        message: envelope.error?.message ?? "Unknown error",
        status: response.status,
      });
    }

    return {
      items: (envelope.data ?? []) as T[],
      pagination: envelope.pagination ?? {
        page: 1,
        perPage: 20,
        total: (envelope.data ?? []).length,
        totalPages: 1,
      },
    };
  }

  // ── CSRF Token Management ─────────────────────────────────────────────────

  /** Fetch a new CSRF token from the server. Call before mutating operations. */
  async refreshCsrfToken(): Promise<string> {
    const data = await this.request<{ token: string }>("GET", "/api/v1/csrf");
    this.csrfToken = data.token;
    return data.token;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>("POST", "/api/v1/auth", {
      body: { email, password, action: "login" },
    });
    if (data.token) {
      this.token = data.token;
    }
    return data;
  }

  async logout(): Promise<void> {
    await this.request<void>("POST", "/api/v1/auth", {
      body: { action: "logout" },
    });
    this.token = undefined;
    this.csrfToken = undefined;
  }

  async getSession(): Promise<SDKUser> {
    return this.request<SDKUser>("GET", "/api/v1/auth");
  }

  // ── Campaigns ─────────────────────────────────────────────────────────────

  async listCampaigns(
    params?: PaginationParams & { state?: string; businessId?: string; tier?: string; category?: string }
  ): Promise<PaginatedResponse<SDKCampaign>> {
    return this.requestPaginated<SDKCampaign>("/api/v1/campaigns", {
      page: params?.page,
      perPage: params?.perPage,
      state: params?.state,
      businessId: params?.businessId,
      tier: params?.tier,
      category: params?.category,
    });
  }

  async getCampaign(id: string): Promise<SDKCampaign> {
    return this.request<SDKCampaign>("GET", `/api/v1/campaigns`, { params: { id } });
  }

  async createCampaign(data: CreateCampaignInput): Promise<SDKCampaign> {
    return this.request<SDKCampaign>("POST", "/api/v1/campaigns", { body: data });
  }

  async updateCampaign(id: string, data: UpdateCampaignInput): Promise<SDKCampaign> {
    return this.request<SDKCampaign>("POST", "/api/v1/campaigns", {
      body: { ...data, id, action: "update" },
    });
  }

  async deleteCampaign(id: string): Promise<void> {
    return this.request<void>("POST", "/api/v1/campaigns", {
      body: { id, action: "delete" },
    });
  }

  // ── Submissions ───────────────────────────────────────────────────────────

  async listSubmissions(
    params?: PaginationParams & {
      status?: string;
      campaignId?: string;
      businessId?: string;
      userId?: string;
    }
  ): Promise<PaginatedResponse<SDKSubmission>> {
    return this.requestPaginated<SDKSubmission>("/api/v1/submissions", {
      page: params?.page,
      perPage: params?.perPage,
      status: params?.status,
      campaignId: params?.campaignId,
      businessId: params?.businessId,
      userId: params?.userId,
    });
  }

  async createSubmission(data: CreateSubmissionInput): Promise<SDKSubmission> {
    return this.request<SDKSubmission>("POST", "/api/v1/submissions", { body: data });
  }

  async reviewSubmission(
    id: string,
    action: "approve" | "reject",
    reason?: string
  ): Promise<void> {
    return this.request<void>("POST", "/api/v1/submissions/review", {
      body: { submissionId: id, decision: action, note: reason },
    });
  }

  // ── Programs ──────────────────────────────────────────────────────────────

  async listPrograms(businessId: string): Promise<PaginatedResponse<SDKProgram>> {
    return this.requestPaginated<SDKProgram>("/api/v1/programs", {
      businessId,
    });
  }

  async createProgram(data: CreateProgramInput): Promise<SDKProgram> {
    return this.request<SDKProgram>("POST", "/api/v1/programs", { body: data });
  }

  async getProgram(id: string): Promise<SDKProgram> {
    return this.request<SDKProgram>("GET", `/api/v1/programs/${encodeURIComponent(id)}`);
  }

  // ── Exchange ──────────────────────────────────────────────────────────────

  async getMarketData(view?: string): Promise<MarketData> {
    return this.request<MarketData>("GET", "/api/v1/exchange/market", {
      params: { view },
    });
  }

  async getOpportunities(): Promise<SDKOpportunity[]> {
    return this.request<SDKOpportunity[]>("GET", "/api/v1/exchange/opportunities");
  }

  async listOrders(params?: PaginationParams): Promise<PaginatedResponse<SDKOrder>> {
    return this.requestPaginated<SDKOrder>("/api/v1/exchange/orders", {
      page: params?.page,
      perPage: params?.perPage,
    });
  }

  async placeOrder(data: PlaceOrderInput): Promise<SDKOrder> {
    return this.request<SDKOrder>("POST", "/api/v1/exchange/orders", { body: data });
  }

  // ── Batch Operations ──────────────────────────────────────────────────────

  async batchApproveSubmissions(ids: string[]): Promise<BatchResult> {
    return this.request<BatchResult>("POST", "/api/v1/batch", {
      body: { action: "approve", entity: "submissions", ids },
    });
  }

  async batchRejectSubmissions(ids: string[], reason: string): Promise<BatchResult> {
    return this.request<BatchResult>("POST", "/api/v1/batch", {
      body: { action: "reject", entity: "submissions", ids, reason },
    });
  }

  // ── Export ────────────────────────────────────────────────────────────────

  async exportData(type: string, format: "csv" | "pdf"): Promise<Blob> {
    const url = this.buildUrl("/api/v1/export", { type, format });
    const response = await this.fetchWithRetry(url, {
      method: "GET",
      headers: this.buildHeaders({ Accept: format === "pdf" ? "application/pdf" : "text/csv" }),
      credentials: "include" as RequestCredentials,
    });

    if (!response.ok) {
      let errorData: { error?: { code: string; message: string } } | null = null;
      try {
        errorData = await response.json();
      } catch {
        // Binary response
      }
      throw new SocialPerksAPIError({
        code: errorData?.error?.code ?? "EXPORT_ERROR",
        message: errorData?.error?.message ?? `Export failed with status ${response.status}`,
        status: response.status,
      });
    }

    return response.blob();
  }

  // ── AI ────────────────────────────────────────────────────────────────────

  async generateCampaign(data: GenerateInput): Promise<GenerateResult> {
    return this.request<GenerateResult>("POST", "/api/v1/ai/generate", { body: data });
  }

  async getRecommendations(params?: {
    businessType?: string;
    businessSize?: string;
    goals?: string[];
  }): Promise<SDKRecommendation[]> {
    return this.request<SDKRecommendation[]>("POST", "/api/v1/ai/recommend", {
      body: params ?? {},
    });
  }

  // ── Reference Data ────────────────────────────────────────────────────────

  async getPricing(params?: {
    actionId?: string;
    platformId?: string;
    businessType?: string;
  }): Promise<unknown> {
    return this.request<unknown>("GET", "/api/v1/pricing", {
      params: params as Record<string, string | undefined>,
    });
  }

  async getActions(params?: {
    platformId?: string;
    type?: string;
    maxEffort?: number;
  }): Promise<unknown[]> {
    return this.request<unknown[]>("GET", "/api/v1/actions", {
      params: {
        platformId: params?.platformId,
        type: params?.type,
        maxEffort: params?.maxEffort,
      },
    });
  }

  async getBenchmarks(businessType: string): Promise<unknown> {
    return this.request<unknown>("GET", "/api/v1/benchmarks", {
      params: { businessType },
    });
  }

  async searchInfluencers(params?: {
    niche?: string;
    minFollowers?: number;
    platformId?: string;
    tier?: string;
  }): Promise<unknown[]> {
    return this.request<unknown[]>("GET", "/api/v1/influencers", {
      params: {
        niche: params?.niche,
        minFollowers: params?.minFollowers,
        platformId: params?.platformId,
        tier: params?.tier,
      },
    });
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  async healthCheck(): Promise<HealthStatus> {
    return this.request<HealthStatus>("GET", "/api/v1/health");
  }
}

// ─── Default export for convenience ─────────────────────────────────────────

export default SocialPerksSDK;
