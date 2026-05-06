"use client";

/**
 * Lightweight review UI for public-claim submissions. Lists pending /
 * approved submissions for the signed-in business's programs and shows a
 * "Redeem" button next to the redemption code.
 *
 * This is a minimum-viable surface — it intentionally lives at
 * /dashboard/claims rather than slot itself into the main business
 * portal because that portal is overdue for a refactor and adding more
 * tabs would make the eventual split harder. When the portal redesign
 * lands this can fold in.
 */

import { useCallback, useEffect, useState } from "react";

interface SubmissionRow {
  id: string;
  programId: string;
  programName: string;
  memberId: string;
  actionId: string;
  platformId: string;
  proofUrl: string;
  redemptionCode: string | null;
  redeemedAt: string | null;
  status: string;
  submittedAt: string;
}

type State =
  | { kind: "loading" }
  | { kind: "unauthenticated" }
  | { kind: "ready"; rows: SubmissionRow[] }
  | { kind: "error"; message: string };

function formatRedemptionCode(code: string): string {
  if (code.length !== 8) return code;
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
}

async function jsonFetch<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  try {
    const res = await fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const body = await res.json().catch(() => ({}) as Record<string, unknown>);
    if (!res.ok) {
      const message =
        ((body as { error?: { message?: string } })?.error?.message as string | undefined) ??
        `Request failed: ${res.status}`;
      return { ok: false, status: res.status, message };
    }
    return { ok: true, data: (body as { data: T }).data };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      message: e instanceof Error ? e.message : "Network error",
    };
  }
}

interface ProgramListResponse {
  programs: Array<{ id: string; name: string }>;
}

interface SubmissionListResponse {
  submissions: Array<{
    id: string;
    programId: string;
    memberId: string;
    actionId: string;
    platformId: string;
    proofUrl: string;
    redemptionCode: string | null;
    redeemedAt: string | null;
    status: string;
    submittedAt: string;
  }>;
}

interface MeResponse {
  user: { businessId: string | null };
}

export function ClaimsReviewClient() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });

    // Resolve the signed-in user's businessId.
    const me = await jsonFetch<MeResponse>("/api/v1/auth");
    if (!me.ok) {
      if (me.status === 401) {
        setState({ kind: "unauthenticated" });
      } else {
        setState({ kind: "error", message: me.message });
      }
      return;
    }
    const businessId = me.data.user?.businessId;
    if (!businessId) {
      setState({ kind: "unauthenticated" });
      return;
    }

    const programs = await jsonFetch<ProgramListResponse>(
      `/api/v1/programs?businessId=${encodeURIComponent(businessId)}`
    );
    if (!programs.ok) {
      setState({ kind: "error", message: programs.message });
      return;
    }

    const rows: SubmissionRow[] = [];
    for (const program of programs.data.programs) {
      const subs = await jsonFetch<SubmissionListResponse>(
        `/api/v1/programs/${encodeURIComponent(program.id)}/submissions`
      );
      if (!subs.ok) continue;
      for (const s of subs.data.submissions) {
        rows.push({ ...s, programName: program.name });
      }
    }
    rows.sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    setState({ kind: "ready", rows });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function redeem(programId: string, submissionId: string) {
    const res = await jsonFetch<{ submission: SubmissionRow }>(
      `/api/v1/programs/${encodeURIComponent(programId)}/submissions/${encodeURIComponent(submissionId)}/redeem`,
      { method: "POST", body: JSON.stringify({}) }
    );
    if (!res.ok) {
      alert(res.message);
      return;
    }
    void load();
  }

  if (state.kind === "loading") {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-surface p-6 text-sm text-brand-dim">
        Loading…
      </div>
    );
  }

  if (state.kind === "unauthenticated") {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-surface p-6 text-sm text-brand-dim">
        Sign in to your business account to review claims.
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="rounded-xl border border-brand-warning/30 bg-brand-warning/5 p-6 text-sm text-brand-warning">
        {state.message}
      </div>
    );
  }

  if (state.rows.length === 0) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-surface p-6 text-sm text-brand-dim">
        No claim submissions yet. Customers will show up here once they scan
        your claim sticker and post about you on social media.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {state.rows.map((row) => (
        <div
          key={row.id}
          className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          data-testid="claim-row"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-brand-white truncate">
              {row.memberId.replace(/^(sms|email):/, "")}
            </p>
            <p className="text-2xs text-brand-muted truncate">
              {row.programName} · {row.platformId} / {row.actionId} ·{" "}
              <a
                href={row.proofUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand-cyan hover:underline"
              >
                proof
              </a>
            </p>
          </div>
          {row.redemptionCode ? (
            <div className="font-mono text-sm tracking-widest text-brand-white bg-brand-elevated px-3 py-2 rounded-lg">
              {formatRedemptionCode(row.redemptionCode)}
            </div>
          ) : (
            <div className="text-2xs text-brand-muted">no code</div>
          )}
          {row.redeemedAt ? (
            <div
              className="text-2xs text-brand-success font-mono"
              data-testid="redeemed-marker"
            >
              redeemed
            </div>
          ) : row.redemptionCode ? (
            <button
              type="button"
              onClick={() => redeem(row.programId, row.id)}
              className="rounded-lg bg-brand-cyan px-4 py-2 text-xs font-semibold text-brand-bg hover:bg-brand-cyan/90"
              data-testid="redeem-button"
            >
              Redeem
            </button>
          ) : (
            <span className="text-2xs text-brand-muted">—</span>
          )}
        </div>
      ))}
    </div>
  );
}
