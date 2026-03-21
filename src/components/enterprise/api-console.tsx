"use client";

import { useState, useCallback } from "react";

// ═══════════════ Types ═══════════════

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  environment: "sandbox" | "production";
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

interface ApiConsoleProps {
  apiKeys: ApiKey[];
  webhooks: Webhook[];
  usage: ApiUsageStats;
}

// ═══════════════ Constants ═══════════════

const WEBHOOK_EVENTS = [
  "campaign.created",
  "campaign.completed",
  "campaign.paused",
  "submission.received",
  "submission.approved",
  "submission.rejected",
  "payout.processed",
  "influencer.joined",
];

const CODE_EXAMPLES: Record<string, { label: string; code: string }> = {
  curl: {
    label: "cURL",
    code: `curl -X GET "https://api.socialperks.io/v1/campaigns" \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json"`,
  },
  javascript: {
    label: "JavaScript",
    code: `const response = await fetch('https://api.socialperks.io/v1/campaigns', {
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
    'https://api.socialperks.io/v1/campaigns',
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

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-brand-green/10 text-brand-green" },
  revoked: { label: "Revoked", className: "bg-brand-red/10 text-brand-red" },
  inactive: { label: "Inactive", className: "bg-brand-muted/10 text-brand-muted" },
  failing: { label: "Failing", className: "bg-brand-red/10 text-brand-red" },
};

// ═══════════════ Component ═══════════════

export default function ApiConsole({ apiKeys, webhooks, usage }: ApiConsoleProps) {
  const [activeTab, setActiveTab] = useState<"keys" | "webhooks" | "usage" | "docs">("keys");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [codeTab, setCodeTab] = useState<"curl" | "javascript" | "python">("curl");
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Webhook form state
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [webhookUrlError, setWebhookUrlError] = useState("");

  // Local state for keys, revoked keys, webhooks
  const [localKeys, setLocalKeys] = useState<ApiKey[]>([]);
  const [revokedKeyIds, setRevokedKeyIds] = useState<Set<string>>(new Set());
  const [removedWebhookIds, setRemovedWebhookIds] = useState<Set<string>>(new Set());
  const [localWebhooks, setLocalWebhooks] = useState<Webhook[]>([]);

  const allKeys = [...apiKeys, ...localKeys].map((k) =>
    revokedKeyIds.has(k.id) ? { ...k, status: "revoked" as const } : k
  );
  const filteredKeys = allKeys.filter((k) => k.environment === environment);

  const allWebhooks = [...webhooks, ...localWebhooks].filter(
    (w) => !removedWebhookIds.has(w.id)
  );

  const handleCopyKey = useCallback((keyId: string, keyPrefix: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${keyPrefix}...`);
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    }
  }, []);

  const toggleWebhookEvent = useCallback((event: string) => {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }, []);

  const handleGenerateKey = useCallback(() => {
    if (!newKeyName) return;
    const prefix = environment === "production" ? "sk_live_" : "sk_test_";
    const randomSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      name: newKeyName,
      keyPrefix: `${prefix}${randomSuffix}`,
      environment,
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: null,
      requestsToday: 0,
      status: "active",
    };
    setLocalKeys((prev) => [...prev, newKey]);
    setNewKeyName("");
    setShowCreateKey(false);
  }, [newKeyName, environment]);

  const handleRevokeKey = useCallback((keyId: string) => {
    setRevokedKeyIds((prev) => {
      const next = new Set(prev);
      next.add(keyId);
      return next;
    });
  }, []);

  const handleRemoveWebhook = useCallback((webhookId: string) => {
    setRemovedWebhookIds((prev) => {
      const next = new Set(prev);
      next.add(webhookId);
      return next;
    });
  }, []);

  const handleSaveWebhook = useCallback(() => {
    if (!webhookUrl || webhookEvents.length === 0) return;
    try {
      const parsed = new URL(webhookUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setWebhookUrlError("Please enter a valid HTTPS URL");
        return;
      }
    } catch {
      setWebhookUrlError("Please enter a valid HTTPS URL");
      return;
    }
    const newWebhook: Webhook = {
      id: crypto.randomUUID(),
      url: webhookUrl,
      events: [...webhookEvents],
      status: "active",
      lastTriggered: null,
      failureCount: 0,
    };
    setLocalWebhooks((prev) => [...prev, newWebhook]);
    setWebhookUrl("");
    setWebhookEvents([]);
    setWebhookUrlError("");
    setShowAddWebhook(false);
  }, [webhookUrl, webhookEvents]);

  const rateLimitPct = usage.rateLimit > 0 ? (usage.rateLimitUsed / usage.rateLimit) * 100 : 0;

  const tabs = [
    { id: "keys" as const, label: "API Keys" },
    { id: "webhooks" as const, label: "Webhooks" },
    { id: "usage" as const, label: "Usage" },
    { id: "docs" as const, label: "Code Examples" },
  ];

  return (
    <div className="min-h-screen bg-brand-bg font-body">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl italic text-brand-white">API Console</h1>
            <p className="mt-1 text-sm text-brand-muted">Manage API keys, webhooks, and integrations</p>
          </div>

          {/* Environment Toggle */}
          <div className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surface p-1" role="group" aria-label="Environment toggle">
            <button
              type="button"
              onClick={() => setEnvironment("sandbox")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                environment === "sandbox"
                  ? "bg-brand-amber/10 text-brand-amber"
                  : "text-brand-muted hover:text-brand-text"
              }`}
              aria-pressed={environment === "sandbox"}
            >
              Sandbox
            </button>
            <button
              type="button"
              onClick={() => setEnvironment("production")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                environment === "production"
                  ? "bg-brand-green/10 text-brand-green"
                  : "text-brand-muted hover:text-brand-text"
              }`}
              aria-pressed={environment === "production"}
            >
              Production
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="mt-6 border-b border-brand-border" aria-label="API console sections">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-brand-cyan text-brand-cyan"
                    : "text-brand-muted hover:text-brand-text"
                }`}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Tab Content */}
        <div className="mt-6" role="tabpanel">
          {/* API Keys */}
          {activeTab === "keys" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-brand-muted">
                  {filteredKeys.length} {environment} key{filteredKeys.length !== 1 ? "s" : ""}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateKey(!showCreateKey)}
                  className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90"
                >
                  Create Key
                </button>
              </div>

              {/* Create Key Form */}
              {showCreateKey && (
                <div className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-4">
                  <h3 className="text-sm font-medium text-brand-white">Create New API Key</h3>
                  <div className="mt-3 flex gap-3">
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                      placeholder="Key name (e.g., Production Server)"
                      aria-label="API key name"
                    />
                    <button
                      type="button"
                      disabled={!newKeyName}
                      onClick={handleGenerateKey}
                      className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Generate
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-brand-muted">
                    Environment: <span className="font-medium capitalize text-brand-text">{environment}</span>
                  </p>
                </div>
              )}

              {/* Keys List */}
              <div className="space-y-3">
                {filteredKeys.map((key) => {
                  const statusCfg = STATUS_STYLES[key.status];
                  return (
                    <div
                      key={key.id}
                      className="rounded-xl border border-brand-border bg-brand-surface p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-brand-white">{key.name}</h3>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.className}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <code className="font-mono text-xs text-brand-dim">{key.keyPrefix}...&bull;&bull;&bull;&bull;</code>
                            <button
                              type="button"
                              onClick={() => handleCopyKey(key.id, key.keyPrefix)}
                              className="text-xs text-brand-cyan transition-colors hover:text-brand-white"
                              aria-label={`Copy API key ${key.name}`}
                            >
                              {copiedKeyId === key.id ? "Copied!" : "Copy"}
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-brand-muted">
                            Created {key.createdAt}
                            {key.lastUsed && ` · Last used ${key.lastUsed}`}
                            {` · ${key.requestsToday} requests today`}
                          </p>
                        </div>
                        {key.status === "active" && (
                          <button
                            type="button"
                            onClick={() => handleRevokeKey(key.id)}
                            className="shrink-0 rounded-lg border border-brand-red/30 bg-brand-red/10 px-3 py-1.5 text-xs font-medium text-brand-red transition-colors hover:bg-brand-red/20"
                            aria-label={`Revoke API key ${key.name}`}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredKeys.length === 0 && (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-surface">
                  <p className="text-sm text-brand-muted">No {environment} API keys. Create one to get started.</p>
                </div>
              )}
            </div>
          )}

          {/* Webhooks */}
          {activeTab === "webhooks" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-brand-muted">
                  {allWebhooks.length} webhook{allWebhooks.length !== 1 ? "s" : ""} configured
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddWebhook(!showAddWebhook)}
                  className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90"
                >
                  Add Webhook
                </button>
              </div>

              {/* Add Webhook Form */}
              {showAddWebhook && (
                <div className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-4">
                  <h3 className="text-sm font-medium text-brand-white">Configure Webhook</h3>
                  <div className="mt-3">
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => { setWebhookUrl(e.target.value); setWebhookUrlError(""); }}
                      className={`w-full rounded-lg border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:outline-none focus:ring-1 ${
                        webhookUrlError
                          ? "border-brand-red focus:border-brand-red focus:ring-brand-red"
                          : "border-brand-border focus:border-brand-cyan focus:ring-brand-cyan"
                      }`}
                      placeholder="https://your-server.com/webhooks/socialperks"
                      aria-label="Webhook URL"
                      aria-invalid={!!webhookUrlError}
                    />
                    {webhookUrlError && (
                      <p className="mt-1 text-xs text-brand-red" role="alert">{webhookUrlError}</p>
                    )}
                  </div>
                  <p className="mt-3 text-xs font-medium text-brand-text">Events</p>
                  <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Webhook events">
                    {WEBHOOK_EVENTS.map((event) => {
                      const isSelected = webhookEvents.includes(event);
                      return (
                        <button
                          key={event}
                          type="button"
                          onClick={() => toggleWebhookEvent(event)}
                          className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                            isSelected
                              ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                              : "border-brand-border text-brand-muted hover:text-brand-text"
                          }`}
                          aria-pressed={isSelected}
                        >
                          {event}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={!webhookUrl || webhookEvents.length === 0}
                      onClick={handleSaveWebhook}
                      className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Save Webhook
                    </button>
                  </div>
                </div>
              )}

              {/* Webhooks List */}
              <div className="space-y-3">
                {allWebhooks.map((webhook) => {
                  const statusCfg = STATUS_STYLES[webhook.status];
                  return (
                    <div
                      key={webhook.id}
                      className="rounded-xl border border-brand-border bg-brand-surface p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <code className="truncate font-mono text-sm text-brand-text">{webhook.url}</code>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.className}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {webhook.events.map((event) => (
                              <span
                                key={event}
                                className="rounded-md bg-brand-elevated px-2 py-0.5 font-mono text-[10px] text-brand-dim"
                              >
                                {event}
                              </span>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-brand-muted">
                            {webhook.lastTriggered ? `Last triggered ${webhook.lastTriggered}` : "Never triggered"}
                            {webhook.failureCount > 0 && (
                              <span className="text-brand-red"> · {webhook.failureCount} failures</span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveWebhook(webhook.id)}
                          className="shrink-0 text-xs text-brand-muted transition-colors hover:text-brand-red"
                          aria-label={`Remove webhook ${webhook.url}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {allWebhooks.length === 0 && (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-surface">
                  <p className="text-sm text-brand-muted">No webhooks configured.</p>
                </div>
              )}
            </div>
          )}

          {/* Usage Stats */}
          {activeTab === "usage" && (
            <div className="space-y-6">
              {/* Rate Limit */}
              <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
                <h3 className="font-heading text-lg italic text-brand-white">Rate Limit</h3>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="font-mono text-3xl font-semibold text-brand-cyan">
                      {usage.rateLimitUsed.toLocaleString()}
                    </p>
                    <p className="text-sm text-brand-muted">
                      of {usage.rateLimit.toLocaleString()} requests/hour
                    </p>
                  </div>
                  <p className={`font-mono text-sm font-semibold ${
                    rateLimitPct > 80 ? "text-brand-red" : rateLimitPct > 50 ? "text-brand-amber" : "text-brand-green"
                  }`}>
                    {rateLimitPct.toFixed(1)}% used
                  </p>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-brand-elevated">
                  <div
                    className={`h-full rounded-full transition-all ${
                      rateLimitPct > 80 ? "bg-brand-red" : rateLimitPct > 50 ? "bg-brand-amber" : "bg-brand-green"
                    }`}
                    style={{ width: `${Math.min(rateLimitPct, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={usage.rateLimitUsed}
                    aria-valuemax={usage.rateLimit}
                    aria-label="Rate limit usage"
                  />
                </div>
              </div>

              {/* Request Stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">Requests Today</p>
                  <p className="mt-2 font-mono text-3xl font-semibold text-brand-green">
                    {usage.requestsToday.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">This Month</p>
                  <p className="mt-2 font-mono text-3xl font-semibold text-brand-purple">
                    {usage.requestsThisMonth.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Top Endpoints */}
              <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
                <h3 className="font-heading text-lg italic text-brand-white">Top Endpoints</h3>
                <div className="mt-4 overflow-hidden rounded-lg border border-brand-border">
                  <table className="w-full" role="table">
                    <thead>
                      <tr className="border-b border-brand-border bg-brand-bg/50">
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-brand-muted">
                          Endpoint
                        </th>
                        <th scope="col" className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-brand-muted">
                          Requests
                        </th>
                        <th scope="col" className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-brand-muted">
                          Avg Latency
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {usage.topEndpoints.map((ep) => (
                        <tr key={ep.endpoint} className="transition-colors hover:bg-brand-elevated/50">
                          <td className="px-4 py-2">
                            <code className="font-mono text-xs text-brand-cyan">{ep.endpoint}</code>
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-sm text-brand-text">
                            {ep.count.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-sm text-brand-dim">
                            {ep.avgLatency}ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Code Examples */}
          {activeTab === "docs" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
                <h3 className="font-heading text-lg italic text-brand-white">Quick Start</h3>
                <p className="mt-1 text-sm text-brand-muted">
                  Use these examples to integrate with the Social Perks API.
                </p>

                {/* Language Tabs */}
                <div className="mt-4 flex gap-2" role="tablist" aria-label="Code examples">
                  {(Object.keys(CODE_EXAMPLES) as Array<keyof typeof CODE_EXAMPLES>).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setCodeTab(lang as typeof codeTab)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        codeTab === lang
                          ? "bg-brand-cyan/10 text-brand-cyan"
                          : "bg-brand-elevated text-brand-muted hover:text-brand-text"
                      }`}
                      role="tab"
                      aria-selected={codeTab === lang}
                    >
                      {CODE_EXAMPLES[lang].label}
                    </button>
                  ))}
                </div>

                {/* Code Block */}
                <div className="mt-4 overflow-x-auto rounded-lg border border-brand-border bg-brand-bg p-4" role="tabpanel">
                  <pre className="font-mono text-sm leading-relaxed text-brand-text">
                    <code>{CODE_EXAMPLES[codeTab].code}</code>
                  </pre>
                </div>
              </div>

              {/* API Endpoints Reference */}
              <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
                <h3 className="font-heading text-lg italic text-brand-white">API Endpoints</h3>
                <div className="mt-4 space-y-2">
                  {[
                    { method: "GET", path: "/v1/campaigns", desc: "List all campaigns" },
                    { method: "POST", path: "/v1/campaigns", desc: "Create a campaign" },
                    { method: "GET", path: "/v1/campaigns/:id", desc: "Get campaign details" },
                    { method: "GET", path: "/v1/pricing", desc: "Query action pricing" },
                    { method: "GET", path: "/v1/influencers", desc: "Search influencers" },
                    { method: "POST", path: "/v1/submissions", desc: "Submit proof of completion" },
                    { method: "GET", path: "/v1/analytics", desc: "Campaign analytics" },
                  ].map((endpoint) => (
                    <div
                      key={`${endpoint.method}-${endpoint.path}`}
                      className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-bg px-4 py-2"
                    >
                      <span className={`shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                        endpoint.method === "GET"
                          ? "bg-brand-green/10 text-brand-green"
                          : "bg-brand-amber/10 text-brand-amber"
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="font-mono text-sm text-brand-cyan">{endpoint.path}</code>
                      <span className="text-xs text-brand-muted">{endpoint.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
