"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";

type Role = "business" | "influencer" | "enterprise" | "admin";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  businessId: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
}

interface UserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  counts: {
    total: number;
    byRole: Record<Role, number>;
    suspended: number;
  };
}

const ROLE_FILTERS: Array<{ value: Role | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "business", label: "Business" },
  { value: "influencer", label: "Influencer" },
  { value: "enterprise", label: "Enterprise" },
  { value: "admin", label: "Admin" },
];

const STATUS_FILTERS: Array<{ value: "all" | "active" | "suspended"; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

function roleColor(role: Role): "cyan" | "green" | "amber" | "red" | "purple" {
  switch (role) {
    case "admin": return "red";
    case "enterprise": return "purple";
    case "influencer": return "amber";
    case "business": return "green";
    default: return "cyan";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UserListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (statusFilter !== "all") params.set("suspended", statusFilter === "suspended" ? "true" : "false");
    params.set("page", String(page));
    params.set("perPage", "25");
    try {
      const res = await fetch(`/api/v1/admin/users?${params}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error?.message ?? "Failed to load users");
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = useCallback(
    async (action: "suspend" | "unsuspend" | "change-role" | "reset-password", payload: Record<string, unknown> = {}) => {
      if (!selected) return;
      setWorking(action);
      try {
        const res = await fetch("/api/v1/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: selected.email, action, ...payload }),
        });
        const json = await res.json();
        if (json.success && json.data?.user) {
          setSelected(json.data.user);
          fetchUsers();
        } else {
          alert(json.error?.message ?? "Action failed");
        }
      } catch {
        alert("Network error");
      }
      setWorking(null);
    },
    [selected, fetchUsers]
  );

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Users"
        description="All accounts across the platform — businesses, influencers, enterprise, admins"
        actions={<Button variant="outline" size="sm" onClick={fetchUsers}>Refresh</Button>}
      />

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <Card padding="sm" borderColor="cyan">
            <Stat value={data.counts.total} label="Total" color="cyan" size="sm" />
          </Card>
          <Card padding="sm" borderColor="green">
            <Stat value={data.counts.byRole.business} label="Business" color="green" size="sm" />
          </Card>
          <Card padding="sm" borderColor="amber">
            <Stat value={data.counts.byRole.influencer} label="Influencer" color="amber" size="sm" />
          </Card>
          <Card padding="sm" borderColor="purple">
            <Stat value={data.counts.byRole.enterprise} label="Enterprise" color="purple" size="sm" />
          </Card>
          <Card padding="sm" borderColor="red">
            <Stat value={data.counts.byRole.admin} label="Admin" color="red" size="sm" />
          </Card>
          <Card padding="sm" borderColor="muted">
            <Stat value={data.counts.suspended} label="Suspended" color="red" size="sm" />
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card padding="md" className="mb-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search email, name, or id…"
            className="flex-1 bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan"
          />
          <div className="flex gap-1 flex-wrap">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setRoleFilter(f.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  roleFilter === f.value
                    ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40"
                    : "bg-brand-surface/50 text-brand-dim hover:text-brand-text border border-brand-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  statusFilter === f.value
                    ? "bg-brand-amber/20 text-brand-amber border border-brand-amber/40"
                    : "bg-brand-surface/50 text-brand-dim hover:text-brand-text border border-brand-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card borderColor="red" padding="sm" className="mb-4">
          <p className="text-sm text-brand-red">{error}</p>
        </Card>
      )}

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-brand-border/50">
                  <td colSpan={6} className="px-4 py-3">
                    <Skeleton width="w-full" height="h-4" />
                  </td>
                </tr>
              ))}
              {!loading && data?.users.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-muted text-sm">No users match these filters.</td></tr>
              )}
              {!loading && data?.users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-brand-border/50 hover:bg-brand-surface/30 transition-colors cursor-pointer"
                  onClick={() => setSelected(u)}
                >
                  <td className="px-4 py-3 text-xs text-brand-text font-mono">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-brand-text">{u.name}</td>
                  <td className="px-4 py-3">
                    <Badge color={roleColor(u.role)} size="sm">{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {u.suspendedAt
                      ? <Badge color="red" dot size="sm">suspended</Badge>
                      : <Badge color="green" dot size="sm">active</Badge>}
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-dim font-mono">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(u); }}
                      className="text-xs text-brand-cyan hover:underline font-mono"
                    >
                      Manage →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-brand-muted font-mono">
          <span>Page {data.page} of {data.totalPages} ({data.total} total)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <UserDrawer
          user={selected}
          working={working}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
    </AdminPageContainer>
  );
}

function UserDrawer({
  user,
  working,
  onClose,
  onAction,
}: {
  user: AdminUser;
  working: string | null;
  onClose: () => void;
  onAction: (action: "suspend" | "unsuspend" | "change-role" | "reset-password", payload?: Record<string, unknown>) => void;
}) {
  const [newRole, setNewRole] = useState<Role>(user.role);
  const [newPassword, setNewPassword] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-brand-bg border-l border-brand-border overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-heading text-lg text-brand-white italic truncate">{user.name}</h2>
            <p className="text-xs text-brand-muted font-mono truncate">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Role</p>
              <Badge color={roleColor(user.role)} size="md">{user.role}</Badge>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Status</p>
              {user.suspendedAt
                ? <Badge color="red" dot size="md">suspended</Badge>
                : <Badge color="green" dot size="md">active</Badge>}
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">User ID</p>
              <p className="text-xs text-brand-text font-mono break-all">{user.id}</p>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Business ID</p>
              <p className="text-xs text-brand-text font-mono break-all">{user.businessId ?? "—"}</p>
            </div>
          </div>

          {user.suspendedAt && user.suspensionReason && (
            <Card borderColor="red" padding="sm">
              <p className="text-2xs uppercase font-mono text-brand-red mb-1">Suspension Reason</p>
              <p className="text-sm text-brand-text">{user.suspensionReason}</p>
            </Card>
          )}

          {/* Suspend / Unsuspend */}
          <div className="border-t border-brand-border pt-5">
            <p className="text-2xs uppercase font-mono text-brand-muted mb-2">Account State</p>
            {user.suspendedAt ? (
              <Button
                variant="success"
                size="sm"
                loading={working === "unsuspend"}
                onClick={() => onAction("unsuspend")}
              >
                Unsuspend
              </Button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for suspension (logged to audit)"
                  className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
                />
                <Button
                  variant="danger"
                  size="sm"
                  loading={working === "suspend"}
                  onClick={() => onAction("suspend", { reason })}
                >
                  Suspend account
                </Button>
              </div>
            )}
          </div>

          {/* Change role */}
          <div className="border-t border-brand-border pt-5">
            <p className="text-2xs uppercase font-mono text-brand-muted mb-2">Change Role</p>
            <div className="flex gap-2">
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="flex-1 bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-cyan"
              >
                <option value="business">business</option>
                <option value="influencer">influencer</option>
                <option value="enterprise">enterprise</option>
                <option value="admin">admin</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                disabled={newRole === user.role}
                loading={working === "change-role"}
                onClick={() => onAction("change-role", { role: newRole })}
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Reset password */}
          <div className="border-t border-brand-border pt-5">
            <p className="text-2xs uppercase font-mono text-brand-muted mb-2">Reset Password</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (8+ chars)"
                className="flex-1 bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={newPassword.length < 8}
                loading={working === "reset-password"}
                onClick={() => { onAction("reset-password", { newPassword }); setNewPassword(""); }}
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Impersonate (Batch 12 will wire this) */}
          <div className="border-t border-brand-border pt-5">
            <p className="text-2xs uppercase font-mono text-brand-muted mb-2">Impersonate</p>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const res = await fetch("/api/v1/admin/impersonate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ email: user.email }),
                  });
                  const json = await res.json();
                  if (json.success) window.location.href = "/";
                  else alert(json.error?.message ?? "Impersonation failed");
                } catch {
                  alert("Network error");
                }
              }}
            >
              Sign in as {user.email}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
