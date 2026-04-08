"use client";

import { useState, useCallback, useEffect } from "react";
import type { PendingReview } from "./brand-manager";

interface BrandContentReviewProps {
  pendingReviews: PendingReview[];
  onActiveCountChange?: (count: number) => void;
}

export function BrandContentReview({ pendingReviews, onActiveCountChange }: BrandContentReviewProps) {
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const handleReviewAction = useCallback((reviewId: string) => {
    setReviewedIds((prev) => {
      const next = new Set(prev);
      next.add(reviewId);
      return next;
    });
  }, []);

  const activeReviews = pendingReviews.filter((r) => !reviewedIds.has(r.id));

  useEffect(() => {
    onActiveCountChange?.(activeReviews.length);
  }, [activeReviews.length, onActiveCountChange]);

  return (
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
  );
}
