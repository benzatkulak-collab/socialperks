"use client";

import { useState, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AUDIT_ACTIONS } from "@/lib/audit";
import type { AuditAction } from "@/lib/audit";

// ═══════════════ Types ═══════════════

interface AuditEvent {
  id: string;
  timestamp: string;
  actor: {
    userId: string;
    email?: string;
    role: string;
    ip?: string;
  };
  action: string;
  resource: {
    type: string;
    id: string;
  };
  metadata?: Record<string, unknown>;
  requestId?: string;
}

interface AuditLogProps {
  businessId?: string | null;
}

// ═══════════════ Demo Data ═══════════════

function createDemoAuditEvents(): AuditEvent[] {
  const now = Date.now();
  const hour = 3_600_000;
  const day = 24 * hour;

  return [
    {
      id: "aud_demo_1",
      timestamp: new Date(now - 0.5 * hour).toISOString(),
      actor: { userId: "u1", email: "sarah@freshfit.com", role: "admin", ip: "192.168.1.10" },
      action: "campaign_created",
      resource: { type: "campaign", id: "cmp_001" },
      metadata: { campaignName: "Summer Fitness Challenge", platform: "Instagram" },
    },
    {
      id: "aud_demo_2",
      timestamp: new Date(now - 1.2 * hour).toISOString(),
      actor: { userId: "u2", email: "mike@freshfit.com", role: "business_owner", ip: "10.0.0.42" },
      action: "submission_reviewed",
      resource: { type: "submission", id: "sub_045" },
      metadata: { verdict: "approved", campaignId: "cmp_001" },
    },
    {
      id: "aud_demo_3",
      timestamp: new Date(now - 3 * hour).toISOString(),
      actor: { userId: "u1", email: "sarah@freshfit.com", role: "admin", ip: "192.168.1.10" },
      action: "api_key_created",
      resource: { type: "api_key", id: "ak_live_003" },
      metadata: { keyName: "Production API v2", scope: "read-write" },
    },
    {
      id: "aud_demo_4",
      timestamp: new Date(now - 5 * hour).toISOString(),
      actor: { userId: "u3", email: "james@freshfit.com", role: "manager", ip: "172.16.0.5" },
      action: "settings_changed",
      resource: { type: "settings", id: "loc_002" },
      metadata: { setting: "notification_preferences", location: "Arlington" },
    },
    {
      id: "aud_demo_5",
      timestamp: new Date(now - 8 * hour).toISOString(),
      actor: { userId: "u2", email: "mike@freshfit.com", role: "business_owner", ip: "10.0.0.42" },
      action: "export_requested",
      resource: { type: "report", id: "rpt_monthly_mar" },
      metadata: { format: "csv", reportType: "campaign_performance" },
    },
    {
      id: "aud_demo_6",
      timestamp: new Date(now - 1 * day).toISOString(),
      actor: { userId: "u1", email: "sarah@freshfit.com", role: "admin", ip: "192.168.1.10" },
      action: "campaign_updated",
      resource: { type: "campaign", id: "cmp_002" },
      metadata: { field: "budget", oldValue: 500, newValue: 750 },
    },
    {
      id: "aud_demo_7",
      timestamp: new Date(now - 1.5 * day).toISOString(),
      actor: { userId: "u4", email: "lisa@freshfit.com", role: "manager", ip: "10.0.1.15" },
      action: "login",
      resource: { type: "session", id: "sess_abc123" },
      metadata: { method: "email_password", mfa: false },
    },
    {
      id: "aud_demo_8",
      timestamp: new Date(now - 2 * day).toISOString(),
      actor: { userId: "u1", email: "sarah@freshfit.com", role: "admin", ip: "192.168.1.10" },
      action: "api_key_revoked",
      resource: { type: "api_key", id: "ak_test_001" },
      metadata: { keyName: "Old Test Key", reason: "rotation" },
    },
    {
      id: "aud_demo_9",
      timestamp: new Date(now - 2.5 * day).toISOString(),
      actor: { userId: "u2", email: "mike@freshfit.com", role: "business_owner", ip: "10.0.0.42" },
      action: "password_changed",
      resource: { type: "user", id: "u2" },
      metadata: { method: "self_service" },
    },
    {
      id: "aud_demo_10",
      timestamp: new Date(now - 3 * day).toISOString(),
      actor: { userId: "u1", email: "sarah@freshfit.com", role: "admin", ip: "192.168.1.10" },
      action: "campaign_deleted",
      resource: { type: "campaign", id: "cmp_old_001" },
      metadata: { campaignName: "Test Campaign Q1", reason: "cleanup" },
    },
    {
      id: "aud_demo_11",
      timestamp: new Date(now - 4 * day).toISOString(),
      actor: { userId: "u3", email: "james@freshfit.com", role: "manager", ip: "172.16.0.5" },
      action: "submission_reviewed",
      resource: { type: "submission", id: "sub_032" },
      metadata: { verdict: "rejected", reason: "blurry_photo" },
    },
    {
      id: "aud_demo_12",
      timestamp: new Date(now - 5 * day).toISOString(),
      actor: { userId: "u4", email: "lisa@freshfit.com", role: "manager", ip: "10.0.1.15" },
      action: "logout",
      resource: { type: "session", id: "sess_xyz789" },
      metadata: { method: "manual" },
    },
  ];
}

// ═══════════════ Action Display Config ═══════════════

const ACTION_CONFIG: Record<string, { label: string; color: "cyan" | "green" | "amber" | "red" | "purple" | "pink" | "muted" }> = {
  login: { label: "Login", color: "cyan" },
  logout: { label: "Logout", color: "muted" },
  campaign_created: { label: "Campaign Created", color: "green" },
  campaign_updated: { label: "Campaign Updated", color: "amber" },
  campaign_deleted: { label: "Campaign Deleted", color: "red" },
  submission_reviewed: { label: "Submission Reviewed", color: "purple" },
  settings_changed: { label: "Settings Changed", color: "amber" },
  api_key_created: { label: "API Key Created", color: "green" },
  api_key_revoked: { label: "API Key Revoked", color: "red" },
  export_requested: { label: "Export Requested", color: "cyan" },
  password_changed: { label: "Password Changed", color: "pink" },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] ?? { label: action, color: "muted" as const };
}

// ═══════════════ Helpers ═══════════════

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatFullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function exportToCsv(events: AuditEvent[]): void {
  const headers = ["Timestamp", "User", "Email", "Role", "Action", "Entity Type", "Entity ID", "IP Address", "Metadata"];
  const rows = events.map((e) => [
    e.timestamp,
    e.actor.userId,
    e.actor.email ?? "",
    e.actor.role,
    e.action,
    e.resource.type,
    e.resource.id,
    e.actor.ip ?? "",
    e.metadata ? JSON.stringify(e.metadata) : "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ═══════════════ Component ═══════════════

const ITEMS_PER_PAGE = 10;

export default function AuditLog({ businessId: _businessId }: AuditLogProps) {
  const [events] = useState<AuditEvent[]>(createDemoAuditEvents);
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Filter events
  const filteredEvents = useMemo(() => {
    let result = events;

    if (actionFilter !== "all") {
      result = result.filter((e) => e.action === actionFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          (e.actor.email ?? "").toLowerCase().includes(q) ||
          e.actor.userId.toLowerCase().includes(q) ||
          e.resource.id.toLowerCase().includes(q) ||
          e.resource.type.toLowerCase().includes(q)
      );
    }

    if (dateFrom) {
      const fromMs = new Date(dateFrom).getTime();
      if (!isNaN(fromMs)) {
        result = result.filter((e) => new Date(e.timestamp).getTime() >= fromMs);
      }
    }

    if (dateTo) {
      const toMs = new Date(dateTo + "T23:59:59").getTime();
      if (!isNaN(toMs)) {
        result = result.filter((e) => new Date(e.timestamp).getTime() <= toMs);
      }
    }

    return result;
  }, [events, actionFilter, searchQuery, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const handleActionFilterChange = useCallback(
    (val: string) => {
      setActionFilter(val as AuditAction | "all");
      handleFilterChange();
    },
    [handleFilterChange]
  );

  const handleSearchChange = useCallback(
    (val: string) => {
      setSearchQuery(val);
      handleFilterChange();
    },
    [handleFilterChange]
  );

  const handleDateFromChange = useCallback(
    (val: string) => {
      setDateFrom(val);
      handleFilterChange();
    },
    [handleFilterChange]
  );

  const handleDateToChange = useCallback(
    (val: string) => {
      setDateTo(val);
      handleFilterChange();
    },
    [handleFilterChange]
  );

  const handleExport = useCallback(() => {
    exportToCsv(filteredEvents);
  }, [filteredEvents]);

  const toggleExpanded = useCallback((eventId: string) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl italic text-brand-white">Audit Log</h2>
          <p className="mt-1 text-sm text-brand-muted">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={filteredEvents.length === 0}
        >
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Action Type Filter */}
          <div>
            <label htmlFor="audit-action-filter" className="mb-1.5 block text-xs font-medium text-brand-muted">
              Action Type
            </label>
            <select
              id="audit-action-filter"
              value={actionFilter}
              onChange={(e) => handleActionFilterChange(e.target.value)}
              className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
            >
              <option value="all">All Actions</option>
              {AUDIT_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {getActionConfig(action).label}
                </option>
              ))}
            </select>
          </div>

          {/* Search by User */}
          <div>
            <label htmlFor="audit-search" className="mb-1.5 block text-xs font-medium text-brand-muted">
              Search User
            </label>
            <input
              id="audit-search"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Email, user ID, or entity..."
              className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
            />
          </div>

          {/* Date From */}
          <div>
            <label htmlFor="audit-date-from" className="mb-1.5 block text-xs font-medium text-brand-muted">
              From Date
            </label>
            <input
              id="audit-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
            />
          </div>

          {/* Date To */}
          <div>
            <label htmlFor="audit-date-to" className="mb-1.5 block text-xs font-medium text-brand-muted">
              To Date
            </label>
            <input
              id="audit-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => handleDateToChange(e.target.value)}
              className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
        {/* Table Header */}
        <div className="hidden border-b border-brand-border bg-brand-elevated/50 px-4 py-3 sm:grid sm:grid-cols-12 sm:gap-4">
          <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-brand-muted">
            Timestamp
          </div>
          <div className="col-span-3 text-xs font-medium uppercase tracking-wider text-brand-muted">
            User
          </div>
          <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-brand-muted">
            Action
          </div>
          <div className="col-span-3 text-xs font-medium uppercase tracking-wider text-brand-muted">
            Entity
          </div>
          <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-brand-muted">
            IP Address
          </div>
        </div>

        {/* Table Rows */}
        {paginatedEvents.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-brand-muted">No audit events match your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-brand-border">
            {paginatedEvents.map((event) => {
              const config = getActionConfig(event.action);
              const isExpanded = expandedEventId === event.id;

              return (
                <div key={event.id}>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(event.id)}
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-brand-elevated/30"
                    aria-expanded={isExpanded}
                  >
                    {/* Desktop layout */}
                    <div className="hidden sm:grid sm:grid-cols-12 sm:items-center sm:gap-4">
                      <div className="col-span-2">
                        <p className="font-mono text-xs text-brand-dim" title={formatFullTimestamp(event.timestamp)}>
                          {formatTimestamp(event.timestamp)}
                        </p>
                      </div>
                      <div className="col-span-3 min-w-0">
                        <p className="truncate text-sm text-brand-text">
                          {event.actor.email ?? event.actor.userId}
                        </p>
                        <p className="text-xs text-brand-muted">{event.actor.role}</p>
                      </div>
                      <div className="col-span-2">
                        <Badge color={config.color} size="sm">
                          {config.label}
                        </Badge>
                      </div>
                      <div className="col-span-3 min-w-0">
                        <p className="truncate font-mono text-xs text-brand-dim">
                          {event.resource.type}/{event.resource.id}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="font-mono text-xs text-brand-muted">
                          {event.actor.ip ?? "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Mobile layout */}
                    <div className="sm:hidden">
                      <div className="flex items-center justify-between gap-2">
                        <Badge color={config.color} size="sm">
                          {config.label}
                        </Badge>
                        <span className="font-mono text-xs text-brand-dim">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-brand-text">
                        {event.actor.email ?? event.actor.userId}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-brand-muted">
                        {event.resource.type}/{event.resource.id}
                      </p>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-brand-border/50 bg-brand-elevated/20 px-4 py-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <DetailItem label="Full Timestamp" value={formatFullTimestamp(event.timestamp)} />
                        <DetailItem label="User ID" value={event.actor.userId} mono />
                        <DetailItem label="Email" value={event.actor.email ?? "N/A"} />
                        <DetailItem label="Role" value={event.actor.role} />
                        <DetailItem label="IP Address" value={event.actor.ip ?? "N/A"} mono />
                        <DetailItem label="Entity" value={`${event.resource.type}/${event.resource.id}`} mono />
                        {event.requestId && (
                          <DetailItem label="Request ID" value={event.requestId} mono />
                        )}
                      </div>
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="mt-3">
                          <p className="mb-1 text-xs font-medium text-brand-muted">Metadata</p>
                          <pre className="rounded-lg bg-brand-bg p-3 font-mono text-xs text-brand-dim overflow-x-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-brand-muted">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}
            {" "}-{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredEvents.length)}
            {" "}of {filteredEvents.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <span className="px-2 font-mono text-xs text-brand-dim">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════ Sub-components ═══════════════

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-brand-muted">{label}</p>
      <p className={`mt-0.5 text-sm text-brand-text ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </p>
    </div>
  );
}
