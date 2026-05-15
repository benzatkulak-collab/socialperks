"use client";

/**
 * ReferralModal — surfaced from the dashboard's "Refer & Earn" card.
 *
 * Reads the authenticated business's referral data from
 * /api/v1/referrals/me, shows the share URL with a one-click copy,
 * and surfaces conversion + estimated-commission counts.
 *
 * Lightweight on purpose: this is a "look at this lever you have"
 * surface, not a full referral analytics dashboard. The full
 * dashboard can come later when there's actually data to visualize.
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ReferralData {
  code: string;
  shareUrl: string;
  metrics: {
    clicks: number;
    conversions: number;
    businessConversions: number;
    estimatedCommissionDollars: number;
  };
}

export interface ReferralModalProps {
  open: boolean;
  onClose: () => void;
}

export function ReferralModal({ open, onClose }: ReferralModalProps) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    setError(null);
    fetch("/api/v1/referrals/me", { signal: ac.signal, credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const body = (await r.json()) as { success: boolean; data?: ReferralData };
        if (!body.success || !body.data) throw new Error("Bad response shape");
        setData(body.data);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Couldn't load your referral details.");
      });
    return () => ac.abort();
  }, [open]);

  // Esc to close — basic modal hygiene
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleCopy = useCallback(async () => {
    if (!data?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard may be denied (insecure context, browser policy).
      // Fail silently — the input below still shows the URL for manual copy.
    }
  }, [data?.shareUrl]);

  const handleShareToTwitter = useCallback(() => {
    if (!data?.shareUrl) return;
    const text = encodeURIComponent(
      "Just found Social Perks — your customers post about you for a perk. Try it free:"
    );
    const url = encodeURIComponent(data.shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener");
  }, [data?.shareUrl]);

  const handleShareToLinkedIn = useCallback(() => {
    if (!data?.shareUrl) return;
    const url = encodeURIComponent(data.shareUrl);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank",
      "noopener"
    );
  }, [data?.shareUrl]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="referral-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-brand-bg/80 backdrop-blur-xl"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] flex flex-col rounded-2xl border border-brand-border/60 bg-brand-surface shadow-2xl shadow-brand-purple/5">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-xs font-medium text-brand-dim hover:text-brand-text border border-brand-border hover:border-brand-subtle bg-brand-surface/40 transition-colors py-1.5 px-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
          aria-label="Close"
        >
          Close ✕
        </button>

        <div className="px-6 pt-7 pb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-purple mb-2">
            Refer &amp; Earn
          </p>
          <h2
            id="referral-modal-title"
            className="font-heading text-2xl italic text-brand-white mb-2"
          >
            Invite a business, earn $10
          </h2>
          <p className="text-sm text-brand-dim mb-6 leading-relaxed">
            Share your link with another business owner. When they sign up and stay through their
            first paid month, you both get $10 in account credit.
          </p>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-brand-red"
            >
              {error}
            </div>
          )}

          {!data && !error && (
            <p className="text-sm text-brand-muted mb-4" aria-live="polite">
              Loading your referral link…
            </p>
          )}

          {data && (
            <>
              <label htmlFor="referral-share-url" className="block text-xs text-brand-muted mb-1.5">
                Your share link
              </label>
              <div className="flex items-center gap-2 mb-5">
                <input
                  id="referral-share-url"
                  type="text"
                  readOnly
                  value={data.shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-sm font-mono outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 transition-all"
                />
                <Button
                  onClick={handleCopy}
                  variant={copied ? "success" : "primary"}
                  size="md"
                  className="shrink-0"
                >
                  {copied ? "Copied ✓" : "Copy"}
                </Button>
              </div>

              <div className="flex gap-2 mb-6">
                <button
                  type="button"
                  onClick={handleShareToTwitter}
                  className="flex-1 px-3 py-2 rounded-lg border border-brand-border bg-brand-surface/40 text-sm text-brand-text hover:border-brand-subtle hover:bg-brand-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  Share to X
                </button>
                <button
                  type="button"
                  onClick={handleShareToLinkedIn}
                  className="flex-1 px-3 py-2 rounded-lg border border-brand-border bg-brand-surface/40 text-sm text-brand-text hover:border-brand-subtle hover:bg-brand-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  Share to LinkedIn
                </button>
              </div>

              <Card className="bg-brand-bg/50 border-brand-border/40 mb-6" padding="sm">
                <p className="text-xs font-mono uppercase tracking-wide text-brand-muted mb-3">
                  Your stats
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="font-heading text-xl italic text-brand-white">
                      {data.metrics.clicks}
                    </p>
                    <p className="text-xs text-brand-muted mt-0.5">link clicks</p>
                  </div>
                  <div>
                    <p className="font-heading text-xl italic text-brand-cyan">
                      {data.metrics.conversions}
                    </p>
                    <p className="text-xs text-brand-muted mt-0.5">signups</p>
                  </div>
                  <div>
                    <p className="font-heading text-xl italic text-brand-green">
                      ${data.metrics.estimatedCommissionDollars.toFixed(2)}
                    </p>
                    <p className="text-xs text-brand-muted mt-0.5">est. credit</p>
                  </div>
                </div>
              </Card>

              <ol className="text-xs text-brand-dim space-y-2 list-decimal list-inside">
                <li>Share the link with another business owner.</li>
                <li>They sign up for any paid plan.</li>
                <li>After their first paid month, $10 is credited to your account.</li>
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
