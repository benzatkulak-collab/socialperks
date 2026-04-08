"use client";

import { useState, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActiveCampaign {
  id: string;
  name: string;
  platform: string;
  platformIcon: string;
  action: string;
  rewardType: "pct" | "dol" | "free";
  rewardValue: string;
  status: "active" | "paused" | "ended";
  completions: number;
  createdAt: string;
  description?: string;
  guidelines?: string;
  maxCompletions?: number | null;
  tags?: string[];
}

export interface CampaignEditModalProps {
  campaign: ActiveCampaign;
  onSave: () => void;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CampaignEditModal({
  campaign,
  onSave,
  onClose,
}: CampaignEditModalProps) {
  // Parse discount value and type from the rewardValue string
  const parseDiscountValue = (): string => {
    if (campaign.rewardType === "free") return "100";
    const num = campaign.rewardValue.replace(/[^0-9.]/g, "");
    return num || "10";
  };

  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description ?? "");
  const [guidelines, setGuidelines] = useState(campaign.guidelines ?? "");
  const [discountValue, setDiscountValue] = useState(parseDiscountValue());
  const [discountType, setDiscountType] = useState<"pct" | "dol">(
    campaign.rewardType === "free" ? "pct" : campaign.rewardType
  );
  const [maxCompletions, setMaxCompletions] = useState(
    campaign.maxCompletions != null ? String(campaign.maxCompletions) : ""
  );
  const [tags, setTags] = useState((campaign.tags ?? []).join(", "));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }

    const dv = parseFloat(discountValue);
    if (isNaN(dv) || dv <= 0) {
      setError("Discount value must be a positive number.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const token = document.cookie.match(/sp-access-token=([^;]+)/)?.[1];
      const payload: Record<string, unknown> = {
        campaignId: campaign.id,
        name: name.trim(),
        description: description.trim(),
        guidelines: guidelines.trim(),
        discountValue: dv,
        discountType,
      };

      if (maxCompletions.trim()) {
        const mc = parseInt(maxCompletions.trim(), 10);
        if (isNaN(mc) || mc < 1) {
          setError("Max completions must be a positive integer or empty for unlimited.");
          setSaving(false);
          return;
        }
        payload.maxCompletions = mc;
      } else {
        payload.maxCompletions = null;
      }

      if (tags.trim()) {
        payload.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      } else {
        payload.tags = [];
      }

      const res = await fetch("/api/v1/campaigns", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.error?.message ?? "Failed to save campaign. Please try again.";
        setError(msg);
        setSaving(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSave();
      }, 600);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [
    campaign.id,
    name,
    description,
    guidelines,
    discountValue,
    discountType,
    maxCompletions,
    tags,
    onSave,
  ]);

  return (
    <Modal open onClose={onClose} title={`Edit: ${campaign.name}`} size="lg">
      <div className="space-y-1">
        {/* Success banner */}
        {success && (
          <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg px-4 py-3 text-sm text-brand-green font-medium mb-2" role="status">
            Campaign updated successfully!
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-brand-red/10 border border-brand-red/30 rounded-lg px-4 py-3 text-sm text-brand-red font-medium mb-2" role="alert">
            {error}
          </div>
        )}

        {/* Campaign info header */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-brand-border">
          <span className="text-lg">{campaign.platformIcon}</span>
          <div className="min-w-0">
            <p className="text-xs text-brand-muted">{campaign.platform} &middot; {campaign.action}</p>
            <p className="text-xs text-brand-dim">{campaign.completions} completions</p>
          </div>
        </div>

        {/* Form fields */}
        <Field
          label="Campaign Name"
          value={name}
          onChange={setName}
          placeholder="e.g. Summer Review Campaign"
          required
        />

        <Field
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Brief description of this campaign"
          multiline
        />

        <Field
          label="Guidelines"
          value={guidelines}
          onChange={setGuidelines}
          placeholder="Instructions for participants"
          multiline
        />

        {/* Discount row */}
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Discount Value"
            value={discountValue}
            onChange={setDiscountValue}
            type="number"
            placeholder="e.g. 15"
            required
          />
          <div className="flex flex-col gap-1.5 mb-3">
            <span className="text-xs font-medium text-brand-dim font-body">Discount Type</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDiscountType("pct")}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  discountType === "pct"
                    ? "bg-brand-cyan/10 border-brand-cyan/40 text-brand-cyan"
                    : "bg-brand-elevated border-brand-border text-brand-dim hover:border-brand-border-hover"
                }`}
              >
                % Off
              </button>
              <button
                type="button"
                onClick={() => setDiscountType("dol")}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  discountType === "dol"
                    ? "bg-brand-cyan/10 border-brand-cyan/40 text-brand-cyan"
                    : "bg-brand-elevated border-brand-border text-brand-dim hover:border-brand-border-hover"
                }`}
              >
                $ Off
              </button>
            </div>
          </div>
        </div>

        <Field
          label="Max Completions"
          value={maxCompletions}
          onChange={setMaxCompletions}
          type="number"
          placeholder="Leave blank for unlimited"
          hint="Maximum number of times this campaign can be completed"
        />

        <Field
          label="Tags"
          value={tags}
          onChange={setTags}
          placeholder="e.g. summer, review, social"
          hint="Comma-separated tags for organization"
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border mt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saving}
            disabled={success}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
