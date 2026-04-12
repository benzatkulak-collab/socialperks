/**
 * Referral tracking and analytics.
 * Tracks referral chains, top referrers, and conversion funnels.
 */

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referrerEmail: string;
  referredEmail: string;
  campaignId?: string;
  status: 'pending' | 'signed_up' | 'converted' | 'expired';
  code: string;
  createdAt: string;
  convertedAt?: string;
  value: number;
}

const referrals = new Map<string, Referral>();

export function createReferral(data: Omit<Referral, 'id' | 'status' | 'createdAt' | 'value'>): Referral {
  const ref: Referral = { ...data, id: crypto.randomUUID(), status: 'pending', createdAt: new Date().toISOString(), value: 0 };
  referrals.set(ref.id, ref);
  return ref;
}

export function convertReferral(id: string, value: number): Referral | null {
  const ref = referrals.get(id);
  if (!ref) return null;
  ref.status = 'converted';
  ref.convertedAt = new Date().toISOString();
  ref.value = value;
  return ref;
}

export function getReferralsByReferrer(referrerId: string): Referral[] {
  return Array.from(referrals.values()).filter(r => r.referrerId === referrerId);
}

export function getReferralStats(referrerId: string) {
  const refs = getReferralsByReferrer(referrerId);
  const total = refs.length;
  const converted = refs.filter(r => r.status === 'converted').length;
  const pending = refs.filter(r => r.status === 'pending').length;
  const totalValue = refs.reduce((sum, r) => sum + r.value, 0);
  return { total, converted, pending, conversionRate: total > 0 ? converted / total : 0, totalValue };
}

export function getTopReferrers(limit = 10): Array<{ referrerId: string; referrerEmail: string; count: number; value: number }> {
  const grouped = new Map<string, { referrerId: string; referrerEmail: string; count: number; value: number }>();
  for (const ref of referrals.values()) {
    const existing = grouped.get(ref.referrerId) || { referrerId: ref.referrerId, referrerEmail: ref.referrerEmail, count: 0, value: 0 };
    existing.count++;
    existing.value += ref.value;
    grouped.set(ref.referrerId, existing);
  }
  return Array.from(grouped.values()).sort((a, b) => b.count - a.count).slice(0, limit);
}
