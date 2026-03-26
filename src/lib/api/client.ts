import { API_ENDPOINTS } from "@/lib/shared/constants";

interface ApiResponse<T> { success: boolean; data?: T; error?: { code: string; message: string }; pagination?: { page: number; perPage: number; total: number; totalPages: number; }; }

class ApiClient {
  private baseUrl: string;
  constructor(baseUrl = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "") : "") { this.baseUrl = baseUrl; }

  /**
   * Fetch with automatic retry for transient server errors (5xx) and network failures.
   * Retries up to `retries` times with exponential backoff (200ms, 400ms).
   */
  private async fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (response.status >= 500 && attempt < retries) {
          // Wait with exponential backoff before retrying server errors
          await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, attempt)));
          continue;
        }
        return response;
      } catch (error: unknown) {
        if (attempt === retries) throw error;
        // Wait before retrying network errors
        await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, attempt)));
      }
    }
    throw new Error("Max retries exceeded");
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const res = await this.fetchWithRetry(
        this.baseUrl + endpoint,
        { headers: { "Content-Type": "application/json" }, ...options }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return {
          success: false,
          error: body?.error ?? { code: "HTTP_ERROR", message: `Request failed with status ${res.status}` },
        };
      }
      return res.json();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Network request failed";
      return {
        success: false,
        error: { code: "NETWORK_ERROR", message },
      };
    }
  }

  async getCampaigns(params?: { businessId?: string; tier?: string; category?: string; page?: number }) {
    const qs = new URLSearchParams();
    if (params?.businessId) qs.set("businessId", params.businessId);
    if (params?.tier) qs.set("tier", params.tier);
    if (params?.category) qs.set("category", params.category);
    if (params?.page) qs.set("page", String(params.page));
    return this.request(API_ENDPOINTS.campaigns + "?" + qs.toString());
  }

  async createCampaign(data: Record<string, unknown>) {
    return this.request(API_ENDPOINTS.campaigns, { method: "POST", body: JSON.stringify(data) });
  }

  async getPricing(params: { actionId?: string; platformId?: string; businessType?: string }) {
    const qs = new URLSearchParams();
    if (params.actionId) qs.set("actionId", params.actionId);
    if (params.platformId) qs.set("platformId", params.platformId);
    if (params.businessType) qs.set("businessType", params.businessType);
    return this.request(API_ENDPOINTS.pricing + "?" + qs.toString());
  }

  async getActions(params?: { platformId?: string; type?: string; maxEffort?: number }) {
    const qs = new URLSearchParams();
    if (params?.platformId) qs.set("platformId", params.platformId);
    if (params?.type) qs.set("type", params.type);
    if (params?.maxEffort !== undefined) qs.set("maxEffort", String(params.maxEffort));
    return this.request(API_ENDPOINTS.actions + "?" + qs.toString());
  }

  async searchInfluencers(params: { niche?: string; minFollowers?: number; platformId?: string; tier?: string }) {
    const qs = new URLSearchParams();
    if (params.niche) qs.set("niche", params.niche);
    if (params.minFollowers) qs.set("minFollowers", String(params.minFollowers));
    if (params.platformId) qs.set("platformId", params.platformId);
    if (params.tier) qs.set("tier", params.tier);
    return this.request(API_ENDPOINTS.influencers + "?" + qs.toString());
  }

  async getBenchmarks(businessType: string) {
    return this.request(API_ENDPOINTS.benchmarks + "?businessType=" + encodeURIComponent(businessType));
  }

  async generateCampaigns(businessType: string, businessSize = "small") {
    return this.request(API_ENDPOINTS.aiGenerate, { method: "POST", body: JSON.stringify({ businessType, businessSize }) });
  }

  async getRecommendations(data: Record<string, unknown>) {
    return this.request(API_ENDPOINTS.aiRecommend, { method: "POST", body: JSON.stringify(data) });
  }

  async getSubmissions(params?: { campaignId?: string; businessId?: string; userId?: string; status?: string; page?: number }) {
    const qs = new URLSearchParams();
    if (params?.campaignId) qs.set("campaignId", params.campaignId);
    if (params?.businessId) qs.set("businessId", params.businessId);
    if (params?.userId) qs.set("userId", params.userId);
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    return this.request(API_ENDPOINTS.submissions + "?" + qs.toString());
  }

  async reviewSubmission(data: { submissionId: string; reviewerId: string; decision: "approve" | "reject"; note?: string; campaign?: Record<string, unknown>; followerCount?: number }) {
    return this.request(API_ENDPOINTS.submissionsReview, { method: "POST", body: JSON.stringify(data) });
  }

  async login(email: string, pin: string) {
    return this.request(API_ENDPOINTS.auth, { method: "POST", body: JSON.stringify({ email, pin, action: "login" }) });
  }
}

export const api = new ApiClient();
export default ApiClient;
