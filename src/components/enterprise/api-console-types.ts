// ═══════════════ API Console Types ═══════════════

export type ApiKeyScope = "read" | "read-write" | "admin";

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  environment: "sandbox" | "production";
  scope: ApiKeyScope;
  createdAt: string;
  lastUsed: string | null;
  requestsToday: number;
  status: "active" | "revoked";
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: "active" | "inactive" | "failing";
  lastTriggered: string | null;
  failureCount: number;
}

export interface ApiUsageStats {
  requestsToday: number;
  requestsThisMonth: number;
  rateLimit: number;
  rateLimitUsed: number;
  topEndpoints: { endpoint: string; count: number; avgLatency: number }[];
}

export interface ApiConsoleProps {
  apiKeys: ApiKey[];
  webhooks: Webhook[];
  usage: ApiUsageStats;
}

// ═══════════════ Constants ═══════════════

export const WEBHOOK_EVENTS = [
  "campaign.created",
  "campaign.completed",
  "campaign.paused",
  "submission.received",
  "submission.approved",
  "submission.rejected",
  "payout.processed",
  "influencer.joined",
];

export const CODE_EXAMPLES: Record<string, { label: string; code: string }> = {
  curl: {
    label: "cURL",
    code: `curl -X GET "https://api.socialperks.app/v1/campaigns" \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json"`,
  },
  javascript: {
    label: "JavaScript",
    code: `const response = await fetch('https://api.socialperks.app/v1/campaigns', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer sk_live_your_api_key',
    'Content-Type': 'application/json',
  },
});

const campaigns = await response.json();
// campaigns: { data: Campaign[], meta: { total: number } }`,
  },
  python: {
    label: "Python",
    code: `import requests

response = requests.get(
    'https://api.socialperks.app/v1/campaigns',
    headers={
        'Authorization': 'Bearer sk_live_your_api_key',
        'Content-Type': 'application/json',
    }
)

campaigns = response.json()
# campaigns: { "data": [...], "meta": { "total": int } }`,
  },
};

// ═══════════════ Helpers ═══════════════

export const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-brand-green/10 text-brand-green" },
  revoked: { label: "Revoked", className: "bg-brand-red/10 text-brand-red" },
  inactive: { label: "Inactive", className: "bg-brand-muted/10 text-brand-muted" },
  failing: { label: "Failing", className: "bg-brand-red/10 text-brand-red" },
};

export const SCOPE_OPTIONS: { value: ApiKeyScope; label: string; description: string }[] = [
  { value: "read", label: "Read Only", description: "Campaigns, submissions, analytics, programs, exchange (read)" },
  { value: "read-write", label: "Read & Write", description: "All read permissions plus create/modify campaigns, submissions, programs, and orders" },
  { value: "admin", label: "Full Access", description: "All permissions including billing and webhook management" },
];

export const SCOPE_STYLES: Record<ApiKeyScope, { label: string; className: string }> = {
  read: { label: "Read Only", className: "bg-brand-cyan/10 text-brand-cyan" },
  "read-write": { label: "Read & Write", className: "bg-brand-amber/10 text-brand-amber" },
  admin: { label: "Full Access", className: "bg-brand-pink/10 text-brand-pink" },
};
