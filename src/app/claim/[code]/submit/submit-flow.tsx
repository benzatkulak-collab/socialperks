"use client";

/**
 * Three-step claim flow client component:
 *   1. Pick action + paste proof URL + (sms|email) contact
 *   2. Enter the OTP delivered to that contact
 *   3. Submission posted, redemption code revealed (PR D fills this in)
 *
 * State is kept entirely in component state — no global store, no auth
 * cookies. The signed claim token from /api/v1/customer/otp/verify is
 * the only thing carried between step 2 and step 3.
 */

import { useState } from "react";

interface ResolvedAction {
  actionId: string;
  platformId: string;
  platformName: string;
  platformIcon: string;
  label: string;
}

interface SubmitFlowProps {
  code: string;
  actions: ResolvedAction[];
}

type Channel = "sms" | "email";
type Step = "form" | "otp" | "done";

interface SubmissionResponse {
  submission: { id: string; points: number; status: string };
  member: { memberId: string };
  fraudCheck: { score: number; action: string; signals: string[] };
  redemptionCode: string;
  redemptionCodeDisplay: string;
}

export function SubmitFlow({ code, actions }: SubmitFlowProps) {
  const [step, setStep] = useState<Step>("form");

  // Step 1 state
  const initialAction = actions[0]
    ? { actionId: actions[0].actionId, platformId: actions[0].platformId }
    : { actionId: "", platformId: "" };
  const [action, setAction] = useState(initialAction);
  const [proofUrl, setProofUrl] = useState("");
  const [channel, setChannel] = useState<Channel>("sms");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Step 2 state
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");

  // Step 3 state
  const [result, setResult] = useState<SubmissionResponse | null>(null);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!action.actionId || !proofUrl || !contact) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      new URL(proofUrl);
    } catch {
      setError("Proof URL must be a valid link (https://...).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/v1/customer/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, channel, contact }),
      });
      const body = await res.json();
      if (!body.success) {
        setError(body.error?.message ?? "Could not send the code. Try again.");
        return;
      }
      setStep("otp");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(otp)) {
      setError("Code must be 6 digits.");
      return;
    }
    setBusy(true);
    try {
      // Step A: verify the OTP
      const verifyRes = await fetch("/api/v1/customer/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, channel, contact, otp }),
      });
      const verifyBody = await verifyRes.json();
      if (!verifyBody.success) {
        setError(
          verifyBody.error?.message ?? "That code didn't work. Try again."
        );
        return;
      }
      const claimToken: string = verifyBody.data.token;
      setToken(claimToken);

      // Step B: submit
      const submitRes = await fetch(`/api/v1/claim/${code}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: claimToken,
          actionId: action.actionId,
          platformId: action.platformId,
          proofUrl,
          proofType: "url",
        }),
      });
      const submitBody = await submitRes.json();
      if (!submitBody.success) {
        setError(submitBody.error?.message ?? "Submission failed.");
        return;
      }
      setResult(submitBody.data as SubmissionResponse);
      setStep("done");
    } catch {
      setError("Network error during submission. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done" && result) {
    return (
      <div
        className="rounded-xl border border-brand-success/30 bg-brand-success/5 p-6 text-center"
        data-testid="claim-success"
      >
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-brand-success/10 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-brand-success"
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
        <h2 className="text-lg font-heading italic text-brand-white mb-1">
          Your perk is ready
        </h2>
        <p className="text-xs text-brand-dim mb-4">
          Show this code at checkout. We&apos;ve also sent it to{" "}
          <span className="text-brand-white">{contact}</span>.
        </p>
        <div
          className="rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 px-4 py-5 mb-4"
          data-testid="redemption-code"
        >
          <p
            className="font-mono text-3xl tracking-[0.3em] text-brand-white"
            aria-label="Redemption code"
          >
            {result.redemptionCodeDisplay}
          </p>
        </div>
        <p className="text-2xs text-brand-muted font-mono">
          Submission {result.submission.id.slice(0, 8)} ·{" "}
          {result.submission.status}
        </p>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <form
        onSubmit={verifyAndSubmit}
        className="rounded-xl border border-brand-border bg-brand-surface p-5 sm:p-6 space-y-4"
      >
        <p className="text-xs text-brand-dim">
          We sent a 6-digit code to{" "}
          <span className="text-brand-white">{contact}</span>. Enter it below.
        </p>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoFocus
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          className="w-full rounded-lg border border-brand-border bg-brand-elevated px-4 py-3 text-center font-mono text-xl tracking-[0.3em] text-brand-white outline-none focus:border-brand-cyan"
          aria-label="Verification code"
          data-testid="otp-input"
        />
        {error && (
          <p className="text-2xs text-brand-warning">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy || otp.length !== 6}
          className="w-full rounded-lg bg-brand-cyan px-4 py-3 text-sm font-semibold text-brand-bg disabled:opacity-50"
          data-testid="otp-submit"
        >
          {busy ? "Verifying…" : "Verify and submit"}
        </button>
        <button
          type="button"
          onClick={() => setStep("form")}
          className="w-full text-2xs text-brand-muted hover:text-brand-white transition-colors"
        >
          Use a different phone or email
        </button>
        {/* Debug-only token display so the network panel + token live in one place */}
        {token && (
          <p className="hidden" data-testid="claim-token">
            {token}
          </p>
        )}
      </form>
    );
  }

  return (
    <form
      onSubmit={requestOtp}
      className="rounded-xl border border-brand-border bg-brand-surface p-5 sm:p-6 space-y-4"
    >
      <div>
        <label className="block text-2xs font-semibold text-brand-dim uppercase tracking-widest mb-2">
          What did you do?
        </label>
        <select
          value={`${action.platformId}:${action.actionId}`}
          onChange={(e) => {
            const [platformId, actionId] = e.target.value.split(":");
            setAction({ platformId, actionId });
          }}
          className="w-full rounded-lg border border-brand-border bg-brand-elevated px-3 py-2.5 text-sm text-brand-white outline-none focus:border-brand-cyan"
          data-testid="action-select"
        >
          {actions.length === 0 && (
            <option value="">No actions available</option>
          )}
          {actions.map((a) => (
            <option
              key={`${a.platformId}:${a.actionId}`}
              value={`${a.platformId}:${a.actionId}`}
            >
              {a.platformIcon} {a.platformName}: {a.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-2xs font-semibold text-brand-dim uppercase tracking-widest mb-2">
          Link to your post
        </label>
        <input
          type="url"
          required
          value={proofUrl}
          onChange={(e) => setProofUrl(e.target.value)}
          placeholder="https://instagram.com/p/..."
          className="w-full rounded-lg border border-brand-border bg-brand-elevated px-3 py-2.5 text-sm text-brand-white placeholder-brand-muted outline-none focus:border-brand-cyan"
          data-testid="proof-url"
        />
      </div>

      <div>
        <label className="block text-2xs font-semibold text-brand-dim uppercase tracking-widest mb-2">
          Verify with
        </label>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => {
              setChannel("sms");
              setContact("");
            }}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs ${
              channel === "sms"
                ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                : "border-brand-border text-brand-dim"
            }`}
            data-testid="channel-sms"
          >
            Phone (SMS)
          </button>
          <button
            type="button"
            onClick={() => {
              setChannel("email");
              setContact("");
            }}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs ${
              channel === "email"
                ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                : "border-brand-border text-brand-dim"
            }`}
            data-testid="channel-email"
          >
            Email
          </button>
        </div>
        <input
          type={channel === "email" ? "email" : "tel"}
          required
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={channel === "email" ? "you@example.com" : "+15551234567"}
          className="w-full rounded-lg border border-brand-border bg-brand-elevated px-3 py-2.5 text-sm text-brand-white placeholder-brand-muted outline-none focus:border-brand-cyan"
          data-testid="contact-input"
        />
        {channel === "sms" && (
          <p className="text-2xs text-brand-muted mt-1">
            Use international format starting with +.
          </p>
        )}
      </div>

      {error && <p className="text-2xs text-brand-warning">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-brand-cyan px-4 py-3 text-sm font-semibold text-brand-bg disabled:opacity-50"
        data-testid="send-code"
      >
        {busy ? "Sending…" : "Send my code"}
      </button>
    </form>
  );
}
