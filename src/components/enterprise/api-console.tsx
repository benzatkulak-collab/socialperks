"use client";

import { useState, useCallback } from "react";
import { STATUS_STYLES } from "./api-console-types";
import type { ApiKey, Webhook, ApiConsoleProps } from "./api-console-types";
import { ApiKeysSection } from "./api-keys-section";
import { WebhooksSection } from "./webhooks-section";
import { ApiUsageSection } from "./api-usage-section";
import { ApiDocsSection } from "./api-docs-section";

// Re-export all types so existing imports from "@/components/enterprise/api-console" keep working
export type { ApiKey, Webhook, ApiUsageStats } from "./api-console-types";

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

  const handleWebhookUrlChange = useCallback((url: string) => {
    setWebhookUrl(url);
    setWebhookUrlError("");
  }, []);

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
          {activeTab === "keys" && (
            <ApiKeysSection
              filteredKeys={filteredKeys}
              environment={environment}
              showCreateKey={showCreateKey}
              newKeyName={newKeyName}
              copiedKeyId={copiedKeyId}
              statusStyles={STATUS_STYLES}
              onToggleCreateKey={() => setShowCreateKey(!showCreateKey)}
              onNewKeyNameChange={setNewKeyName}
              onGenerateKey={handleGenerateKey}
              onCopyKey={handleCopyKey}
              onRevokeKey={handleRevokeKey}
            />
          )}

          {activeTab === "webhooks" && (
            <WebhooksSection
              allWebhooks={allWebhooks}
              showAddWebhook={showAddWebhook}
              webhookUrl={webhookUrl}
              webhookEvents={webhookEvents}
              webhookUrlError={webhookUrlError}
              statusStyles={STATUS_STYLES}
              onToggleAddWebhook={() => setShowAddWebhook(!showAddWebhook)}
              onWebhookUrlChange={handleWebhookUrlChange}
              onToggleWebhookEvent={toggleWebhookEvent}
              onSaveWebhook={handleSaveWebhook}
              onRemoveWebhook={handleRemoveWebhook}
            />
          )}

          {activeTab === "usage" && (
            <ApiUsageSection usage={usage} />
          )}

          {activeTab === "docs" && (
            <ApiDocsSection
              codeTab={codeTab}
              onCodeTabChange={setCodeTab}
            />
          )}
        </div>
      </div>
    </div>
  );
}
