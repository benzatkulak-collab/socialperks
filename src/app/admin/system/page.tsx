"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";

interface SystemMetrics {
  status: "ok" | "degraded";
  timestamp: string;
  node: string;
  platform: string;
  uptimeSeconds: number;
  pid: number;
  database: { connected: boolean };
  memory: { rssMB: number; heapUsedMB: number; heapTotalMB: number; externalMB: number };
  cpu: { userMicros: number; systemMicros: number };
  env: {
    mode: string;
    hasAuthSecret: boolean;
    hasDatabaseUrl: boolean;
    hasStripeKey: boolean;
    hasResendKey: boolean;
    hasCronSecret: boolean;
    hasAdminPassword: boolean;
  };
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

export default function AdminSystemPage() {
  const [data, setData] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/admin/system", { credentials: "include" });
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 10_000); // poll every 10s for live feel
    return () => clearInterval(id);
  }, [fetchData]);

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="System"
        description="Runtime health, memory, database, environment configuration"
        actions={<Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>}
      />

      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} width="w-full" height="h-24" />)}
        </div>
      )}

      {data && (
        <>
          {/* Overall status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card padding="md" borderColor={data.status === "ok" ? "green" : "red"}>
              <Stat
                value={data.status === "ok" ? "OK" : "Degraded"}
                label="Status"
                color={data.status === "ok" ? "green" : "red"}
                size="lg"
              />
            </Card>
            <Card padding="md" borderColor="cyan">
              <Stat value={formatUptime(data.uptimeSeconds)} label="Uptime" color="cyan" size="lg" />
            </Card>
            <Card padding="md" borderColor={data.database.connected ? "green" : "red"}>
              <Stat
                value={data.database.connected ? "Connected" : "Down"}
                label="Database"
                color={data.database.connected ? "green" : "red"}
                size="lg"
              />
            </Card>
            <Card padding="md" borderColor="purple">
              <Stat value={data.env.mode} label="Environment" color="purple" size="lg" />
            </Card>
          </div>

          {/* Memory */}
          <h2 className="font-heading text-lg text-brand-white italic mb-4">Memory</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card padding="sm" borderColor="amber">
              <Stat value={data.memory.heapUsedMB} suffix="MB" label="Heap Used" color="amber" size="sm" />
            </Card>
            <Card padding="sm" borderColor="muted">
              <Stat value={data.memory.heapTotalMB} suffix="MB" label="Heap Total" color="white" size="sm" />
            </Card>
            <Card padding="sm" borderColor="muted">
              <Stat value={data.memory.rssMB} suffix="MB" label="RSS" color="white" size="sm" />
            </Card>
            <Card padding="sm" borderColor="muted">
              <Stat value={data.memory.externalMB} suffix="MB" label="External" color="white" size="sm" />
            </Card>
          </div>

          {/* Runtime info */}
          <h2 className="font-heading text-lg text-brand-white italic mb-4">Runtime</h2>
          <Card padding="md" className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Node</p>
                <p className="font-mono text-brand-text">{data.node}</p>
              </div>
              <div>
                <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Platform</p>
                <p className="font-mono text-brand-text">{data.platform}</p>
              </div>
              <div>
                <p className="text-2xs uppercase font-mono text-brand-muted mb-1">PID</p>
                <p className="font-mono text-brand-text">{data.pid}</p>
              </div>
              <div>
                <p className="text-2xs uppercase font-mono text-brand-muted mb-1">CPU User</p>
                <p className="font-mono text-brand-text">{(data.cpu.userMicros / 1000).toFixed(0)}ms</p>
              </div>
            </div>
          </Card>

          {/* Env config checklist */}
          <h2 className="font-heading text-lg text-brand-white italic mb-4">Environment Config</h2>
          <Card padding="md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <EnvRow label="AUTH_SECRET" set={data.env.hasAuthSecret} critical />
              <EnvRow label="DATABASE_URL" set={data.env.hasDatabaseUrl} />
              <EnvRow label="STRIPE_SECRET_KEY" set={data.env.hasStripeKey} />
              <EnvRow label="RESEND_API_KEY" set={data.env.hasResendKey} />
              <EnvRow label="CRON_SECRET" set={data.env.hasCronSecret} critical />
              <EnvRow label="ADMIN_PASSWORD" set={data.env.hasAdminPassword} />
            </div>
          </Card>
        </>
      )}
    </AdminPageContainer>
  );
}

function EnvRow({ label, set, critical }: { label: string; set: boolean; critical?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-md bg-brand-surface/30">
      <span className="text-xs font-mono text-brand-dim">{label}</span>
      <Badge color={set ? "green" : critical ? "red" : "muted"} dot size="sm">
        {set ? "set" : "missing"}
      </Badge>
    </div>
  );
}
