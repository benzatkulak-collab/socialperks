"use client";

/**
 * Client-side interactive bits for the public campaign page.
 * Handles share buttons (copy link, Twitter, Facebook).
 */

import { useState, useCallback } from "react";

interface CampaignPageClientProps {
  campaignId: string;
  campaignName: string;
  perkDisplay: string;
}

export function CampaignPageClient({
  campaignId,
  campaignName,
  perkDisplay,
}: CampaignPageClientProps) {
  const [copied, setCopied] = useState(false);

  const campaignUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/campaign/${campaignId}`
      : `https://socialperks.app/campaign/${campaignId}`;

  const shareText = `Earn ${perkDisplay} with ${campaignName} on Social Perks!`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(campaignUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = campaignUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [campaignUrl]);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(campaignUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(campaignUrl)}`;

  return (
    <div className="mt-8 rounded-2xl border border-[#2A2F45] bg-[#141825] p-6 sm:p-8">
      <h2 className="mb-4 text-center font-serif text-xl italic text-[#FAFBFD]">
        Share this campaign
      </h2>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Copy Link */}
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-lg border border-[#2A2F45] bg-[#0C0F1A] px-4 py-2.5 text-sm font-medium text-[#E8EAF0] transition-all hover:border-[#22D3EE]/30 hover:bg-[#22D3EE]/5"
        >
          {copied ? (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M3 8.5l3 3 7-7"
                  stroke="#34D399"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[#34D399]">Copied!</span>
            </>
          ) : (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <rect
                  x="5"
                  y="5"
                  width="8"
                  height="8"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M3 11V3.5A1.5 1.5 0 014.5 2H11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Copy Link
            </>
          )}
        </button>

        {/* Twitter */}
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-[#2A2F45] bg-[#0C0F1A] px-4 py-2.5 text-sm font-medium text-[#E8EAF0] transition-all hover:border-[#1DA1F2]/30 hover:bg-[#1DA1F2]/5"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.6.75h2.454l-5.36 6.126L16 15.25h-4.937l-3.867-5.055-4.425 5.055H.316l5.733-6.554L0 .75h5.063l3.495 4.622L12.6.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" />
          </svg>
          Share on X
        </a>

        {/* Facebook */}
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-[#2A2F45] bg-[#0C0F1A] px-4 py-2.5 text-sm font-medium text-[#E8EAF0] transition-all hover:border-[#1877F2]/30 hover:bg-[#1877F2]/5"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M16 8a8 8 0 10-9.25 7.903v-5.59H4.719V8H6.75V6.237c0-2.005 1.194-3.112 3.022-3.112.875 0 1.79.156 1.79.156V5.25h-1.008c-.994 0-1.304.617-1.304 1.25V8h2.219l-.355 2.313H9.25v5.59A8.002 8.002 0 0016 8z" />
          </svg>
          Share on Facebook
        </a>
      </div>
    </div>
  );
}
