"use client";

/**
 * MCP Sandbox — self-serve in-browser MCP testing surface.
 *
 * Goal: a developer lands on /agent/test, picks a tool, fills in args,
 * hits Send, and sees the real JSON-RPC response in <60 seconds. The
 * "I'll try it later" excuse disappears; the experience IS trying it.
 *
 * Design choices:
 *   - Only read tools (requiresAuth: false) are pre-populated. Write
 *     tools are listed but locked behind an "Add API key" toggle.
 *   - Schema-driven form rendering. We read the manifest's inputSchema
 *     for each tool and render a primitive input per top-level
 *     property. No nested objects or arrays — keep the demo simple.
 *   - Response panel shows pretty-printed JSON-RPC, plus a parsed
 *     _meta block (durationMs, cost, rateLimit) since that's the
 *     unique-to-Social-Perks bit worth showcasing.
 *
 * Hard-coded production endpoint. This page is the canonical demo
 * surface — it points at the live server. No env switching.
 */

import { useEffect, useMemo, useState, useCallback } from "react";

const MCP_ENDPOINT = "https://socialperks.app/api/mcp";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ToolCost {
  type: "free" | "plan" | "cash";
  resource?: string;
  consumedPerCall?: number;
  minCents?: number;
  maxCents?: number;
  description?: string;
}

interface ToolSchemaProperty {
  type?: string | string[];
  description?: string;
  enum?: string[];
  default?: unknown;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}

interface ToolSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, ToolSchemaProperty>;
}

interface Tool {
  name: string;
  description: string;
  requiresAuth: boolean;
  cost: ToolCost;
  inputSchema: ToolSchema;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: {
    content?: Array<{ type: string; text: string }>;
    isError?: boolean;
    _meta?: {
      durationMs?: number;
      cost?: ToolCost;
      rateLimit?: {
        limit: number | null;
        remaining: number | null;
        resetAt: string | null;
      } | null;
      downstreamStatus?: number | null;
    };
  };
  error?: { code: number; message: string };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Coerce a string form input into the value the schema expects.
 * Schemas in the wild are loose — `type` can be missing, a string, or
 * a union. We default to string and bail on anything unparseable.
 */
function coerceValue(raw: string, prop: ToolSchemaProperty): unknown {
  if (raw === "") return undefined;
  const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;
  if (type === "integer" || type === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  if (type === "boolean") {
    return raw === "true";
  }
  return raw;
}

function describeCost(cost: ToolCost | undefined): string {
  if (!cost) return "—";
  if (cost.type === "free") return "free";
  if (cost.type === "plan") return `plan: ${cost.resource} × ${cost.consumedPerCall ?? 1}`;
  if (cost.type === "cash") return `cash: ${cost.description ?? "varies"}`;
  return cost.type;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function McpSandbox() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<JsonRpcResponse | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);

  // Load the manifest once on mount. Use POST tools/list so we get the
  // _meta.cost block on each tool (the GET manifest also has it, but
  // POST mirrors what an agent would actually do).
  useEffect(() => {
    const ac = new AbortController();
    fetch(MCP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((body: { result?: { tools?: Array<Tool & { _meta?: { cost: ToolCost } }> } }) => {
        const list = body.result?.tools ?? [];
        // Normalize: cost lives at _meta.cost on tools/list but at the
        // top level on the GET manifest. Surface it consistently.
        const normalized: Tool[] = list.map((t) => ({
          name: t.name,
          description: t.description,
          requiresAuth: t.requiresAuth ?? false,
          cost: t.cost ?? t._meta?.cost ?? { type: "free" },
          inputSchema: t.inputSchema ?? {},
        }));
        setTools(normalized);
        // Pre-select the first read-only tool to skip a click.
        const firstFree = normalized.find((t) => !t.requiresAuth);
        if (firstFree) setSelectedName(firstFree.name);
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return;
        setLoadError(e instanceof Error ? e.message : "Failed to load tools");
      });
    return () => ac.abort();
  }, []);

  const selected = useMemo(
    () => tools.find((t) => t.name === selectedName) ?? null,
    [tools, selectedName]
  );

  // Reset args when the selected tool changes — fill defaults from the
  // schema so the user can hit Send immediately.
  useEffect(() => {
    if (!selected?.inputSchema?.properties) {
      setArgs({});
      return;
    }
    const next: Record<string, string> = {};
    for (const [key, prop] of Object.entries(selected.inputSchema.properties)) {
      if (prop.default !== undefined) next[key] = String(prop.default);
    }
    setArgs(next);
  }, [selected]);

  const handleSend = useCallback(async () => {
    if (!selected) return;
    setSending(true);
    setResponse(null);
    setRawError(null);

    const argPayload: Record<string, unknown> = {};
    if (selected.inputSchema?.properties) {
      for (const [key, prop] of Object.entries(selected.inputSchema.properties)) {
        const v = coerceValue(args[key] ?? "", prop);
        if (v !== undefined) argPayload[key] = v;
      }
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (selected.requiresAuth && apiKey.trim()) {
        headers["x-api-key"] = apiKey.trim();
      }
      const res = await fetch(MCP_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: { name: selected.name, arguments: argPayload },
        }),
      });
      const body = (await res.json()) as JsonRpcResponse;
      setResponse(body);
    } catch (e: unknown) {
      setRawError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSending(false);
    }
  }, [selected, args, apiKey]);

  // Render the parsed body when the result contains a JSON-encoded
  // payload (which all our tools do). Fall back to the raw envelope.
  const parsedBody = useMemo(() => {
    const text = response?.result?.content?.[0]?.text;
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }, [response]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="rounded-2xl border border-brand-red/40 bg-brand-red/5 p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-red mb-1">
          Couldn&apos;t load tools
        </p>
        <p className="text-sm text-brand-dim">{loadError}</p>
        <p className="text-xs text-brand-muted mt-2">
          If this persists, the production endpoint may be down. Check{" "}
          <a href="https://socialperks.app/api/v1/health" className="text-brand-cyan hover:underline">
            /api/v1/health
          </a>.
        </p>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-6 animate-pulse">
        <div className="h-4 w-1/3 bg-brand-border/40 rounded mb-3" />
        <div className="h-3 w-2/3 bg-brand-border/30 rounded" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
      {/* Tool list */}
      <aside className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-3 sm:p-4 h-fit">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted mb-3 px-2">
          {tools.length} tools available
        </p>
        <ul className="space-y-1" role="list">
          {tools.map((t) => {
            const isSelected = t.name === selectedName;
            return (
              <li key={t.name}>
                <button
                  type="button"
                  onClick={() => setSelectedName(t.name)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                    isSelected
                      ? "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30"
                      : "text-brand-text hover:bg-brand-surface/50 border border-transparent"
                  }`}
                  aria-pressed={isSelected}
                >
                  <span className="font-mono font-semibold text-xs block">
                    {t.name}
                  </span>
                  <span className="text-[11px] text-brand-muted mt-0.5 flex items-center gap-1.5">
                    {t.requiresAuth ? (
                      <span title="Requires API key" aria-label="Requires API key">🔒</span>
                    ) : (
                      <span title="No auth required" aria-label="No auth required">○</span>
                    )}
                    {describeCost(t.cost)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Tool detail + form + response */}
      <div className="space-y-6">
        {selected && (
          <>
            <div>
              <h2 className="font-heading text-2xl italic text-brand-white">
                {selected.name}
              </h2>
              <p className="text-sm text-brand-dim mt-1 leading-relaxed">
                {selected.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${
                  selected.requiresAuth
                    ? "bg-brand-amber/10 text-brand-amber border border-brand-amber/30"
                    : "bg-brand-green/10 text-brand-green border border-brand-green/30"
                }`}>
                  {selected.requiresAuth ? "🔒 Requires API key" : "○ Public — no auth"}
                </span>
                <span className="rounded-full px-2 py-0.5 bg-brand-surface/50 text-brand-muted border border-brand-border">
                  cost: {describeCost(selected.cost)}
                </span>
              </div>
            </div>

            {/* Auth toggle for write tools */}
            {selected.requiresAuth && (
              <div className="rounded-xl border border-brand-amber/30 bg-brand-amber/5 p-4">
                <p className="text-sm text-brand-text mb-3">
                  This tool requires an API key. Don&apos;t have one?{" "}
                  <a
                    href="/agent/authorize?agent_name=Sandbox&scope=read.campaigns,write.campaigns,read.submissions&redirect_uri=https://socialperks.app/agent/test&state=sandbox"
                    className="text-brand-cyan hover:underline underline-offset-4"
                  >
                    Get one via the OAuth flow
                  </a>{" "}
                  or read the{" "}
                  <a href="https://github.com/benzatkulak-collab/socialperks/blob/main/AGENTS.md" className="text-brand-cyan hover:underline underline-offset-4">
                    AGENTS.md docs
                  </a>.
                </p>
                <label className="block text-xs text-brand-muted mb-1.5">
                  Paste an API key (stored only in this browser tab):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sp_test_..."
                    className="flex-1 px-3 py-2 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-sm font-mono outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((v) => !v)}
                    className="text-xs text-brand-muted hover:text-brand-text px-3 py-2"
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}

            {/* Args form */}
            <div className="rounded-xl border border-brand-border/40 bg-brand-surface/20 p-4 sm:p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted mb-3">
                Arguments
              </p>
              {selected.inputSchema?.properties &&
              Object.keys(selected.inputSchema.properties).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(selected.inputSchema.properties).map(([key, prop]) => {
                    const isRequired = selected.inputSchema?.required?.includes(key);
                    const inputId = `arg-${selected.name}-${key}`;
                    return (
                      <div key={key}>
                        <label htmlFor={inputId} className="block text-sm font-medium text-brand-text mb-1">
                          {key}
                          {isRequired && <span className="text-brand-red ml-1" aria-hidden="true">*</span>}
                          {prop.type && (
                            <span className="ml-2 font-mono text-[10px] text-brand-muted">
                              {Array.isArray(prop.type) ? prop.type.join("|") : prop.type}
                            </span>
                          )}
                        </label>
                        {prop.description && (
                          <p className="text-xs text-brand-dim mb-1.5 leading-relaxed">{prop.description}</p>
                        )}
                        {prop.enum ? (
                          <select
                            id={inputId}
                            value={args[key] ?? ""}
                            onChange={(e) => setArgs((a) => ({ ...a, [key]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-sm outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40"
                          >
                            <option value="">— pick one —</option>
                            {prop.enum.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={inputId}
                            type={prop.type === "integer" || prop.type === "number" ? "number" : "text"}
                            value={args[key] ?? ""}
                            onChange={(e) => setArgs((a) => ({ ...a, [key]: e.target.value }))}
                            placeholder={isRequired ? "required" : "optional"}
                            className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-sm outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 font-mono"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-brand-muted">
                  This tool takes no arguments. Hit Send.
                </p>
              )}
            </div>

            {/* Send + curl preview */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="rounded-xl bg-brand-cyan px-6 py-3 text-sm font-semibold text-brand-bg hover:bg-brand-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 transition-all"
              >
                {sending ? "Sending..." : `Send ${selected.name}`}
              </button>
              <button
                type="button"
                onClick={() => {
                  const argPayload: Record<string, unknown> = {};
                  if (selected.inputSchema?.properties) {
                    for (const [key, prop] of Object.entries(selected.inputSchema.properties)) {
                      const v = coerceValue(args[key] ?? "", prop);
                      if (v !== undefined) argPayload[key] = v;
                    }
                  }
                  const body = JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "tools/call",
                    params: { name: selected.name, arguments: argPayload },
                  });
                  const auth = selected.requiresAuth ? ` \\\n  -H "x-api-key: $YOUR_API_KEY"` : "";
                  const curl = `curl -X POST ${MCP_ENDPOINT} \\\n  -H "Content-Type: application/json"${auth} \\\n  -d '${body}'`;
                  navigator.clipboard.writeText(curl).then(() => {
                    // Brief feedback via a toast would be nice; for
                    // now the button title is enough.
                  });
                }}
                className="rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-sm font-medium text-brand-text hover:border-brand-subtle hover:bg-brand-elevated transition-all"
                title="Copy this call as a curl command"
              >
                Copy as curl
              </button>
            </div>

            {/* Response */}
            {(response || rawError) && (
              <div className="rounded-xl border border-brand-border/40 bg-brand-bg/60 overflow-hidden">
                <div className="flex items-center justify-between border-b border-brand-border/40 px-4 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                    Response
                  </p>
                  {response?.result?._meta && (
                    <div className="flex flex-wrap gap-2 text-[10px] font-mono text-brand-muted">
                      {response.result._meta.durationMs !== undefined && (
                        <span className="rounded bg-brand-surface px-1.5 py-0.5">
                          {response.result._meta.durationMs}ms
                        </span>
                      )}
                      {response.result._meta.downstreamStatus !== null &&
                        response.result._meta.downstreamStatus !== undefined && (
                          <span className="rounded bg-brand-surface px-1.5 py-0.5">
                            status:{response.result._meta.downstreamStatus}
                          </span>
                        )}
                      {response.result._meta.rateLimit?.remaining !== null &&
                        response.result._meta.rateLimit?.limit !== null &&
                        response.result._meta.rateLimit?.remaining !== undefined && (
                          <span className="rounded bg-brand-surface px-1.5 py-0.5">
                            rl:{response.result._meta.rateLimit?.remaining}/
                            {response.result._meta.rateLimit?.limit}
                          </span>
                        )}
                      <span className="rounded bg-brand-surface px-1.5 py-0.5">
                        cost:{describeCost(response.result._meta.cost)}
                      </span>
                    </div>
                  )}
                </div>
                {rawError && (
                  <pre className="p-4 text-xs text-brand-red font-mono whitespace-pre-wrap">
                    Network error: {rawError}
                  </pre>
                )}
                {response?.error && (
                  <pre className="p-4 text-xs text-brand-red font-mono whitespace-pre-wrap">
                    {`Error ${response.error.code}: ${response.error.message}`}
                  </pre>
                )}
                {response?.result && (
                  <pre className="p-4 text-xs text-brand-text font-mono whitespace-pre-wrap overflow-x-auto max-h-96">
                    {response.result.isError ? "⚠ Tool reported an error:\n\n" : ""}
                    {typeof parsedBody === "string"
                      ? parsedBody
                      : JSON.stringify(parsedBody, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
