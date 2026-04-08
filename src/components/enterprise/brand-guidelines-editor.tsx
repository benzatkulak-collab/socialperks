"use client";

import { useCallback, useState } from "react";
import type { BrandGuidelines } from "./brand-manager";

interface BrandGuidelinesEditorProps {
  guidelines: BrandGuidelines;
  onSave: (guidelines: BrandGuidelines) => void;
}

export function BrandGuidelinesEditor({ guidelines, onSave }: BrandGuidelinesEditorProps) {
  const [editGuidelines, setEditGuidelines] = useState<BrandGuidelines>({ ...guidelines });
  const [newHashtag, setNewHashtag] = useState("");
  const [newDisclaimer, setNewDisclaimer] = useState("");
  const [guidelinesSaved, setGuidelinesSaved] = useState(false);

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
    onSave(editGuidelines);
    setGuidelinesSaved(true);
  }, [editGuidelines, onSave]);

  return (
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
  );
}
