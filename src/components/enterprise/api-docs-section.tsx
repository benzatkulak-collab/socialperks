"use client";

import { CODE_EXAMPLES } from "./api-console-types";

// ═══════════════ Types ═══════════════

interface ApiDocsSectionProps {
  codeTab: "curl" | "javascript" | "python";
  onCodeTabChange: (tab: "curl" | "javascript" | "python") => void;
}

// ═══════════════ Component ═══════════════

export function ApiDocsSection({ codeTab, onCodeTabChange }: ApiDocsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
        <h3 className="font-heading text-lg italic text-brand-white">Quick Start</h3>
        <p className="mt-1 text-sm text-brand-muted">
          Use these examples to integrate with the Social Perks API.
        </p>

        {/* Language Tabs */}
        <div className="mt-4 flex gap-2" role="tablist" aria-label="Code examples">
          {(Object.keys(CODE_EXAMPLES) as Array<keyof typeof CODE_EXAMPLES>).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => onCodeTabChange(lang as typeof codeTab)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                codeTab === lang
                  ? "bg-brand-cyan/10 text-brand-cyan"
                  : "bg-brand-elevated text-brand-muted hover:text-brand-text"
              }`}
              role="tab"
              aria-selected={codeTab === lang}
            >
              {CODE_EXAMPLES[lang].label}
            </button>
          ))}
        </div>

        {/* Code Block */}
        <div className="mt-4 overflow-x-auto rounded-lg border border-brand-border bg-brand-bg p-4" role="tabpanel">
          <pre className="font-mono text-sm leading-relaxed text-brand-text">
            <code>{CODE_EXAMPLES[codeTab].code}</code>
          </pre>
        </div>
      </div>

      {/* API Endpoints Reference */}
      <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
        <h3 className="font-heading text-lg italic text-brand-white">API Endpoints</h3>
        <div className="mt-4 space-y-2">
          {[
            { method: "GET", path: "/v1/campaigns", desc: "List all campaigns" },
            { method: "POST", path: "/v1/campaigns", desc: "Create a campaign" },
            { method: "GET", path: "/v1/campaigns/:id", desc: "Get campaign details" },
            { method: "GET", path: "/v1/pricing", desc: "Query action pricing" },
            { method: "GET", path: "/v1/influencers", desc: "Search influencers" },
            { method: "POST", path: "/v1/submissions", desc: "Submit proof of completion" },
            { method: "GET", path: "/v1/analytics", desc: "Campaign analytics" },
          ].map((endpoint) => (
            <div
              key={`${endpoint.method}-${endpoint.path}`}
              className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-bg px-4 py-2"
            >
              <span className={`shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                endpoint.method === "GET"
                  ? "bg-brand-green/10 text-brand-green"
                  : "bg-brand-amber/10 text-brand-amber"
              }`}>
                {endpoint.method}
              </span>
              <code className="font-mono text-sm text-brand-cyan">{endpoint.path}</code>
              <span className="text-xs text-brand-muted">{endpoint.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
