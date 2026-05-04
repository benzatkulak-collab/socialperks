/**
 * Unified OAuth env-var reader.
 *
 * Recon found two naming conventions in the codebase:
 *   - Routes used `OAUTH_<PLATFORMID>_CLIENT_ID` (e.g. OAUTH_IG_CLIENT_ID)
 *   - .env.example documented `INSTAGRAM_CLIENT_ID`, `TIKTOK_CLIENT_KEY`, etc.
 *
 * This module is the single source of truth. Routes should import
 * `getOAuthCredentials(platformId)` instead of reading `process.env` directly.
 *
 * Convention going forward: the canonical names are `OAUTH_<PLATFORMID>_CLIENT_ID`
 * and `OAUTH_<PLATFORMID>_CLIENT_SECRET` (using the 2-letter platform ID).
 * Legacy long-form names are still accepted as a fallback so that existing
 * deployments don't silently break.
 */

interface OAuthCredentials {
  clientId: string | null;
  clientSecret: string | null;
  /** True if both credentials were found in env (real OAuth possible). */
  configured: boolean;
}

// Long-form aliases that pre-existed in .env.example. Kept as a fallback
// so existing prod deployments don't break when a single naming convention
// is adopted.
const LEGACY_ID_ALIASES: Record<string, string[]> = {
  ig: ["INSTAGRAM_CLIENT_ID"],
  fb: ["FACEBOOK_CLIENT_ID", "META_CLIENT_ID"],
  tt: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_ID"],
  xw: ["TWITTER_CLIENT_ID", "X_CLIENT_ID"],
  yt: ["YOUTUBE_CLIENT_ID", "GOOGLE_CLIENT_ID"],
  li: ["LINKEDIN_CLIENT_ID"],
  pi: ["PINTEREST_CLIENT_ID"],
  th: ["THREADS_CLIENT_ID"],
  sc: ["SNAPCHAT_CLIENT_ID"],
  tw: ["TWITCH_CLIENT_ID"],
  rd: ["REDDIT_CLIENT_ID"],
};

const LEGACY_SECRET_ALIASES: Record<string, string[]> = {
  ig: ["INSTAGRAM_CLIENT_SECRET"],
  fb: ["FACEBOOK_CLIENT_SECRET", "META_CLIENT_SECRET"],
  tt: ["TIKTOK_CLIENT_SECRET"],
  xw: ["TWITTER_CLIENT_SECRET", "X_CLIENT_SECRET"],
  yt: ["YOUTUBE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
  li: ["LINKEDIN_CLIENT_SECRET"],
  pi: ["PINTEREST_CLIENT_SECRET"],
  th: ["THREADS_CLIENT_SECRET"],
  sc: ["SNAPCHAT_CLIENT_SECRET"],
  tw: ["TWITCH_CLIENT_SECRET"],
  rd: ["REDDIT_CLIENT_SECRET"],
};

function readFirstEnv(...keys: string[]): string | null {
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.length > 0) return v;
  }
  return null;
}

export function getOAuthCredentials(platformId: string): OAuthCredentials {
  const id = platformId.toLowerCase();
  const upper = id.toUpperCase();

  const canonicalIdKey = `OAUTH_${upper}_CLIENT_ID`;
  const canonicalSecretKey = `OAUTH_${upper}_CLIENT_SECRET`;
  const idAliases = LEGACY_ID_ALIASES[id] ?? [];
  const secretAliases = LEGACY_SECRET_ALIASES[id] ?? [];

  const clientId = readFirstEnv(canonicalIdKey, ...idAliases);
  const clientSecret = readFirstEnv(canonicalSecretKey, ...secretAliases);

  return {
    clientId,
    clientSecret,
    configured: clientId !== null && clientSecret !== null,
  };
}

/**
 * Convenience: read just the client ID. Returns "demo-client-id" as a
 * placeholder when nothing is configured (callers can detect this and
 * surface a "demo mode" notice to users).
 */
export function getOAuthClientId(platformId: string): string {
  return getOAuthCredentials(platformId).clientId ?? "demo-client-id";
}

export function isOAuthConfigured(platformId: string): boolean {
  return getOAuthCredentials(platformId).configured;
}
