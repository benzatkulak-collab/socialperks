import type { Metadata } from "next";
import { DemoShell } from "../_components/demo-chrome";
import {
  DEMO_SUBMISSIONS,
  formatRelative,
  platformColor,
} from "@/lib/demo/data";

export const metadata: Metadata = {
  title: "Submissions · Live Demo · Social Perks",
  description:
    "Inbox view of 12 demo customer submissions across Instagram, Google, TikTok, and Facebook.",
  robots: { index: true, follow: true },
};

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  pending: {
    bg: "bg-brand-amber/15",
    text: "text-brand-amber",
    label: "Pending",
  },
  approved: {
    bg: "bg-brand-green/15",
    text: "text-brand-green",
    label: "Approved",
  },
  rejected: { bg: "bg-red-500/15", text: "text-red-400", label: "Rejected" },
};

export default function DemoSubmissionsPage() {
  const pending = DEMO_SUBMISSIONS.filter((s) => s.status === "pending").length;
  const approved = DEMO_SUBMISSIONS.filter(
    (s) => s.status === "approved",
  ).length;
  const rejected = DEMO_SUBMISSIONS.filter(
    (s) => s.status === "rejected",
  ).length;

  return (
    <DemoShell activeTab="submissions">
      <div className="mb-6">
        <h1 className="font-heading text-3xl italic text-brand-white sm:text-4xl">
          Submissions inbox
        </h1>
        <p className="mt-2 text-brand-dim">
          Review customer proof of their social posts.
        </p>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto">
        <span className="whitespace-nowrap rounded-full bg-brand-surface/80 px-3 py-1 text-xs font-medium text-brand-text">
          All {DEMO_SUBMISSIONS.length}
        </span>
        <span className="whitespace-nowrap rounded-full bg-brand-amber/15 px-3 py-1 text-xs font-medium text-brand-amber">
          Pending {pending}
        </span>
        <span className="whitespace-nowrap rounded-full bg-brand-green/15 px-3 py-1 text-xs font-medium text-brand-green">
          Approved {approved}
        </span>
        <span className="whitespace-nowrap rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400">
          Rejected {rejected}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface/40">
        <ul className="divide-y divide-brand-border/60">
          {DEMO_SUBMISSIONS.map((s) => {
            const status = STATUS_STYLES[s.status];
            const platColor = platformColor(s.platform);
            return (
              <li
                key={s.id}
                className="flex flex-col gap-4 p-4 transition-colors hover:bg-brand-surface/60 sm:flex-row sm:items-center sm:p-5"
              >
                <div className="flex items-center gap-4 sm:flex-1">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold text-brand-white"
                    style={{ backgroundColor: `${platColor}33` }}
                    aria-hidden="true"
                  >
                    {s.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-brand-white">
                        {s.customerName}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{
                          backgroundColor: `${platColor}22`,
                          color: platColor,
                        }}
                      >
                        {s.platform}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${status.bg} ${status.text}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-brand-dim">
                      &ldquo;{s.caption}&rdquo;
                    </p>
                    <div className="mt-1 text-xs text-brand-muted">
                      {s.campaignName} · {formatRelative(s.submittedAt)} · $
                      {s.perkValue} perk
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:flex-shrink-0">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-lg border border-brand-border bg-gradient-to-br from-brand-border/40 to-brand-surface text-brand-muted"
                    aria-label="Submission thumbnail placeholder"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.5-3.5L9 20" />
                    </svg>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled
                      title="Sign up to interact"
                      className="cursor-not-allowed rounded-lg border border-brand-green/40 bg-brand-green/10 px-3 py-1.5 text-xs font-semibold text-brand-green/60 opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Sign up to interact"
                      className="cursor-not-allowed rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400/60 opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </DemoShell>
  );
}
