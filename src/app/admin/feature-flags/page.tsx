"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";

interface FlagMap {
  [flagId: string]: boolean | string | number | null;
}

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<FlagMap>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/flags", { credentials: "include" });
    const json = await res.json();
    if (json.success) setFlags(json.data ?? {});
    setLoading(false);
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const toggleFlag = async (flagId: string, value: boolean) => {
    setWorking(flagId);
    try {
      await fetch("/api/v1/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ flagId, value }),
      });
    } catch {
      // surface error silently — refresh will reveal real state
    }
    setWorking(null);
    fetchFlags();
  };

  const flagEntries = Object.entries(flags);
  const enabled = flagEntries.filter(([_, v]) => v === true).length;
  const disabled = flagEntries.filter(([_, v]) => v === false).length;

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Feature Flags"
        description="Global flag values evaluated for your admin context"
        actions={<Button variant="outline" size="sm" onClick={fetchFlags}>Refresh</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Card padding="sm" borderColor="cyan">
          <Stat value={flagEntries.length} label="Total flags" color="cyan" size="sm" />
        </Card>
        <Card padding="sm" borderColor="green">
          <Stat value={enabled} label="Enabled" color="green" size="sm" />
        </Card>
        <Card padding="sm" borderColor="muted">
          <Stat value={disabled} label="Disabled" color="white" size="sm" />
        </Card>
      </div>

      {loading && <Skeleton width="w-full" height="h-32" />}

      {!loading && flagEntries.length === 0 && (
        <Card padding="md">
          <p className="text-sm text-brand-muted">No flags registered.</p>
        </Card>
      )}

      {!loading && flagEntries.length > 0 && (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                <th className="text-left px-4 py-3">Flag</th>
                <th className="text-left px-4 py-3">Value</th>
                <th className="text-right px-4 py-3">Toggle</th>
              </tr>
            </thead>
            <tbody>
              {flagEntries.map(([id, value]) => (
                <tr key={id} className="border-b border-brand-border/50">
                  <td className="px-4 py-3 text-xs text-brand-text font-mono">{id}</td>
                  <td className="px-4 py-3">
                    {typeof value === "boolean" ? (
                      <Badge color={value ? "green" : "muted"} dot size="sm">{value ? "on" : "off"}</Badge>
                    ) : (
                      <code className="text-xs text-brand-dim font-mono">{JSON.stringify(value)}</code>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {typeof value === "boolean" && (
                      <button
                        onClick={() => toggleFlag(id, !value)}
                        disabled={working === id}
                        className="text-xs text-brand-cyan hover:underline font-mono disabled:opacity-50"
                      >
                        {working === id ? "…" : value ? "Disable" : "Enable"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </AdminPageContainer>
  );
}
