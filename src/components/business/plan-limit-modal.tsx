"use client";

/**
 * PlanLimitModal — listens for a custom event dispatched when an API call
 * returns a 403 with code PLAN_LIMIT_EXCEEDED, and renders a modal with
 * the message and an Upgrade CTA.
 *
 * Usage:
 *   1. Mount once in the portal: <PlanLimitModal />
 *   2. After every API fetch, call:
 *        if (await reportPlanLimit(res)) return; // handled
 *      reportPlanLimit consumes the response body and dispatches the
 *      event if it's a plan-limit error. Otherwise it leaves the response
 *      alone and returns false.
 *
 * Why an event-bus pattern instead of a context: keeps the call site
 * stateless. Components don't need to wire a context just to surface an
 * upgrade prompt — they just `await reportPlanLimit(res)` and continue.
 */

import { useEffect, useState } from "react";

interface PlanLimitDetail {
  message: string;
  limit: number;
  current: number;
  plan: string;
  upgradeUrl: string;
}

const EVENT_NAME = "sp:plan-limit";

export interface PlanLimitErrorBody {
  success: false;
  error: {
    code: "PLAN_LIMIT_EXCEEDED";
    message: string;
    limit: number;
    current: number;
    plan: string;
    upgradeUrl: string;
  };
}

/**
 * Inspect a Response. If it's a 403 with body code PLAN_LIMIT_EXCEEDED,
 * dispatch the upgrade event and return true. Otherwise return false and
 * leave the response un-consumed.
 *
 * IMPORTANT: this calls res.clone().json() so the caller can still
 * .json() the original response on the false path.
 */
export async function reportPlanLimit(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  let body: PlanLimitErrorBody;
  try {
    body = (await res.clone().json()) as PlanLimitErrorBody;
  } catch {
    return false;
  }
  if (!body || body.success !== false || body.error?.code !== "PLAN_LIMIT_EXCEEDED") {
    return false;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<PlanLimitDetail>(EVENT_NAME, {
        detail: {
          message: body.error.message,
          limit: body.error.limit,
          current: body.error.current,
          plan: body.error.plan,
          upgradeUrl: body.error.upgradeUrl ?? "/pricing",
        },
      })
    );
  }
  return true;
}

export function PlanLimitModal() {
  const [detail, setDetail] = useState<PlanLimitDetail | null>(null);

  useEffect(() => {
    function onLimit(e: Event) {
      const ce = e as CustomEvent<PlanLimitDetail>;
      setDetail(ce.detail);
    }
    window.addEventListener(EVENT_NAME, onLimit);
    return () => window.removeEventListener(EVENT_NAME, onLimit);
  }, []);

  if (!detail) return null;

  const planLabel = detail.plan.charAt(0).toUpperCase() + detail.plan.slice(1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-limit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => setDetail(null)}
    >
      <div
        className="max-w-md w-full bg-brand-card border border-amber-500/30 rounded-xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl leading-none" aria-hidden>↑</span>
          <div>
            <h2
              id="plan-limit-title"
              className="font-serif italic text-xl text-brand-white"
            >
              Time to upgrade
            </h2>
            <p className="text-sm text-brand-text-dim mt-1">
              You&apos;ve hit your {planLabel} plan limit.
            </p>
          </div>
        </div>

        <p className="text-brand-text mb-3">{detail.message}</p>

        <div className="bg-black/40 rounded-lg p-3 mb-5 text-sm text-brand-text-dim">
          <span className="text-brand-text font-medium">{detail.current.toLocaleString()}</span> /{" "}
          {detail.limit.toLocaleString()} used this month
        </div>

        <div className="flex gap-3">
          <a
            href={detail.upgradeUrl}
            className="flex-1 px-4 py-2.5 bg-brand-cyan text-black font-medium rounded text-center hover:bg-brand-cyan/90"
          >
            See plans
          </a>
          <button
            type="button"
            onClick={() => setDetail(null)}
            className="px-4 py-2.5 border border-brand-border text-brand-text rounded hover:bg-brand-elevated"
          >
            Not now
          </button>
        </div>

        <p className="text-xs text-brand-text-dim mt-4 text-center">
          Manage your subscription at{" "}
          <a href="/dashboard/billing" className="text-brand-cyan hover:underline">
            /dashboard/billing
          </a>
        </p>
      </div>
    </div>
  );
}
