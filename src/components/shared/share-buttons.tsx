"use client";

import { useEffect, useState } from "react";

export type ShareChannel =
  | "twitter"
  | "facebook"
  | "linkedin"
  | "reddit"
  | "email"
  | "copy";

export interface ShareButtonsProps {
  /** Canonical URL of the page being shared. */
  url: string;
  /** Title of the page (used as default share text). */
  title: string;
  /** Optional summary text to include. */
  summary?: string;
  /** Channels to render and order. Defaults to all six. */
  channels?: ShareChannel[];
  /** Optional className for the container. */
  className?: string;
  /** Compact label for the share row (visible above buttons). */
  label?: string;
}

interface PlausibleWindow extends Window {
  plausible?: (event: string, opts?: { props?: Record<string, string> }) => void;
}

function trackShare(channel: ShareChannel, url: string) {
  if (typeof window === "undefined") return;
  const w = window as PlausibleWindow;
  try {
    w.plausible?.("Share", { props: { channel, url } });
  } catch {
    /* no-op */
  }
  // Cloudflare Web Analytics has no public custom-event API today;
  // we still expose a CustomEvent so any listener can pick it up.
  try {
    window.dispatchEvent(
      new CustomEvent("sp:share", { detail: { channel, url } }),
    );
  } catch {
    /* no-op */
  }
}

function buildShareHref(channel: ShareChannel, url: string, title: string, summary?: string): string {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const s = encodeURIComponent(summary ?? "");
  switch (channel) {
    case "twitter":
      return `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${u}&title=${t}`;
    case "email":
      return `mailto:?subject=${t}&body=${s}%0A%0A${u}`;
    case "copy":
      return "#";
  }
}

const LABELS: Record<ShareChannel, string> = {
  twitter: "Share on X",
  facebook: "Share on Facebook",
  linkedin: "Share on LinkedIn",
  reddit: "Share on Reddit",
  email: "Share via email",
  copy: "Copy link",
};

function Icon({ channel }: { channel: ShareChannel }) {
  const cls = "h-4 w-4";
  switch (channel) {
    case "twitter":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.24 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22C18.34 21.24 22 17.08 22 12.06" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.26 2.37 4.26 5.45zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12M3.56 20.45h3.56V9H3.56zM22.22 0H1.78C.8 0 0 .77 0 1.73v20.54C0 23.23.8 24 1.78 24h20.44c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0" />
        </svg>
      );
    case "reddit":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M12 2c5.52 0 10 4.48 10 10 0 .74-.08 1.46-.23 2.16.36.36.59.86.59 1.41 0 1.1-.9 2-2 2h-.06c-.42 1.3-1.55 2.41-3.13 3.18-1.55.75-3.45 1.2-5.5 1.2s-3.95-.45-5.5-1.2c-1.58-.77-2.71-1.88-3.13-3.18H3a2 2 0 0 1-2-2c0-.55.23-1.05.59-1.41C1.44 13.46 1.36 12.74 1.36 12 1.36 6.48 5.84 2 12 2m4.06 4.62c.75 0 1.36.61 1.36 1.36S16.81 9.34 16.06 9.34s-1.36-.61-1.36-1.36.61-1.36 1.36-1.36M7.94 6.62c.75 0 1.36.61 1.36 1.36S8.69 9.34 7.94 9.34 6.58 8.73 6.58 7.98s.61-1.36 1.36-1.36M12 17.66c2.13 0 3.91-.66 4.53-1.55-.62-.5-1.69-.83-2.91-.83-1.21 0-2.28.33-2.91.83.62.89 2.4 1.55 2.91 1.55Z" />
        </svg>
      );
    case "email":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1m1 2.6V18h16V7.6l-8 5.33zM5.31 7l6.69 4.46L18.69 7z" />
        </svg>
      );
    case "copy":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m0 16H8V7h11z" />
        </svg>
      );
  }
}

const DEFAULT_CHANNELS: ShareChannel[] = [
  "twitter",
  "facebook",
  "linkedin",
  "reddit",
  "email",
  "copy",
];

export function ShareButtons({
  url,
  title,
  summary,
  channels = DEFAULT_CHANNELS,
  className,
  label = "Share this",
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
    trackShare("copy", url);
  }

  function handleClick(channel: ShareChannel, href: string, e: React.MouseEvent) {
    if (channel === "copy") {
      e.preventDefault();
      void handleCopy();
      return;
    }
    trackShare(channel, url);
    if (channel !== "email") {
      e.preventDefault();
      window.open(href, "_blank", "noopener,noreferrer,width=600,height=560");
    }
  }

  // Mobile: render a single button that opens a bottom sheet.
  if (isMobile) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-border/60 bg-brand-card/40 px-4 py-2.5 text-sm text-brand-text transition-colors hover:border-brand-cyan/50 hover:bg-brand-card/60"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3 3 0 0 0 0-1.4l7.05-4.11A3 3 0 1 0 15 5a3 3 0 0 0 .04.5L7.91 9.65A3 3 0 1 0 8 14.35l7.13 4.16a3 3 0 1 0 2.87-2.43" />
          </svg>
          Share
        </button>
        {sheetOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Share options"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:hidden"
            onClick={() => setSheetOpen(false)}
          >
            <div
              className="w-full rounded-t-2xl border-t border-brand-border/60 bg-brand-card p-5 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-brand-border/60" />
              <p className="text-center font-mono text-[10px] uppercase tracking-wider text-brand-muted">
                {label}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {channels.map((c) => {
                  const href = buildShareHref(c, url, title, summary);
                  return (
                    <a
                      key={c}
                      href={href}
                      target={c === "email" || c === "copy" ? undefined : "_blank"}
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        handleClick(c, href, e);
                        if (c !== "copy") setSheetOpen(false);
                      }}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-brand-border/60 bg-brand-bg/60 p-4 text-brand-text transition-colors hover:border-brand-cyan/50"
                      aria-label={LABELS[c]}
                    >
                      <Icon channel={c} />
                      <span className="text-[11px]">
                        {c === "copy" && copied ? "Copied" : LABELS[c].replace(/^(Share on |Share via |Copy )/, "")}
                      </span>
                    </a>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="mt-5 w-full rounded-lg border border-brand-border/60 px-4 py-2.5 text-sm text-brand-muted hover:text-brand-text"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop / tablet: inline button row.
  return (
    <div className={className}>
      {label && (
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-brand-muted">
          {label}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {channels.map((c) => {
          const href = buildShareHref(c, url, title, summary);
          return (
            <a
              key={c}
              href={href}
              target={c === "email" || c === "copy" ? undefined : "_blank"}
              rel="noopener noreferrer"
              onClick={(e) => handleClick(c, href, e)}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand-border/60 bg-brand-card/40 px-3 py-1.5 text-xs text-brand-text transition-colors hover:border-brand-cyan/50 hover:bg-brand-card/60"
              aria-label={LABELS[c]}
              title={LABELS[c]}
            >
              <Icon channel={c} />
              <span>
                {c === "copy" && copied
                  ? "Copied"
                  : c === "twitter"
                    ? "X"
                    : c === "copy"
                      ? "Copy link"
                      : LABELS[c].replace(/^Share on /, "").replace(/^Share via /, "")}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default ShareButtons;
