"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";
import { apiFetch, apiFetchJson } from "@/lib/api/csrf-fetch";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SubmissionEntry {
  id: string;
  campaignId: string;
  campaignName: string;
  businessName: string;
  proofUrl: string;
  proofType: string;
  notes: string;
  status: "pending" | "approved" | "rejected" | "redeemed";
  submittedAt: string;
  perkValue?: number;
}

interface PayoutAccountInfo {
  influencerId: string;
  stripeAccountId: string | null;
  status: "pending" | "active" | "restricted";
  onboardingUrl: string | null;
  payoutsEnabled: boolean;
  createdAt: string;
}

interface PayoutEntry {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  completedAt: string | null;
  failureReason: string | null;
}

/** A durable earned perk from GET /api/v1/wallet (the redeemable reward). */
interface WalletPerk {
  id: string;
  businessId: string;
  campaignId: string;
  value: number;
  type: "pct" | "dol";
  status: "available" | "redeemed" | "expired";
  redemptionCode: string;
  expiresAt: string;
}

type CashOutStep = "idle" | "form" | "submitting" | "success" | "error";

interface PerkWalletProps {
  influencerId: string;
  influencerName: string;
}

// ─── Wallet Skeleton ────────────────────────────────────────────────────────

function WalletSkeleton() {
  return (
    <div className="animate-fade-up" role="status" aria-label="Loading wallet">
      <Skeleton height="h-7" width="w-48" className="mb-2" />
      <Skeleton height="h-4" width="w-64" className="mb-6" />
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-brand-surface border border-brand-border rounded-xl p-4">
            <Skeleton height="h-8" width="w-20" className="mb-2" />
            <Skeleton height="h-3" width="w-16" />
          </div>
        ))}
      </div>
      <Skeleton height="h-5" width="w-32" className="mb-3" />
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height="h-14" rounded="lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Status Badge Mapping ───────────────────────────────────────────────────

const STATUS_COLORS: Record<string, "green" | "amber" | "red" | "purple"> = {
  approved: "green",
  pending: "amber",
  rejected: "red",
  redeemed: "purple",
};

const PAYOUT_STATUS_COLORS: Record<string, "green" | "amber" | "red" | "cyan"> = {
  completed: "green",
  processing: "cyan",
  pending: "amber",
  failed: "red",
};

// ─── PerkWallet Component ───────────────────────────────────────────────────

export function PerkWallet({ influencerId, influencerName }: PerkWalletProps) {
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cashOutStep, setCashOutStep] = useState<CashOutStep>("idle");
  const [cashOutError, setCashOutError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // ── Payout account state ──────────────────────────────────────────────
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccountInfo | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutEntry[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  // ── Redeemable perks state (durable wallet) ───────────────────────────
  const [perks, setPerks] = useState<WalletPerk[]>([]);
  const [perksLoading, setPerksLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState("");

  // ── Fetch submissions ─────────────────────────────────────────────────

  const fetchSubmissions = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const res = await fetch(
        `/api/v1/submissions?userId=${encodeURIComponent(influencerId)}`,
        { signal: controller.signal, credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch submissions");
      const json = await res.json();
      if (controller.signal.aborted) return;

      const mapped: SubmissionEntry[] = (json.data?.submissions ?? []).map(
        (s: Record<string, unknown>) => ({
          id: s.id as string,
          campaignId: s.campaignId as string,
          campaignName: (s.campaignName as string) ?? "Campaign",
          businessName: (s.businessName as string) ?? "Business",
          proofUrl: (s.proofUrl as string) ?? "",
          proofType: (s.proofType as string) ?? "",
          notes: (s.notes as string) ?? "",
          status: s.status as SubmissionEntry["status"],
          submittedAt:
            (s.submittedAt as string)?.slice(0, 10) ??
            new Date().toISOString().slice(0, 10),
          perkValue: s.perkValue as number | undefined,
        })
      );
      setSubmissions(mapped);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.warn("[PerkWallet] Fetch failed:", e.message);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [influencerId]);

  // ── Fetch payout account status ───────────────────────────────────────

  const fetchPayoutStatus = useCallback(async () => {
    setPayoutLoading(true);
    try {
      const res = await fetch(
        `/api/v1/payouts?influencerId=${encodeURIComponent(influencerId)}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const json = await res.json();
      if (json.data?.account) {
        setPayoutAccount(json.data.account);
      }
      if (json.data?.payouts) {
        setPayoutHistory(json.data.payouts);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.warn("[PerkWallet] Payout status fetch failed:", e.message);
      }
    } finally {
      setPayoutLoading(false);
    }
  }, [influencerId]);

  // ── Fetch redeemable perks (durable wallet) ───────────────────────────

  const fetchPerks = useCallback(async () => {
    setPerksLoading(true);
    try {
      const body = await apiFetchJson<{
        data: { wallets: { businessId: string; perks: WalletPerk[] }[] };
      }>("/api/v1/wallet");
      const flat: WalletPerk[] = (body.data?.wallets ?? []).flatMap((w) =>
        w.perks.map((p) => ({ ...p, businessId: w.businessId }))
      );
      setPerks(flat);
    } catch (e: unknown) {
      if (e instanceof Error) console.warn("[PerkWallet] Perks fetch failed:", e.message);
    } finally {
      setPerksLoading(false);
    }
  }, []);

  const handleRedeem = useCallback(async (perkId: string) => {
    setRedeemingId(perkId);
    setRedeemError("");
    try {
      await apiFetchJson("/api/v1/wallet/redeem", {
        method: "POST",
        body: JSON.stringify({ perkId }),
      });
      setPerks((prev) =>
        prev.map((p) => (p.id === perkId ? { ...p, status: "redeemed" } : p))
      );
    } catch (e: unknown) {
      setRedeemError(
        e instanceof Error ? e.message : "Redemption failed. Please try again."
      );
    } finally {
      setRedeemingId(null);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
    fetchPayoutStatus();
    fetchPerks();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchSubmissions, fetchPayoutStatus, fetchPerks]);

  // ── Computed values ───────────────────────────────────────────────────

  const availableBalance = useMemo(
    () =>
      submissions
        .filter((s) => s.status === "approved")
        .reduce((sum, s) => sum + (s.perkValue || 0), 0),
    [submissions]
  );

  const totalEarned = useMemo(
    () =>
      submissions
        .filter((s) => s.status === "approved" || s.status === "redeemed")
        .reduce((sum, s) => sum + (s.perkValue || 0), 0),
    [submissions]
  );

  const pendingAmount = useMemo(
    () =>
      submissions
        .filter((s) => s.status === "pending")
        .reduce((sum, s) => sum + (s.perkValue || 0), 0),
    [submissions]
  );

  // Show active + already-redeemed perks; hide expired to reduce noise.
  const visiblePerks = useMemo(
    () => perks.filter((p) => p.status === "available" || p.status === "redeemed"),
    [perks]
  );

  // ── Set up payout account ─────────────────────────────────────────────

  const handleSetupPayouts = useCallback(async () => {
    setSetupLoading(true);
    setCashOutError("");

    try {
      const res = await apiFetch("/api/v1/payouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_account",
          influencerId,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? `Setup failed (${res.status})`);
      }

      const json = await res.json();
      const onboardingUrl = json.data?.onboardingUrl;

      if (onboardingUrl) {
        // Redirect to Stripe Connect onboarding
        window.location.href = onboardingUrl;
      } else {
        // Refresh status
        await fetchPayoutStatus();
      }
    } catch (e: unknown) {
      setCashOutError(
        e instanceof Error ? e.message : "Failed to set up payouts."
      );
    } finally {
      setSetupLoading(false);
    }
  }, [influencerId, fetchPayoutStatus]);

  // ── Cash out handler (via Stripe Connect) ─────────────────────────────

  const handleCashOutSubmit = useCallback(async () => {
    if (availableBalance <= 0) return;

    setCashOutStep("submitting");
    setCashOutError("");

    try {
      // Convert dollars to cents for the payout API
      const amountInCents = Math.round(availableBalance * 100);

      const res = await apiFetch("/api/v1/payouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_payout",
          influencerId,
          amount: amountInCents,
          currency: "usd",
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(
          json?.error?.message ?? `Request failed (${res.status})`
        );
      }

      setCashOutStep("success");
    } catch (e: unknown) {
      setCashOutError(
        e instanceof Error ? e.message : "Something went wrong. Please try again."
      );
      setCashOutStep("error");
    }
  }, [influencerId, availableBalance]);

  const handleStartCashOut = useCallback(() => {
    setCashOutStep("form");
    setCashOutError("");
  }, []);

  const handleCancelCashOut = useCallback(() => {
    setCashOutStep("idle");
    setCashOutError("");
  }, []);

  const handleResetCashOut = useCallback(() => {
    setCashOutStep("idle");
    setCashOutError("");
    // Refresh to reflect new state
    fetchSubmissions();
    fetchPayoutStatus();
  }, [fetchSubmissions, fetchPayoutStatus]);

  // ── Helper: determine cash out UI based on account status ─────────────

  const hasAccount = payoutAccount != null;
  const isAccountActive = payoutAccount?.status === "active" && payoutAccount.payoutsEnabled;
  const isAccountPending = payoutAccount?.status === "pending";
  const isAccountRestricted = payoutAccount?.status === "restricted";

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) return <WalletSkeleton />;

  return (
    <div className="animate-fade-up">
      <h1 className="font-heading text-2xl italic mb-1 sm:text-3xl">
        Perk Wallet
      </h1>
      <p className="text-sm text-brand-dim mb-6 sm:mb-8">
        Track your perks and cash out your earnings, {influencerName}
      </p>

      {/* ── Section 1: Balance Cards ─────────────────────────────────────── */}
      <AnimateOnScroll
        animation="fade-up"
        stagger
        staggerDelay={80}
        className="grid grid-cols-3 gap-3 mb-6"
      >
        <Card borderColor="green">
          <Stat
            value={`$${availableBalance}`}
            label="Available Balance"
            color="#34D399"
          />
        </Card>
        <Card borderColor="cyan">
          <Stat
            value={`$${totalEarned}`}
            label="Total Earned"
            color="#22D3EE"
          />
        </Card>
        <Card borderColor="amber">
          <Stat
            value={`$${pendingAmount}`}
            label="Pending"
            color="#FBBF24"
          />
        </Card>
      </AnimateOnScroll>

      {/* ── Section 1.5: Redeemable Perks (durable wallet) ───────────────── */}
      <AnimateOnScroll animation="fade-up" delay={60}>
        <h2 className="text-sm font-semibold text-brand-dim mb-3">
          Redeemable Perks
        </h2>
        {redeemError && (
          <div className="text-xs text-brand-red font-medium mb-2" role="alert">
            {redeemError}
          </div>
        )}
        {perksLoading ? (
          <Card className="text-center py-8 mb-6">
            <div className="text-xs text-brand-dim">Loading perks…</div>
          </Card>
        ) : visiblePerks.length === 0 ? (
          <Card className="text-center py-10 mb-6">
            <div className="text-2xl mb-2">&#x1F39F;&#xFE0F;</div>
            <div className="text-sm font-bold mb-1">No redeemable perks yet</div>
            <div className="text-xs text-brand-dim">
              Approved campaign perks appear here with a code to redeem in-store.
            </div>
          </Card>
        ) : (
          <div className="space-y-2 mb-6">
            {visiblePerks.map((perk) => {
              const label = perk.type === "pct" ? `${perk.value}% off` : `$${perk.value}`;
              const isRedeemed = perk.status === "redeemed";
              return (
                <Card key={perk.id} padding="sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-brand-text">
                        {label} perk
                      </div>
                      <div className="font-mono text-xs text-brand-muted">
                        Code:{" "}
                        <span className="text-brand-text tracking-wider">
                          {perk.redemptionCode}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Badge color={isRedeemed ? "purple" : "green"}>
                        {isRedeemed ? "redeemed" : "available"}
                      </Badge>
                      {!isRedeemed && (
                        <Button
                          size="sm"
                          onClick={() => handleRedeem(perk.id)}
                          loading={redeemingId === perk.id}
                          disabled={redeemingId === perk.id}
                        >
                          Mark Redeemed
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </AnimateOnScroll>

      {/* ── Section 2: Perk History ──────────────────────────────────────── */}
      <AnimateOnScroll animation="fade-up" delay={100}>
        <h2 className="text-sm font-semibold text-brand-dim mb-3">
          Perk History
        </h2>
        {submissions.length === 0 ? (
          <Card className="text-center py-12 mb-6">
            <div className="text-3xl mb-3">&#x1F4B0;</div>
            <div className="text-sm font-bold mb-1">No perks yet</div>
            <div className="text-xs text-brand-dim">
              Complete campaigns to start earning perks
            </div>
          </Card>
        ) : (
          <div className="space-y-2 mb-6">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_80px_80px_100px] gap-3 px-4 py-2 text-3xs uppercase tracking-wider text-brand-muted font-mono">
              <span>Campaign</span>
              <span className="text-right">Value</span>
              <span className="text-center">Status</span>
              <span className="text-right">Date</span>
            </div>
            {submissions.map((sub) => (
              <Card key={sub.id} padding="sm">
                <div className="flex flex-col sm:grid sm:grid-cols-[1fr_80px_80px_100px] sm:items-center gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-brand-text truncate">
                      {sub.campaignName}
                    </div>
                    <div className="text-xs text-brand-muted truncate">
                      {sub.businessName}
                    </div>
                  </div>
                  <div className="font-mono text-sm font-semibold text-brand-green sm:text-right">
                    ${sub.perkValue || 0}
                  </div>
                  <div className="sm:text-center">
                    <Badge color={STATUS_COLORS[sub.status] ?? "muted"}>
                      {sub.status}
                    </Badge>
                  </div>
                  <div className="text-xs font-mono text-brand-muted sm:text-right">
                    {sub.submittedAt}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AnimateOnScroll>

      {/* ── Section 3: Cash Out ──────────────────────────────────────────── */}
      <AnimateOnScroll animation="fade-up" delay={200}>
        <h2 className="text-sm font-semibold text-brand-dim mb-3">Cash Out</h2>
        <Card borderColor="pink">
          {/* ── No Connect account: Show setup button ── */}
          {!hasAccount && cashOutStep === "idle" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-xs text-brand-muted mb-1">
                    Available to cash out
                  </div>
                  <div className="font-mono text-2xl font-semibold text-brand-green">
                    ${availableBalance}
                  </div>
                </div>
                <Button
                  size="md"
                  onClick={handleSetupPayouts}
                  loading={setupLoading}
                  disabled={setupLoading || payoutLoading}
                >
                  Set Up Payouts
                </Button>
              </div>
              <div className="text-xs text-brand-muted">
                Connect your bank account via Stripe to start receiving payouts.
                Setup takes about 2 minutes.
              </div>
              {cashOutError && (
                <div className="text-xs text-brand-red font-medium" role="alert">
                  {cashOutError}
                </div>
              )}
            </div>
          )}

          {/* ── Account pending: Show complete setup ── */}
          {hasAccount && (isAccountPending || isAccountRestricted) && cashOutStep === "idle" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-xs text-brand-muted mb-1">
                    Available to cash out
                  </div>
                  <div className="font-mono text-2xl font-semibold text-brand-green">
                    ${availableBalance}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color="amber">
                    {isAccountRestricted ? "Restricted" : "Setup Incomplete"}
                  </Badge>
                  <Button
                    size="md"
                    onClick={handleSetupPayouts}
                    loading={setupLoading}
                    disabled={setupLoading}
                  >
                    Complete Setup
                  </Button>
                </div>
              </div>
              <div className="text-xs text-brand-muted">
                {isAccountRestricted
                  ? "Your payout account needs additional information. Click \"Complete Setup\" to update your details."
                  : "Your payout account setup isn't finished yet. Click \"Complete Setup\" to continue with Stripe onboarding."}
              </div>
              {cashOutError && (
                <div className="text-xs text-brand-red font-medium" role="alert">
                  {cashOutError}
                </div>
              )}
            </div>
          )}

          {/* ── Account active: Show cash out flow ── */}
          {isAccountActive && cashOutStep === "idle" && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-xs text-brand-muted mb-1">
                  Available to cash out
                </div>
                <div className="font-mono text-2xl font-semibold text-brand-green">
                  ${availableBalance}
                </div>
                <div className="text-xs text-brand-muted mt-1 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-brand-green" />
                  Stripe Connect active
                </div>
              </div>
              <Button
                size="md"
                disabled={availableBalance <= 0 || availableBalance < 10}
                onClick={handleStartCashOut}
              >
                Request Cash Out
              </Button>
            </div>
          )}

          {/* ── Cash out confirmation ── */}
          {cashOutStep === "form" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-brand-muted mb-1">
                    Cashing out via Stripe Connect
                  </div>
                  <div className="font-mono text-lg font-semibold text-brand-green">
                    ${availableBalance}
                  </div>
                </div>
              </div>

              <div className="bg-brand-surface border border-brand-border rounded-lg px-4 py-3">
                <div className="text-xs text-brand-muted mb-1">Destination</div>
                <div className="text-sm text-brand-text font-medium">
                  Your connected Stripe account
                </div>
                <div className="text-xs text-brand-muted mt-1">
                  Funds will be transferred to the bank account linked in your Stripe dashboard.
                </div>
              </div>

              {availableBalance < 10 && (
                <div
                  className="text-xs text-brand-amber font-medium"
                  role="alert"
                >
                  Minimum payout amount is $10.00.
                </div>
              )}

              {cashOutError && (
                <div
                  className="text-xs text-brand-red font-medium"
                  role="alert"
                >
                  {cashOutError}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCashOutSubmit}
                  disabled={availableBalance < 10}
                >
                  Confirm Payout
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelCashOut}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {cashOutStep === "submitting" && (
            <div className="flex items-center justify-center py-6">
              <Button loading disabled>
                Processing...
              </Button>
            </div>
          )}

          {cashOutStep === "success" && (
            <div className="text-center py-4">
              <div
                className="bg-brand-green/10 border border-brand-green/30 rounded-lg px-4 py-3 text-sm text-brand-green font-medium mb-4"
                role="status"
                aria-live="polite"
              >
                Your payout request has been submitted!
              </div>
              <p className="text-xs text-brand-dim mb-4">
                We&apos;ll transfer ${availableBalance} to your connected Stripe
                account. You&apos;ll be notified once it&apos;s complete.
              </p>
              <Button variant="ghost" size="sm" onClick={handleResetCashOut}>
                Done
              </Button>
            </div>
          )}

          {cashOutStep === "error" && (
            <div className="space-y-4">
              <div
                className="bg-brand-red/10 border border-brand-red/30 rounded-lg px-4 py-3 text-sm text-brand-red font-medium"
                role="alert"
              >
                {cashOutError || "Something went wrong. Please try again."}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleStartCashOut}>
                  Try Again
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelCashOut}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      </AnimateOnScroll>

      {/* ── Section 4: Payout History ────────────────────────────────────── */}
      {payoutHistory.length > 0 && (
        <AnimateOnScroll animation="fade-up" delay={300}>
          <h2 className="text-sm font-semibold text-brand-dim mb-3 mt-6">
            Payout History
          </h2>
          <div className="space-y-2">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_80px_80px_120px] gap-3 px-4 py-2 text-3xs uppercase tracking-wider text-brand-muted font-mono">
              <span>Payout ID</span>
              <span className="text-right">Amount</span>
              <span className="text-center">Status</span>
              <span className="text-right">Date</span>
            </div>
            {payoutHistory.map((payout) => (
              <Card key={payout.id} padding="sm">
                <div className="flex flex-col sm:grid sm:grid-cols-[1fr_80px_80px_120px] sm:items-center gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-mono text-brand-text truncate">
                      {payout.id.slice(0, 20)}...
                    </div>
                    {payout.failureReason && (
                      <div className="text-xs text-brand-red truncate">
                        {payout.failureReason}
                      </div>
                    )}
                  </div>
                  <div className="font-mono text-sm font-semibold text-brand-green sm:text-right">
                    ${(payout.amount / 100).toFixed(2)}
                  </div>
                  <div className="sm:text-center">
                    <Badge color={PAYOUT_STATUS_COLORS[payout.status] ?? "muted"}>
                      {payout.status}
                    </Badge>
                  </div>
                  <div className="text-xs font-mono text-brand-muted sm:text-right">
                    {payout.createdAt?.slice(0, 10) ?? "—"}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </AnimateOnScroll>
      )}
    </div>
  );
}
