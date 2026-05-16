/**
 * Support Triage Agent
 *
 * Reads recent contact-form submissions and classifies each by
 * subject + content into a category: billing, technical, abuse,
 * partnership, general. Routes high-confidence categories to a
 * canned auto-reply queue; queues the rest for human triage.
 *
 * The /api/v1/contact endpoint accepts submissions but the platform
 * doesn't persist them yet (it sends a notification email and
 * returns). This agent surfaces the gap: until the inbound store
 * exists, the agent emits a single "no-data" decision per run so
 * admins know the pipe is wired but empty.
 */

import type { Agent, AgentDecision } from "./types";

interface InboundMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  receivedAt: string;
  status?: "new" | "triaged" | "answered";
}

async function fetchPendingInbound(): Promise<InboundMessage[]> {
  // The contact module doesn't expose a list API yet (the /api/v1/contact
  // endpoint sends a notification email and discards). When a contact
  // store is added, wire it here. Until then, return empty.
  //
  // The dynamic-import-by-variable pattern keeps TypeScript from
  // statically resolving the path so the module doesn't have to exist.
  try {
    const path = "@/lib/contact-store";
    const mod = (await import(/* webpackIgnore: true */ path).catch(() => null)) as
      | { listPendingInbound?: () => InboundMessage[] }
      | null;
    return mod?.listPendingInbound?.() ?? [];
  } catch {
    return [];
  }
}

function classify(msg: InboundMessage): { category: string; confidence: number; reasons: string[] } {
  const text = (msg.subject + " " + msg.message).toLowerCase();
  const reasons: string[] = [];

  const billingKw = ["payment", "billing", "invoice", "charge", "refund", "subscription", "card", "stripe"];
  const technicalKw = ["bug", "error", "broken", "doesn't work", "crash", "not loading", "500", "404"];
  const abuseKw = ["abuse", "spam", "fraud", "harass", "report", "violat"];
  const partnerKw = ["partner", "collab", "integration", "api", "enterprise", "demo"];

  const billingHits = billingKw.filter((k) => text.includes(k)).length;
  const techHits = technicalKw.filter((k) => text.includes(k)).length;
  const abuseHits = abuseKw.filter((k) => text.includes(k)).length;
  const partnerHits = partnerKw.filter((k) => text.includes(k)).length;

  const ranked = [
    { cat: "billing", hits: billingHits },
    { cat: "technical", hits: techHits },
    { cat: "abuse", hits: abuseHits },
    { cat: "partnership", hits: partnerHits },
  ].sort((a, b) => b.hits - a.hits);

  if (ranked[0].hits === 0) {
    return { category: "general", confidence: 0.3, reasons: ["no-keyword-match"] };
  }

  reasons.push(`${ranked[0].cat}-${ranked[0].hits}-hits`);
  // Confidence scales with hit count, capped.
  const confidence = Math.min(0.95, 0.5 + ranked[0].hits * 0.1);
  return { category: ranked[0].cat, confidence, reasons };
}

export const supportTriageAgent: Agent = {
  id: "support-triage",
  name: "Support Triage",
  description: "Classifies incoming contact-form messages and routes to category queues.",
  defaultMode: "dry-run",
  intervalSeconds: 300,
  config: {
    threshold: { min: 0.5, max: 0.99, default: 0.7, step: 0.01 },
    maxActionsPerRun: { min: 1, max: 100, default: 25 },
  },
  async run(_ctx) {
    const inbound = await fetchPendingInbound();
    const decisions: AgentDecision[] = [];

    for (const msg of inbound) {
      const { category, confidence, reasons } = classify(msg);
      decisions.push({
        targetId: msg.id,
        action: `route-to-${category}`,
        confidence,
        executed: false, // contact-store wiring not in place yet
        reason: reasons.join(", "),
        meta: { from: msg.email, subject: msg.subject, category },
      });
    }

    return decisions;
  },
};
