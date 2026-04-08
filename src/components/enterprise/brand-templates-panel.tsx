"use client";

import { useState, useCallback } from "react";
import type { CampaignTemplate } from "./brand-manager";

interface BrandTemplatesPanelProps {
  templates: CampaignTemplate[];
  onTotalCountChange?: (count: number) => void;
}

export function BrandTemplatesPanel({ templates, onTotalCountChange: _onTotalCountChange }: BrandTemplatesPanelProps) {
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [localTemplates, setLocalTemplates] = useState<CampaignTemplate[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");

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

  return (
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
  );
}
