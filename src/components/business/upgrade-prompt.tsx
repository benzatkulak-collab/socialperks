"use client";

/**
 * <UpgradePrompt /> — Inline upsell banner for the business dashboard.
 *
 * Shows when:
 *   - User is on trial day 10+ (≤4 days remaining), or
 *   - User has hit a free-tier limit (campaigns, actions, etc.)
 *
 * Pass either `trialDaysRemaining` or `limitReached` (or both). If neither
 * triggers, the component renders null.
 */

import { useMemo } from "react";

export interface UpgradePromptProps {
  /** Days remaining in the trial. Triggers when ≤ 4. */
  trialDaysRemaining?: number;
  /** Name of the limit the user just hit (e.g. "campaigns"). */
  limitReached?: string;
  /** Optional click-through override; defaults to /upgrade. */
  href?: string;
  /** Compact vs. card layout. */
  variant?: "card" | "inline";
  className?: string;
}

const TRIAL_WARNING_THRESHOLD = 4;

export function UpgradePrompt({
  trialDaysRemaining,
  limitReached,
  href = "/upgrade",
  variant = "card",
  className = "",
}: UpgradePromptProps): JSX.Element | null {
  const trialActive =
    typeof trialDaysRemaining === "number" &&
    trialDaysRemaining <= TRIAL_WARNING_THRESHOLD &&
    trialDaysRemaining >= 0;
  const limitActive = Boolean(limitReached);

  const message = useMemo(() => {
    if (limitActive) {
      return {
        title: `You've hit your free-tier ${limitReached} limit`,
        body: "Upgrade to Pro for unlimited usage and advanced analytics.",
        cta: "Upgrade to keep going",
        tone: "warning" as const,
      };
    }
    if (trialActive) {
      const days = trialDaysRemaining ?? 0;
      const phrasing =
        days === 0
          ? "Your trial ends today"
          : days === 1
            ? "1 day left in your trial"
            : `${days} days left in your trial`;
      return {
        title: phrasing,
        body: "Upgrade to Pro to keep your campaigns and customers active.",
        cta: "Upgrade to Pro",
        tone: "info" as const,
      };
    }
    return null;
  }, [trialActive, limitActive, trialDaysRemaining, limitReached]);

  if (!message) return null;

  const toneClasses =
    message.tone === "warning"
      ? "border-amber-400/40 bg-amber-400/[0.06]"
      : "border-cyan-400/40 bg-cyan-400/[0.06]";
  const iconColor =
    message.tone === "warning" ? "text-amber-300" : "text-cyan-300";
  const buttonClasses =
    message.tone === "warning"
      ? "bg-amber-400 text-[#0C0F1A] hover:bg-amber-300"
      : "bg-cyan-400 text-[#0C0F1A] hover:bg-cyan-300";

  if (variant === "inline") {
    return (
      <div
        className={`flex items-center justify-between gap-4 px-4 py-3 rounded-lg border ${toneClasses} ${className}`}
        role="status"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`h-5 w-5 flex-shrink-0 ${iconColor}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <div className="text-sm font-medium text-white">
              {message.title}
            </div>
            <div className="text-xs text-white/60">{message.body}</div>
          </div>
        </div>
        <a
          href={href}
          className={`text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap transition ${buttonClasses}`}
        >
          {message.cta}
        </a>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border ${toneClasses} p-6 ${className}`}
      role="status"
    >
      <div className="flex items-start gap-4">
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center ${
            message.tone === "warning"
              ? "bg-amber-400/15 border border-amber-400/30"
              : "bg-cyan-400/15 border border-cyan-400/30"
          }`}
        >
          <svg
            className={`h-5 w-5 ${iconColor}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3
            className="text-lg italic mb-1 text-white"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {message.title}
          </h3>
          <p className="text-sm text-white/70 mb-4">{message.body}</p>
          <a
            href={href}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${buttonClasses}`}
          >
            {message.cta}
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10.3 4.3a1 1 0 011.4 0l5 5a1 1 0 010 1.4l-5 5a1 1 0 11-1.4-1.4L13.6 11H4a1 1 0 110-2h9.6l-3.3-3.3a1 1 0 010-1.4z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

export default UpgradePrompt;
