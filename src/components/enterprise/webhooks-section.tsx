"use client";

import type { Webhook } from "./api-console-types";
import { WEBHOOK_EVENTS } from "./api-console-types";

// ═══════════════ Types ═══════════════

interface WebhooksSectionProps {
  allWebhooks: Webhook[];
  showAddWebhook: boolean;
  webhookUrl: string;
  webhookEvents: string[];
  webhookUrlError: string;
  statusStyles: Record<string, { label: string; className: string }>;
  onToggleAddWebhook: () => void;
  onWebhookUrlChange: (url: string) => void;
  onToggleWebhookEvent: (event: string) => void;
  onSaveWebhook: () => void;
  onRemoveWebhook: (webhookId: string) => void;
}

// ═══════════════ Component ═══════════════

export function WebhooksSection({
  allWebhooks,
  showAddWebhook,
  webhookUrl,
  webhookEvents,
  webhookUrlError,
  statusStyles,
  onToggleAddWebhook,
  onWebhookUrlChange,
  onToggleWebhookEvent,
  onSaveWebhook,
  onRemoveWebhook,
}: WebhooksSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-muted">
          {allWebhooks.length} webhook{allWebhooks.length !== 1 ? "s" : ""} configured
        </p>
        <button
          type="button"
          onClick={onToggleAddWebhook}
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
              onChange={(e) => onWebhookUrlChange(e.target.value)}
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
                  onClick={() => onToggleWebhookEvent(event)}
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
              onClick={onSaveWebhook}
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
          const statusCfg = statusStyles[webhook.status];
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
                  onClick={() => onRemoveWebhook(webhook.id)}
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
  );
}
