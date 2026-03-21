/**
 * Mobile Interoperability Layer
 *
 * Shared types and contracts between the web app and future mobile app.
 * Both platforms consume the same /api/v1/* endpoints.
 *
 * Architecture decisions for mobile readiness:
 * 1. All data flows through REST APIs — no direct localStorage coupling
 * 2. Shared type definitions in this file
 * 3. Offline-first data sync pattern
 * 4. Deep linking support
 * 5. Push notification contracts
 * 6. Platform-agnostic auth token format
 */

// ═══════════════ Auth Token ═══════════════
// Both web and mobile use the same token format.
// Web stores in httpOnly cookie, mobile in secure storage.

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  userId: string;
  role: "business_owner" | "influencer" | "admin" | "enterprise_manager";
}

// ═══════════════ Shared Views ═══════════════
// Mobile-friendly representations that both platforms render.

export interface SharedCampaignView {
  id: string;
  name: string;
  description: string;
  perkDisplay: string; // "15%" or "$5"
  tierLabel: string;
  tierColor: string;
  categoryLabel: string;
  actionCount: number;
  actionIcons: string[]; // Platform emojis
  estimatedValue: string; // "$42"
  effortLevel: number; // 0-5
  businessName: string;
  businessAvatar: string;
  status: "available" | "active" | "completed" | "expired";
}

export interface SharedProfileView {
  id: string;
  displayName: string;
  avatar: string;
  type: "business" | "influencer";
  // Business fields
  businessType?: string;
  businessSize?: string;
  location?: string;
  // Influencer fields
  tier?: string;
  followerCount?: number;
  engagementRate?: number;
  niches?: string[];
  platforms?: { name: string; handle: string; followers: number }[];
}

// ═══════════════ Offline Sync ═══════════════
// The mobile app works offline and syncs when connected.

export interface SyncPayload {
  lastSyncTimestamp: number;
  pendingActions: PendingAction[];
  deviceId: string;
  appVersion: string;
}

export interface PendingAction {
  id: string;
  type: "campaign_submit" | "review_submit" | "profile_update" | "perk_redeem";
  data: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
}

export interface SyncResponse {
  syncedAt: number;
  accepted: string[]; // IDs of accepted pending actions
  rejected: { id: string; reason: string }[];
  updates: {
    campaigns: SharedCampaignView[];
    notifications: MobileNotification[];
    profileUpdates: Record<string, unknown>;
  };
}

// ═══════════════ Deep Links ═══════════════
// URL scheme: socialperks://
// Web equivalent: https://socialperks.com

export interface DeepLinkAction {
  scheme: "campaign" | "profile" | "earn" | "redeem" | "settings";
  id?: string;
  params?: Record<string, string>;
}

export function generateDeepLink(action: DeepLinkAction): { mobile: string; web: string } {
  const base = `socialperks://${action.scheme}`;
  const webBase = `https://app.socialperks.com/${action.scheme}`;
  const params = action.id ? `/${action.id}` : "";
  const qs = action.params ? "?" + new URLSearchParams(action.params).toString() : "";

  return {
    mobile: `${base}${params}${qs}`,
    web: `${webBase}${params}${qs}`,
  };
}

// ═══════════════ Push Notifications ═══════════════

export interface MobileNotification {
  id: string;
  type: "campaign_completed" | "perk_earned" | "new_campaign" | "review_reminder" | "milestone";
  title: string;
  body: string;
  data: Record<string, unknown>;
  deepLink: DeepLinkAction;
  createdAt: number;
  read: boolean;
}

// ═══════════════ Feature Flags ═══════════════
// Shared between web and mobile for gradual rollouts.

export interface FeatureFlags {
  influencerMarketplace: boolean;
  aiRecommendations: boolean;
  qrCodes: boolean;
  multiLocation: boolean;
  offlineMode: boolean;
  pushNotifications: boolean;
  stripePayments: boolean;
  socialVerification: boolean;
  apiConsole: boolean;
  whiteLabel: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  influencerMarketplace: false,
  aiRecommendations: true,
  qrCodes: true,
  multiLocation: false,
  offlineMode: false,
  pushNotifications: false,
  stripePayments: false,
  socialVerification: false,
  apiConsole: false,
  whiteLabel: false,
};

// ═══════════════ App Version Contract ═══════════════
// Minimum API version required by each client.

export interface AppVersionContract {
  minApiVersion: string;
  currentApiVersion: string;
  deprecatedEndpoints: string[];
  newEndpoints: { path: string; since: string }[];
}

export const CURRENT_CONTRACT: AppVersionContract = {
  minApiVersion: "1.0.0",
  currentApiVersion: "1.0.0",
  deprecatedEndpoints: [],
  newEndpoints: [
    { path: "/api/v1/campaigns", since: "1.0.0" },
    { path: "/api/v1/pricing", since: "1.0.0" },
    { path: "/api/v1/actions", since: "1.0.0" },
    { path: "/api/v1/influencers", since: "1.0.0" },
    { path: "/api/v1/benchmarks", since: "1.0.0" },
    { path: "/api/v1/ai/generate", since: "1.0.0" },
    { path: "/api/v1/ai/recommend", since: "1.0.0" },
    { path: "/api/v1/auth", since: "1.0.0" },
  ],
};
