"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/lib/hooks/use-store";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OnboardingChecklistProps {
  /** Whether the business has completed their profile */
  hasProfile: boolean;
  /** Whether at least one social platform is connected */
  hasSocialConnection: boolean;
  /** Whether any campaign has been created */
  hasCampaign: boolean;
  /** Whether a campaign link has been shared */
  hasSharedLink: boolean;
  /** Whether any submission has been reviewed */
  hasReviewedSubmission: boolean;
  /** Navigation callback to send the user to a specific section */
  onNavigate: (section: string) => void;
}

interface ChecklistStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  section: string;
}

const STORAGE_KEY = "sp-onboarding-checklist";
const DISMISS_KEY = "sp-onboarding-dismissed";

const STEPS: ChecklistStep[] = [
  {
    id: "profile",
    icon: "user",
    title: "Complete business profile",
    description: "Add your business name, type, and a short description so customers know who you are.",
    section: "settings",
  },
  {
    id: "social",
    icon: "link",
    title: "Connect a social platform",
    description: "Link at least one social media account to start tracking marketing actions.",
    section: "settings",
  },
  {
    id: "campaign",
    icon: "rocket",
    title: "Create your first campaign",
    description: "Set up a campaign with a reward to incentivize customer action on social media.",
    section: "create",
  },
  {
    id: "share",
    icon: "share",
    title: "Share your campaign link",
    description: "Copy and share your unique campaign link so customers can start participating.",
    section: "campaigns",
  },
  {
    id: "review",
    icon: "check",
    title: "Review your first submission",
    description: "Approve or reject a customer submission to complete the loop and award their perk.",
    section: "submissions",
  },
];

// ─── Step Icons ─────────────────────────────────────────────────────────────

function StepIcon({ type, completed }: { type: string; completed: boolean }) {
  if (completed) {
    return (
      <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  const iconPaths: Record<string, React.ReactNode> = {
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />,
    link: <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-1.553a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.5 8.735" />,
    rocket: <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />,
    share: <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  };

  return (
    <svg className="w-5 h-5 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      {iconPaths[type] ?? iconPaths.check}
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OnboardingChecklist({
  hasProfile,
  hasSocialConnection,
  hasCampaign,
  hasSharedLink,
  hasReviewedSubmission,
  onNavigate,
}: OnboardingChecklistProps) {
  const { value: dismissed, setValue: setDismissed, ready: dismissReady } = useLocalStorage(DISMISS_KEY, false);
  const { value: manualCompletions, setValue: setManualCompletions, ready: storageReady } = useLocalStorage<Record<string, boolean>>(STORAGE_KEY, {});
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Build the completion status for each step
  const completionMap = useMemo((): Record<string, boolean> => ({
    profile: hasProfile || !!manualCompletions.profile,
    social: hasSocialConnection || !!manualCompletions.social,
    campaign: hasCampaign || !!manualCompletions.campaign,
    share: hasSharedLink || !!manualCompletions.share,
    review: hasReviewedSubmission || !!manualCompletions.review,
  }), [hasProfile, hasSocialConnection, hasCampaign, hasSharedLink, hasReviewedSubmission, manualCompletions]);

  const completedCount = useMemo(
    () => STEPS.filter((s) => completionMap[s.id]).length,
    [completionMap]
  );

  const totalSteps = STEPS.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);
  const allComplete = completedCount === totalSteps;

  // Persist prop-driven completions
  useEffect(() => {
    if (!storageReady) return;
    const updates: Record<string, boolean> = {};
    if (hasProfile && !manualCompletions.profile) updates.profile = true;
    if (hasSocialConnection && !manualCompletions.social) updates.social = true;
    if (hasCampaign && !manualCompletions.campaign) updates.campaign = true;
    if (hasSharedLink && !manualCompletions.share) updates.share = true;
    if (hasReviewedSubmission && !manualCompletions.review) updates.review = true;

    if (Object.keys(updates).length > 0) {
      setManualCompletions((prev) => ({ ...prev, ...updates }));
    }
  }, [hasProfile, hasSocialConnection, hasCampaign, hasSharedLink, hasReviewedSubmission, storageReady, manualCompletions, setManualCompletions]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, [setDismissed]);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const handleStepClick = useCallback((section: string) => {
    onNavigate(section);
  }, [onNavigate]);

  // Don't render until localStorage is ready
  if (!dismissReady || !storageReady) return null;

  // Don't show if dismissed or all steps are complete
  if (dismissed || allComplete) return null;

  return (
    <Card className="mb-6 border-l-[3px] border-l-brand-cyan animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-cyan/10">
            <svg className="w-4 h-4 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-brand-white">Getting Started</h3>
            <p className="text-xs text-brand-muted">{completedCount} of {totalSteps} steps complete</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="text-xs text-brand-muted hover:text-brand-dim transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
            aria-label={isCollapsed ? "Expand checklist" : "Collapse checklist"}
          >
            <svg className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-brand-muted hover:text-brand-dim transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
            aria-label="Dismiss checklist"
            title="Don't show again"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-brand-elevated rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-brand-cyan rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps (collapsible) */}
      {!isCollapsed && (
        <div className="space-y-2">
          {STEPS.map((step) => {
            const completed = !!completionMap[step.id];
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleStepClick(step.section)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                  completed
                    ? "bg-brand-green/5 border border-brand-green/20"
                    : "bg-brand-elevated/30 border border-brand-border/50 hover:bg-brand-elevated/50 hover:border-brand-border"
                }`}
              >
                {/* Icon */}
                <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 mt-0.5 ${
                  completed ? "bg-brand-green/10" : "bg-brand-surface"
                }`}>
                  <StepIcon type={step.icon} completed={completed} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    completed ? "text-brand-green line-through" : "text-brand-white"
                  }`}>
                    {step.title}
                  </p>
                  <p className={`text-xs mt-0.5 ${completed ? "text-brand-muted" : "text-brand-dim"}`}>
                    {step.description}
                  </p>
                </div>

                {/* Arrow indicator for incomplete steps */}
                {!completed && (
                  <svg className="w-4 h-4 text-brand-muted group-hover:text-brand-cyan transition-colors shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Dismiss link */}
      {!isCollapsed && (
        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Don&apos;t show again
          </Button>
        </div>
      )}
    </Card>
  );
}
