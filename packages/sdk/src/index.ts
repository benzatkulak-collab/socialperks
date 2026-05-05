// @social-perks/sdk — TypeScript client for the Social Perks API.
//
// Usage:
//   import { SocialPerks } from "@social-perks/sdk";
//   const sp = new SocialPerks({
//     baseUrl: "https://social-perks.example.com",
//     apiKey: process.env.SOCIAL_PERKS_API_KEY,
//   });
//   const pricing = await sp.pricing.estimate({ actionId: "ig_post" });
//
// All methods return parsed `data` payloads. On error, throws SocialPerksError.

import {
  type Action,
  type ApiResponse,
  type Campaign,
  type PaginatedResult,
  type PricingEstimate,
  type SocialPerksConfig,
  SocialPerksError,
} from "./types.js";

export * from "./types.js";

class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly bearerToken?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(config: SocialPerksConfig) {
    if (!config.baseUrl) {
      throw new Error("SocialPerks: baseUrl is required");
    }
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.bearerToken = config.bearerToken;
    this.fetchImpl = config.fetch ?? globalThis.fetch;
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "social-perks-sdk/0.1.0",
      ...extra,
    };
    if (this.apiKey) headers["x-api-key"] = this.apiKey;
    if (this.bearerToken) headers["Authorization"] = `Bearer ${this.bearerToken}`;
    return headers;
  }

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: { query?: Record<string, unknown>; body?: unknown } = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v1${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await this.fetchImpl(url.toString(), {
        method,
        headers: this.headers(),
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") {
        throw new SocialPerksError(
          "TIMEOUT",
          `Request to ${path} timed out after ${this.timeoutMs}ms`,
          0
        );
      }
      throw new SocialPerksError(
        "NETWORK_ERROR",
        `Request to ${path} failed: ${(e as Error).message}`,
        0
      );
    } finally {
      clearTimeout(timer);
    }

    const requestId = res.headers.get("x-request-id") ?? undefined;
    let parsed: ApiResponse<T>;
    try {
      parsed = (await res.json()) as ApiResponse<T>;
    } catch {
      throw new SocialPerksError(
        "INVALID_RESPONSE",
        `Server returned non-JSON response (status ${res.status})`,
        res.status,
        requestId
      );
    }

    if (!parsed.success) {
      throw new SocialPerksError(
        parsed.error.code,
        parsed.error.message,
        res.status,
        requestId
      );
    }

    return parsed.data;
  }
}

export class SocialPerks {
  private readonly http: HttpClient;

  constructor(config: SocialPerksConfig) {
    this.http = new HttpClient(config);
  }

  /** Pricing oracle — estimate the USD value of an action. */
  readonly pricing = {
    estimate: (params: {
      actionId?: string;
      platformId?: string;
      businessType?: string;
    }): Promise<PricingEstimate> =>
      this.http.request<PricingEstimate>("GET", "/pricing", { query: params }),
  };

  /** Action library — list and filter the 107 marketing actions. */
  readonly actions = {
    list: (
      params: {
        platformId?: string;
        type?: Action["type"];
        maxEffort?: number;
        page?: number;
        perPage?: number;
      } = {}
    ): Promise<PaginatedResult<Action>> =>
      this.http.request<PaginatedResult<Action>>("GET", "/actions", { query: params }),
  };

  /** Industry benchmarks. */
  readonly benchmarks = {
    get: (params: { industry?: string } = {}): Promise<unknown> =>
      this.http.request<unknown>("GET", "/benchmarks", { query: params }),
  };

  /** Campaign management. Requires auth. */
  readonly campaigns = {
    list: (params: { status?: Campaign["status"] } = {}): Promise<Campaign[]> =>
      this.http.request<Campaign[]>("GET", "/campaigns", { query: params }),

    create: (input: {
      actionId: string;
      platformId: string;
      rewardType: Campaign["rewardType"];
      rewardValue: number;
    }): Promise<Campaign> =>
      this.http.request<Campaign>("POST", "/campaigns", { body: input }),
  };

  /** Submission tracking. Requires auth. */
  readonly submissions = {
    list: (): Promise<unknown> => this.http.request<unknown>("GET", "/submissions"),
    create: (input: { campaignId: string; proofUrl: string }): Promise<unknown> =>
      this.http.request<unknown>("POST", "/submissions", { body: input }),
  };

  /** Public exchange/marketplace data. */
  readonly exchange = {
    opportunities: (): Promise<unknown> =>
      this.http.request<unknown>("GET", "/exchange/opportunities"),
    market: (): Promise<unknown> => this.http.request<unknown>("GET", "/exchange/market"),
  };

  /** AI endpoints. Requires auth. */
  readonly ai = {
    quickStart: (input: {
      businessType?: string;
      industry?: string;
    }): Promise<unknown> =>
      this.http.request<unknown>("POST", "/ai/quick-start", { body: input }),

    campaignAgent: (input: Record<string, unknown>): Promise<unknown> =>
      this.http.request<unknown>("POST", "/ai/campaign-agent", { body: input }),
  };

  /** Server health check. */
  health(): Promise<unknown> {
    return this.http.request<unknown>("GET", "/health");
  }
}
