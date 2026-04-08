"use client";

import { useState, useMemo, useCallback } from "react";
import { formatNumber, formatCurrency } from "@/lib/shared/formatters";
import { SortableHeader, ReportBarChart } from "./report-charts";
import { REPORT_TYPES, PRESET_RANGES } from "./report-types";
import type {
  ReportType,
  ReportsProps,
  CampaignPerformance,
  LocationComparison,
} from "./report-types";

// Re-export all types so existing imports from "@/components/enterprise/reports" keep working
export type {
  DateRange,
  ReportMetric,
  CampaignPerformance,
  LocationComparison,
  PlatformBreakdown,
  ReportData,
} from "./report-types";

// ═══════════════ Helpers ═══════════════

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

// ═══════════════ Component ═══════════════

export default function Reports({ reportData, dateRange, onDateRangeChange }: ReportsProps) {
  const [activeReport, setActiveReport] = useState<ReportType>("campaigns");
  const [sortColumn, setSortColumn] = useState<string>("marketingValue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleExportCSV = useCallback(() => {
    const headers = ["Name", "Location", "Platform", "Completions", "Impressions", "Conversions", "Marketing Value", "ROI"];
    const rows = reportData.campaignPerformance.map((c) =>
      [c.name, c.location, c.platform, c.completions, c.impressions, c.conversions, c.marketingValue, c.roi].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [reportData.campaignPerformance]);

  const handleExportPDF = useCallback(() => {
    window.print();
  }, []);

  const handlePresetRange = (days: number) => {
    onDateRangeChange({
      start: getDateDaysAgo(days),
      end: new Date().toISOString().split("T")[0],
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const sortedCampaigns = useMemo(() => {
    const data = [...reportData.campaignPerformance];
    return data.sort((a, b) => {
      const aVal = a[sortColumn as keyof CampaignPerformance];
      const bVal = b[sortColumn as keyof CampaignPerformance];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [reportData.campaignPerformance, sortColumn, sortDirection]);

  const sortedLocations = useMemo(() => {
    const data = [...reportData.locationComparison];
    return data.sort((a, b) => {
      const aVal = a[sortColumn as keyof LocationComparison];
      const bVal = b[sortColumn as keyof LocationComparison];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [reportData.locationComparison, sortColumn, sortDirection]);

  return (
    <div className="min-h-screen bg-brand-bg font-body">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl italic text-brand-white">Reports</h1>
            <p className="mt-1 text-sm text-brand-muted">Analytics and performance insights</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="rounded-lg border border-brand-border bg-brand-elevated px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:border-brand-cyan/40"
              aria-label="Export report as CSV"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="rounded-lg border border-brand-border bg-brand-elevated px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:border-brand-cyan/40"
              aria-label="Export report as PDF"
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center" role="group" aria-label="Date range selection">
          <div className="flex gap-2">
            {PRESET_RANGES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetRange(preset.days)}
                className="rounded-lg border border-brand-border bg-brand-surface px-3 py-1.5 font-mono text-xs font-medium text-brand-muted transition-colors hover:border-brand-cyan/40 hover:text-brand-cyan"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
              className="rounded-lg border border-brand-border bg-brand-surface px-3 py-1.5 text-sm text-brand-text focus:border-brand-cyan focus:outline-none"
              aria-label="Start date"
            />
            <span className="text-xs text-brand-muted">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
              className="rounded-lg border border-brand-border bg-brand-surface px-3 py-1.5 text-sm text-brand-text focus:border-brand-cyan focus:outline-none"
              aria-label="End date"
            />
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4" role="region" aria-label="Summary metrics">
          {reportData.metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-brand-border bg-brand-surface p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">{metric.label}</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-brand-white">{metric.formattedValue}</p>
              <p className={`mt-1 text-xs font-medium ${metric.change >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                {metric.change >= 0 ? "+" : ""}{metric.change}% {metric.changeLabel}
              </p>
            </div>
          ))}
        </div>

        {/* Report Type Selector */}
        <div className="mt-8 flex gap-2 overflow-x-auto" role="tablist" aria-label="Report types">
          {REPORT_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setActiveReport(type.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                activeReport === type.id
                  ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                  : "border-brand-border bg-brand-surface text-brand-muted hover:text-brand-text"
              }`}
              role="tab"
              aria-selected={activeReport === type.id}
            >
              <span aria-hidden="true">{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>

        {/* Report Content */}
        <div className="mt-6" role="tabpanel">
          {/* Chart */}
          <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
            <h3 className="font-heading text-lg italic text-brand-white">
              {REPORT_TYPES.find((r) => r.id === activeReport)?.label}
            </h3>
            <div className="mt-4">
              <ReportBarChart
                campaigns={reportData.campaignPerformance}
                reportType={activeReport}
              />
            </div>
          </div>

          {/* Data Tables */}
          <div className="mt-6 overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
            {/* Campaign Performance */}
            {activeReport === "campaigns" && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]" role="table">
                  <thead>
                    <tr className="border-b border-brand-border">
                      <SortableHeader
                        label="Campaign"
                        column="name"
                        currentSort={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                        align="left"
                      />
                      <SortableHeader
                        label="Platform"
                        column="platform"
                        currentSort={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                        align="left"
                      />
                      <SortableHeader
                        label="Completions"
                        column="completions"
                        currentSort={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortableHeader
                        label="Impressions"
                        column="impressions"
                        currentSort={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortableHeader
                        label="Value"
                        column="marketingValue"
                        currentSort={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortableHeader
                        label="ROI"
                        column="roi"
                        currentSort={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                        align="right"
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {sortedCampaigns.map((campaign) => (
                      <tr key={campaign.id} className="transition-colors hover:bg-brand-elevated/50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-brand-text">{campaign.name}</p>
                          <p className="text-xs text-brand-muted">{campaign.location}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-sm text-brand-dim">
                            <span aria-hidden="true">{campaign.platformIcon}</span>
                            {campaign.platform}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-brand-text">
                          {formatNumber(campaign.completions)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-brand-dim">
                          {formatNumber(campaign.impressions)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-brand-green">
                          {formatCurrency(campaign.marketingValue)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono text-sm font-semibold ${
                            campaign.roi >= 200 ? "text-brand-green" : campaign.roi >= 100 ? "text-brand-cyan" : "text-brand-amber"
                          }`}>
                            {campaign.roi}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sortedCampaigns.length === 0 && (
                  <div className="flex h-32 items-center justify-center">
                    <p className="text-sm text-brand-muted">No campaign data for this period.</p>
                  </div>
                )}
              </div>
            )}

            {/* Location Comparison */}
            {activeReport === "locations" && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]" role="table">
                  <thead>
                    <tr className="border-b border-brand-border">
                      <SortableHeader label="Location" column="name" currentSort={sortColumn} direction={sortDirection} onSort={handleSort} align="left" />
                      <SortableHeader label="Campaigns" column="campaigns" currentSort={sortColumn} direction={sortDirection} onSort={handleSort} align="right" />
                      <SortableHeader label="Completions" column="completions" currentSort={sortColumn} direction={sortDirection} onSort={handleSort} align="right" />
                      <SortableHeader label="Reviews" column="reviews" currentSort={sortColumn} direction={sortDirection} onSort={handleSort} align="right" />
                      <SortableHeader label="Value" column="marketingValue" currentSort={sortColumn} direction={sortDirection} onSort={handleSort} align="right" />
                      <SortableHeader label="ROI" column="roi" currentSort={sortColumn} direction={sortDirection} onSort={handleSort} align="right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {sortedLocations.map((loc) => (
                      <tr key={loc.id} className="transition-colors hover:bg-brand-elevated/50">
                        <td className="px-4 py-3 text-sm font-medium text-brand-text">{loc.name}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-brand-dim">{loc.campaigns}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-brand-text">{formatNumber(loc.completions)}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-brand-dim">{loc.reviews}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-brand-green">{formatCurrency(loc.marketingValue)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono text-sm font-semibold ${
                            loc.roi >= 200 ? "text-brand-green" : loc.roi >= 100 ? "text-brand-cyan" : "text-brand-amber"
                          }`}>
                            {loc.roi}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sortedLocations.length === 0 && (
                  <div className="flex h-32 items-center justify-center">
                    <p className="text-sm text-brand-muted">No location data for this period.</p>
                  </div>
                )}
              </div>
            )}

            {/* ROI Analysis */}
            {activeReport === "roi" && (
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {reportData.campaignPerformance
                    .sort((a, b) => b.roi - a.roi)
                    .slice(0, 6)
                    .map((campaign) => (
                      <div
                        key={campaign.id}
                        className="rounded-xl border border-brand-border bg-brand-bg p-4"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-brand-text">{campaign.name}</h4>
                          <span className={`font-mono text-lg font-bold ${
                            campaign.roi >= 200 ? "text-brand-green" : campaign.roi >= 100 ? "text-brand-cyan" : "text-brand-amber"
                          }`}>
                            {campaign.roi}%
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-brand-muted">{campaign.location}</p>
                        <div className="mt-3 flex justify-between text-xs text-brand-dim">
                          <span>{formatNumber(campaign.completions)} completions</span>
                          <span className="text-brand-green">{formatCurrency(campaign.marketingValue)}</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-elevated">
                          <div
                            className={`h-full rounded-full ${
                              campaign.roi >= 200 ? "bg-brand-green" : campaign.roi >= 100 ? "bg-brand-cyan" : "bg-brand-amber"
                            }`}
                            style={{ width: `${Math.min(campaign.roi / 3, 100)}%` }}
                            role="progressbar"
                            aria-valuenow={campaign.roi}
                            aria-label={`ROI: ${campaign.roi}%`}
                          />
                        </div>
                      </div>
                    ))}
                </div>
                {reportData.campaignPerformance.length === 0 && (
                  <div className="flex h-32 items-center justify-center">
                    <p className="text-sm text-brand-muted">No ROI data for this period.</p>
                  </div>
                )}
              </div>
            )}

            {/* Platform Breakdown */}
            {activeReport === "platforms" && (
              <div className="p-6">
                <div className="space-y-4">
                  {reportData.platformBreakdown
                    .sort((a, b) => b.marketingValue - a.marketingValue)
                    .map((platform) => (
                      <div
                        key={platform.platform}
                        className="rounded-xl border border-brand-border bg-brand-bg p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl" aria-hidden="true">{platform.platformIcon}</span>
                            <div>
                              <p className="text-sm font-medium text-brand-white">{platform.platform}</p>
                              <p className="text-xs text-brand-muted">
                                {platform.campaigns} campaign{platform.campaigns !== 1 ? "s" : ""} &middot; {formatNumber(platform.completions)} completions
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="font-mono text-lg font-semibold text-brand-green">
                                {formatCurrency(platform.marketingValue)}
                              </p>
                              <p className="text-xs text-brand-muted">marketing value</p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-lg font-semibold text-brand-cyan">
                                {platform.share}%
                              </p>
                              <p className="text-xs text-brand-muted">share</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-brand-elevated">
                          <div
                            className="h-full rounded-full bg-brand-cyan transition-all"
                            style={{ width: `${platform.share}%` }}
                            role="progressbar"
                            aria-valuenow={platform.share}
                            aria-label={`${platform.platform} share: ${platform.share}%`}
                          />
                        </div>
                      </div>
                    ))}
                </div>
                {reportData.platformBreakdown.length === 0 && (
                  <div className="flex h-32 items-center justify-center">
                    <p className="text-sm text-brand-muted">No platform data for this period.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
