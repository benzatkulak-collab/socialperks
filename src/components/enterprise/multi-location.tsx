"use client";

import { useState, useMemo, useCallback } from "react";
import { formatCurrency } from "@/lib/shared/formatters";

// ═══════════════ Types ═══════════════

export interface LocationStaff {
  id: string;
  name: string;
  role: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  activeCampaigns: number;
  totalCompletions: number;
  completionRate: number;
  reviews: number;
  marketingValue: number;
  staff: LocationStaff[];
  status: "active" | "inactive" | "pending";
}

export interface NewLocationForm {
  name: string;
  address: string;
  city: string;
  state: string;
}

interface MultiLocationProps {
  locations: Location[];
  onAddLocation: (location: NewLocationForm) => void;
}

// ═══════════════ Helpers ═══════════════

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-brand-green/10 text-brand-green" },
  inactive: { label: "Inactive", className: "bg-brand-muted/10 text-brand-muted" },
  pending: { label: "Pending", className: "bg-brand-amber/10 text-brand-amber" },
};

// ═══════════════ Component ═══════════════

export default function MultiLocation({ locations, onAddLocation }: MultiLocationProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "pending">("all");
  const [view, setView] = useState<"list" | "add" | "detail" | "compare">("list");
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // New location form state
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");

  const filteredLocations = useMemo(() => {
    let result = [...locations];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    return result;
  }, [locations, search, statusFilter]);

  const handleAddLocation = useCallback(() => {
    if (!formName || !formAddress || !formCity || !formState) return;
    onAddLocation({ name: formName, address: formAddress, city: formCity, state: formState });
    setFormName("");
    setFormAddress("");
    setFormCity("");
    setFormState("");
    setView("list");
  }, [formName, formAddress, formCity, formState, onAddLocation]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }, []);

  const compareLocations = useMemo(
    () => locations.filter((l) => compareIds.includes(l.id)),
    [locations, compareIds]
  );

  return (
    <div className="min-h-screen bg-brand-bg font-body">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl italic text-brand-white">Locations</h1>
            <p className="mt-1 text-sm text-brand-muted">
              {locations.length} location{locations.length !== 1 ? "s" : ""} &middot; Manage all your business locations
            </p>
          </div>
          <div className="flex gap-2">
            {view !== "list" && (
              <button
                type="button"
                onClick={() => { setView("list"); setSelectedLocation(null); }}
                className="rounded-lg border border-brand-border bg-brand-elevated px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:border-brand-cyan/40"
              >
                Back to List
              </button>
            )}
            {view === "list" && compareIds.length >= 2 && (
              <button
                type="button"
                onClick={() => setView("compare")}
                className="rounded-lg border border-brand-purple/30 bg-brand-purple/10 px-4 py-2 text-sm font-medium text-brand-purple transition-colors hover:bg-brand-purple/20"
              >
                Compare ({compareIds.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setView("add")}
              className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90"
            >
              Add Location
            </button>
          </div>
        </div>

        {/* List View */}
        {view === "list" && (
          <div className="mt-6">
            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-brand-border bg-brand-surface py-2.5 pl-10 pr-4 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                  placeholder="Search locations..."
                  aria-label="Search locations"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-subtle" aria-hidden="true">
                  &#x1F50D;
                </span>
              </div>
              <div className="flex gap-2" role="group" aria-label="Filter by status">
                {(["all", "active", "inactive", "pending"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full px-3 py-2 text-xs font-medium capitalize transition-colors ${
                      statusFilter === status
                        ? "bg-brand-cyan/10 text-brand-cyan"
                        : "bg-brand-elevated text-brand-muted hover:text-brand-text"
                    }`}
                    aria-pressed={statusFilter === status}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Location Cards */}
            <div className="mt-4 space-y-3" role="list" aria-label="Locations">
              {filteredLocations.map((location) => {
                const statusCfg = STATUS_STYLES[location.status];
                const isComparing = compareIds.includes(location.id);
                return (
                  <article
                    key={location.id}
                    className={`card-hover rounded-xl border bg-brand-surface p-5 ${
                      isComparing ? "border-brand-purple/40" : "border-brand-border"
                    }`}
                    role="listitem"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-brand-white">{location.name}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.className}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-brand-muted">
                          {location.address}, {location.city}, {location.state}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-brand-dim">
                          <span>
                            <span className="font-mono font-semibold text-brand-cyan">{location.activeCampaigns}</span> campaigns
                          </span>
                          <span>
                            <span className="font-mono font-semibold text-brand-green">{location.totalCompletions}</span> completions
                          </span>
                          <span>
                            <span className="font-mono font-semibold text-brand-amber">{location.completionRate}%</span> rate
                          </span>
                          <span>
                            <span className="font-mono font-semibold text-brand-pink">{formatCurrency(location.marketingValue)}</span> value
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCompare(location.id)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            isComparing
                              ? "border-brand-purple/40 bg-brand-purple/10 text-brand-purple"
                              : "border-brand-border text-brand-muted hover:text-brand-text"
                          }`}
                          aria-pressed={isComparing}
                          aria-label={`${isComparing ? "Remove from" : "Add to"} comparison`}
                        >
                          {isComparing ? "Comparing" : "Compare"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedLocation(location); setView("detail"); }}
                          className="rounded-lg bg-brand-elevated px-3 py-1.5 text-xs font-medium text-brand-cyan transition-colors hover:bg-brand-cyan/10"
                          aria-label={`View details for ${location.name}`}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {filteredLocations.length === 0 && (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-surface">
                  <p className="text-sm text-brand-muted">No locations match your search.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Location View */}
        {view === "add" && (
          <div className="mx-auto mt-6 max-w-xl rounded-xl border border-brand-border bg-brand-surface p-6">
            <h2 className="font-heading text-xl italic text-brand-white">Add New Location</h2>
            <p className="mt-1 text-sm text-brand-muted">Register a new business location to manage campaigns.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="loc-name" className="block text-sm font-medium text-brand-text">
                  Location Name
                </label>
                <input
                  id="loc-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                  placeholder="e.g., Downtown Location"
                />
              </div>
              <div>
                <label htmlFor="loc-address" className="block text-sm font-medium text-brand-text">
                  Street Address
                </label>
                <input
                  id="loc-address"
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="loc-city" className="block text-sm font-medium text-brand-text">
                    City
                  </label>
                  <input
                    id="loc-city"
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label htmlFor="loc-state" className="block text-sm font-medium text-brand-text">
                    State
                  </label>
                  <input
                    id="loc-state"
                    type="text"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="State"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-muted transition-colors hover:text-brand-text"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddLocation}
                  disabled={!formName || !formAddress || !formCity || !formState}
                  className="rounded-lg bg-brand-cyan px-5 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add Location
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail View */}
        {view === "detail" && selectedLocation && (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-heading text-2xl italic text-brand-white">{selectedLocation.name}</h2>
                  <p className="mt-1 text-sm text-brand-muted">
                    {selectedLocation.address}, {selectedLocation.city}, {selectedLocation.state}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[selectedLocation.status].className}`}>
                  {STATUS_STYLES[selectedLocation.status].label}
                </span>
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-brand-border bg-brand-bg p-3">
                  <p className="text-xs text-brand-muted">Active Campaigns</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-brand-cyan">{selectedLocation.activeCampaigns}</p>
                </div>
                <div className="rounded-lg border border-brand-border bg-brand-bg p-3">
                  <p className="text-xs text-brand-muted">Completions</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-brand-green">{selectedLocation.totalCompletions}</p>
                </div>
                <div className="rounded-lg border border-brand-border bg-brand-bg p-3">
                  <p className="text-xs text-brand-muted">Completion Rate</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-brand-amber">{selectedLocation.completionRate}%</p>
                </div>
                <div className="rounded-lg border border-brand-border bg-brand-bg p-3">
                  <p className="text-xs text-brand-muted">Marketing Value</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-brand-pink">{formatCurrency(selectedLocation.marketingValue)}</p>
                </div>
              </div>
            </div>

            {/* Staff */}
            <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
              <h3 className="font-heading text-lg italic text-brand-white">Staff</h3>
              {selectedLocation.staff.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {selectedLocation.staff.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-bg px-4 py-2">
                      <p className="text-sm text-brand-text">{member.name}</p>
                      <p className="text-xs text-brand-muted">{member.role}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-brand-muted">No staff members assigned.</p>
              )}
            </div>
          </div>
        )}

        {/* Compare View */}
        {view === "compare" && (
          <div className="mt-6">
            <h2 className="font-heading text-xl italic text-brand-white">Location Comparison</h2>
            <p className="mt-1 text-sm text-brand-muted">Comparing {compareLocations.length} locations side by side</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[600px]" role="table">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-muted">
                      Metric
                    </th>
                    {compareLocations.map((loc) => (
                      <th key={loc.id} scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-brand-text">
                        {loc.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {([
                    { label: "Active Campaigns", key: "activeCampaigns" as const, color: "text-brand-cyan" },
                    { label: "Completions", key: "totalCompletions" as const, color: "text-brand-green" },
                    { label: "Completion Rate", key: "completionRate" as const, color: "text-brand-amber", suffix: "%" },
                    { label: "Reviews", key: "reviews" as const, color: "text-brand-purple" },
                    { label: "Marketing Value", key: "marketingValue" as const, color: "text-brand-pink", format: "currency" },
                  ]).map((metric) => (
                    <tr key={metric.key} className="transition-colors hover:bg-brand-elevated/50">
                      <td className="px-4 py-3 text-sm text-brand-dim">{metric.label}</td>
                      {compareLocations.map((loc) => {
                        const val = loc[metric.key];
                        const display = metric.format === "currency"
                          ? formatCurrency(val)
                          : metric.suffix
                            ? `${val}${metric.suffix}`
                            : String(val);
                        // Determine if this is the best value
                        const values = compareLocations.map((l) => l[metric.key]);
                        const maxVal = Math.max(...values);
                        const isBest = val === maxVal;
                        return (
                          <td
                            key={loc.id}
                            className={`px-4 py-3 text-right font-mono text-sm font-semibold ${
                              isBest ? metric.color : "text-brand-dim"
                            }`}
                          >
                            {display}
                            {isBest && <span className="ml-1 text-[10px]" aria-label="Best performing">&uarr;</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => { setCompareIds([]); setView("list"); }}
                className="rounded-lg border border-brand-border px-4 py-2 text-sm text-brand-muted transition-colors hover:text-brand-text"
              >
                Clear Comparison
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
