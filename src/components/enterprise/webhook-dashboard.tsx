"use client";

import { useState, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WEBHOOK_EVENTS } from "./api-console-types";

// ═══════════════ Types ═══════════════

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  status: "active" | "inactive" | "failing";
  failureCount: number;
  lastTriggered: string | null;
  lastSuccess: string | null;
  lastFailure: string | null;
  createdAt: string;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  status: "pending" | "delivered" | "failed" | "dead";
  statusCode: number | null;
  attempts: number;
  maxAttempts: number;
  responseTime: number | null;
  error: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

interface WebhookDashboardProps {
  businessId?: string | null;
}

// ═══════════════ Demo Data ═══════════════

function createDemoWebhooks(): WebhookEndpoint[] {
  return [
    {
      id: "whk_demo_1",
      url: "https://api.yourapp.com/webhooks/socialperks",
      events: ["campaign.created", "campaign.completed", "submission.approved"],
      secret: "whsec_abc1....",
      status: "active",
      failureCount: 0,
      lastTriggered: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      lastSuccess: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      lastFailure: null,
      createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    },
    {
      id: "whk_demo_2",
      url: "https://hooks.slack.com/services/T01/B02/xyz",
      events: ["submission.received", "payout.processed"],
      secret: "whsec_def2....",
      status: "failing",
      failureCount: 4,
      lastTriggered: new Date(Date.now() - 6 * 3_600_000).toISOString(),
      lastSuccess: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      lastFailure: new Date(Date.now() - 6 * 3_600_000).toISOString(),
      createdAt: new Date(Date.now() - 60 * 86_400_000).toISOString(),
    },
    {
      id: "whk_demo_3",
      url: "https://staging.internal.corp/events",
      events: ["*"],
      secret: "whsec_ghi3....",
      status: "inactive",
      failureCount: 12,
      lastTriggered: new Date(Date.now() - 14 * 86_400_000).toISOString(),
      lastSuccess: null,
      lastFailure: new Date(Date.now() - 14 * 86_400_000).toISOString(),
      createdAt: new Date(Date.now() - 90 * 86_400_000).toISOString(),
    },
  ];
}

function createDemoDeliveries(): WebhookDelivery[] {
  const now = Date.now();
  const hour = 3_600_000;

  return [
    {
      id: "dlv_1",
      webhookId: "whk_demo_1",
      eventType: "submission.approved",
      status: "delivered",
      statusCode: 200,
      attempts: 1,
      maxAttempts: 6,
      responseTime: 142,
      error: null,
      createdAt: new Date(now - 2 * hour).toISOString(),
      deliveredAt: new Date(now - 2 * hour + 142).toISOString(),
    },
    {
      id: "dlv_2",
      webhookId: "whk_demo_1",
      eventType: "campaign.created",
      status: "delivered",
      statusCode: 200,
      attempts: 1,
      maxAttempts: 6,
      responseTime: 98,
      error: null,
      createdAt: new Date(now - 5 * hour).toISOString(),
      deliveredAt: new Date(now - 5 * hour + 98).toISOString(),
    },
    {
      id: "dlv_3",
      webhookId: "whk_demo_1",
      eventType: "campaign.completed",
      status: "delivered",
      statusCode: 200,
      attempts: 1,
      maxAttempts: 6,
      responseTime: 205,
      error: null,
      createdAt: new Date(now - 24 * hour).toISOString(),
      deliveredAt: new Date(now - 24 * hour + 205).toISOString(),
    },
    {
      id: "dlv_4",
      webhookId: "whk_demo_2",
      eventType: "submission.received",
      status: "failed",
      statusCode: 503,
      attempts: 3,
      maxAttempts: 6,
      responseTime: null,
      error: "HTTP 503: Service Unavailable",
      createdAt: new Date(now - 6 * hour).toISOString(),
      deliveredAt: null,
    },
    {
      id: "dlv_5",
      webhookId: "whk_demo_2",
      eventType: "payout.processed",
      status: "dead",
      statusCode: 500,
      attempts: 6,
      maxAttempts: 6,
      responseTime: null,
      error: "HTTP 500: Internal Server Error",
      createdAt: new Date(now - 48 * hour).toISOString(),
      deliveredAt: null,
    },
    {
      id: "dlv_6",
      webhookId: "whk_demo_2",
      eventType: "submission.received",
      status: "delivered",
      statusCode: 200,
      attempts: 2,
      maxAttempts: 6,
      responseTime: 312,
      error: null,
      createdAt: new Date(now - 72 * hour).toISOString(),
      deliveredAt: new Date(now - 71 * hour).toISOString(),
    },
  ];
}

// ═══════════════ Helpers ═══════════════

const STATUS_CONFIG: Record<string, { label: string; color: "green" | "red" | "amber" | "muted" | "cyan" }> = {
  active: { label: "Active", color: "green" },
  inactive: { label: "Inactive", color: "muted" },
  failing: { label: "Failing", color: "red" },
};

const DELIVERY_STATUS_CONFIG: Record<string, { label: string; color: "green" | "red" | "amber" | "muted" | "cyan" }> = {
  pending: { label: "Pending", color: "amber" },
  delivered: { label: "Delivered", color: "green" },
  failed: { label: "Failed", color: "red" },
  dead: { label: "Dead Letter", color: "muted" },
};

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ═══════════════ Component ═══════════════

export default function WebhookDashboard({ businessId: _businessId }: WebhookDashboardProps) {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(createDemoWebhooks);
  const [deliveries] = useState<WebhookDelivery[]>(createDemoDeliveries);
  const [activeTab, setActiveTab] = useState<"overview" | "deliveries">("overview");
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newUrlError, setNewUrlError] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  // Edit form state
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editEvents, setEditEvents] = useState<string[]>([]);

  // Testing state
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ webhookId: string; success: boolean; message: string } | null>(null);

  // Filter deliveries
  const filteredDeliveries = useMemo(() => {
    if (!selectedWebhookId) return deliveries;
    return deliveries.filter((d) => d.webhookId === selectedWebhookId);
  }, [deliveries, selectedWebhookId]);

  // Webhooks with failure alerts
  const failingWebhooks = useMemo(
    () => webhooks.filter((w) => w.status === "failing" || w.failureCount >= 3),
    [webhooks]
  );

  // Create webhook handler
  const handleCreate = useCallback(() => {
    if (!newUrl || newEvents.length === 0) return;

    try {
      const parsed = new URL(newUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setNewUrlError("Please enter a valid HTTPS URL");
        return;
      }
    } catch {
      setNewUrlError("Please enter a valid URL");
      return;
    }

    const secret = `whsec_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const webhook: WebhookEndpoint = {
      id: `whk_${crypto.randomUUID().slice(0, 8)}`,
      url: newUrl,
      events: [...newEvents],
      secret,
      status: "active",
      failureCount: 0,
      lastTriggered: null,
      lastSuccess: null,
      lastFailure: null,
      createdAt: new Date().toISOString(),
    };

    setWebhooks((prev) => [...prev, webhook]);
    setNewSecret(secret);
    setNewUrl("");
    setNewEvents([]);
    setNewUrlError("");
  }, [newUrl, newEvents]);

  const handleDelete = useCallback((webhookId: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
    if (selectedWebhookId === webhookId) setSelectedWebhookId(null);
    if (editingWebhookId === webhookId) setEditingWebhookId(null);
  }, [selectedWebhookId, editingWebhookId]);

  const handleToggleStatus = useCallback((webhookId: string) => {
    setWebhooks((prev) =>
      prev.map((w) => {
        if (w.id !== webhookId) return w;
        const newStatus = w.status === "active" ? "inactive" : "active";
        return {
          ...w,
          status: newStatus,
          failureCount: newStatus === "active" ? 0 : w.failureCount,
        };
      })
    );
  }, []);

  const handleStartEdit = useCallback(
    (webhook: WebhookEndpoint) => {
      setEditingWebhookId(webhook.id);
      setEditUrl(webhook.url);
      setEditEvents([...webhook.events]);
    },
    []
  );

  const handleSaveEdit = useCallback(() => {
    if (!editingWebhookId || !editUrl || editEvents.length === 0) return;

    setWebhooks((prev) =>
      prev.map((w) => {
        if (w.id !== editingWebhookId) return w;
        return { ...w, url: editUrl, events: [...editEvents] };
      })
    );
    setEditingWebhookId(null);
  }, [editingWebhookId, editUrl, editEvents]);

  const handleTest = useCallback(
    (webhookId: string) => {
      setTestingWebhookId(webhookId);
      setTestResult(null);

      // Simulate test delivery
      setTimeout(() => {
        const webhook = webhooks.find((w) => w.id === webhookId);
        if (!webhook) return;

        const success = webhook.status === "active";
        setTestResult({
          webhookId,
          success,
          message: success
            ? "Test event delivered successfully (200 OK)"
            : "Test failed: endpoint returned error",
        });
        setTestingWebhookId(null);
      }, 1500);
    },
    [webhooks]
  );

  const toggleNewEvent = useCallback((event: string) => {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }, []);

  const toggleEditEvent = useCallback((event: string) => {
    setEditEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }, []);

  const tabs = [
    { id: "overview" as const, label: "Endpoints" },
    { id: "deliveries" as const, label: "Delivery History" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl italic text-brand-white">Webhook Management</h2>
          <p className="mt-1 text-sm text-brand-muted">
            {webhooks.length} endpoint{webhooks.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setShowCreateForm(true);
            setNewSecret(null);
          }}
        >
          Add Webhook
        </Button>
      </div>

      {/* Failure Alerts */}
      {failingWebhooks.length > 0 && (
        <div className="rounded-xl border border-brand-red/30 bg-brand-red/5 p-4" role="alert">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-brand-red text-lg" aria-hidden="true">!</span>
            <div>
              <h3 className="text-sm font-semibold text-brand-red">Webhook Failures Detected</h3>
              <ul className="mt-2 space-y-1">
                {failingWebhooks.map((w) => (
                  <li key={w.id} className="text-xs text-brand-red/80">
                    <code className="font-mono">{w.url}</code>
                    {" "}&mdash; {w.failureCount} consecutive failure{w.failureCount !== 1 ? "s" : ""}
                    {w.status === "inactive" && " (auto-disabled)"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <nav className="border-b border-brand-border" aria-label="Webhook dashboard sections">
        <div className="flex gap-1">
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

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-brand-white">Create Webhook Endpoint</h3>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewSecret(null);
              }}
              className="text-xs text-brand-muted hover:text-brand-text"
            >
              Cancel
            </button>
          </div>

          {/* Show secret if just created */}
          {newSecret && (
            <div className="mt-3 rounded-lg border border-brand-green/30 bg-brand-green/5 p-3">
              <p className="text-xs font-medium text-brand-green">Webhook created! Save this secret -- it will not be shown again.</p>
              <code className="mt-1 block break-all font-mono text-xs text-brand-green/80">{newSecret}</code>
            </div>
          )}

          {!newSecret && (
            <>
              <div className="mt-4">
                <label htmlFor="webhook-url" className="mb-1.5 block text-xs font-medium text-brand-muted">
                  Endpoint URL
                </label>
                <input
                  id="webhook-url"
                  type="url"
                  value={newUrl}
                  onChange={(e) => {
                    setNewUrl(e.target.value);
                    setNewUrlError("");
                  }}
                  className={`w-full rounded-lg border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:outline-none focus:ring-1 ${
                    newUrlError
                      ? "border-brand-red focus:border-brand-red focus:ring-brand-red"
                      : "border-brand-border focus:border-brand-cyan focus:ring-brand-cyan"
                  }`}
                  placeholder="https://your-server.com/webhooks/socialperks"
                  aria-invalid={!!newUrlError}
                />
                {newUrlError && (
                  <p className="mt-1 text-xs text-brand-red" role="alert">{newUrlError}</p>
                )}
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-brand-muted">Event Types</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Event types to subscribe to">
                  {WEBHOOK_EVENTS.map((event) => {
                    const selected = newEvents.includes(event);
                    return (
                      <button
                        key={event}
                        type="button"
                        onClick={() => toggleNewEvent(event)}
                        className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                          selected
                            ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                            : "border-brand-border text-brand-muted hover:text-brand-text"
                        }`}
                        aria-pressed={selected}
                      >
                        {event}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreate}
                  disabled={!newUrl || newEvents.length === 0}
                >
                  Create Webhook
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {webhooks.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-surface">
              <p className="text-sm text-brand-muted">No webhooks configured yet.</p>
            </div>
          ) : (
            webhooks.map((webhook) => {
              const statusCfg = STATUS_CONFIG[webhook.status];
              const isEditing = editingWebhookId === webhook.id;

              return (
                <div
                  key={webhook.id}
                  className={`rounded-xl border bg-brand-surface p-5 ${
                    webhook.status === "failing"
                      ? "border-brand-red/30"
                      : "border-brand-border"
                  }`}
                >
                  {isEditing ? (
                    /* Edit Mode */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-brand-white">Edit Webhook</h3>
                        <button
                          type="button"
                          onClick={() => setEditingWebhookId(null)}
                          className="text-xs text-brand-muted hover:text-brand-text"
                        >
                          Cancel
                        </button>
                      </div>
                      <div>
                        <label htmlFor={`edit-url-${webhook.id}`} className="mb-1 block text-xs font-medium text-brand-muted">
                          URL
                        </label>
                        <input
                          id={`edit-url-${webhook.id}`}
                          type="url"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                        />
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium text-brand-muted">Events</p>
                        <div className="flex flex-wrap gap-2">
                          {WEBHOOK_EVENTS.map((event) => {
                            const sel = editEvents.includes(event);
                            return (
                              <button
                                key={event}
                                type="button"
                                onClick={() => toggleEditEvent(event)}
                                className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                                  sel
                                    ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                                    : "border-brand-border text-brand-muted hover:text-brand-text"
                                }`}
                                aria-pressed={sel}
                              >
                                {event}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingWebhookId(null)}>
                          Cancel
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="truncate font-mono text-sm text-brand-text">{webhook.url}</code>
                            <Badge color={statusCfg.color} size="sm" dot>
                              {statusCfg.label}
                            </Badge>
                            {webhook.failureCount > 0 && (
                              <Badge color="red" size="sm" variant="outline">
                                {webhook.failureCount} failure{webhook.failureCount !== 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>

                          {/* Events */}
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

                          {/* Timing info */}
                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-brand-muted">
                            <span>Created {formatRelativeTime(webhook.createdAt)}</span>
                            <span>Last triggered: {formatRelativeTime(webhook.lastTriggered)}</span>
                            {webhook.lastSuccess && (
                              <span className="text-brand-green">
                                Last success: {formatRelativeTime(webhook.lastSuccess)}
                              </span>
                            )}
                            {webhook.lastFailure && (
                              <span className="text-brand-red">
                                Last failure: {formatRelativeTime(webhook.lastFailure)}
                              </span>
                            )}
                          </div>

                          {/* Secret (masked) */}
                          <div className="mt-2">
                            <span className="text-xs text-brand-muted">Secret: </span>
                            <code className="font-mono text-xs text-brand-dim">{webhook.secret}</code>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTest(webhook.id)}
                            loading={testingWebhookId === webhook.id}
                            disabled={webhook.status === "inactive"}
                          >
                            Test
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(webhook)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(webhook.id)}
                          >
                            {webhook.status === "active" || webhook.status === "failing"
                              ? "Disable"
                              : "Enable"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(webhook.id)}
                            className="text-brand-red hover:text-brand-red"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      {/* Test result */}
                      {testResult && testResult.webhookId === webhook.id && (
                        <div
                          className={`mt-3 rounded-lg border p-3 ${
                            testResult.success
                              ? "border-brand-green/30 bg-brand-green/5"
                              : "border-brand-red/30 bg-brand-red/5"
                          }`}
                        >
                          <p className={`text-xs font-medium ${testResult.success ? "text-brand-green" : "text-brand-red"}`}>
                            {testResult.message}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Deliveries Tab */}
      {activeTab === "deliveries" && (
        <div className="space-y-4">
          {/* Webhook filter */}
          <div className="flex items-center gap-3">
            <label htmlFor="delivery-webhook-filter" className="text-xs font-medium text-brand-muted">
              Filter by endpoint:
            </label>
            <select
              id="delivery-webhook-filter"
              value={selectedWebhookId ?? "all"}
              onChange={(e) =>
                setSelectedWebhookId(e.target.value === "all" ? null : e.target.value)
              }
              className="rounded-lg border border-brand-border bg-brand-bg px-3 py-1.5 text-sm text-brand-text focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
            >
              <option value="all">All Endpoints</option>
              {webhooks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.url.length > 40 ? `${w.url.slice(0, 40)}...` : w.url}
                </option>
              ))}
            </select>
            <span className="text-xs text-brand-muted">
              {filteredDeliveries.length} deliver{filteredDeliveries.length !== 1 ? "ies" : "y"}
            </span>
          </div>

          {/* Delivery Table */}
          <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
            {/* Header */}
            <div className="hidden border-b border-brand-border bg-brand-elevated/50 px-4 py-3 sm:grid sm:grid-cols-12 sm:gap-4">
              <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-brand-muted">
                Status
              </div>
              <div className="col-span-3 text-xs font-medium uppercase tracking-wider text-brand-muted">
                Event
              </div>
              <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-brand-muted">
                Status Code
              </div>
              <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-brand-muted">
                Response Time
              </div>
              <div className="col-span-1 text-xs font-medium uppercase tracking-wider text-brand-muted">
                Retries
              </div>
              <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-brand-muted">
                Timestamp
              </div>
            </div>

            {filteredDeliveries.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-brand-muted">No delivery records found.</p>
              </div>
            ) : (
              <div className="divide-y divide-brand-border">
                {filteredDeliveries.map((delivery) => {
                  const statusCfg = DELIVERY_STATUS_CONFIG[delivery.status];
                  return (
                    <div key={delivery.id} className="px-4 py-3">
                      {/* Desktop */}
                      <div className="hidden sm:grid sm:grid-cols-12 sm:items-center sm:gap-4">
                        <div className="col-span-2">
                          <Badge color={statusCfg.color} size="sm" dot>
                            {statusCfg.label}
                          </Badge>
                        </div>
                        <div className="col-span-3">
                          <span className="font-mono text-xs text-brand-dim">{delivery.eventType}</span>
                        </div>
                        <div className="col-span-2">
                          {delivery.statusCode ? (
                            <span
                              className={`font-mono text-xs ${
                                delivery.statusCode >= 200 && delivery.statusCode < 300
                                  ? "text-brand-green"
                                  : "text-brand-red"
                              }`}
                            >
                              {delivery.statusCode}
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-brand-muted">--</span>
                          )}
                        </div>
                        <div className="col-span-2">
                          {delivery.responseTime ? (
                            <span className="font-mono text-xs text-brand-dim">{delivery.responseTime}ms</span>
                          ) : (
                            <span className="font-mono text-xs text-brand-muted">--</span>
                          )}
                        </div>
                        <div className="col-span-1">
                          <span className="font-mono text-xs text-brand-dim">
                            {delivery.attempts}/{delivery.maxAttempts}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="font-mono text-xs text-brand-dim">
                            {formatFullDate(delivery.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Mobile */}
                      <div className="sm:hidden">
                        <div className="flex items-center justify-between gap-2">
                          <Badge color={statusCfg.color} size="sm" dot>
                            {statusCfg.label}
                          </Badge>
                          <span className="font-mono text-xs text-brand-dim">
                            {formatRelativeTime(delivery.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-xs text-brand-dim">{delivery.eventType}</p>
                        <div className="mt-1 flex gap-3 text-xs text-brand-muted">
                          {delivery.statusCode && <span>HTTP {delivery.statusCode}</span>}
                          {delivery.responseTime && <span>{delivery.responseTime}ms</span>}
                          <span>
                            {delivery.attempts}/{delivery.maxAttempts} attempts
                          </span>
                        </div>
                      </div>

                      {/* Error display */}
                      {delivery.error && (
                        <div className="mt-2 rounded-lg bg-brand-red/5 px-3 py-1.5">
                          <p className="font-mono text-xs text-brand-red/80">{delivery.error}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
