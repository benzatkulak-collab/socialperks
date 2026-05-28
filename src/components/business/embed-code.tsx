"use client";

import { useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmbedCodeProps {
  businessId: string;
  businessName: string;
  /** Base URL for the widget script. Defaults to the current origin. */
  widgetOrigin?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EmbedCode({ businessId, businessName, widgetOrigin }: EmbedCodeProps) {
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const codeRef = useRef<HTMLPreElement>(null);

  const origin = widgetOrigin || (typeof window !== "undefined" ? window.location.origin : "https://socialperks.app");

  const snippet = `<script src="${origin}/widget.js" data-business-id="${businessId}" data-theme="${theme}"></script>`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback: select the text in the pre element
      if (codeRef.current) {
        const range = document.createRange();
        range.selectNodeContents(codeRef.current);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    });
  }, [snippet]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-brand-white mb-1">Website Widget</h3>
        <p className="text-xs text-brand-dim">
          Add a floating &quot;Earn a Perk&quot; button to your website. Customers can browse your campaigns and submit proof without leaving your site.
        </p>
      </div>

      {/* Theme toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-brand-muted">Theme:</span>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`px-3 py-1 text-xs rounded-md border transition-colors ${
            theme === "dark"
              ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
              : "border-brand-border bg-brand-surface text-brand-muted hover:border-brand-border-hover"
          }`}
        >
          Dark
        </button>
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`px-3 py-1 text-xs rounded-md border transition-colors ${
            theme === "light"
              ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
              : "border-brand-border bg-brand-surface text-brand-muted hover:border-brand-border-hover"
          }`}
        >
          Light
        </button>
      </div>

      {/* Code snippet */}
      <div className="relative group">
        <pre
          ref={codeRef}
          className="bg-brand-bg border border-brand-border rounded-lg p-4 text-xs font-mono text-brand-cyan overflow-x-auto whitespace-pre-wrap break-all leading-relaxed select-all"
        >
          {snippet}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className={`absolute top-2 right-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
            copied
              ? "border-brand-green/40 bg-brand-green/10 text-brand-green"
              : "border-brand-border bg-brand-surface text-brand-muted hover:text-brand-white hover:border-brand-border-hover opacity-0 group-hover:opacity-100"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Instructions */}
      <div className="rounded-lg border border-brand-border bg-brand-surface/30 p-4">
        <p className="text-xs font-semibold text-brand-white mb-2">Installation</p>
        <ol className="text-xs text-brand-dim space-y-1.5 list-decimal list-inside">
          <li>Copy the code snippet above</li>
          <li>
            Paste it into your website&apos;s HTML, just before the closing{" "}
            <code className="text-brand-cyan font-mono bg-brand-cyan/5 px-1 py-0.5 rounded">&lt;/body&gt;</code>{" "}
            tag
          </li>
          <li>A floating button will appear in the bottom-right corner</li>
          <li>Customers click it to see your active campaigns and submit proof</li>
        </ol>
      </div>

      {/* Preview */}
      <div>
        <p className="text-xs font-semibold text-brand-white mb-2">Preview</p>
        <Card className="relative overflow-hidden bg-brand-bg min-h-[140px] flex items-end justify-end p-6">
          {/* Mock website background */}
          <div className="absolute inset-0 opacity-10">
            <div className="h-3 w-24 bg-brand-muted rounded mt-4 ml-4" />
            <div className="h-2 w-48 bg-brand-muted rounded mt-3 ml-4" />
            <div className="h-2 w-36 bg-brand-muted rounded mt-2 ml-4" />
            <div className="h-16 w-40 bg-brand-muted rounded mt-4 ml-4" />
          </div>

          {/* Mock FAB button */}
          <div
            className="relative z-10 inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold shadow-lg"
            style={{
              background: "#22D3EE",
              color: "#0C0F1A",
              boxShadow: "0 4px 24px rgba(34,211,238,0.3)",
            }}
          >
            Earn a Perk &#10024;
          </div>

          {/* Business name label */}
          <div className="absolute top-3 left-3">
            <span className="text-3xs text-brand-muted uppercase tracking-wider">Your website</span>
            {businessName && (
              <p className="text-xs text-brand-dim mt-0.5">{businessName}</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
