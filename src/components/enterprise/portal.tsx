"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Tabs } from "@/components/ui/tabs";
import { AgentTicker } from "@/components/shared/agent-ticker";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";
import { useEnterpriseData } from "@/lib/hooks/use-enterprise-data";

const EnterpriseDashboard = dynamic(() => import("@/components/enterprise/dashboard"));
const MultiLocation = dynamic(() => import("@/components/enterprise/multi-location"));
const Reports = dynamic(() => import("@/components/enterprise/reports"));
const BrandManager = dynamic(() => import("@/components/enterprise/brand-manager"));
const ApiConsole = dynamic(() => import("@/components/enterprise/api-console"));
const AuditLog = dynamic(() => import("@/components/enterprise/audit-log"));
const WebhookDashboard = dynamic(() => import("@/components/enterprise/webhook-dashboard"));
const FeatureFlagsPanel = dynamic(() => import("@/components/enterprise/feature-flags-panel").then(m => ({ default: m.FeatureFlagsPanel })));

import type { DateRange } from "@/components/enterprise/report-types";
import type { BrandGuidelines } from "@/components/enterprise/brand-manager";

// ═══════════════ Loading Skeleton ═══════════════

function EnterpriseSkeleton() {
  return (
    <div className="min-h-screen bg-brand-bg" role="status" aria-label="Loading enterprise data">
      {/* Skeleton header */}
      <div className="border-b border-brand-border/50 bg-brand-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-brand-elevated animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-48 rounded bg-brand-elevated animate-pulse" />
              <div className="h-4 w-32 rounded bg-brand-elevated animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      {/* Skeleton stat cards */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-brand-border bg-brand-surface p-4">
              <div className="h-3 w-24 rounded bg-brand-elevated animate-pulse" />
              <div className="mt-3 h-7 w-20 rounded bg-brand-elevated animate-pulse" />
              <div className="mt-2 h-3 w-32 rounded bg-brand-elevated animate-pulse" />
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-brand-border bg-brand-surface p-6">
          <div className="h-5 w-48 rounded bg-brand-elevated animate-pulse" />
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-brand-elevated animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════ Error Banner ═══════════════

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
      <div
        className="flex items-center justify-between gap-3 rounded-lg border border-brand-amber/30 bg-brand-amber/5 px-4 py-2.5"
        role="alert"
      >
        <p className="text-sm text-brand-amber">
          Some data may be outdated. {message}
        </p>
        <Button variant="ghost" size="sm" onClick={onRetry} className="text-brand-amber shrink-0">
          Retry
        </Button>
      </div>
    </div>
  );
}

// ═══════════════ Enterprise Portal ═══════════════

export interface EnterprisePortalProps {
  onLogout: () => void;
  businessId?: string | null;
}

export function EnterprisePortal({
  onLogout,
  businessId = null,
}: EnterprisePortalProps) {
  const [page, setPage] = useState<string>("dashboard");
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [brandGuidelines, setBrandGuidelines] = useState<BrandGuidelines | null>(null);

  const {
    enterprise,
    locations,
    reportData,
    guidelines,
    templates,
    pendingReviews,
    locationCompliance,
    apiKeys,
    webhooks,
    apiUsage,
    loading,
    error,
    refresh,
  } = useEnterpriseData(businessId);

  const currentGuidelines = brandGuidelines ?? guidelines;

  const portalTabs = useMemo(() => [
    { id: "dashboard", label: "Dashboard" },
    { id: "locations", label: "Locations" },
    { id: "reports", label: "Reports" },
    { id: "brand", label: "Brand" },
    { id: "api", label: "API" },
    { id: "webhooks", label: "Webhooks" },
    { id: "audit", label: "Audit Log" },
    { id: "flags", label: "Feature Flags" },
  ], []);

  const handleNavigate = useCallback((section: string) => {
    setPage(section);
  }, []);

  // Show skeleton during initial load
  if (loading && !enterprise) {
    return (
      <div className="min-h-screen bg-brand-bg">
        {/* Top Bar */}
        <div className="sticky top-0 z-40 bg-brand-surface/90 backdrop-blur-xl border-b border-brand-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <Badge color="#A78BFA">Enterprise</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout}>Log Out</Button>
          </div>
        </div>
        <EnterpriseSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Top Bar -- sticky with backdrop blur */}
      <div className="sticky top-0 z-40 bg-brand-surface/90 backdrop-blur-xl border-b border-brand-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <Badge color="#A78BFA">Enterprise</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-brand-dim hidden sm:block">{enterprise.avatar} {enterprise.companyName}</span>
            <Button variant="ghost" size="sm" onClick={onLogout}>Log Out</Button>
          </div>
        </div>
      </div>

      {/* Sub-nav -- sticky below top bar */}
      <nav className="bg-brand-elevated/80 backdrop-blur-lg border-b border-brand-border/50 sticky top-[52px] z-30" aria-label="Enterprise portal navigation">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2">
          <Tabs tabs={portalTabs} activeTab={page} onChange={setPage} />
        </div>
      </nav>

      <AgentTicker />

      {/* Error banner (non-blocking -- data still shows with fallback) */}
      {error && <ErrorBanner message={error} onRetry={refresh} />}

      {/* Dashboard */}
      {page === "dashboard" && (
        <SectionErrorBoundary section="Dashboard">
          <EnterpriseDashboard
            enterprise={enterprise}
            onNavigate={handleNavigate}
          />
        </SectionErrorBoundary>
      )}

      {/* Locations */}
      {page === "locations" && (
        <SectionErrorBoundary section="Locations">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <MultiLocation
            locations={locations}
            onAddLocation={() => {
              // In production this would persist via API
            }}
          />
        </div>
        </SectionErrorBoundary>
      )}

      {/* Reports */}
      {page === "reports" && (
        <SectionErrorBoundary section="Reports">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Reports
            reportData={reportData}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>
        </SectionErrorBoundary>
      )}

      {/* Brand */}
      {page === "brand" && (
        <SectionErrorBoundary section="Brand Manager">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <BrandManager
            guidelines={currentGuidelines}
            templates={templates}
            pendingReviews={pendingReviews}
            locationCompliance={locationCompliance}
            onUpdateGuidelines={(g) => setBrandGuidelines(g)}
          />
        </div>
        </SectionErrorBoundary>
      )}

      {/* API Console */}
      {page === "api" && (
        <SectionErrorBoundary section="API Console">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <ApiConsole
            apiKeys={apiKeys}
            webhooks={webhooks}
            usage={apiUsage}
          />
        </div>
        </SectionErrorBoundary>
      )}

      {/* Webhooks */}
      {page === "webhooks" && (
        <SectionErrorBoundary section="Webhook Management">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <WebhookDashboard businessId={businessId} />
        </div>
        </SectionErrorBoundary>
      )}

      {/* Audit Log */}
      {page === "audit" && (
        <SectionErrorBoundary section="Audit Log">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <AuditLog businessId={businessId} />
        </div>
        </SectionErrorBoundary>
      )}

      {/* Feature Flags */}
      {page === "flags" && (
        <SectionErrorBoundary section="Feature Flags">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <FeatureFlagsPanel />
        </div>
        </SectionErrorBoundary>
      )}
    </div>
  );
}
