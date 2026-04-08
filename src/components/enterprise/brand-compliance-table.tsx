"use client";

import type { LocationCompliance } from "./brand-manager";

// ═══════════════ Helpers ═══════════════

function getScoreColor(score: number): string {
  if (score >= 90) return "text-brand-green";
  if (score >= 70) return "text-brand-amber";
  return "text-brand-red";
}

function getScoreBg(score: number): string {
  if (score >= 90) return "bg-brand-green";
  if (score >= 70) return "bg-brand-amber";
  return "bg-brand-red";
}

// ═══════════════ Component ═══════════════

interface BrandComplianceTableProps {
  locationCompliance: LocationCompliance[];
}

export function BrandComplianceTable({ locationCompliance }: BrandComplianceTableProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-brand-muted">
        Brand compliance scores per location. Based on content adherence to guidelines.
      </p>

      <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
        <table className="w-full" role="table">
          <thead>
            <tr className="border-b border-brand-border">
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-muted">
                Location
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-brand-muted">
                Submissions
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-brand-muted">
                Flagged
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-brand-muted">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {locationCompliance
              .sort((a, b) => b.score - a.score)
              .map((loc) => (
                <tr key={loc.id} className="transition-colors hover:bg-brand-elevated/50">
                  <td className="px-4 py-3 text-sm font-medium text-brand-text">{loc.name}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-brand-dim">
                    {loc.totalSubmissions}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-brand-dim">
                    {loc.flaggedSubmissions > 0 ? (
                      <span className="text-brand-red">{loc.flaggedSubmissions}</span>
                    ) : (
                      <span>0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-brand-elevated sm:block">
                        <div
                          className={`h-full rounded-full ${getScoreBg(loc.score)}`}
                          style={{ width: `${loc.score}%` }}
                        />
                      </div>
                      <span className={`font-mono text-sm font-semibold ${getScoreColor(loc.score)}`}>
                        {loc.score}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {locationCompliance.length === 0 && (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-brand-muted">No compliance data yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
