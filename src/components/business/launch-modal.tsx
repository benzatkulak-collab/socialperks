"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { PLATFORMS, FOLLOWER_TIERS } from "@/lib/platforms";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CampaignData {
  id: string;
  name: string;
  description: string;
  actions: string[];
  discountValue: number;
  discountType: "pct" | "dol";
  category: string;
  tier: string;
  reason: string;
}

interface LaunchModalProps {
  campaign: CampaignData;
  onLaunch: (data: Record<string, unknown>) => void;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LaunchModal({ campaign, onLaunch, onClose }: LaunchModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const fieldId = useId();
  const [name, setName] = useState(campaign.name);
  const [instructions, setInstructions] = useState(campaign.description);
  const [guidelines, setGuidelines] = useState("");
  const [perkValue, setPerkValue] = useState(String(campaign.discountValue));
  const [perkType, setPerkType] = useState<"pct" | "dol">(
    campaign.discountType
  );
  const [maxCompletions, setMaxCompletions] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [selectedActions, setSelectedActions] = useState<string[]>([
    ...campaign.actions,
  ]);
  const [validationError, setValidationError] = useState("");

  // Reset form when a different campaign is opened
  useEffect(() => {
    setName(campaign.name);
    setInstructions(campaign.description);
    setPerkValue(String(campaign.discountValue));
    setPerkType(campaign.discountType);
    setSelectedActions([...campaign.actions]);
    setValidationError("");
  }, [campaign.id, campaign.name, campaign.description, campaign.discountValue, campaign.discountType, campaign.actions]);

  const toggleAction = (actionId: string) =>
    setSelectedActions((prev) =>
      prev.includes(actionId)
        ? prev.filter((a) => a !== actionId)
        : [...prev, actionId]
    );

  function handleLaunch() {
    setValidationError("");
    if (!name || !selectedActions.length) return;

    // Defense in depth: even if the picker UI lets a prohibited action
    // through (bug, future regression, programmatic injection), block
    // launch. Prohibited = action.incentivizable === false in the
    // platforms catalog (e.g. Google/Yelp/Tripadvisor reviews).
    const prohibitedSelections: string[] = [];
    for (const platform of PLATFORMS) {
      for (const action of platform.actions) {
        if (selectedActions.includes(action.id) && action.incentivizable === false) {
          prohibitedSelections.push(`${platform.name} ${action.label}`);
        }
      }
    }
    if (prohibitedSelections.length > 0) {
      setValidationError(
        `Cannot launch: ${prohibitedSelections.join(", ")} — these platforms ban incentivized reviews under their ToS.`
      );
      return;
    }

    const parsedPerkValue = parseInt(perkValue);
    if (!parsedPerkValue || parsedPerkValue <= 0) {
      setValidationError("Perk value must be greater than 0.");
      return;
    }

    const parsedMaxCompletions = parseInt(maxCompletions);
    if (maxCompletions && (!parsedMaxCompletions || parsedMaxCompletions <= 0)) {
      setValidationError("Max completions must be greater than 0.");
      return;
    }

    const parsedExpiresInDays = parseInt(expiresInDays);
    if (expiresInDays && (!parsedExpiresInDays || parsedExpiresInDays <= 0)) {
      setValidationError("Expiration days must be greater than 0.");
      return;
    }

    onLaunch({
      id: campaign.id,
      name,
      instructions,
      guidelines,
      actions: selectedActions,
      discountValue: parsedPerkValue,
      discountType: perkType,
      maxCompletions: parsedMaxCompletions || null,
      expiresInDays: parsedExpiresInDays || 30,
      category: campaign.category,
      tier: campaign.tier,
    });
  }

  const inputClasses =
    "font-body text-sm px-3.5 py-2.5 rounded-md border border-brand-border bg-brand-bg text-brand-text w-full outline-none transition-all focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40";

  return (
    <div
      className="fixed inset-0 bg-black/85 z-50 overflow-auto p-4 md:p-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="animate-fade-in-scale max-w-4xl mx-auto my-8 bg-brand-surface rounded-2xl border border-brand-border p-6 md:p-7"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Customize and launch campaign"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-heading italic text-brand-text">
            Customize & Launch
          </h2>
          <button
            onClick={onClose}
            className="font-body font-semibold rounded-md border-none cursor-pointer transition-all duration-150 tracking-wide px-3 py-1.5 text-xs bg-transparent text-brand-dim hover:text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
            aria-label="Close dialog"
          >
            ✕ Close
          </button>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── Left Column: Form Fields ── */}
          <div>
            {/* Campaign Name */}
            <div className="mb-3.5">
              <label htmlFor={`${fieldId}-name`} className="block text-2xs font-semibold text-brand-dim mb-1.5 font-body">
                Campaign Name
              </label>
              <input
                id={`${fieldId}-name`}
                className={inputClasses}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name your campaign"
                required
              />
            </div>

            {/* Customer Instructions */}
            <div className="mb-3.5">
              <label htmlFor={`${fieldId}-instructions`} className="block text-2xs font-semibold text-brand-dim mb-1.5 font-body">
                Customer Instructions
              </label>
              <textarea
                id={`${fieldId}-instructions`}
                className={`${inputClasses} resize-y min-h-[80px]`}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="What should customers do to complete this campaign?"
              />
            </div>

            {/* Content Guidelines */}
            <div className="mb-3.5">
              <label htmlFor={`${fieldId}-guidelines`} className="block text-2xs font-semibold text-brand-dim mb-1.5 font-body">
                Content Guidelines
              </label>
              <textarea
                id={`${fieldId}-guidelines`}
                className={`${inputClasses} resize-y min-h-[80px]`}
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                placeholder="Brand voice, photo tips, dos and don'ts..."
              />
            </div>

            {/* Perk Value & Type */}
            <div className="flex gap-3">
              <div className="flex-1 mb-3.5">
                <label htmlFor={`${fieldId}-perk-value`} className="block text-2xs font-semibold text-brand-dim mb-1.5 font-body">
                  Perk Value
                </label>
                <input
                  id={`${fieldId}-perk-value`}
                  className={inputClasses}
                  type="number"
                  min="1"
                  value={perkValue}
                  onChange={(e) => setPerkValue(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1 mb-3.5">
                <div className="text-2xs font-semibold text-brand-dim mb-1.5 font-body">
                  Type
                </div>
                <div className="flex gap-1">
                  {(
                    [
                      { value: "pct" as const, label: "% Off" },
                      { value: "dol" as const, label: "$ Off" },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setPerkType(o.value)}
                      className={`font-body text-xs font-semibold px-3 py-2.5 rounded-md flex-1 transition-colors border ${
                        perkType === o.value
                          ? "border-brand-cyan bg-brand-cyan/5 text-brand-cyan"
                          : "border-brand-border bg-brand-bg text-brand-dim"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Max Completions & Expiry */}
            <div className="flex gap-3">
              <div className="flex-1 mb-3.5">
                <label htmlFor={`${fieldId}-max-completions`} className="block text-2xs font-semibold text-brand-dim mb-1.5 font-body">
                  Max Completions
                </label>
                <input
                  id={`${fieldId}-max-completions`}
                  className={inputClasses}
                  type="number"
                  min="1"
                  value={maxCompletions}
                  onChange={(e) => setMaxCompletions(e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
              <div className="flex-1 mb-3.5">
                <label htmlFor={`${fieldId}-expires`} className="block text-2xs font-semibold text-brand-dim mb-1.5 font-body">
                  Expires (days)
                </label>
                <input
                  id={`${fieldId}-expires`}
                  className={inputClasses}
                  type="number"
                  min="1"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Right Column: Actions, Tiers, FTC, Launch ── */}
          <div>
            {/* Action Picker by Platform */}
            <div className="text-2xs font-bold text-brand-dim mb-2 font-body">
              Actions ({selectedActions.length} selected)
            </div>
            <div className="max-h-64 overflow-auto scrollbar-thin mb-4 pr-1">
              {PLATFORMS.map((platform) => {
                const hasSelected = platform.actions.some((a) =>
                  selectedActions.includes(a.id)
                );
                return (
                  <div key={platform.id} className="mb-2.5">
                    <div
                      className={`text-2xs font-bold mb-1 font-body ${
                        hasSelected ? "" : "text-brand-muted"
                      }`}
                      style={hasSelected ? { color: platform.color } : {}}
                    >
                      {platform.icon} {platform.name}
                    </div>
                    <div className="flex flex-wrap gap-1 pl-4">
                      {platform.actions.map((action) => {
                        const selected = selectedActions.includes(action.id);
                        // Prohibited actions: Google reviews, Yelp reviews,
                        // TripAdvisor reviews etc. are flagged via
                        // incentivizable=false in the platforms catalog.
                        // Render them disabled with a tooltip so users know
                        // why — this is a hard ToS line, not a soft warning.
                        const prohibited = action.incentivizable === false;
                        if (prohibited) {
                          return (
                            <button
                              key={action.id}
                              type="button"
                              disabled
                              title={`${platform.name}'s policy prohibits incentivized ${action.label.toLowerCase()}s. Use a content action like a post or story instead.`}
                              className="font-body text-3xs font-semibold px-2 py-1 rounded border border-brand-red/30 bg-brand-red/5 text-brand-red/70 line-through cursor-not-allowed"
                              aria-label={`${action.label} — banned by ${platform.name} policy`}
                            >
                              ⛔ {action.label}
                            </button>
                          );
                        }
                        return (
                          <button
                            key={action.id}
                            onClick={() => toggleAction(action.id)}
                            className={`font-body text-3xs font-semibold px-2 py-1 rounded cursor-pointer border transition-colors ${
                              selected
                                ? ""
                                : "border-brand-border text-brand-muted hover:border-brand-border-hover hover:text-brand-dim"
                            }`}
                            style={
                              selected
                                ? {
                                    borderColor: platform.color,
                                    color: platform.color,
                                    backgroundColor: platform.color + "14",
                                  }
                                : {}
                            }
                          >
                            {selected ? "✓ " : ""}
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Follower Tiers */}
            <div className="bg-brand-amber/5 border border-brand-amber/15 rounded-lg p-3 mb-4">
              <div className="text-3xs font-bold text-brand-amber font-mono mb-2">
                FOLLOWER BONUS TIERS
              </div>
              <div className="space-y-1">
                {FOLLOWER_TIERS.map((tier) => (
                  <div
                    key={tier.label}
                    className="flex justify-between text-3xs font-body"
                  >
                    <span style={{ color: tier.color }}>{tier.label}</span>
                    <strong className="text-brand-green font-mono">
                      {(parseInt(perkValue) || 0) + tier.bonus}
                      {perkType === "pct" ? "%" : "$"}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* FTC Warning Note */}
            <div className="text-3xs text-brand-amber bg-brand-amber/5 px-2.5 py-2 rounded-md mb-4 font-body leading-relaxed">
              <strong className="block mb-0.5">FTC Compliance</strong>
              Disclosure auto-injected per platform. Reviews must state perk
              received. Social posts must include #ad #sponsored. This is
              mandatory and cannot be turned off.
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="text-xs text-brand-red bg-brand-red/5 border border-brand-red/20 rounded-md px-3 py-2 mb-4 font-body" role="alert" aria-live="assertive">
                {validationError}
              </div>
            )}

            {/* Launch Button */}
            <button
              onClick={handleLaunch}
              disabled={!name || !selectedActions.length}
              className={`w-full font-body font-semibold rounded-lg border-none cursor-pointer transition-all duration-150 tracking-wide py-3.5 text-sm bg-brand-green text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg ${
                !name || !selectedActions.length
                  ? "opacity-30 cursor-not-allowed"
                  : ""
              }`}
            >
              Launch Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LaunchModal;
