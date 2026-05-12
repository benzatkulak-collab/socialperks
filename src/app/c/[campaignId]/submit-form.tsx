"use client";

import { useState, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ProofType = "url" | "screenshot" | "video";
type FormState = "idle" | "submitting" | "success" | "error";

interface SubmitFormProps {
  campaignId: string;
  /** Action IDs available for this campaign. */
  actions: { id: string; label: string; platformIcon: string }[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SubmitForm({ campaignId, actions }: SubmitFormProps) {
  const [proofUrl, setProofUrl] = useState("");
  const [proofType, setProofType] = useState<ProofType>("url");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedAction, setSelectedAction] = useState(actions[0]?.id ?? "");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // ── Validation ──────────────────────────────────────────────────────────

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isValidEmail = (e: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const canSubmit =
    formState !== "submitting" &&
    proofUrl.trim().length > 0 &&
    isValidUrl(proofUrl) &&
    email.trim().length > 0 &&
    isValidEmail(email) &&
    selectedAction.length > 0;

  // ── Submit Handler ──────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;

      setFormState("submitting");
      setErrorMessage("");

      try {
        // Public campaign-page submissions are anonymous — they hit a
        // dedicated no-auth endpoint instead of the CSRF-gated /submissions.
        const res = await fetch("/api/v1/submissions/public", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            actionId: selectedAction,
            proofUrl: proofUrl.trim(),
            proofType,
            email: email.trim(),
            notes: notes.trim() || undefined,
            source: "public_campaign_page",
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const msg =
            body?.error?.message ?? `Submission failed (${res.status})`;
          throw new Error(msg);
        }

        setFormState("success");
      } catch (err) {
        setFormState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong"
        );
      }
    },
    [canSubmit, campaignId, email, selectedAction, proofUrl, proofType, notes]
  );

  // ── Success State ───────────────────────────────────────────────────────

  if (formState === "success") {
    return (
      <div className="rounded-xl border border-brand-green/30 bg-brand-green/5 p-6 sm:p-8 text-center animate-fade-up">
        <div className="w-14 h-14 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-7 h-7 text-brand-green"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-heading italic text-brand-white mb-2">
          Submission Received!
        </h3>
        <p className="text-sm text-brand-dim leading-relaxed max-w-sm mx-auto">
          Your submission has been received! You&apos;ll be notified when
          it&apos;s reviewed. Check your email for updates.
        </p>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Action Selector */}
      {actions.length > 1 && (
        <div>
          <label
            htmlFor="action-select"
            className="block text-xs font-semibold text-brand-dim mb-1.5"
          >
            What did you do?
          </label>
          <select
            id="action-select"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-brand-border bg-brand-bg text-sm text-brand-text outline-none transition-all focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/20 appearance-none cursor-pointer"
          >
            {actions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.platformIcon} {a.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Email */}
      <div>
        <label
          htmlFor="email-input"
          className="block text-xs font-semibold text-brand-dim mb-1.5"
        >
          Your email
        </label>
        <input
          id="email-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full px-3.5 py-2.5 rounded-lg border border-brand-border bg-brand-bg text-sm text-brand-text placeholder:text-brand-muted outline-none transition-all focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/20"
        />
        <p className="text-2xs text-brand-muted mt-1">
          We&apos;ll notify you when your submission is reviewed
        </p>
      </div>

      {/* Proof Type */}
      <div>
        <label className="block text-xs font-semibold text-brand-dim mb-1.5">
          Proof type
        </label>
        <div className="flex gap-2">
          {(
            [
              { value: "url", label: "Link / URL" },
              { value: "screenshot", label: "Screenshot" },
              { value: "video", label: "Video" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setProofType(opt.value)}
              className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                proofType === opt.value
                  ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                  : "border-brand-border bg-brand-bg text-brand-dim hover:border-brand-border-hover"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Proof URL */}
      <div>
        <label
          htmlFor="proof-url-input"
          className="block text-xs font-semibold text-brand-dim mb-1.5"
        >
          {proofType === "url"
            ? "Link to your post"
            : proofType === "screenshot"
              ? "Screenshot URL"
              : "Video URL"}
        </label>
        <input
          id="proof-url-input"
          type="url"
          value={proofUrl}
          onChange={(e) => setProofUrl(e.target.value)}
          placeholder={
            proofType === "url"
              ? "https://instagram.com/p/..."
              : proofType === "screenshot"
                ? "https://imgur.com/..."
                : "https://youtube.com/..."
          }
          required
          className="w-full px-3.5 py-2.5 rounded-lg border border-brand-border bg-brand-bg text-sm text-brand-text placeholder:text-brand-muted outline-none transition-all focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/20"
        />
      </div>

      {/* Notes (optional) */}
      <div>
        <label
          htmlFor="notes-input"
          className="block text-xs font-semibold text-brand-dim mb-1.5"
        >
          Notes{" "}
          <span className="font-normal text-brand-muted">(optional)</span>
        </label>
        <textarea
          id="notes-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Anything you'd like us to know..."
          className="w-full px-3.5 py-2.5 rounded-lg border border-brand-border bg-brand-bg text-sm text-brand-text placeholder:text-brand-muted outline-none transition-all focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/20 resize-none"
        />
      </div>

      {/* Error message */}
      {formState === "error" && errorMessage && (
        <div className="rounded-lg border border-brand-red/30 bg-brand-red/5 px-4 py-3 text-xs text-brand-red">
          {errorMessage}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full font-semibold rounded-lg border-none cursor-pointer transition-all duration-150 tracking-wide px-5 py-3 text-sm ${
          canSubmit
            ? "bg-brand-cyan text-brand-bg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
            : "bg-brand-elevated text-brand-muted cursor-not-allowed"
        }`}
      >
        {formState === "submitting" ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Submitting...
          </span>
        ) : (
          "Submit Proof"
        )}
      </button>
    </form>
  );
}
