/**
 * OAuth Token Lifecycle Manager
 *
 * Manages OAuth 2.0 tokens for all social media platform integrations.
 * Handles token storage, refresh, rotation, and revocation.
 *
 * Each platform has its own OAuth configuration (authorization URL, token URL,
 * scopes, etc.) and token lifecycle. This manager abstracts those differences
 * behind a unified interface.
 *
 * Storage: In-memory Map with persistence hooks for production (Postgres/Redis).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OAuthConfig {
  platformId: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  scopes: string[];
  /** Some platforms (TikTok) use PKCE; others use standard code flow. */
  usePkce: boolean;
  /** Token refresh buffer — refresh N ms before actual expiry. */
  refreshBufferMs: number;
}

export interface OAuthToken {
  platformId: string;
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  scope: string;
  expiresAt: number; // Unix timestamp ms
  issuedAt: number;
  /** Platform-specific user ID returned during auth. */
  platformUserId: string | null;
  /** Number of times this token has been refreshed. */
  refreshCount: number;
  /** Whether this token has been revoked. */
  revoked: boolean;
}

export interface TokenExchangeRequest {
  platformId: string;
  userId: string;
  authorizationCode: string;
  redirectUri: string;
  codeVerifier?: string; // For PKCE
}

export interface TokenRefreshResult {
  success: boolean;
  token?: OAuthToken;
  error?: string;
  /** If the refresh token itself expired, user must re-authorize. */
  requiresReauth: boolean;
}

// ─── Platform OAuth Configurations ──────────────────────────────────────────

const PLATFORM_OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  ig: {
    platformId: "ig",
    clientId: process.env.INSTAGRAM_CLIENT_ID ?? "",
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET ?? "",
    authorizationUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    revokeUrl: undefined, // Instagram doesn't support programmatic revocation
    scopes: ["user_profile", "user_media"],
    usePkce: false,
    refreshBufferMs: 5 * 60 * 1000, // 5 min buffer
  },
  tt: {
    platformId: "tt",
    clientId: process.env.TIKTOK_CLIENT_KEY ?? "",
    clientSecret: process.env.TIKTOK_CLIENT_SECRET ?? "",
    authorizationUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    revokeUrl: "https://open.tiktokapis.com/v2/oauth/revoke/",
    scopes: ["user.info.basic", "video.list"],
    usePkce: true,
    refreshBufferMs: 5 * 60 * 1000,
  },
  yt: {
    platformId: "yt",
    clientId: process.env.YOUTUBE_CLIENT_ID ?? "",
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    usePkce: false,
    refreshBufferMs: 5 * 60 * 1000,
  },
  xw: {
    platformId: "xw",
    clientId: process.env.X_CLIENT_ID ?? "",
    clientSecret: process.env.X_CLIENT_SECRET ?? "",
    authorizationUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    revokeUrl: "https://api.twitter.com/2/oauth2/revoke",
    scopes: ["tweet.read", "users.read", "offline.access"],
    usePkce: true,
    refreshBufferMs: 5 * 60 * 1000,
  },
  fb: {
    platformId: "fb",
    clientId: process.env.FACEBOOK_APP_ID ?? "",
    clientSecret: process.env.FACEBOOK_APP_SECRET ?? "",
    authorizationUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    revokeUrl: undefined,
    scopes: ["public_profile", "pages_read_engagement"],
    usePkce: false,
    refreshBufferMs: 5 * 60 * 1000,
  },
  li: {
    platformId: "li",
    clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
    authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    revokeUrl: undefined,
    scopes: ["r_liteprofile", "r_organization_social"],
    usePkce: false,
    refreshBufferMs: 5 * 60 * 1000,
  },
  go: {
    platformId: "go",
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: ["https://www.googleapis.com/auth/business.manage"],
    usePkce: false,
    refreshBufferMs: 5 * 60 * 1000,
  },
  yl: {
    platformId: "yl",
    clientId: process.env.YELP_CLIENT_ID ?? "",
    clientSecret: process.env.YELP_CLIENT_SECRET ?? "",
    authorizationUrl: "", // Yelp uses API key auth, not OAuth
    tokenUrl: "",
    scopes: [],
    usePkce: false,
    refreshBufferMs: 0,
  },
  pi: {
    platformId: "pi",
    clientId: process.env.PINTEREST_APP_ID ?? "",
    clientSecret: process.env.PINTEREST_APP_SECRET ?? "",
    authorizationUrl: "https://www.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    revokeUrl: undefined,
    scopes: ["boards:read", "pins:read"],
    usePkce: false,
    refreshBufferMs: 5 * 60 * 1000,
  },
  rd: {
    platformId: "rd",
    clientId: process.env.REDDIT_CLIENT_ID ?? "",
    clientSecret: process.env.REDDIT_CLIENT_SECRET ?? "",
    authorizationUrl: "https://www.reddit.com/api/v1/authorize",
    tokenUrl: "https://www.reddit.com/api/v1/access_token",
    revokeUrl: "https://www.reddit.com/api/v1/revoke_token",
    scopes: ["identity", "read"],
    usePkce: false,
    refreshBufferMs: 5 * 60 * 1000,
  },
  ta: {
    platformId: "ta",
    clientId: process.env.TRIPADVISOR_API_KEY ?? "",
    clientSecret: "", // API key auth, no client secret
    authorizationUrl: "", // TripAdvisor uses API key auth, not OAuth
    tokenUrl: "",
    scopes: [],
    usePkce: false,
    refreshBufferMs: 0,
  },
  th: {
    platformId: "th",
    clientId: process.env.THREADS_CLIENT_ID ?? "",
    clientSecret: process.env.THREADS_CLIENT_SECRET ?? "",
    authorizationUrl: "https://www.threads.net/oauth/authorize",
    tokenUrl: "https://graph.threads.net/oauth/access_token",
    revokeUrl: undefined,
    scopes: ["threads_basic", "threads_content_publish"],
    usePkce: false,
    refreshBufferMs: 5 * 60 * 1000,
  },
  sc: {
    platformId: "sc",
    clientId: process.env.SNAPCHAT_CLIENT_ID ?? "",
    clientSecret: process.env.SNAPCHAT_CLIENT_SECRET ?? "",
    authorizationUrl: "https://accounts.snapchat.com/accounts/oauth2/auth",
    tokenUrl: "https://accounts.snapchat.com/accounts/oauth2/token",
    revokeUrl: undefined,
    scopes: ["snapchat-marketing-api"],
    usePkce: false,
    refreshBufferMs: 5 * 60 * 1000,
  },
  nd: {
    platformId: "nd",
    clientId: process.env.NEXTDOOR_API_KEY ?? "",
    clientSecret: "", // API key auth
    authorizationUrl: "", // Nextdoor uses API key auth
    tokenUrl: "",
    scopes: [],
    usePkce: false,
    refreshBufferMs: 0,
  },
  wa: {
    platformId: "wa",
    clientId: process.env.WHATSAPP_BUSINESS_TOKEN ?? "",
    clientSecret: "", // Facebook Business API token
    authorizationUrl: "", // WhatsApp uses pre-generated business tokens
    tokenUrl: "",
    scopes: [],
    usePkce: false,
    refreshBufferMs: 0,
  },
  tg: {
    platformId: "tg",
    clientId: process.env.TELEGRAM_BOT_TOKEN ?? "",
    clientSecret: "", // Bot API token
    authorizationUrl: "", // Telegram uses Bot API, not OAuth
    tokenUrl: "",
    scopes: [],
    usePkce: false,
    refreshBufferMs: 0,
  },
  dc: {
    platformId: "dc",
    clientId: process.env.DISCORD_CLIENT_ID ?? "",
    clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    authorizationUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    revokeUrl: "https://discord.com/api/oauth2/token/revoke",
    scopes: ["identify", "guilds"],
    usePkce: false,
    refreshBufferMs: 5 * 60 * 1000,
  },
  tw: {
    platformId: "tw",
    clientId: process.env.TWITCH_CLIENT_ID ?? "",
    clientSecret: process.env.TWITCH_CLIENT_SECRET ?? "",
    authorizationUrl: "https://id.twitch.tv/oauth2/authorize",
    tokenUrl: "https://id.twitch.tv/oauth2/token",
    revokeUrl: "https://id.twitch.tv/oauth2/revoke",
    scopes: ["user:read:email", "clips:edit"],
    usePkce: false,
    refreshBufferMs: 5 * 60 * 1000,
  },
  tm: {
    platformId: "tm",
    clientId: process.env.TUMBLR_CLIENT_ID ?? "",
    clientSecret: process.env.TUMBLR_CLIENT_SECRET ?? "",
    authorizationUrl: "https://www.tumblr.com/oauth2/authorize",
    tokenUrl: "https://api.tumblr.com/v2/oauth2/token",
    revokeUrl: undefined,
    scopes: ["basic", "write"],
    usePkce: false,
    refreshBufferMs: 5 * 60 * 1000,
  },
  br: {
    platformId: "br",
    clientId: "", // No public API available
    clientSecret: "",
    authorizationUrl: "",
    tokenUrl: "",
    scopes: [],
    usePkce: false,
    refreshBufferMs: 0,
  },
  l8: {
    platformId: "l8",
    clientId: "", // No public API available
    clientSecret: "",
    authorizationUrl: "",
    tokenUrl: "",
    scopes: [],
    usePkce: false,
    refreshBufferMs: 0,
  },
  bs: {
    platformId: "bs",
    clientId: process.env.BLUESKY_HANDLE ?? "",
    clientSecret: process.env.BLUESKY_APP_PASSWORD ?? "",
    authorizationUrl: "", // AT Protocol uses app passwords, not OAuth
    tokenUrl: "https://bsky.social/xrpc/com.atproto.server.createSession",
    revokeUrl: "https://bsky.social/xrpc/com.atproto.server.deleteSession",
    scopes: [],
    usePkce: false,
    refreshBufferMs: 0,
  },
  md: {
    platformId: "md",
    clientId: process.env.MASTODON_CLIENT_ID ?? "",
    clientSecret: process.env.MASTODON_CLIENT_SECRET ?? "",
    authorizationUrl: `${process.env.MASTODON_INSTANCE_URL ?? "https://mastodon.social"}/oauth/authorize`,
    tokenUrl: `${process.env.MASTODON_INSTANCE_URL ?? "https://mastodon.social"}/oauth/token`,
    revokeUrl: `${process.env.MASTODON_INSTANCE_URL ?? "https://mastodon.social"}/oauth/revoke`,
    scopes: ["read", "write"],
    usePkce: false,
    refreshBufferMs: 5 * 60 * 1000,
  },
  gm: {
    platformId: "gm",
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: ["https://www.googleapis.com/auth/business.manage"],
    usePkce: false,
    refreshBufferMs: 5 * 60 * 1000,
  },
  rf: {
    platformId: "rf",
    clientId: "", // Internal referral system, no API needed
    clientSecret: "",
    authorizationUrl: "",
    tokenUrl: "",
    scopes: [],
    usePkce: false,
    refreshBufferMs: 0,
  },
};

// ─── Token Storage ──────────────────────────────────────────────────────────

/**
 * Abstraction over token persistence. In-memory implementation for now;
 * production implementation would use encrypted Postgres columns or a
 * dedicated secrets manager (AWS Secrets Manager, HashiCorp Vault).
 */
export interface TokenStore {
  get(platformId: string, userId: string): Promise<OAuthToken | null>;
  set(token: OAuthToken): Promise<void>;
  delete(platformId: string, userId: string): Promise<void>;
  listByUser(userId: string): Promise<OAuthToken[]>;
  listExpiringSoon(windowMs: number): Promise<OAuthToken[]>;
}

class InMemoryTokenStore implements TokenStore {
  private tokens = new Map<string, OAuthToken>();

  private key(platformId: string, userId: string): string {
    return `${platformId}:${userId}`;
  }

  async get(platformId: string, userId: string): Promise<OAuthToken | null> {
    return this.tokens.get(this.key(platformId, userId)) ?? null;
  }

  async set(token: OAuthToken): Promise<void> {
    this.tokens.set(this.key(token.platformId, token.userId), token);
  }

  async delete(platformId: string, userId: string): Promise<void> {
    this.tokens.delete(this.key(platformId, userId));
  }

  async listByUser(userId: string): Promise<OAuthToken[]> {
    const results: OAuthToken[] = [];
    for (const token of this.tokens.values()) {
      if (token.userId === userId && !token.revoked) results.push(token);
    }
    return results;
  }

  async listExpiringSoon(windowMs: number): Promise<OAuthToken[]> {
    const cutoff = Date.now() + windowMs;
    const results: OAuthToken[] = [];
    for (const token of this.tokens.values()) {
      if (!token.revoked && token.expiresAt > 0 && token.expiresAt <= cutoff) {
        results.push(token);
      }
    }
    return results;
  }
}

// ─── OAuth Manager ──────────────────────────────────────────────────────────

export class OAuthManager {
  private store: TokenStore;
  private configs: Map<string, OAuthConfig>;
  /** Track in-flight refresh requests to avoid duplicate refreshes. */
  private refreshInFlight = new Map<string, Promise<TokenRefreshResult>>();

  constructor(store?: TokenStore) {
    this.store = store ?? new InMemoryTokenStore();
    this.configs = new Map(
      Object.entries(PLATFORM_OAUTH_CONFIGS)
    );
  }

  // ── Configuration ───────────────────────────────────────────────────────

  getConfig(platformId: string): OAuthConfig | null {
    return this.configs.get(platformId) ?? null;
  }

  isConfigured(platformId: string): boolean {
    const config = this.configs.get(platformId);
    if (!config) return false;
    // Platforms with no public API
    if (["br", "l8", "rf"].includes(platformId)) return false;
    // API key-only platforms (Yelp, TripAdvisor, Nextdoor, WhatsApp, Telegram)
    if (["yl", "ta", "nd", "wa", "tg"].includes(platformId)) return !!config.clientId;
    // AT Protocol (Bluesky) uses handle + app password
    if (platformId === "bs") return !!config.clientId && !!config.clientSecret;
    return !!config.clientId && !!config.clientSecret;
  }

  /**
   * Generate the authorization URL to redirect the user to for OAuth consent.
   * Returns the URL and a state parameter for CSRF protection.
   */
  generateAuthorizationUrl(
    platformId: string,
    redirectUri: string,
    state: string,
    codeChallenge?: string
  ): string | null {
    const config = this.configs.get(platformId);
    if (!config || !config.authorizationUrl) return null;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
      state,
    });

    if (config.usePkce && codeChallenge) {
      params.set("code_challenge", codeChallenge);
      params.set("code_challenge_method", "S256");
    }

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  // ── Token Exchange ──────────────────────────────────────────────────────

  /**
   * Exchange an authorization code for an access token.
   * This is called after the user completes the OAuth consent flow.
   */
  async exchangeCode(request: TokenExchangeRequest): Promise<OAuthToken> {
    const config = this.configs.get(request.platformId);
    if (!config) throw new Error(`No OAuth config for platform: ${request.platformId}`);

    const body: Record<string, string> = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: request.authorizationCode,
      redirect_uri: request.redirectUri,
      grant_type: "authorization_code",
    };

    if (config.usePkce && request.codeVerifier) {
      body.code_verifier = request.codeVerifier;
    }

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Token exchange failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const now = Date.now();

    const token: OAuthToken = {
      platformId: request.platformId,
      userId: request.userId,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      tokenType: data.token_type ?? "Bearer",
      scope: data.scope ?? config.scopes.join(" "),
      expiresAt: data.expires_in ? now + data.expires_in * 1000 : 0,
      issuedAt: now,
      platformUserId: data.user_id?.toString() ?? data.open_id ?? null,
      refreshCount: 0,
      revoked: false,
    };

    await this.store.set(token);
    return token;
  }

  // ── Token Access ────────────────────────────────────────────────────────

  /**
   * Get a valid access token for a platform+user pair.
   * Automatically refreshes if the token is expired or expiring soon.
   * Returns null if no token exists or refresh fails (user must re-authorize).
   */
  async getValidToken(platformId: string, userId: string): Promise<OAuthToken | null> {
    const token = await this.store.get(platformId, userId);
    if (!token || token.revoked) return null;

    // Check if token needs refresh
    const config = this.configs.get(platformId);
    const bufferMs = config?.refreshBufferMs ?? 5 * 60 * 1000;

    if (token.expiresAt > 0 && Date.now() >= token.expiresAt - bufferMs) {
      const result = await this.refreshToken(platformId, userId);
      if (result.success && result.token) return result.token;
      if (result.requiresReauth) return null;
      // If refresh failed but token isn't expired yet, use existing
      if (Date.now() < token.expiresAt) return token;
      return null;
    }

    return token;
  }

  // ── Token Refresh ───────────────────────────────────────────────────────

  /**
   * Refresh an access token using the refresh token.
   * Deduplicates concurrent refresh requests for the same token.
   */
  async refreshToken(platformId: string, userId: string): Promise<TokenRefreshResult> {
    const key = `${platformId}:${userId}`;

    // Deduplicate: if a refresh is already in flight for this key, wait for it
    const existing = this.refreshInFlight.get(key);
    if (existing) return existing;

    const promise = this.doRefresh(platformId, userId);
    this.refreshInFlight.set(key, promise);

    try {
      return await promise;
    } finally {
      this.refreshInFlight.delete(key);
    }
  }

  private async doRefresh(platformId: string, userId: string): Promise<TokenRefreshResult> {
    const token = await this.store.get(platformId, userId);
    if (!token) return { success: false, error: "No token found", requiresReauth: true };
    if (!token.refreshToken) return { success: false, error: "No refresh token", requiresReauth: true };

    const config = this.configs.get(platformId);
    if (!config) return { success: false, error: "No config", requiresReauth: true };

    try {
      const body: Record<string, string> = {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: token.refreshToken,
        grant_type: "refresh_token",
      };

      const response = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body).toString(),
      });

      if (!response.ok) {
        const status = response.status;
        // 400/401 usually means refresh token expired → user must re-authorize
        if (status === 400 || status === 401) {
          await this.store.delete(platformId, userId);
          return { success: false, error: "Refresh token expired", requiresReauth: true };
        }
        return { success: false, error: `Refresh failed (${status})`, requiresReauth: false };
      }

      const data = await response.json();
      const now = Date.now();

      const refreshed: OAuthToken = {
        ...token,
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? token.refreshToken, // Some platforms rotate refresh tokens
        expiresAt: data.expires_in ? now + data.expires_in * 1000 : token.expiresAt,
        issuedAt: now,
        refreshCount: token.refreshCount + 1,
      };

      await this.store.set(refreshed);
      return { success: true, token: refreshed, requiresReauth: false };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown refresh error",
        requiresReauth: false,
      };
    }
  }

  // ── Token Revocation ────────────────────────────────────────────────────

  async revokeToken(platformId: string, userId: string): Promise<boolean> {
    const token = await this.store.get(platformId, userId);
    if (!token) return false;

    const config = this.configs.get(platformId);

    // Try platform-side revocation if supported
    if (config?.revokeUrl && token.accessToken) {
      try {
        await fetch(config.revokeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: token.accessToken,
            client_id: config.clientId,
            client_secret: config.clientSecret,
          }).toString(),
        });
      } catch {
        // Log but don't fail — we still mark it revoked locally
      }
    }

    // Mark revoked locally
    await this.store.set({ ...token, revoked: true });
    return true;
  }

  // ── Maintenance ─────────────────────────────────────────────────────────

  /**
   * Proactively refresh tokens that are about to expire.
   * Run this on a cron schedule (e.g., every 15 minutes).
   */
  async refreshExpiringTokens(windowMs: number = 30 * 60 * 1000): Promise<{
    refreshed: number;
    failed: number;
    requiresReauth: string[];
  }> {
    const expiring = await this.store.listExpiringSoon(windowMs);
    let refreshed = 0;
    let failed = 0;
    const requiresReauth: string[] = [];

    for (const token of expiring) {
      const result = await this.refreshToken(token.platformId, token.userId);
      if (result.success) {
        refreshed++;
      } else {
        failed++;
        if (result.requiresReauth) {
          requiresReauth.push(`${token.platformId}:${token.userId}`);
        }
      }
    }

    return { refreshed, failed, requiresReauth };
  }

  /**
   * Get all connected platforms for a user.
   */
  async getUserConnections(userId: string): Promise<{ platformId: string; connected: boolean; expiresAt: number }[]> {
    const tokens = await this.store.listByUser(userId);
    return tokens.map((t) => ({
      platformId: t.platformId,
      connected: !t.revoked && (t.expiresAt === 0 || t.expiresAt > Date.now()),
      expiresAt: t.expiresAt,
    }));
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const oauthManager = new OAuthManager();
