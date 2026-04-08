"use client";

import { useState } from "react";
import { BrandGuidelinesEditor } from "./brand-guidelines-editor";
import { BrandTemplatesPanel } from "./brand-templates-panel";
import { BrandContentReview } from "./brand-content-review";
import { BrandComplianceTable } from "./brand-compliance-table";

// ═══════════════ Types ═══════════════

export interface BrandGuidelines {
  approvedHashtags: string[];
  requiredDisclaimers: string[];
  photoGuidelines: string;
  toneOfVoice: string;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  platforms: string[];
  tier: string;
  actionsRequired: string[];
  createdAt: string;
  usageCount: number;
}

export interface PendingReview {
  id: string;
  influencerName: string;
  influencerAvatar: string;
  locationName: string;
  campaignName: string;
  platform: string;
  platformIcon: string;
  contentType: string;
  submittedAt: string;
  previewUrl: string;
  complianceFlags: string[];
}

export interface LocationCompliance {
  id: string;
  name: string;
  score: number;
  totalSubmissions: number;
  flaggedSubmissions: number;
}

interface BrandManagerProps {
  guidelines: BrandGuidelines;
  templates: CampaignTemplate[];
  pendingReviews: PendingReview[];
  locationCompliance: LocationCompliance[];
  onUpdateGuidelines: (guidelines: BrandGuidelines) => void;
}

// ═══════════════ Component ═══════════════

export default function BrandManager({
  guidelines,
  templates,
  pendingReviews,
  locationCompliance,
  onUpdateGuidelines,
}: BrandManagerProps) {
  const [activeTab, setActiveTab] = useState<"guidelines" | "templates" | "review" | "compliance">("guidelines");

  const tabs = [
    { id: "guidelines" as const, label: "Brand Guidelines", count: null },
    { id: "templates" as const, label: "Templates", count: templates.length },
    { id: "review" as const, label: "Content Review", count: pendingReviews.length },
    { id: "compliance" as const, label: "Compliance", count: null },
  ];

  return (
    <div className="min-h-screen bg-brand-bg font-body">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl italic text-brand-white">Brand Manager</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Manage brand compliance, guidelines, and content approval
          </p>
        </div>

        {/* Tabs */}
        <nav className="mt-6 border-b border-brand-border" aria-label="Brand manager sections">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-brand-cyan text-brand-cyan"
                    : "text-brand-muted hover:text-brand-text"
                }`}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className="rounded-full bg-brand-cyan/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-cyan">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Tab Content */}
        <div className="mt-6" role="tabpanel">
          {activeTab === "guidelines" && (
            <BrandGuidelinesEditor guidelines={guidelines} onSave={onUpdateGuidelines} />
          )}
          {activeTab === "templates" && (
            <BrandTemplatesPanel templates={templates} />
          )}
          {activeTab === "review" && (
            <BrandContentReview pendingReviews={pendingReviews} />
          )}
          {activeTab === "compliance" && (
            <BrandComplianceTable locationCompliance={locationCompliance} />
          )}
        </div>
      </div>
    </div>
  );
}
