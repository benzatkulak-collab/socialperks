"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";

interface ApiKey {
  id: string;
  agentName: string;
  permissions: string[];
  env?: string;
  createdAt?: string;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  revoked?: boolean;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPerms, setNewKeyPerms] = useState("read");
  const [newPlaintext, setNewPlaintext] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/api-keys", { credentials: "include" });
    const json = await res.json();
    if (json.success) setKeys(json.data?.keys ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setNewPlaintext(null);
    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentName: newKeyName,
          permissions: newKeyPerms.split(",").map((p) => p.trim()).filter(Boolean),
          env: "production",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewPlaintext(json.data?.plaintext ?? json.data?.token ?? null);
        setNewKeyName("");
        fetchKeys();
      } else {
        alert(json.error?.message ?? "Failed to create key");
      }
    } catch {
      alert("Network error");
    }
    setCreating(false);
  };

  const counts = {
    total: keys.length,
    active: keys.filter((k) => !k.revoked).length,
    revoked: keys.filter((k) => k.revoked).length,
  };

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="API Keys"
        description="Issued keys, scopes, usage, rotation"
        actions={<Button variant="outline" size="sm" onClick={fetchKeys}>Refresh</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Card padding="sm" borderColor="cyan">
          <Stat value={counts.total} label="Total keys" color="cyan" size="sm" />
        </Card>
        <Card padding="sm" borderColor="green">
          <Stat value={counts.active} label="Active" color="green" size="sm" />
        </Card>
        <Card padding="sm" borderColor="red">
          <Stat value={counts.revoked} label="Revoked" color="red" size="sm" />
        </Card>
      </div>

      {/* Create new key */}
      <Card padding="md" className="mb-6">
        <p className="text-2xs uppercase font-mono text-brand-muted mb-3">Issue new key</p>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Agent / integration name"
            className="flex-1 bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan"
          />
          <input
            type="text"
            value={newKeyPerms}
            onChange={(e) => setNewKeyPerms(e.target.value)}
            placeholder="Permissions (comma-separated)"
            className="flex-1 bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan font-mono"
          />
          <Button variant="outline" size="sm" loading={creating} onClick={createKey}>Issue</Button>
        </div>
        {newPlaintext && (
          <div className="mt-4 p-3 rounded-md bg-brand-amber/10 border border-brand-amber/40">
            <p className="text-2xs uppercase font-mono text-brand-amber mb-1">Copy this token now — it will not be shown again</p>
            <code className="text-xs text-brand-text font-mono break-all block">{newPlaintext}</code>
          </div>
        )}
      </Card>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                <th className="text-left px-4 py-3">Key</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-left px-4 py-3">Permissions</th>
                <th className="text-left px-4 py-3">Env</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-left px-4 py-3">Last Used</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-brand-border/50">
                  <td colSpan={7} className="px-4 py-3"><Skeleton width="w-full" height="h-4" /></td>
                </tr>
              ))}
              {!loading && keys.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-brand-muted text-sm">No API keys issued yet.</td></tr>
              )}
              {!loading && keys.map((k) => (
                <tr key={k.id} className="border-b border-brand-border/50">
                  <td className="px-4 py-3 text-xs text-brand-text font-mono">{k.id.slice(0, 18)}…</td>
                  <td className="px-4 py-3 text-xs text-brand-text">{k.agentName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {k.permissions.map((p) => (
                        <span key={p} className="px-1.5 py-0.5 rounded text-2xs bg-brand-surface/50 text-brand-dim font-mono">
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-dim font-mono">{k.env ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-brand-dim font-mono">{formatDate(k.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-brand-dim font-mono">{formatDate(k.lastUsedAt)}</td>
                  <td className="px-4 py-3">
                    <Badge color={k.revoked ? "red" : "green"} dot size="sm">
                      {k.revoked ? "revoked" : "active"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminPageContainer>
  );
}
