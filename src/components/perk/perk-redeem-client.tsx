"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

export type PerkType = "pct" | "dol";

export interface RedeemablePerk {
  id: string;
  value: number;
  type: PerkType;
  status: string; // "active" | "redeemed" | "expired"
  expiresAt: string;
  redemptionCode: string;
}

export function formatPerkValue(value: number, type: PerkType): string {
  return type === "pct" ? `${value}% off` : `$${value.toFixed(2)} off`;
}

/**
 * A single redeemable perk card. Customer-facing, no account required — the
 * `token` is the magic-link token that authenticates the redeem request. On
 * redemption it reveals the code for the customer to show staff (counter) or
 * use at checkout (online). Single-use is enforced server-side.
 */
export function PerkCard({
  token,
  perk,
  businessName,
}: {
  token: string;
  perk: RedeemablePerk;
  businessName: string;
}) {
  const [status, setStatus] = useState(perk.status);
  const [code, setCode] = useState(perk.status === "redeemed" ? perk.redemptionCode : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isExpired =
    status === "expired" || new Date(perk.expiresAt).getTime() < Date.now();
  const isRedeemed = status === "redeemed";

  async function redeem() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/wallet/public/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, perkId: perk.id }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Could not redeem this perk.");
      } else {
        // Activation aha-moment: a real customer redeemed a real perk — the
        // end of the loop and the strongest signal the product delivered value.
        track("perk_redeemed");
        setStatus("redeemed");
        setCode(json.data.redemptionCode);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 sm:p-6">
      <p className="text-xs font-mono uppercase tracking-[0.15em] text-brand-cyan">
        {businessName}
      </p>
      <p className="mt-1 font-heading text-3xl italic text-brand-white">
        {formatPerkValue(perk.value, perk.type)}
      </p>

      {isRedeemed ? (
        <div className="mt-4 rounded-xl border border-brand-green/40 bg-brand-green/10 p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-brand-green">Redeemed</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em] text-brand-white">
            {code}
          </p>
          <p className="mt-2 text-sm text-brand-dim">
            Show this code to redeem your perk.
          </p>
        </div>
      ) : isExpired ? (
        <p className="mt-4 rounded-xl border border-brand-border bg-brand-elevated p-4 text-center text-sm text-brand-muted">
          This perk has expired.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-brand-dim">
            Expires {new Date(perk.expiresAt).toLocaleDateString()}
          </p>
          <button
            type="button"
            onClick={redeem}
            disabled={loading}
            className="mt-4 block w-full rounded-xl bg-brand-cyan py-3 text-center text-sm font-semibold text-brand-bg transition-all duration-200 hover:bg-brand-cyan/90 disabled:opacity-60"
          >
            {loading ? "Redeeming…" : "Redeem now"}
          </button>
          <p className="mt-2 text-center text-xs text-brand-muted">
            Redeem when you&apos;re ready to use it — it can only be redeemed once.
          </p>
          {error && (
            <p className="mt-2 text-center text-xs text-brand-amber">{error}</p>
          )}
        </>
      )}
    </div>
  );
}
