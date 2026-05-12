/**
 * Lead store — in-memory, Prisma-ready shape.
 *
 * Follows the same pattern as the rest of the codebase (see `seed.ts` and
 * the influencer store): in-memory Map keyed by lead id. A Prisma adapter
 * can be slotted in later by replacing the `memory` operations — the
 * function signatures are designed to be drop-in compatible with Prisma's
 * `lead.upsert / findMany / update`.
 *
 * Leads are scoped to the user that collected them (ownerId).
 */

import type { Lead, OutreachStatus } from "./types";

const memory = new Map<string, Lead>();

/**
 * Capacity guard. In production this store is backed by Prisma, but until
 * that migration lands we prevent unbounded growth in the in-memory store.
 * When the cap is hit we evict the oldest insertion (Map iteration order
 * is insertion order) — same LRU-ish approach used by response-cache.
 */
const MAX_LEADS = 10_000;

function evictIfFull(): void {
  while (memory.size >= MAX_LEADS) {
    const firstKey = memory.keys().next().value;
    if (firstKey === undefined) break;
    memory.delete(firstKey);
  }
}

interface LeadFilters {
  ownerId?: string;
  status?: OutreachStatus;
  industry?: string;
  city?: string;
  minScore?: number;
}

export async function addLead(lead: Lead): Promise<Lead> {
  // Re-insert to bump in LRU order if it already exists.
  if (memory.has(lead.id)) memory.delete(lead.id);
  evictIfFull();
  memory.set(lead.id, lead);
  return lead;
}

export async function getLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  let results = Array.from(memory.values());

  if (filters.ownerId) {
    results = results.filter((l) => l.ownerId === filters.ownerId);
  }
  if (filters.status) {
    results = results.filter((l) => l.outreachStatus === filters.status);
  }
  if (filters.industry) {
    const needle = filters.industry.toLowerCase();
    results = results.filter((l) => l.industry.toLowerCase().includes(needle));
  }
  if (filters.city) {
    const needle = filters.city.toLowerCase();
    results = results.filter((l) => l.city.toLowerCase().includes(needle));
  }
  if (typeof filters.minScore === "number") {
    const min = filters.minScore;
    results = results.filter((l) => l.fitScore >= min);
  }

  return results.sort((a, b) => b.fitScore - a.fitScore);
}

export async function getLead(id: string): Promise<Lead | null> {
  return memory.get(id) ?? null;
}

export async function updateOutreachStatus(
  id: string,
  status: OutreachStatus,
  notes?: string
): Promise<Lead | null> {
  const existing = memory.get(id);
  if (!existing) return null;
  const updated: Lead = {
    ...existing,
    outreachStatus: status,
    notes: notes !== undefined ? notes : existing.notes,
  };
  memory.set(id, updated);
  return updated;
}

export async function countLeadsByStatus(
  ownerId: string
): Promise<Record<OutreachStatus, number>> {
  const counts: Record<OutreachStatus, number> = {
    new: 0,
    contacted: 0,
    replied: 0,
    qualified: 0,
    converted: 0,
    dead: 0,
  };
  for (const lead of memory.values()) {
    if (lead.ownerId !== ownerId) continue;
    counts[lead.outreachStatus]++;
  }
  return counts;
}

/** Test-only: wipe in-memory store. */
export function _resetLeadStore() {
  memory.clear();
}
