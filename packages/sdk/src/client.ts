import { SocialPerksError } from "./errors.js";
import type {
  Campaign,
  CampaignCreateInput,
  ActionIdea,
  PosterParams,
  EnqueueSmsInput,
  ClientOptions,
  ResourceTier,
} from "./types.js";

const DEFAULT_BASE_URL = "https://socialperks.io";
const DEFAULT_TIMEOUT_MS = 30_000;
const SDK_VERSION = "0.1.0";

interface RequestArgs {
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

/**
 * Main client. Construct once per process, reuse forever.
 *
 *   const sp = new SocialPerks({ apiKey: process.env.SOCIAL_PERKS_API_KEY! });
 *   const campaigns = await sp.campaigns.list({ status: "active" });
 */
export class SocialPerks {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private readonly retry: { attempts: number; baseDelayMs: number };

  constructor(opts: ClientOptions) {
    if (!opts.apiKey) {
      throw new SocialPerksError({
        code: "unauthorized",
        message: "Missing apiKey. Get one with `npx @socialperks/cli init` or from /dashboard/api-keys.",
        status: 0,
      });
    }
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetcher = opts.fetch ?? globalThis.fetch;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retry = opts.retry ?? { attempts: 2, baseDelayMs: 250 };

    if (!this.fetcher) {
      throw new Error("Global fetch not found. Pass opts.fetch or run on Node 18+.");
    }
  }

  /**
   * Build a SocialPerks instance from environment variables.
   * Reads SOCIAL_PERKS_API_KEY and (optionally) SOCIAL_PERKS_BASE_URL.
   */
  static fromEnv(env: Record<string, string | undefined> = process.env): SocialPerks {
    const apiKey = env.SOCIAL_PERKS_API_KEY;
    if (!apiKey) {
      throw new SocialPerksError({
        code: "unauthorized",
        message: "SOCIAL_PERKS_API_KEY is not set. Run `npx @socialperks/cli init` to generate one.",
        status: 0,
      });
    }
    return new SocialPerks({ apiKey, baseUrl: env.SOCIAL_PERKS_BASE_URL });
  }

  // ─── Public namespaces ──────────────────────────────────────────────────

  campaigns = {
    list: (args: { status?: string } = {}): Promise<Campaign[]> =>
      this.req<{ campaigns: Campaign[] }>({
        path: "/api/v1/campaigns",
        query: { status: args.status },
      }).then((r) => r.campaigns ?? []),

    create: (input: CampaignCreateInput): Promise<Campaign> =>
      this.req<Campaign>({
        path: "/api/v1/campaigns",
        method: "POST",
        body: input,
      }),
  };

  actions = {
    list: (args: { platform?: string; tier?: ResourceTier; businessType?: string } = {}): Promise<ActionIdea[]> =>
      this.req<ActionIdea[]>({
        path: "/api/v1/actions",
        query: { platform: args.platform, tier: args.tier, businessType: args.businessType },
      }),
  };

  poster = {
    /**
     * Get the printable 8.5×11 SVG poster URL for a campaign. The
     * shop owner prints this and tapes it to the counter — that's the
     * actual customer-flywheel artifact.
     */
    url: (params: PosterParams): string => {
      const q = new URLSearchParams();
      q.set("campaignId", params.campaignId);
      if (params.businessName) q.set("businessName", params.businessName);
      if (params.perk) q.set("perk", params.perk);
      return `${this.baseUrl}/api/v1/businesses/poster?${q.toString()}`;
    },

    /** Fetch the SVG bytes directly. Returns the SVG as a string. */
    fetch: async (params: PosterParams): Promise<string> => {
      const res = await this.fetcher(this.poster.url(params), {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw SocialPerksError.fromStatus(res.status, await res.text(), res.headers.get("x-request-id") ?? undefined);
      return res.text();
    },
  };

  sms = {
    /**
     * Schedule a post-purchase SMS to a customer's phone, delayed by
     * `delayMinutes` (default 120). Includes the perk's claim URL.
     * Customer phone must be E.164.
     */
    enqueuePostPurchase: (input: EnqueueSmsInput): Promise<{ queued: boolean; sendAt: string }> =>
      // The SDK calls the production endpoint. The `/api/v1/sms/test`
      // endpoint is admin-only (WAITLIST_ADMIN_TOKEN gated) and not
      // intended for shop-owner / agent usage.
      this.req({
        path: "/api/v1/sms/enqueue",
        method: "POST",
        body: input,
      }),
  };

  ai = {
    /** One-shot recommendation: best campaign to launch first for this business. */
    quickStart: (input: { businessType: string; budget?: number }): Promise<unknown> =>
      this.req({ path: "/api/v1/ai/quick-start", method: "POST", body: input }),

    /** Full marketing plan — multi-campaign, sequenced. */
    campaignAgent: (input: { businessId: string; goal?: string }): Promise<unknown> =>
      this.req({ path: "/api/v1/ai/campaign-agent", method: "POST", body: input }),
  };

  reference = {
    pricing: (): Promise<unknown> => this.req({ path: "/api/v1/pricing" }),
    benchmarks: (): Promise<unknown> => this.req({ path: "/api/v1/benchmarks" }),
    health: (): Promise<{ ok: boolean }> => this.req({ path: "/api/v1/health" }),
  };

  webhooks = {
    /**
     * List active webhook subscriptions. The secret is NOT returned;
     * if you've lost it, delete + re-create the subscription.
     */
    list: (): Promise<{
      subscriptions: Array<{
        id: string;
        url: string;
        events: string[];
        active: boolean;
        failureCount: number;
        lastSuccessAt?: string;
        lastFailureAt?: string;
        lastFailureReason?: string;
        createdAt: string;
      }>;
    }> => this.req({ path: "/api/v1/webhooks" }),

    /**
     * Subscribe to events. Returns the secret in plaintext — save
     * it; you'll use it to verify HMAC signatures on incoming
     * deliveries. The secret is never retrievable after this call.
     *
     * Verify signatures by computing
     *   HMAC_SHA256(secret, request_body)
     * and comparing (timing-safely) to the X-SocialPerks-Signature
     * header value (format: "sha256=<hex>").
     */
    subscribe: (input: {
      url: string;
      events: string[];
    }): Promise<{
      subscription: {
        id: string;
        url: string;
        events: string[];
        active: boolean;
        secret: string;
        createdAt: string;
      };
      verifyHelp?: string;
    }> =>
      this.req({
        path: "/api/v1/webhooks",
        method: "POST",
        body: input,
      }),
  };

  // ─── Internals ──────────────────────────────────────────────────────────

  private async req<T>(args: RequestArgs): Promise<T> {
    const url = new URL(this.baseUrl + args.path);
    if (args.query) {
      for (const [k, v] of Object.entries(args.query)) {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
      "User-Agent": `socialperks-sdk-js/${SDK_VERSION}`,
      Accept: "application/json",
    };

    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.retry.attempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this.fetcher(url.toString(), {
          method: args.method ?? "GET",
          headers,
          body: args.body ? JSON.stringify(args.body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const requestId = res.headers.get("x-request-id") ?? undefined;
        const text = await res.text();
        const body: unknown = text ? safeJsonParse(text) : null;

        if (!res.ok) {
          // Retry on 5xx and 429; bubble 4xx else.
          if ((res.status >= 500 || res.status === 429) && attempt < this.retry.attempts) {
            await sleep(this.retry.baseDelayMs * Math.pow(2, attempt));
            continue;
          }
          throw SocialPerksError.fromStatus(res.status, body, requestId);
        }

        // Some routes wrap in { data: ... }, some don't. Unwrap if present.
        if (body && typeof body === "object" && "data" in body && Object.keys(body).length <= 3) {
          return (body as { data: T }).data;
        }
        return body as T;
      } catch (e) {
        clearTimeout(timeout);
        lastErr = e;
        if (e instanceof SocialPerksError) {
          if (e.code === "rate_limited" || e.code === "server") {
            if (attempt < this.retry.attempts) {
              await sleep(this.retry.baseDelayMs * Math.pow(2, attempt));
              continue;
            }
          }
          throw e;
        }
        const isAbort = e instanceof Error && e.name === "AbortError";
        if (attempt < this.retry.attempts) {
          await sleep(this.retry.baseDelayMs * Math.pow(2, attempt));
          continue;
        }
        throw new SocialPerksError({
          code: isAbort ? "timeout" : "network",
          message: e instanceof Error ? e.message : "Network error",
          status: 0,
        });
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new SocialPerksError({ code: "unknown", message: "Request failed", status: 0 });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
