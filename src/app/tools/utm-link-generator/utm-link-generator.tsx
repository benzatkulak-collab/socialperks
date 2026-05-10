"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const SOURCES = ["facebook","instagram","twitter","linkedin","tiktok","youtube","pinterest","google","bing","email","newsletter","podcast","qr-code","sms","partner","blog","other"];
const MEDIUMS = ["social","cpc","email","referral","affiliate","display","organic","qr","sms","podcast","influencer","other"];
const STORAGE_KEY = "social-perks:utm-history";
const MAX_HISTORY = 5;

interface HistoryEntry { url: string; source: string; campaign: string; createdAt: number; }

function buildUtmUrl(p: { baseUrl: string; source: string; medium: string; campaign: string; content: string; term: string; }): { url: string; valid: boolean; error: string | null } {
  const trimmed = p.baseUrl.trim();
  if (!trimmed) return { url: "", valid: false, error: null };
  let parsed: URL;
  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed;
    parsed = new URL(candidate);
  } catch {
    return { url: "", valid: false, error: "Enter a valid URL." };
  }
  if (p.source) parsed.searchParams.set("utm_source", p.source);
  if (p.medium) parsed.searchParams.set("utm_medium", p.medium);
  if (p.campaign) parsed.searchParams.set("utm_campaign", p.campaign);
  if (p.content) parsed.searchParams.set("utm_content", p.content);
  if (p.term) parsed.searchParams.set("utm_term", p.term);
  return { url: parsed.toString(), valid: true, error: null };
}

function shorten(url: string): string {
  if (!url) return "";
  if (url.length <= 48) return url;
  return url.slice(0, 45) + "…";
}

export function UtmLinkGenerator() {
  const [baseUrl, setBaseUrl] = useState("");
  const [source, setSource] = useState("instagram");
  const [medium, setMedium] = useState("social");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [term, setTerm] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as HistoryEntry[];
      if (Array.isArray(parsed)) setHistory(parsed.slice(0, MAX_HISTORY));
    } catch {}
  }, []);

  const result = useMemo(() => buildUtmUrl({
    baseUrl,
    source: source.trim().toLowerCase(),
    medium: medium.trim().toLowerCase(),
    campaign: campaign.trim(),
    content: content.trim(),
    term: term.trim(),
  }), [baseUrl, source, medium, campaign, content, term]);

  function persistHistory(entries: HistoryEntry[]) {
    setHistory(entries);
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
  }

  async function handleCopy() {
    if (!result.valid || !result.url) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
    const entry: HistoryEntry = { url: result.url, source: source || "—", campaign: campaign || "—", createdAt: Date.now() };
    const next = [entry, ...history.filter((h) => h.url !== entry.url)].slice(0, MAX_HISTORY);
    persistHistory(next);
  }

  function clearHistory() { persistHistory([]); }

  return (
    <section className="pb-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-5">
          <div className="md:col-span-3">
            <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6 sm:p-8">
              <div className="grid gap-5">
                <Field label="Website URL" required hint="The page you want to link to.">
                  <input type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://yoursite.com/landing" className="w-full rounded-xl border border-brand-border bg-brand-bg/60 px-4 py-2.5 text-sm text-brand-white placeholder-brand-muted outline-none transition-colors focus:border-brand-cyan/60" />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Source" required hint="Where the click comes from.">
                    <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-xl border border-brand-border bg-brand-bg/60 px-4 py-2.5 text-sm text-brand-white outline-none focus:border-brand-cyan/60">
                      {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Medium" required hint="Type of traffic.">
                    <select value={medium} onChange={(e) => setMedium(e.target.value)} className="w-full rounded-xl border border-brand-border bg-brand-bg/60 px-4 py-2.5 text-sm text-brand-white outline-none focus:border-brand-cyan/60">
                      {MEDIUMS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Campaign" required hint="The campaign name (e.g., spring-launch).">
                  <input type="text" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="spring-launch" className="w-full rounded-xl border border-brand-border bg-brand-bg/60 px-4 py-2.5 text-sm text-brand-white placeholder-brand-muted outline-none focus:border-brand-cyan/60" />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Content (optional)" hint="A/B variant or ad creative.">
                    <input type="text" value={content} onChange={(e) => setContent(e.target.value)} placeholder="hero-cta-blue" className="w-full rounded-xl border border-brand-border bg-brand-bg/60 px-4 py-2.5 text-sm text-brand-white placeholder-brand-muted outline-none focus:border-brand-cyan/60" />
                  </Field>
                  <Field label="Term (optional)" hint="Keyword for paid search.">
                    <input type="text" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="customer loyalty" className="w-full rounded-xl border border-brand-border bg-brand-bg/60 px-4 py-2.5 text-sm text-brand-white placeholder-brand-muted outline-none focus:border-brand-cyan/60" />
                  </Field>
                </div>
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-brand-border bg-brand-surface/50 p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-cyan">Your tracked URL</div>
              <div className="mt-4">
                {result.error ? (
                  <p className="text-sm text-brand-amber">{result.error}</p>
                ) : result.valid && result.url ? (
                  <>
                    <pre className="overflow-x-auto rounded-xl border border-brand-border bg-brand-bg/70 p-3 font-mono text-[11px] leading-relaxed text-brand-text"><code className="break-all">{result.url}</code></pre>
                    <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-brand-muted">Preview · {shorten(result.url)}</p>
                    <button type="button" onClick={handleCopy} className="mt-4 w-full rounded-xl bg-brand-cyan px-4 py-2.5 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300">{copied ? "Copied to clipboard" : "Copy URL"}</button>
                  </>
                ) : (
                  <p className="text-sm text-brand-dim">Enter a website URL to generate your tracked link.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {history.length > 0 ? (
          <div className="mt-10 rounded-2xl border border-brand-border bg-brand-surface/40 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-xl italic text-brand-white">Recent links</h3>
                <p className="mt-1 text-xs text-brand-muted">Stored locally in your browser. Last {MAX_HISTORY}.</p>
              </div>
              <button type="button" onClick={clearHistory} className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted transition-colors hover:text-brand-amber">Clear</button>
            </div>
            <ul className="mt-4 space-y-2">
              {history.map((h) => (
                <li key={h.url + "-" + h.createdAt} className="rounded-xl border border-brand-border bg-brand-bg/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-xs text-brand-text">{h.url}</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">{h.source} · {h.campaign}</div>
                    </div>
                    <button type="button" onClick={() => navigator.clipboard.writeText(h.url)} className="shrink-0 rounded-lg border border-brand-border bg-brand-surface/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-brand-text transition-colors hover:border-brand-cyan/40 hover:text-brand-cyan">Copy</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-12 rounded-2xl border border-brand-border bg-brand-surface/30 p-8 text-center sm:p-12">
          <h2 className="font-heading text-3xl italic leading-tight text-brand-white sm:text-4xl">Track conversions automatically with Social Perks.</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-dim">Stop hand-building UTM links. Social Perks auto-tags every campaign link, attributes conversions back to creators, and pays them when a customer converts.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/ai" className="w-full rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20 sm:w-auto">See how it works →</Link>
            <Link href="/pricing" className="w-full rounded-xl border border-brand-border bg-brand-surface/50 px-7 py-3 text-sm font-medium text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-surface sm:w-auto">See pricing</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode; }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-text">{label}{required ? <span className="ml-1 text-brand-cyan">*</span> : null}</span>
        {hint ? <span className="text-[11px] text-brand-muted">{hint}</span> : null}
      </div>
      <div className="mt-2">{children}</div>
    </label>
  );
}
