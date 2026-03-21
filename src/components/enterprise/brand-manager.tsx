"use client";

import { useState, useCallback } from "react";

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

export default function BrandManager({
  guidelines,
  templates,
  pendingReviews,
  locationCompliance,
  onUpdateGuidelines,
}: BrandManagerProps) {
  const [activeTab, setActiveTab] = useState<"guidelines" | "templates" | "review" | "compliance">("guidelines");

  // Guidelines editing state
  const [editGuidelines, setEditGuidelines] = useState<BrandGuidelines>({ ...guidelines });
  const [newHashtag, setNewHashtag] = useState("");
  const [newDisclaimer, setNewDisclaimer] = useState("");
  const [guidelinesSaved, setGuidelinesSaved] = useState(false);

  // Template state
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [localTemplates, setLocalTemplates] = useState<CampaignTemplate[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");

  // Review actions
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const addHashtag = useCallback(() => {
    if (!newHashtag) return;
    const tag = newHashtag.startsWith("#") ? newHashtag : `#${newHashtag}`;
    if (editGuidelines.approvedHashtags.includes(tag)) return;
    setEditGuidelines((prev) => ({
      ...prev,
      approvedHashtags: [...prev.approvedHashtags, tag],
    }));
    setNewHashtag("");
    setGuidelinesSaved(false);
  }, [newHashtag, editGuidelines.approvedHashtags]);

  const removeHashtag = useCallback((tag: string) => {
    setEditGuidelines((prev) => ({
      ...prev,
      approvedHashtags: prev.approvedHashtags.filter((t) => t !== tag),
    }));
    setGuidelinesSaved(false);
  }, []);

  const addDisclaimer = useCallback(() => {
    if (!newDisclaimer) return;
    setEditGuidelines((prev) => ({
      ...prev,
      requiredDisclaimers: [...prev.requiredDisclaimers, newDisclaimer],
    }));
    setNewDisclaimer("");
    setGuidelinesSaved(false);
  }, [newDisclaimer]);

  const removeDisclaimer = useCallback((disclaimer: string) => {
    setEditGuidelines((prev) => ({
      ...prev,
      requiredDisclaimers: prev.requiredDisclaimers.filter((d) => d !== disclaimer),
    }));
    setGuidelinesSaved(false);
  }, []);

  const saveGuidelines = useCallback(() => {
    onUpdateGuidelines(editGuidelines);
    setGuidelinesSaved(true);
  }, [editGuidelines, onUpdateGuidelines]);

  const handleReviewAction = useCallback((reviewId: string) => {
    setReviewedIds((prev) => {
      const next = new Set(prev);
      next.add(reviewId);
      return next;
    });
  }, []);

  const handleCreateTemplate = useCallback(() => {
    if (!newTemplateName) return;
    const newTemplate: CampaignTemplate = {
      id: crypto.randomUUID(),
      name: newTemplateName,
      description: newTemplateDescription || "No description",
      platforms: [],
      tier: "essential",
      actionsRequired: [],
      createdAt: new Date().toISOString().split("T")[0],
      usageCount: 0,
    };
    setLocalTemplates((prev) => [...prev, newTemplate]);
    setNewTemplateName("");
    setNewTemplateDescription("");
    setShowCreateTemplate(false);
  }, [newTemplateName, newTemplateDescription]);

  const handleStartEditTemplate = useCallback((template: CampaignTemplate) => {
    setEditingTemplateId(template.id);
    setEditingTemplateName(template.name);
  }, []);

  const handleSaveEditTemplate = useCallback((templateId: string) => {
    setLocalTemplates((prev) =>
      prev.map((t) => t.id === templateId ? { ...t, name: editingTemplateName } : t)
    );
    setEditingTemplateId(null);
    setEditingTemplateName("");
  }, [editingTemplateName]);

  const allTemplates = [...templates, ...localTemplates];
  const activeReviews = pendingReviews.filter((r) => !reviewedIds.has(r.id));

  const tabs = [
    { id: "guidelines" as const, label: "Brand Guidelines", count: null },
    { id: "templates" as const, label: "Templates", count: allTemplates.length },
    { id: "review" as const, label: "Content Review", count: activeReviews.length },
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
          {/* Guidelines Editor */}
          {activeTab === "guidelines" && (
            <div className="space-y-6">
              {/* Approved Hashtags */}
              <section className="rounded-xl border border-brand-border bg-brand-surface p-6">
                <h2 className="font-heading text-lg italic text-brand-white">Approved Hashtags</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  Hashtags that locations and influencers must use in sponsored content.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {editGuidelines.approvedHashtags.map((tag) => (
                    <span
                      key={tag}
                      className="group flex items-center gap-1.5 rounded-full bg-brand-cyan/10 px-3 py-1 text-sm text-brand-cyan"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeHashtag(tag)}
                        className="text-brand-cyan/50 transition-colors hover:text-brand-red"
                        aria-label={`Remove hashtag ${tag}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newHashtag}
                    onChange={(e) => setNewHashtag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addHashtag()}
                    className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="Add hashtag..."
                    aria-label="New hashtag"
                  />
                  <button
                    type="button"
                    onClick={addHashtag}
                    disabled={!newHashtag}
                    className="rounded-lg bg-brand-elevated px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-brand-cyan/10 hover:text-brand-cyan disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </section>

              {/* Required Disclaimers */}
              <section className="rounded-xl border border-brand-border bg-brand-surface p-6">
                <h2 className="font-heading text-lg italic text-brand-white">Required Disclaimers</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  FTC-compliant disclaimers that must appear in sponsored content.
                </p>
                <div className="mt-4 space-y-2">
                  {editGuidelines.requiredDisclaimers.map((disclaimer) => (
                    <div
                      key={disclaimer}
                      className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-bg px-4 py-2"
                    >
                      <p className="text-sm text-brand-text">{disclaimer}</p>
                      <button
                        type="button"
                        onClick={() => removeDisclaimer(disclaimer)}
                        className="ml-2 shrink-0 text-xs text-brand-muted transition-colors hover:text-brand-red"
                        aria-label={`Remove disclaimer: ${disclaimer}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newDisclaimer}
                    onChange={(e) => setNewDisclaimer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addDisclaimer()}
                    className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="Add required disclaimer..."
                    aria-label="New disclaimer"
                  />
                  <button
                    type="button"
                    onClick={addDisclaimer}
                    disabled={!newDisclaimer}
                    className="rounded-lg bg-brand-elevated px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-brand-cyan/10 hover:text-brand-cyan disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </section>

              {/* Photo Guidelines */}
              <section className="rounded-xl border border-brand-border bg-brand-surface p-6">
                <h2 className="font-heading text-lg italic text-brand-white">Photo Guidelines</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  Instructions for photo content quality and style.
                </p>
                <textarea
                  value={editGuidelines.photoGuidelines}
                  onChange={(e) => {
                    setEditGuidelines((prev) => ({ ...prev, photoGuidelines: e.target.value }));
                    setGuidelinesSaved(false);
                  }}
                  rows={4}
                  className="mt-3 w-full resize-none rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                  placeholder="Describe photo requirements: lighting, framing, branding elements..."
                  aria-label="Photo guidelines"
                />
              </section>

              {/* Tone of Voice */}
              <section className="rounded-xl border border-brand-border bg-brand-surface p-6">
                <h2 className="font-heading text-lg italic text-brand-white">Tone of Voice</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  The brand voice to be used across all content.
                </p>
                <textarea
                  value={editGuidelines.toneOfVoice}
                  onChange={(e) => {
                    setEditGuidelines((prev) => ({ ...prev, toneOfVoice: e.target.value }));
                    setGuidelinesSaved(false);
                  }}
                  rows={3}
                  className="mt-3 w-full resize-none rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                  placeholder="Describe the brand personality and tone..."
                  aria-label="Tone of voice"
                />
              </section>

              {/* Save */}
              <div className="flex items-center justify-end gap-3">
                {guidelinesSaved && (
                  <span className="text-sm font-medium text-brand-green" role="status">
                    Guidelines saved
                  </span>
                )}
                <button
                  type="button"
                  onClick={saveGuidelines}
                  className="rounded-lg bg-brand-cyan px-5 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90"
                >
                  Save Guidelines
                </button>
              </div>
            </div>
          )}

          {/* Templates */}
          {activeTab === "templates" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-brand-muted">
                  {allTemplates.length} pre-approved template{allTemplates.length !== 1 ? "s" : ""}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateTemplate(!showCreateTemplate)}
                  className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90"
                >
                  Create Template
                </button>
              </div>

              {/* Create Template Form */}
              {showCreateTemplate && (
                <div className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-4">
                  <h3 className="text-sm font-medium text-brand-white">New Template</h3>
                  <div className="mt-3 space-y-3">
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                      placeholder="Template name"
                      aria-label="Template name"
                    />
                    <input
                      type="text"
                      value={newTemplateDescription}
                      onChange={(e) => setNewTemplateDescription(e.target.value)}
                      className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                      placeholder="Description"
                      aria-label="Template description"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCreateTemplate}
                        disabled={!newTemplateName}
                        className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Save Template
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {allTemplates.map((template) => (
                  <article
                    key={template.id}
                    className="card-hover rounded-xl border border-brand-border bg-brand-surface p-5"
                  >
                    <div className="flex items-start justify-between">
                      {editingTemplateId === template.id ? (
                        <input
                          type="text"
                          value={editingTemplateName}
                          onChange={(e) => setEditingTemplateName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEditTemplate(template.id);
                            if (e.key === "Escape") setEditingTemplateId(null);
                          }}
                          className="flex-1 rounded-lg border border-brand-cyan bg-brand-bg px-2 py-1 font-heading text-lg italic text-brand-white focus:outline-none"
                          aria-label="Edit template name"
                          autoFocus
                        />
                      ) : (
                        <h3 className="font-heading text-lg italic text-brand-white">{template.name}</h3>
                      )}
                      <span className="rounded-full bg-brand-elevated px-2 py-0.5 text-[10px] font-medium text-brand-muted">
                        {template.tier}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-brand-dim">{template.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {template.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="rounded-md bg-brand-bg px-2 py-0.5 text-xs text-brand-muted"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-brand-border pt-3">
                      <p className="text-xs text-brand-muted">
                        Used {template.usageCount} time{template.usageCount !== 1 ? "s" : ""} &middot; Created {template.createdAt}
                      </p>
                      {editingTemplateId === template.id ? (
                        <button
                          type="button"
                          onClick={() => handleSaveEditTemplate(template.id)}
                          className="text-xs font-medium text-brand-green transition-colors hover:text-brand-white"
                          aria-label={`Save template ${template.name}`}
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEditTemplate(template)}
                          className="text-xs font-medium text-brand-cyan transition-colors hover:text-brand-white"
                          aria-label={`Edit template ${template.name}`}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {allTemplates.length === 0 && (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-surface">
                  <div className="text-center">
                    <p className="text-sm text-brand-muted">No templates yet.</p>
                    <p className="mt-1 text-xs text-brand-subtle">Create templates for consistent campaign deployment across locations.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content Review Queue */}
          {activeTab === "review" && (
            <div className="space-y-4">
              <p className="text-sm text-brand-muted">
                {activeReviews.length} submission{activeReviews.length !== 1 ? "s" : ""} pending review
              </p>

              {activeReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-xl border border-brand-border bg-brand-surface p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" aria-hidden="true">{review.influencerAvatar}</span>
                        <div>
                          <p className="text-sm font-medium text-brand-white">{review.influencerName}</p>
                          <p className="text-xs text-brand-muted">
                            {review.locationName} &middot; {review.campaignName}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-xs text-brand-dim">
                        <span className="flex items-center gap-1">
                          <span aria-hidden="true">{review.platformIcon}</span>
                          {review.platform}
                        </span>
                        <span>{review.contentType}</span>
                        <span>Submitted {review.submittedAt}</span>
                      </div>

                      {/* Compliance Flags */}
                      {review.complianceFlags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {review.complianceFlags.map((flag) => (
                            <span
                              key={flag}
                              className="flex items-center gap-1 rounded-full bg-brand-red/10 px-2.5 py-0.5 text-xs font-medium text-brand-red"
                            >
                              <span aria-hidden="true">&#9888;</span>
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleReviewAction(review.id)}
                        className="rounded-lg bg-brand-green/10 px-4 py-1.5 text-sm font-medium text-brand-green transition-colors hover:bg-brand-green/20"
                        aria-label={`Approve submission from ${review.influencerName}`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewAction(review.id)}
                        className="rounded-lg bg-brand-red/10 px-4 py-1.5 text-sm font-medium text-brand-red transition-colors hover:bg-brand-red/20"
                        aria-label={`Reject submission from ${review.influencerName}`}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {activeReviews.length === 0 && (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-surface">
                  <div className="text-center">
                    <p className="text-sm text-brand-muted">All submissions reviewed!</p>
                    <p className="mt-1 text-xs text-brand-subtle">New submissions will appear here for approval.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compliance Scores */}
          {activeTab === "compliance" && (
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
          )}
        </div>
      </div>
    </div>
  );
}
