"use client";

/**
 * Lead detail page.
 *
 * - Full lead info
 * - Fit reasons explained
 * - Outreach status dropdown
 * - Notes
 * - "Generate personalized outreach" → calls /api/v1/leads/:id/outreach
 */

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Lead, OutreachStatus } from "@/lib/leads/types";
import { OUTREACH_STATUSES } from "@/lib/leads/types";

interface OutreachDraft {
  channel: "email" | "instagram" | "sms";
  subject?: string;
  body: string;
}

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/leads");
    const json = await res.json();
    if (json.success) {
      const match = (json.data?.leads as Lead[]).find((l) => l.id === id);
      if (match) {
        setLead(match);
        setNotes(match.notes ?? "");
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(status: OutreachStatus) {
    if (!lead) return;
    setSaving(true);
    const res = await fetch(`/api/v1/leads?id=${encodeURIComponent(lead.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });
    const json = await res.json();
    if (json.success) setLead(json.data.lead);
    setSaving(false);
  }

  async function saveNotes() {
    if (!lead) return;
    setSaving(true);
    const res = await fetch(`/api/v1/leads?id=${encodeURIComponent(lead.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: lead.outreachStatus, notes }),
    });
    const json = await res.json();
    if (json.success) setLead(json.data.lead);
    setSaving(false);
  }

  async function generateOutreach() {
    if (!lead) return;
    setGenerating(true);
    const res = await fetch(
      `/api/v1/leads/${encodeURIComponent(lead.id)}/outreach`,
      { method: "POST" }
    );
    const json = await res.json();
    if (json.success) setDrafts(json.data.drafts ?? []);
    setGenerating(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0C0F1A] text-zinc-400 p-6">
        Loading…
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-[#0C0F1A] text-zinc-400 p-6">
        <Link href="/dashboard/leads" className="text-cyan-400">
          ← Back to leads
        </Link>
        <div className="mt-6">Lead not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0F1A] text-zinc-200 p-6">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/dashboard/leads"
          className="text-cyan-400 hover:text-cyan-300 text-sm"
        >
          ← Back to leads
        </Link>

        <header className="mt-4 mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif italic text-3xl">{lead.businessName}</h1>
            <div className="text-zinc-400 mt-1">
              {lead.industry} · {lead.city}, {lead.state}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-zinc-500">
              Fit score
            </div>
            <div className="font-mono text-4xl text-cyan-300">
              {lead.fitScore}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Business info */}
          <section className="border border-zinc-800 bg-zinc-950/60 rounded-lg p-5">
            <h2 className="text-lg mb-4">Business info</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Address" value={lead.address} />
              <Row label="Phone" value={lead.phone ?? "—"} />
              <Row
                label="Website"
                value={
                  lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:text-cyan-300"
                    >
                      {lead.website}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Row
                label="Google"
                value={`${lead.googleRating.toFixed(1)}★ · ${lead.googleReviewCount} reviews`}
              />
              <Row
                label="Instagram"
                value={
                  lead.hasInstagram
                    ? lead.instagramHandle ?? "yes"
                    : "not detected"
                }
              />
              <Row
                label="Responds to reviews"
                value={lead.hasResponseToReviews ? "yes" : "no"}
              />
              <Row
                label="Collected"
                value={new Date(lead.collectedAt).toLocaleString()}
              />
            </dl>
          </section>

          {/* Fit reasons */}
          <section className="border border-zinc-800 bg-zinc-950/60 rounded-lg p-5">
            <h2 className="text-lg mb-4">Why this lead fits</h2>
            <ul className="space-y-2 text-sm">
              {lead.fitReasons.length === 0 ? (
                <li className="text-zinc-500 italic">No signals captured.</li>
              ) : (
                lead.fitReasons.map((r, i) => (
                  <li
                    key={i}
                    className="flex gap-2 items-start text-zinc-300"
                  >
                    <span className="text-cyan-400">•</span>
                    <span>{r}</span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

        {/* Outreach status + notes */}
        <section className="border border-zinc-800 bg-zinc-950/60 rounded-lg p-5 mb-8">
          <h2 className="text-lg mb-4">Outreach</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Status</span>
              <select
                value={lead.outreachStatus}
                onChange={(e) =>
                  updateStatus(e.target.value as OutreachStatus)
                }
                disabled={saving}
                className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2"
              >
                {OUTREACH_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Conversation notes, follow-up reminders…"
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100"
            />
          </label>
          <button
            onClick={saveNotes}
            disabled={saving}
            className="mt-3 text-sm bg-zinc-800 hover:bg-zinc-700 rounded px-3 py-1"
          >
            {saving ? "Saving…" : "Save notes"}
          </button>
        </section>

        {/* Generate outreach */}
        <section className="border border-zinc-800 bg-zinc-950/60 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg">Personalized outreach</h2>
            <button
              onClick={generateOutreach}
              disabled={generating}
              className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-zinc-950 font-semibold rounded px-4 py-2"
            >
              {generating ? "Generating…" : "Generate personalized outreach"}
            </button>
          </div>

          {drafts.length === 0 ? (
            <p className="text-zinc-500 text-sm italic">
              Click the button above to generate three drafts (email, Instagram
              DM, SMS) using this lead&apos;s specific data.
            </p>
          ) : (
            <div className="space-y-4">
              {drafts.map((d) => (
                <div
                  key={d.channel}
                  className="border border-zinc-800 rounded p-4 bg-zinc-950/40"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wider text-cyan-300">
                      {d.channel}
                    </span>
                    <button
                      onClick={() => {
                        const text =
                          d.channel === "email" && d.subject
                            ? `Subject: ${d.subject}\n\n${d.body}`
                            : d.body;
                        navigator.clipboard?.writeText(text);
                      }}
                      className="text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Copy
                    </button>
                  </div>
                  {d.subject && (
                    <div className="text-sm text-zinc-300 mb-2">
                      <span className="text-zinc-500">Subject: </span>
                      {d.subject}
                    </div>
                  )}
                  <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans">
                    {d.body}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <dt className="text-zinc-500 w-32 shrink-0">{label}</dt>
      <dd className="text-zinc-200 flex-1 break-words">{value}</dd>
    </div>
  );
}
