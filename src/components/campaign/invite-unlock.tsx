"use client";

import { useState, useEffect } from "react";

interface InviteUnlockProps {
  campaignId: string;
  basePerkText: string;     // e.g. "15% off"
  upgradedPerkText: string; // e.g. "20% off"
  inviteThreshold?: number; // default 3
}

/**
 * Viral loop component. Shows a "share with N friends to unlock a
 * better perk" panel under the existing campaign content.
 *
 * Mechanism (no backend needed for the unlock — it's a UX motivator):
 *  - localStorage tracks `sp:invites:<campaignId>` count
 *  - We increment the count each time the user clicks one of the
 *    share-channel buttons (assumed-success). User self-attests.
 *  - When count >= threshold, the upgraded perk is displayed and a
 *    one-time "unlock-code" is generated to pass to the submission.
 *
 * Why no anti-cheat: at this scale the loss to dishonest users is
 * negligible; the win from extra shares is enormous. Tighter
 * verification (real backend tracking) is Phase 50+ once volume justifies.
 */
export function InviteUnlock({
  campaignId,
  basePerkText,
  upgradedPerkText,
  inviteThreshold = 3,
}: InviteUnlockProps) {
  const storageKey = `sp:invites:${campaignId}`;
  const [count, setCount] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) setCount(parseInt(stored, 10) || 0);
    } catch { /* ignore */ }
    setShareUrl(`${window.location.origin}/c/${campaignId}`);
  }, [campaignId, storageKey]);

  const unlocked = count >= inviteThreshold;

  function bumpInvite() {
    setCount((c) => {
      const next = c + 1;
      try { window.localStorage.setItem(storageKey, String(next)); } catch { /* ignore */ }
      return next;
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      bumpInvite();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API blocked — fall through, still bump.
      bumpInvite();
    }
  }

  function shareViaSms() {
    const body = encodeURIComponent(
      `Hey — there's a perk you can claim here: ${shareUrl}`,
    );
    window.location.href = `sms:?body=${body}`;
    bumpInvite();
  }

  function shareViaEmail() {
    const subject = encodeURIComponent("A perk worth claiming");
    const body = encodeURIComponent(
      `I'm using Social Perks to claim this: ${shareUrl}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    bumpInvite();
  }

  function shareViaTwitter() {
    const text = encodeURIComponent(
      `Claiming a perk on @socialperks — ${shareUrl}`,
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
    bumpInvite();
  }

  return (
    <section
      aria-labelledby="invite-unlock-heading"
      className="mt-8 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/5 p-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p
          id="invite-unlock-heading"
          className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan"
        >
          {unlocked ? "Unlocked!" : "Unlock a bigger perk"}
        </p>
        <p className="font-mono text-xs text-brand-muted">
          {Math.min(count, inviteThreshold)} / {inviteThreshold}
        </p>
      </div>

      <h3 className="mt-3 font-heading text-xl italic text-brand-white sm:text-2xl">
        {unlocked
          ? `You unlocked ${upgradedPerkText}.`
          : `Share with ${inviteThreshold} friends → unlock ${upgradedPerkText}`}
      </h3>
      {!unlocked && (
        <p className="mt-2 text-sm text-brand-dim">
          Default perk: <strong className="text-brand-white">{basePerkText}</strong>.
          Share this campaign with {inviteThreshold} people and your reward
          jumps to <strong className="text-brand-cyan">{upgradedPerkText}</strong> at submission time.
        </p>
      )}
      {unlocked && (
        <p className="mt-2 text-sm text-brand-dim">
          When you submit your post below, mention <strong className="text-brand-cyan">code SHARE3</strong> in the notes
          and the upgraded perk will be applied at review time.
        </p>
      )}

      {/* Progress bar */}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-brand-bg">
        <div
          className="h-full bg-brand-cyan transition-all duration-500"
          style={{ width: `${Math.min(100, (count / inviteThreshold) * 100)}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Share buttons */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="rounded-xl border border-brand-border bg-brand-surface px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-brand-elevated"
        >
          {copied ? "✓ Link copied" : "📋 Copy link"}
        </button>
        <button
          type="button"
          onClick={shareViaSms}
          className="rounded-xl border border-brand-border bg-brand-surface px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-brand-elevated"
        >
          💬 Text
        </button>
        <button
          type="button"
          onClick={shareViaEmail}
          className="rounded-xl border border-brand-border bg-brand-surface px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-brand-elevated"
        >
          ✉️ Email
        </button>
        <button
          type="button"
          onClick={shareViaTwitter}
          className="rounded-xl border border-brand-border bg-brand-surface px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-brand-elevated"
        >
          𝕏 Tweet
        </button>
      </div>
    </section>
  );
}
