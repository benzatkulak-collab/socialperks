"use client";

/**
 * ClaudeDesktopInstall — one-click install snippet for Claude Desktop.
 *
 * Claude Desktop reads its MCP server list from
 * ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
 * or %APPDATA%\Claude\claude_desktop_config.json (Windows). The user
 * adds a server by editing that JSON and restarting Claude.
 *
 * For a remote MCP server (streamable-http transport), the snippet
 * shape Claude Desktop accepts is the `url` form:
 *
 *   {
 *     "mcpServers": {
 *       "social-perks": {
 *         "url": "https://socialperks.app/api/mcp"
 *       }
 *     }
 *   }
 *
 * One Copy button, one click to copy, one-line instruction telling the
 * user where to paste. The whole experience targets <30 seconds from
 * "I'm curious" to "it's installed."
 *
 * Three variants depending on where the component renders:
 *   - "compact": single Copy button + minimal text (homepage strip)
 *   - "full":    Copy button + the path to the config file + restart
 *                hint (the /agents page, /agent/test page)
 *   - "minimal": just the Copy button, for nav menus etc. (unused today)
 */

import { useState, useCallback } from "react";

const SNIPPET = {
  mcpServers: {
    "social-perks": {
      url: "https://socialperks.app/api/mcp",
    },
  },
};

const SNIPPET_STR = JSON.stringify(SNIPPET, null, 2);

export type InstallVariant = "compact" | "full" | "minimal";

export interface ClaudeDesktopInstallProps {
  variant?: InstallVariant;
  /**
   * Optional title override. The default is variant-specific so
   * embeddings on different pages read naturally.
   */
  title?: string;
}

export function ClaudeDesktopInstall({ variant = "full", title }: ClaudeDesktopInstallProps) {
  const [copied, setCopied] = useState(false);

  const copySnippet = useCallback(() => {
    navigator.clipboard.writeText(SNIPPET_STR).then(() => {
      setCopied(true);
      // Auto-reset after 2s so the user can copy again if they ran
      // into a paste mistake and want to retry.
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  if (variant === "minimal") {
    return (
      <button
        type="button"
        onClick={copySnippet}
        className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surface px-3 py-1.5 text-xs font-medium text-brand-text hover:border-brand-cyan/40 hover:text-brand-cyan transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
        title="Copy Claude Desktop config snippet"
      >
        <span aria-hidden="true">📋</span>
        {copied ? "Copied!" : "Copy Claude config"}
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-brand-cyan/30 bg-brand-cyan/[0.04] px-4 py-3 sm:px-5">
        <div>
          <p className="text-sm font-semibold text-brand-white">
            {title ?? "Use Social Perks from Claude Desktop"}
          </p>
          <p className="text-xs text-brand-dim mt-0.5">
            Copy the snippet, paste into your Claude Desktop config, restart Claude.
          </p>
        </div>
        <button
          type="button"
          onClick={copySnippet}
          className="shrink-0 rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg hover:bg-brand-cyan/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 transition-all"
        >
          {copied ? "✓ Copied" : "Copy config snippet"}
        </button>
      </div>
    );
  }

  // "full" variant — used on /agents, /agent/test, and anywhere else
  // we have room to explain.
  return (
    <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/40 p-6 sm:p-8 backdrop-blur-sm">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
        Install in 30 seconds
      </p>
      <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
        {title ?? "Use Social Perks from Claude Desktop"}
      </h2>
      <p className="mt-3 text-sm text-brand-dim leading-relaxed sm:text-base">
        Add Social Perks to Claude Desktop&apos;s MCP server list with one
        copy-paste. Read-only tools (pricing, action catalog, benchmarks)
        work immediately; write tools require an{" "}
        <a href="/agent/authorize?agent_name=Claude%20Desktop&scope=read.campaigns,write.campaigns,read.submissions&redirect_uri=https://socialperks.app/agent/test&state=desktop" className="text-brand-cyan hover:underline underline-offset-4">
          API key via the OAuth flow
        </a>.
      </p>

      <ol className="mt-6 space-y-4 text-sm text-brand-text">
        <li className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-cyan/10 text-xs text-brand-cyan font-semibold" aria-hidden="true">
            1
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-brand-white">Copy the config snippet</p>
            <div className="mt-2 rounded-lg border border-brand-border bg-brand-bg/60 overflow-hidden">
              <pre className="px-4 py-3 text-xs font-mono text-brand-text overflow-x-auto whitespace-pre">
{SNIPPET_STR}
              </pre>
            </div>
            <button
              type="button"
              onClick={copySnippet}
              className={`mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 ${
                copied
                  ? "bg-brand-green/20 text-brand-green border border-brand-green/40"
                  : "bg-brand-cyan text-brand-bg hover:bg-brand-cyan/90"
              }`}
              aria-live="polite"
            >
              {copied ? "✓ Copied to clipboard" : "Copy config snippet"}
            </button>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-cyan/10 text-xs text-brand-cyan font-semibold" aria-hidden="true">
            2
          </span>
          <div className="min-w-0">
            <p className="font-medium text-brand-white">Paste into your Claude Desktop config</p>
            <p className="mt-1 text-xs text-brand-dim leading-relaxed">
              Open <code className="rounded bg-brand-surface px-1.5 py-0.5 font-mono text-[11px] text-brand-text">~/Library/Application Support/Claude/claude_desktop_config.json</code> on
              macOS, or <code className="rounded bg-brand-surface px-1.5 py-0.5 font-mono text-[11px] text-brand-text">%APPDATA%\Claude\claude_desktop_config.json</code> on
              Windows. If the file exists, merge the <code className="rounded bg-brand-surface px-1.5 py-0.5 font-mono text-[11px] text-brand-text">mcpServers</code> object
              with your existing entries.
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-cyan/10 text-xs text-brand-cyan font-semibold" aria-hidden="true">
            3
          </span>
          <div className="min-w-0">
            <p className="font-medium text-brand-white">Restart Claude Desktop</p>
            <p className="mt-1 text-xs text-brand-dim leading-relaxed">
              Cmd+Q (or Ctrl+Q on Windows) → re-open Claude. The Social Perks tools
              appear in the tools picker. Try asking:{" "}
              <em className="text-brand-text">&ldquo;What&apos;s the going rate for an Instagram Story tag campaign?&rdquo;</em>
            </p>
          </div>
        </li>
      </ol>

      <p className="mt-6 text-xs text-brand-muted">
        Prefer to test in your browser first?{" "}
        <a href="/agent/test" className="text-brand-cyan hover:underline underline-offset-4">
          Try the MCP server right here →
        </a>
      </p>
    </div>
  );
}
