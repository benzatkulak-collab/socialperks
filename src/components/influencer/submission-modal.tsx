"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { MarketplaceCampaign } from "@/components/influencer/marketplace-utils";

export function SubmissionModal({
  campaign,
  onSubmit,
  onClose,
}: {
  campaign: MarketplaceCampaign;
  onSubmit: (proofUrl: string, proofType: string, notes: string) => void;
  onClose: () => void;
}) {
  const [proofUrl, setProofUrl] = useState("");
  const [proofType, setProofType] = useState("url");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = useCallback(() => {
    if (!proofUrl.trim()) {
      setError("Please provide a proof URL.");
      return;
    }
    onSubmit(proofUrl, proofType, notes);
  }, [proofUrl, proofType, notes, onSubmit]);

  const handleProofUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setProofUrl(e.target.value);
    setError("");
  }, []);

  const handleProofTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setProofType(e.target.value);
  }, []);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Submit proof">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-brand-surface border border-brand-border rounded-xl p-6 animate-fade-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-md text-brand-muted hover:text-brand-text hover:bg-brand-elevated transition-colors text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
          aria-label="Close modal"
        >
          &times;
        </button>
        <h2 className="text-lg font-bold text-brand-text mb-1">Submit Proof</h2>
        <p className="text-xs text-brand-dim mb-4">
          {campaign.platformIcon} {campaign.campaignName}
        </p>

        <div className="bg-brand-elevated/50 rounded-lg p-3 mb-4">
          <div className="text-xs text-brand-muted mb-1">Requirements</div>
          <div className="text-xs text-brand-text">
            {campaign.description}
          </div>
          <div className="flex gap-2 mt-2">
            {campaign.actionsRequired.map((a) => (
              <span key={a} className="px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan text-3xs font-semibold">{a}</span>
            ))}
          </div>
          <div className="text-xs text-brand-green mt-2 font-semibold">
            Perk: {campaign.perkValue}{campaign.perkType === "pct" ? "% off" : " dollars"}
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label htmlFor="proof-url" className="block text-xs font-semibold text-brand-dim mb-1">Proof URL</label>
            <input
              id="proof-url"
              type="url"
              placeholder="https://instagram.com/p/..."
              value={proofUrl}
              onChange={handleProofUrlChange}
              required
              className="w-full px-3 py-2 rounded-md border border-brand-border bg-brand-bg text-brand-text text-sm font-body outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 transition-all"
            />
          </div>
          <div>
            <label htmlFor="proof-type" className="block text-xs font-semibold text-brand-dim mb-1">Proof Type</label>
            <select
              id="proof-type"
              value={proofType}
              onChange={handleProofTypeChange}
              className="w-full px-3 py-2 rounded-md border border-brand-border bg-brand-bg text-brand-text text-sm font-body outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 cursor-pointer appearance-none"
            >
              <option value="url">URL</option>
              <option value="screenshot">Screenshot</option>
            </select>
          </div>
          <div>
            <label htmlFor="proof-notes" className="block text-xs font-semibold text-brand-dim mb-1">Notes (optional)</label>
            <textarea
              id="proof-notes"
              placeholder="Any additional context about your submission..."
              value={notes}
              onChange={handleNotesChange}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-brand-border bg-brand-bg text-brand-text text-sm font-body outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 transition-all resize-none"
            />
          </div>
        </div>

        {error && <div className="text-xs text-brand-red mb-3" role="alert" aria-live="polite">{error}</div>}

        <div className="flex gap-3">
          <Button fullWidth onClick={handleSubmit}>
            Submit Proof
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
