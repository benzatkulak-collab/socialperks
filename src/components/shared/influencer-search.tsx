'use client';
import { useState, useMemo } from 'react';

interface Influencer {
  id: string;
  displayName: string;
  bio: string;
  followerCount: number;
  engagementRate: number;
  niches: string[];
  location: string;
  tier: string;
  verified: boolean;
  avatar?: string;
}

interface InfluencerSearchProps {
  influencers: Influencer[];
  onSelect?: (influencer: Influencer) => void;
}

const TIER_COLORS: Record<string, string> = {
  micro: 'border-emerald-400/30 text-emerald-300',
  mid: 'border-cyan-400/30 text-cyan-300',
  macro: 'border-amber-400/30 text-amber-300',
  mega: 'border-pink-400/30 text-pink-300',
};

export function InfluencerSearch({ influencers, onSelect }: InfluencerSearchProps) {
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [nicheFilter, setNicheFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'followers' | 'engagement' | 'name'>('followers');

  const niches = useMemo(() => {
    const set = new Set<string>();
    influencers.forEach(i => i.niches.forEach(n => set.add(n)));
    return Array.from(set).sort();
  }, [influencers]);

  const filtered = useMemo(() => {
    return influencers
      .filter(i => {
        if (query && !i.displayName.toLowerCase().includes(query.toLowerCase()) && !i.bio.toLowerCase().includes(query.toLowerCase())) return false;
        if (tierFilter !== 'all' && i.tier !== tierFilter) return false;
        if (nicheFilter !== 'all' && !i.niches.includes(nicheFilter)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'followers') return b.followerCount - a.followerCount;
        if (sortBy === 'engagement') return b.engagementRate - a.engagementRate;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [influencers, query, tierFilter, nicheFilter, sortBy]);

  const formatFollowers = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          type="search" placeholder="Search influencers..." value={query} onChange={e => setQuery(e.target.value)}
          className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-cyan-400/40 focus:outline-none"
          aria-label="Search influencers"
        />
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:border-cyan-400/40" aria-label="Filter by tier">
          <option value="all">All Tiers</option>
          <option value="micro">Micro</option>
          <option value="mid">Mid</option>
          <option value="macro">Macro</option>
          <option value="mega">Mega</option>
        </select>
        <select value={nicheFilter} onChange={e => setNicheFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:border-cyan-400/40" aria-label="Filter by niche">
          <option value="all">All Niches</option>
          {niches.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:border-cyan-400/40" aria-label="Sort by">
          <option value="followers">Most Followers</option>
          <option value="engagement">Highest Engagement</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      <p className="text-sm text-white/40">{filtered.length} influencer{filtered.length !== 1 ? 's' : ''} found</p>

      <div className="grid gap-3">
        {filtered.map(inf => (
          <button key={inf.id} onClick={() => onSelect?.(inf)}
            className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-cyan-400/20 hover:bg-white/[0.04] transition-all text-left w-full group">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400/20 to-purple-400/20 flex items-center justify-center text-lg font-bold text-white/60 flex-shrink-0">
              {inf.displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white truncate">{inf.displayName}</span>
                {inf.verified && <span className="text-cyan-400 text-xs" title="Verified">&#10003;</span>}
                <span className={`px-1.5 py-0.5 text-[10px] border rounded-full uppercase tracking-wider ${TIER_COLORS[inf.tier] || 'border-white/20 text-white/40'}`}>{inf.tier}</span>
              </div>
              <p className="text-xs text-white/40 truncate mt-0.5">{inf.bio || inf.niches.join(', ')}</p>
            </div>
            <div className="flex items-center gap-6 text-right flex-shrink-0">
              <div>
                <p className="text-sm font-mono text-white/80">{formatFollowers(inf.followerCount)}</p>
                <p className="text-[10px] text-white/30 uppercase">Followers</p>
              </div>
              <div>
                <p className="text-sm font-mono text-white/80">{(inf.engagementRate * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-white/30 uppercase">Engagement</p>
              </div>
              {inf.location && (
                <div className="hidden md:block">
                  <p className="text-xs text-white/50">{inf.location}</p>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
