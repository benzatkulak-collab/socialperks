/**
 * Marketing Action Exchange — The Stock Exchange for Marketing
 *
 * A real-time marketplace matching businesses (buy orders) with influencers
 * and AI agents (sell orders). This is Social Perks' core infrastructure:
 * the pricing oracle, the matching engine, and the settlement layer that
 * every AI agent queries to run marketing campaigns.
 *
 * ARCHITECTURE:
 * - In-memory order book (will migrate to Postgres + Redis pub/sub)
 * - Price-time priority matching (best price first, then earliest order)
 * - Continuous matching on every new order placement
 * - Price history seeded from platform action values
 *
 * REVENUE MODEL:
 * - 3% fee on agent/influencer side per settled trade
 * - 5% fee on business side per settled trade
 * - ~4% blended take rate
 */

import { ALL_ACTIONS, findAction, findPlatform } from "./platforms";
import { checkCampaignCompliance } from "./compliance-engine";
import { ledger } from "./financial-ledger";
import { emitCampaignEvent } from "./events";

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export interface BuyOrder {
  id: string;
  businessId: string;
  businessName: string;
  businessType: string;
  actionId: string;
  platformId: string;
  maxPrice: number;
  quantity: number;
  filled: number;
  requirements: {
    minFollowers?: number;
    niches?: string[];
    location?: string;
    minEngagement?: number;
  };
  perkValue: number;
  perkType: "pct" | "dol";
  campaignId?: string;
  status: "open" | "partially_filled" | "filled" | "cancelled" | "expired";
  createdAt: string;
  expiresAt: string;
}

export interface SellOrder {
  id: string;
  agentId: string;
  agentName: string;
  agentType: "ai_agent" | "influencer" | "managed_account";
  actionId: string;
  platformId: string;
  askPrice: number;
  platformHandle: string;
  followerCount: number;
  engagementRate: number;
  niches: string[];
  location: string;
  availability: number;
  status: "open" | "matched" | "executing" | "completed" | "cancelled";
  createdAt: string;
}

export interface Trade {
  id: string;
  buyOrderId: string;
  sellOrderId: string;
  actionId: string;
  platformId: string;
  price: number;
  businessId: string;
  businessName: string;
  agentId: string;
  agentName: string;
  status: "pending" | "executing" | "proof_submitted" | "verified" | "settled" | "disputed" | "cancelled";
  proofUrl?: string;
  verifiedAt?: string;
  settledAt?: string;
  disputeReason?: string;
  platformFee: number;
  createdAt: string;
}

export interface MarketData {
  actionId: string;
  platformId: string;
  platformName: string;
  actionLabel: string;
  actionType: string;
  currentPrice: number;
  bidPrice: number;
  askPrice: number;
  spread: number;
  volume24h: number;
  volumeChange: number;
  high24h: number;
  low24h: number;
  openOrders: number;
  availableSellers: number;
  avgCompletionTime: string;
  trend: "up" | "down" | "stable";
}

export interface MarketDepth {
  bids: { price: number; quantity: number }[];
  asks: { price: number; quantity: number }[];
}

export interface PricePoint {
  price: number;
  timestamp: string;
  volume?: number;
}

export interface AgentProfile {
  agentName: string;
  agentType: "ai_agent" | "influencer" | "managed_account";
  platforms: { platformId: string; handle: string; followers: number; engagementRate: number }[];
  niches: string[];
  location: string;
  rateCard?: Record<string, number>;
}

export interface EnrollmentResult {
  agentId: string;
  enrolledAt: string;
  matchedCampaigns: number;
  estimatedDailyEarnings: number;
  autoPlacedSellOrders: SellOrder[];
}

export interface Opportunity {
  matchingOrders: BuyOrder[];
  estimatedDailyEarnings: number;
  topPayingActions: { actionId: string; platformId: string; avgPrice: number; actionLabel: string; platformName: string }[];
  demand: { high: string[]; medium: string[]; low: string[] };
}

export interface MarketStats {
  totalVolume24h: number;
  totalTrades: number;
  activeBuyOrders: number;
  activeSellOrders: number;
  avgSpread: number;
  totalSettledValue: number;
  platformRevenue24h: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════════

const uid = () => crypto.randomUUID();

function isoNow(): string {
  return new Date().toISOString();
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

function isWithin24h(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 86_400_000;
}

/** Seeded pseudo-random for deterministic price generation */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Exchange Engine
// ══════════════════════════════════════════════════════════════════════════════

class MarketingExchange {
  private buyOrders: Map<string, BuyOrder> = new Map();
  private sellOrders: Map<string, SellOrder> = new Map();
  private trades: Map<string, Trade> = new Map();
  private priceHistory: Map<string, PricePoint[]> = new Map();

  /** Platform fee rates */
  static readonly AGENT_FEE = 0.03;
  static readonly BUSINESS_FEE = 0.05;

  /** Minimum match score to create a trade (0-100) */
  static readonly MIN_MATCH_SCORE = 35;

  constructor() {
    this.seedMarketData();
    this.seedBuyOrders();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ORDER MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  placeBuyOrder(
    businessId: string,
    businessName: string,
    businessType: string,
    actionId: string,
    platformId: string,
    maxPrice: number,
    quantity: number,
    requirements: BuyOrder["requirements"],
    perkValue: number,
    perkType: "pct" | "dol",
    expiresInHours: number = 168 // Default 7 days
  ): BuyOrder {
    const action = findAction(actionId);
    if (!action) throw new Error(`Unknown action: ${actionId}`);
    const platform = findPlatform(platformId);
    if (!platform) throw new Error(`Unknown platform: ${platformId}`);
    if (maxPrice <= 0) throw new Error("maxPrice must be positive");
    if (quantity <= 0) throw new Error("quantity must be positive");

    const order: BuyOrder = {
      id: `bo_${uid()}`,
      businessId,
      businessName,
      businessType,
      actionId,
      platformId,
      maxPrice,
      quantity,
      filled: 0,
      requirements,
      perkValue,
      perkType,
      status: "open",
      createdAt: isoNow(),
      expiresAt: hoursFromNow(expiresInHours),
    };

    // Run compliance check on the order
    try {
      const complianceCampaign = {
        id: order.id, businessId, name: businessName, description: "",
        actions: [actionId], discountValue: perkValue, discountType: perkType,
        expiresInDays: 168, useTiers: false, status: "active" as const, createdAt: isoNow(),
      };
      const compliance = checkCampaignCompliance(complianceCampaign, [actionId]);
      (order as BuyOrder & { complianceScore?: number }).complianceScore = compliance.score;
    } catch { /* compliance is best-effort on orders */ }

    this.buyOrders.set(order.id, order);

    // Emit event
    emitCampaignEvent("campaign.created", order.id, businessId, { actionId, maxPrice, quantity });

    // Trigger matching immediately
    this.matchOrders();

    return order;
  }

  placeSellOrder(
    agentId: string,
    agentName: string,
    agentType: SellOrder["agentType"],
    actionId: string,
    platformId: string,
    askPrice: number,
    platformHandle: string,
    followerCount: number,
    engagementRate: number,
    niches: string[],
    location: string,
    availability: number = 5
  ): SellOrder {
    const action = findAction(actionId);
    if (!action) throw new Error(`Unknown action: ${actionId}`);
    const platform = findPlatform(platformId);
    if (!platform) throw new Error(`Unknown platform: ${platformId}`);
    if (askPrice <= 0) throw new Error("askPrice must be positive");

    const order: SellOrder = {
      id: `so_${uid()}`,
      agentId,
      agentName,
      agentType,
      actionId,
      platformId,
      askPrice,
      platformHandle,
      followerCount,
      engagementRate,
      niches,
      location,
      availability,
      status: "open",
      createdAt: isoNow(),
    };

    this.sellOrders.set(order.id, order);

    // Trigger matching immediately
    this.matchOrders();

    return order;
  }

  cancelBuyOrder(orderId: string): void {
    const order = this.buyOrders.get(orderId);
    if (!order) throw new Error(`Buy order not found: ${orderId}`);
    if (order.status === "filled" || order.status === "cancelled") {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }
    order.status = "cancelled";
  }

  cancelSellOrder(orderId: string): void {
    const order = this.sellOrders.get(orderId);
    if (!order) throw new Error(`Sell order not found: ${orderId}`);
    if (order.status === "completed" || order.status === "cancelled") {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }
    order.status = "cancelled";
  }

  getBuyOrder(orderId: string): BuyOrder | undefined {
    return this.buyOrders.get(orderId);
  }

  getSellOrder(orderId: string): SellOrder | undefined {
    return this.sellOrders.get(orderId);
  }

  getTrade(tradeId: string): Trade | undefined {
    return this.trades.get(tradeId);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MATCHING ENGINE
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Core matching algorithm — finds compatible buy/sell orders and creates trades.
   *
   * Strategy: Price-time priority
   * 1. Group open buy orders by actionId
   * 2. For each buy order, find all compatible open sell orders
   * 3. Score each potential match on multiple dimensions
   * 4. Execute matches above the threshold, best score first
   * 5. Price is set at the midpoint between bid and ask
   *
   * Returns newly created trades.
   */
  matchOrders(): Trade[] {
    const newTrades: Trade[] = [];

    // Get all open/partially_filled buy orders, sorted by price (highest first) then time (oldest first)
    const openBuys = Array.from(this.buyOrders.values())
      .filter(o => o.status === "open" || o.status === "partially_filled")
      .filter(o => new Date(o.expiresAt) > new Date()) // Not expired
      .sort((a, b) => {
        if (b.maxPrice !== a.maxPrice) return b.maxPrice - a.maxPrice;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    // Get all open sell orders, sorted by price (lowest first) then time (oldest first)
    const openSells = Array.from(this.sellOrders.values())
      .filter(o => o.status === "open")
      .sort((a, b) => {
        if (a.askPrice !== b.askPrice) return a.askPrice - b.askPrice;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    // Track which sell orders get matched this round (prevent double-matching)
    const matchedSellIds = new Set<string>();

    for (const buy of openBuys) {
      const remainingQuantity = buy.quantity - buy.filled;
      if (remainingQuantity <= 0) continue;

      // Find compatible sells for this action on this platform
      const compatibleSells = openSells
        .filter(sell => {
          if (matchedSellIds.has(sell.id)) return false;
          if (sell.actionId !== buy.actionId) return false;
          if (sell.platformId !== buy.platformId) return false;
          if (sell.askPrice > buy.maxPrice) return false; // Price must overlap
          return true;
        })
        .map(sell => ({ sell, score: this.scoreMatch(buy, sell) }))
        .filter(({ score }) => score >= MarketingExchange.MIN_MATCH_SCORE)
        .sort((a, b) => b.score - a.score); // Best matches first

      let filledThisRound = 0;

      for (const { sell } of compatibleSells) {
        if (filledThisRound >= remainingQuantity) break;
        if (matchedSellIds.has(sell.id)) continue;

        // Calculate trade price — weighted midpoint favoring the more competitive side
        const spreadMid = (buy.maxPrice + sell.askPrice) / 2;
        const price = Math.round(spreadMid * 100) / 100;

        // Calculate platform fee (percentage of trade price)
        const platformFee = Math.round(price * (MarketingExchange.AGENT_FEE + MarketingExchange.BUSINESS_FEE) * 100) / 100;

        const trade: Trade = {
          id: `tr_${uid()}`,
          buyOrderId: buy.id,
          sellOrderId: sell.id,
          actionId: buy.actionId,
          platformId: buy.platformId,
          price,
          businessId: buy.businessId,
          businessName: buy.businessName,
          agentId: sell.agentId,
          agentName: sell.agentName,
          status: "pending",
          platformFee,
          createdAt: isoNow(),
        };

        this.trades.set(trade.id, trade);
        newTrades.push(trade);

        // Update orders
        sell.status = "matched";
        matchedSellIds.add(sell.id);
        filledThisRound++;
      }

      // Update buy order status
      buy.filled += filledThisRound;
      if (buy.filled >= buy.quantity) {
        buy.status = "filled";
      } else if (buy.filled > 0) {
        buy.status = "partially_filled";
      }
    }

    return newTrades;
  }

  /**
   * Scores a potential match between a buy order and sell order.
   * Returns 0-100 where higher = better match.
   *
   * Scoring dimensions:
   * - Price competitiveness (30 points) — how much price overlap
   * - Follower quality (25 points) — meets or exceeds requirements
   * - Niche alignment (20 points) — content relevance
   * - Engagement quality (15 points) — engagement rate vs minimum
   * - Location match (10 points) — geographic relevance
   */
  scoreMatch(buy: BuyOrder, sell: SellOrder): number {
    let score = 0;

    // ── Price competitiveness (30 points) ──
    // Full points if ask is <=50% of max bid. Zero if ask == max bid.
    if (sell.askPrice <= buy.maxPrice) {
      const priceRatio = sell.askPrice / buy.maxPrice;
      // Lower ask relative to max bid = higher score
      score += Math.round((1 - priceRatio) * 60); // 0-30 range (since ratio 0.5-1.0 maps to 30-0)
      score = Math.min(score, 30); // Cap at 30
      score = Math.max(score, 5);  // Min 5 points if price overlaps at all
    }

    // ── Follower quality (25 points) ──
    const minFollowers = buy.requirements.minFollowers ?? 0;
    if (sell.followerCount >= minFollowers) {
      if (minFollowers === 0) {
        // No requirement — base points
        score += 15;
      } else {
        const followerRatio = sell.followerCount / minFollowers;
        if (followerRatio >= 5) score += 25;       // 5x+ requirement
        else if (followerRatio >= 2) score += 22;  // 2-5x requirement
        else if (followerRatio >= 1.5) score += 20; // 1.5-2x
        else score += 15;                            // Barely meets
      }
    } else {
      // Below minimum — heavy penalty but don't disqualify completely
      const deficit = minFollowers - sell.followerCount;
      const deficitRatio = deficit / minFollowers;
      if (deficitRatio < 0.2) score += 5; // Within 20% — might still work
      // else 0 points
    }

    // ── Niche alignment (20 points) ──
    const requiredNiches = buy.requirements.niches ?? [];
    if (requiredNiches.length === 0) {
      score += 12; // No niche requirement — partial credit
    } else {
      const sellerNichesLower = sell.niches.map(n => n.toLowerCase());
      const matchedNiches = requiredNiches.filter(n =>
        sellerNichesLower.some(sn =>
          sn.includes(n.toLowerCase()) || n.toLowerCase().includes(sn)
        )
      );
      const nicheRatio = matchedNiches.length / requiredNiches.length;
      score += Math.round(nicheRatio * 20);
    }

    // ── Engagement quality (15 points) ──
    const minEngagement = buy.requirements.minEngagement ?? 0;
    if (minEngagement === 0) {
      // No requirement — score based on absolute engagement
      if (sell.engagementRate >= 0.05) score += 15;      // 5%+ is excellent
      else if (sell.engagementRate >= 0.03) score += 12;  // 3-5% is good
      else if (sell.engagementRate >= 0.01) score += 8;   // 1-3% is decent
      else score += 4;                                     // Below 1%
    } else {
      const engRatio = sell.engagementRate / minEngagement;
      if (engRatio >= 2) score += 15;
      else if (engRatio >= 1.5) score += 13;
      else if (engRatio >= 1) score += 10;
      else if (engRatio >= 0.7) score += 5;
      // Below 70% of minimum — 0 points
    }

    // ── Location match (10 points) ──
    const requiredLocation = buy.requirements.location;
    if (!requiredLocation) {
      score += 6; // No location requirement — partial credit
    } else {
      const buyLoc = requiredLocation.toLowerCase();
      const sellLoc = sell.location.toLowerCase();
      if (sellLoc === buyLoc) {
        score += 10; // Exact match
      } else if (sellLoc.includes(buyLoc) || buyLoc.includes(sellLoc)) {
        score += 8; // Partial match (e.g., "New York" contains "NY")
      } else {
        // Check state/country level matching
        const buyParts = buyLoc.split(/[,\s]+/);
        const sellParts = sellLoc.split(/[,\s]+/);
        const overlap = buyParts.some(bp => sellParts.some(sp => sp === bp && bp.length > 1));
        if (overlap) score += 5;
        // else 0 — no geographic overlap
      }
    }

    return Math.min(100, Math.max(0, score));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TRADE LIFECYCLE
  // ════════════════════════════════════════════════════════════════════════════

  submitProof(tradeId: string, proofUrl: string): Trade {
    const trade = this.trades.get(tradeId);
    if (!trade) throw new Error(`Trade not found: ${tradeId}`);
    if (trade.status !== "pending" && trade.status !== "executing") {
      throw new Error(`Cannot submit proof for trade with status: ${trade.status}`);
    }
    trade.proofUrl = proofUrl;
    trade.status = "proof_submitted";

    // Update sell order status
    const sellOrder = this.sellOrders.get(trade.sellOrderId);
    if (sellOrder) sellOrder.status = "executing";

    return trade;
  }

  verifyTrade(tradeId: string): Trade {
    const trade = this.trades.get(tradeId);
    if (!trade) throw new Error(`Trade not found: ${tradeId}`);
    if (trade.status !== "proof_submitted") {
      throw new Error(`Cannot verify trade with status: ${trade.status}. Must be proof_submitted.`);
    }
    trade.status = "verified";
    trade.verifiedAt = isoNow();
    return trade;
  }

  settleTrade(tradeId: string): Trade {
    const trade = this.trades.get(tradeId);
    if (!trade) throw new Error(`Trade not found: ${tradeId}`);
    if (trade.status !== "verified") {
      throw new Error(`Cannot settle trade with status: ${trade.status}. Must be verified.`);
    }
    trade.status = "settled";
    trade.settledAt = isoNow();

    // Record price in history
    const key = trade.actionId;
    if (!this.priceHistory.has(key)) {
      this.priceHistory.set(key, []);
    }
    this.priceHistory.get(key)!.push({
      price: trade.price,
      timestamp: trade.settledAt!,
      volume: 1,
    });

    // Update sell order
    const sellOrder = this.sellOrders.get(trade.sellOrderId);
    if (sellOrder) sellOrder.status = "completed";

    // Record in financial ledger (business pays, agent earns, platform takes fee)
    try {
      const agentEarnings = trade.price * (1 - MarketingExchange.AGENT_FEE);
      ledger.recordInfluencerEarning(trade.agentId, trade.businessId, agentEarnings, tradeId);
    } catch { /* best-effort ledger recording */ }

    return trade;
  }

  disputeTrade(tradeId: string, reason: string): Trade {
    const trade = this.trades.get(tradeId);
    if (!trade) throw new Error(`Trade not found: ${tradeId}`);
    if (trade.status === "settled" || trade.status === "cancelled") {
      throw new Error(`Cannot dispute trade with status: ${trade.status}`);
    }
    trade.status = "disputed";
    trade.disputeReason = reason;
    return trade;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MARKET DATA — FREE, NO AUTH
  // ════════════════════════════════════════════════════════════════════════════

  getMarketData(): MarketData[] {
    return ALL_ACTIONS.map(action => this.buildMarketData(action.id, action.platformId!));
  }

  getMarketDataForAction(actionId: string): MarketData | null {
    const action = findAction(actionId);
    if (!action || !action.platformId) return null;
    return this.buildMarketData(actionId, action.platformId);
  }

  getMarketDataForPlatform(platformId: string): MarketData[] {
    const platform = findPlatform(platformId);
    if (!platform) return [];
    return platform.actions.map(action => this.buildMarketData(action.id, platformId));
  }

  getPriceHistory(actionId: string, hours: number = 24): PricePoint[] {
    const history = this.priceHistory.get(actionId) ?? [];
    const cutoff = Date.now() - hours * 3600_000;
    return history.filter(p => new Date(p.timestamp).getTime() > cutoff);
  }

  getMarketDepth(actionId: string): MarketDepth {
    const action = findAction(actionId);
    if (!action) return { bids: [], asks: [] };

    // Aggregate buy orders by price level
    const bidMap = new Map<number, number>();
    for (const order of this.buyOrders.values()) {
      if (order.actionId !== actionId) continue;
      if (order.status !== "open" && order.status !== "partially_filled") continue;
      const remaining = order.quantity - order.filled;
      if (remaining <= 0) continue;
      const price = Math.round(order.maxPrice * 100) / 100;
      bidMap.set(price, (bidMap.get(price) ?? 0) + remaining);
    }

    // Aggregate sell orders by price level
    const askMap = new Map<number, number>();
    for (const order of this.sellOrders.values()) {
      if (order.actionId !== actionId) continue;
      if (order.status !== "open") continue;
      const price = Math.round(order.askPrice * 100) / 100;
      askMap.set(price, (askMap.get(price) ?? 0) + order.availability);
    }

    const bids = Array.from(bidMap.entries())
      .map(([price, quantity]) => ({ price, quantity }))
      .sort((a, b) => b.price - a.price); // Highest bid first

    const asks = Array.from(askMap.entries())
      .map(([price, quantity]) => ({ price, quantity }))
      .sort((a, b) => a.price - b.price); // Lowest ask first

    return { bids, asks };
  }

  getTopMovers(): MarketData[] {
    const allData = this.getMarketData();
    return allData
      .filter(d => d.volume24h > 0)
      .sort((a, b) => Math.abs(b.volumeChange) - Math.abs(a.volumeChange))
      .slice(0, 20);
  }

  getMarketStats(): MarketStats {
    let totalVolume24h = 0;
    let totalTrades = 0;
    let totalSettledValue = 0;
    let platformRevenue24h = 0;

    for (const trade of this.trades.values()) {
      if (isWithin24h(trade.createdAt)) {
        totalVolume24h += trade.price;
        totalTrades++;
        platformRevenue24h += trade.platformFee;
      }
      if (trade.status === "settled") {
        totalSettledValue += trade.price;
      }
    }

    const activeBuyOrders = Array.from(this.buyOrders.values())
      .filter(o => o.status === "open" || o.status === "partially_filled").length;
    const activeSellOrders = Array.from(this.sellOrders.values())
      .filter(o => o.status === "open").length;

    // Calculate average spread across all active markets
    const spreads: number[] = [];
    const actionIds = new Set(
      Array.from(this.buyOrders.values())
        .filter(o => o.status === "open" || o.status === "partially_filled")
        .map(o => o.actionId)
    );
    for (const actionId of actionIds) {
      const depth = this.getMarketDepth(actionId);
      if (depth.bids.length > 0 && depth.asks.length > 0) {
        spreads.push(depth.asks[0].price - depth.bids[0].price);
      }
    }
    const avgSpread = spreads.length > 0
      ? Math.round((spreads.reduce((s, v) => s + v, 0) / spreads.length) * 100) / 100
      : 0;

    return {
      totalVolume24h: Math.round(totalVolume24h * 100) / 100,
      totalTrades,
      activeBuyOrders,
      activeSellOrders,
      avgSpread,
      totalSettledValue: Math.round(totalSettledValue * 100) / 100,
      platformRevenue24h: Math.round(platformRevenue24h * 100) / 100,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AGENT AUTO-ENROLLMENT — THE CROWN JEWEL
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * ONE CALL to go from nothing to earning money.
   *
   * 1. Creates agent profile with a unique ID
   * 2. Scans ALL open buy orders across all platforms
   * 3. For each platform the agent is on, finds matching opportunities
   * 4. Auto-places sell orders at competitive prices
   * 5. Triggers matching engine to instantly create trades
   * 6. Returns estimated daily earnings to hook the agent
   *
   * The magic: an AI agent calls this once and immediately has pending trades.
   */
  autoEnroll(profile: AgentProfile): EnrollmentResult {
    const agentId = `ag_${uid()}`;
    const enrolledAt = isoNow();
    const autoPlacedSellOrders: SellOrder[] = [];

    // Build a lookup of the agent's platforms
    const agentPlatforms = new Map(
      profile.platforms.map(p => [p.platformId, p])
    );

    // Scan all open buy orders and find opportunities
    const openBuys = Array.from(this.buyOrders.values())
      .filter(o => o.status === "open" || o.status === "partially_filled")
      .filter(o => new Date(o.expiresAt) > new Date());

    // Group by platform to find what the agent can fulfill
    for (const buy of openBuys) {
      const agentPlatform = agentPlatforms.get(buy.platformId);
      if (!agentPlatform) continue; // Agent not on this platform

      // Check follower requirement
      if (buy.requirements.minFollowers && agentPlatform.followers < buy.requirements.minFollowers * 0.8) {
        continue; // Too far below minimum (allow 20% grace)
      }

      // Check niche alignment
      if (buy.requirements.niches && buy.requirements.niches.length > 0) {
        const agentNichesLower = profile.niches.map(n => n.toLowerCase());
        const hasNicheOverlap = buy.requirements.niches.some(reqNiche =>
          agentNichesLower.some(an =>
            an.includes(reqNiche.toLowerCase()) || reqNiche.toLowerCase().includes(an)
          )
        );
        if (!hasNicheOverlap) continue;
      }

      // Determine ask price — use rate card if available, else price competitively
      let askPrice: number;
      const action = findAction(buy.actionId);
      if (!action) continue;

      if (profile.rateCard && profile.rateCard[action.type]) {
        // Agent has explicit pricing for this action type
        askPrice = profile.rateCard[action.type];
      } else {
        // Price competitively: slightly below the buy order max to ensure matching
        // Higher follower counts command higher prices (closer to maxPrice)
        const followerPremium = Math.min(1, agentPlatform.followers / 50000);
        const engagementPremium = Math.min(1, agentPlatform.engagementRate / 0.05);
        const qualityFactor = 0.5 + (followerPremium * 0.25) + (engagementPremium * 0.25);
        askPrice = Math.round(buy.maxPrice * qualityFactor * 100) / 100;
        askPrice = Math.max(askPrice, action.value * 0.3); // Floor at 30% of base value
      }

      // Don't place if ask would exceed max price
      if (askPrice > buy.maxPrice) continue;

      // Check if we already placed a sell order for this action+platform combo
      const alreadyPlaced = autoPlacedSellOrders.some(
        so => so.actionId === buy.actionId && so.platformId === buy.platformId
      );
      if (alreadyPlaced) continue;

      try {
        const sellOrder = this.placeSellOrder(
          agentId,
          profile.agentName,
          profile.agentType,
          buy.actionId,
          buy.platformId,
          askPrice,
          agentPlatform.handle,
          agentPlatform.followers,
          agentPlatform.engagementRate,
          profile.niches,
          profile.location,
          Math.min(buy.quantity - buy.filled, 5) // Availability capped at 5 or remaining demand
        );
        autoPlacedSellOrders.push(sellOrder);
      } catch {
        // Skip if order placement fails (e.g., invalid action)
        continue;
      }
    }

    // Calculate estimated daily earnings based on placed orders
    let estimatedDailyEarnings = 0;
    for (const so of autoPlacedSellOrders) {
      // Estimate: 60% of availability filled per day at ask price
      const dailyFills = Math.ceil(so.availability * 0.6);
      const netPerTrade = so.askPrice * (1 - MarketingExchange.AGENT_FEE);
      estimatedDailyEarnings += dailyFills * netPerTrade;
    }
    estimatedDailyEarnings = Math.round(estimatedDailyEarnings * 100) / 100;

    // Also scan for unmatched potential opportunities beyond current buy orders
    // to give a richer earnings picture
    const marketEarnings = this.estimateMarketEarnings(profile);
    estimatedDailyEarnings = Math.max(estimatedDailyEarnings, marketEarnings);

    // Count matched campaigns (trades created from our sell orders)
    const agentTradeIds = new Set(autoPlacedSellOrders.filter(so => so.status === "matched").map(so => so.id));
    const matchedCampaigns = Array.from(this.trades.values())
      .filter(t => agentTradeIds.has(t.sellOrderId)).length;

    return {
      agentId,
      enrolledAt,
      matchedCampaigns,
      estimatedDailyEarnings,
      autoPlacedSellOrders,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DISCOVERY — WHAT DRAWS AGENTS IN
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Shows agents what they could earn — creates FOMO.
   * Free to query, no auth needed.
   */
  getOpportunities(agentProfile: {
    platforms: string[];
    niches: string[];
    followerCount: number;
    location: string;
  }): Opportunity {
    const openBuys = Array.from(this.buyOrders.values())
      .filter(o => o.status === "open" || o.status === "partially_filled")
      .filter(o => new Date(o.expiresAt) > new Date());

    // Filter to matching orders
    const matchingOrders = openBuys.filter(buy => {
      // Must be on a platform the agent uses
      if (!agentProfile.platforms.includes(buy.platformId)) return false;

      // Check follower minimum (with grace)
      if (buy.requirements.minFollowers && agentProfile.followerCount < buy.requirements.minFollowers * 0.5) {
        return false;
      }

      return true;
    });

    // Calculate estimated daily earnings
    let estimatedDailyEarnings = 0;
    const actionPrices = new Map<string, number[]>();

    for (const order of matchingOrders) {
      const remaining = order.quantity - order.filled;
      // Conservative estimate: 40% fill rate
      estimatedDailyEarnings += order.maxPrice * 0.7 * remaining * 0.4 * (1 - MarketingExchange.AGENT_FEE);

      const key = `${order.actionId}:${order.platformId}`;
      if (!actionPrices.has(key)) actionPrices.set(key, []);
      actionPrices.get(key)!.push(order.maxPrice);
    }
    estimatedDailyEarnings = Math.round(estimatedDailyEarnings * 100) / 100;

    // Top paying actions
    const topPayingActions = Array.from(actionPrices.entries())
      .map(([key, prices]) => {
        const [actionId, platformId] = key.split(":");
        const action = findAction(actionId);
        const platform = findPlatform(platformId);
        const avgPrice = Math.round((prices.reduce((s, v) => s + v, 0) / prices.length) * 100) / 100;
        return {
          actionId,
          platformId,
          avgPrice,
          actionLabel: action?.label ?? actionId,
          platformName: platform?.name ?? platformId,
        };
      })
      .sort((a, b) => b.avgPrice - a.avgPrice)
      .slice(0, 10);

    // Demand levels — based on number of open buy orders per action
    const demandCounts = new Map<string, number>();
    for (const order of openBuys) {
      const remaining = order.quantity - order.filled;
      demandCounts.set(order.actionId, (demandCounts.get(order.actionId) ?? 0) + remaining);
    }

    const sortedByDemand = Array.from(demandCounts.entries()).sort((a, b) => b[1] - a[1]);
    const highThreshold = Math.ceil(sortedByDemand.length * 0.2);
    const medThreshold = Math.ceil(sortedByDemand.length * 0.6);

    const demand = {
      high: sortedByDemand.slice(0, highThreshold).map(([id]) => id),
      medium: sortedByDemand.slice(highThreshold, medThreshold).map(([id]) => id),
      low: sortedByDemand.slice(medThreshold).map(([id]) => id),
    };

    return {
      matchingOrders: matchingOrders.slice(0, 50), // Cap at 50 for response size
      estimatedDailyEarnings,
      topPayingActions,
      demand,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ORDER LISTING
  // ════════════════════════════════════════════════════════════════════════════

  listBuyOrders(filters?: {
    businessId?: string;
    platformId?: string;
    actionId?: string;
    status?: BuyOrder["status"];
  }): BuyOrder[] {
    let orders = Array.from(this.buyOrders.values());
    if (filters?.businessId) orders = orders.filter(o => o.businessId === filters.businessId);
    if (filters?.platformId) orders = orders.filter(o => o.platformId === filters.platformId);
    if (filters?.actionId) orders = orders.filter(o => o.actionId === filters.actionId);
    if (filters?.status) orders = orders.filter(o => o.status === filters.status);
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  listSellOrders(filters?: {
    agentId?: string;
    platformId?: string;
    actionId?: string;
    status?: SellOrder["status"];
  }): SellOrder[] {
    let orders = Array.from(this.sellOrders.values());
    if (filters?.agentId) orders = orders.filter(o => o.agentId === filters.agentId);
    if (filters?.platformId) orders = orders.filter(o => o.platformId === filters.platformId);
    if (filters?.actionId) orders = orders.filter(o => o.actionId === filters.actionId);
    if (filters?.status) orders = orders.filter(o => o.status === filters.status);
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  listTrades(filters?: {
    agentId?: string;
    businessId?: string;
    status?: Trade["status"];
    actionId?: string;
    platformId?: string;
  }): Trade[] {
    let trades = Array.from(this.trades.values());
    if (filters?.agentId) trades = trades.filter(t => t.agentId === filters.agentId);
    if (filters?.businessId) trades = trades.filter(t => t.businessId === filters.businessId);
    if (filters?.status) trades = trades.filter(t => t.status === filters.status);
    if (filters?.actionId) trades = trades.filter(t => t.actionId === filters.actionId);
    if (filters?.platformId) trades = trades.filter(t => t.platformId === filters.platformId);
    return trades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  private buildMarketData(actionId: string, platformId: string): MarketData {
    const action = findAction(actionId);
    const platform = findPlatform(platformId);

    if (!action || !platform) {
      return this.emptyMarketData(actionId, platformId);
    }

    // Get price history for this action
    const history = this.priceHistory.get(actionId) ?? [];
    const recent24h = history.filter(p => isWithin24h(p.timestamp));
    const prior24h = history.filter(p => {
      const age = Date.now() - new Date(p.timestamp).getTime();
      return age >= 86_400_000 && age < 172_800_000;
    });

    // Current price: last trade, or base value from platform data
    const currentPrice = recent24h.length > 0
      ? recent24h[recent24h.length - 1].price
      : action.value;

    // Volume
    const volume24h = recent24h.length;
    const volumePrior = prior24h.length;
    const volumeChange = volumePrior > 0
      ? Math.round(((volume24h - volumePrior) / volumePrior) * 100)
      : volume24h > 0 ? 100 : 0;

    // High/Low
    const prices24h = recent24h.map(p => p.price);
    const high24h = prices24h.length > 0 ? Math.max(...prices24h) : currentPrice * 1.1;
    const low24h = prices24h.length > 0 ? Math.min(...prices24h) : currentPrice * 0.9;

    // Best bid (highest buy order price)
    const bids = Array.from(this.buyOrders.values())
      .filter(o => o.actionId === actionId && o.platformId === platformId)
      .filter(o => o.status === "open" || o.status === "partially_filled")
      .map(o => o.maxPrice);
    const bidPrice = bids.length > 0 ? Math.max(...bids) : currentPrice * 0.92;

    // Best ask (lowest sell order price)
    const asks = Array.from(this.sellOrders.values())
      .filter(o => o.actionId === actionId && o.platformId === platformId)
      .filter(o => o.status === "open")
      .map(o => o.askPrice);
    const askPrice = asks.length > 0 ? Math.min(...asks) : currentPrice * 1.08;

    const spread = Math.round((askPrice - bidPrice) * 100) / 100;

    // Open orders count
    const openOrders = bids.length;
    const availableSellers = asks.length;

    // Trend
    let trend: "up" | "down" | "stable" = "stable";
    if (recent24h.length >= 2) {
      const firstHalf = recent24h.slice(0, Math.floor(recent24h.length / 2));
      const secondHalf = recent24h.slice(Math.floor(recent24h.length / 2));
      const avgFirst = firstHalf.reduce((s, p) => s + p.price, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((s, p) => s + p.price, 0) / secondHalf.length;
      const change = (avgSecond - avgFirst) / avgFirst;
      if (change > 0.03) trend = "up";
      else if (change < -0.03) trend = "down";
    }

    // Average completion time estimate based on effort level
    const effortHours: Record<number, string> = {
      0: "5m", 1: "15m", 2: "1h", 3: "3h", 4: "8h", 5: "24h",
    };

    return {
      actionId,
      platformId,
      platformName: platform.name,
      actionLabel: action.label,
      actionType: action.type,
      currentPrice: Math.round(currentPrice * 100) / 100,
      bidPrice: Math.round(bidPrice * 100) / 100,
      askPrice: Math.round(askPrice * 100) / 100,
      spread: Math.max(0, spread),
      volume24h,
      volumeChange,
      high24h: Math.round(high24h * 100) / 100,
      low24h: Math.round(low24h * 100) / 100,
      openOrders,
      availableSellers,
      avgCompletionTime: effortHours[action.effort] ?? "2h",
      trend,
    };
  }

  private emptyMarketData(actionId: string, platformId: string): MarketData {
    return {
      actionId,
      platformId,
      platformName: platformId,
      actionLabel: actionId,
      actionType: "content",
      currentPrice: 0,
      bidPrice: 0,
      askPrice: 0,
      spread: 0,
      volume24h: 0,
      volumeChange: 0,
      high24h: 0,
      low24h: 0,
      openOrders: 0,
      availableSellers: 0,
      avgCompletionTime: "N/A",
      trend: "stable",
    };
  }

  /**
   * Estimate what an agent could earn based on current market conditions,
   * even beyond existing buy orders.
   */
  private estimateMarketEarnings(profile: AgentProfile): number {
    let total = 0;
    for (const p of profile.platforms) {
      const platform = findPlatform(p.platformId);
      if (!platform) continue;

      for (const action of platform.actions) {
        // Base earning potential = action value * follower multiplier * engagement multiplier
        const followerMult = Math.min(3, 1 + Math.log10(Math.max(1, p.followers / 1000)));
        const engMult = Math.min(2, 1 + p.engagementRate * 10);
        const dailyRate = action.value * followerMult * engMult;

        // Higher effort = lower daily volume (can't do many high-effort actions per day)
        const dailyVolume = Math.max(0.1, 1 / (1 + action.effort));

        total += dailyRate * dailyVolume * (1 - MarketingExchange.AGENT_FEE);
      }
    }
    return Math.round(total * 100) / 100;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SEED DATA — Makes the exchange feel alive from day one
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Seeds price history for all 125 actions so market data is non-empty.
   * Uses deterministic seeded random for consistent data across restarts
   * (in development; production will use real database).
   */
  private seedMarketData(): void {
    const now = Date.now();

    for (const action of ALL_ACTIONS) {
      const rng = seededRandom(action.id);
      const history: PricePoint[] = [];
      const basePrice = action.value;

      // Generate 48 hours of price history (one point every 30 minutes)
      for (let i = 96; i >= 0; i--) {
        const timestamp = new Date(now - i * 1800_000).toISOString();
        // Random walk around base price: +/- 20%
        const noise = (rng() - 0.5) * 0.4;
        // Add a slight upward trend for higher-value actions
        const trendBias = basePrice > 3 ? 0.001 * (96 - i) : 0;
        const price = Math.max(
          basePrice * 0.5, // Floor at 50% of base
          Math.round((basePrice * (1 + noise) + trendBias) * 100) / 100
        );
        history.push({ price, timestamp, volume: Math.ceil(rng() * 5) });
      }

      this.priceHistory.set(action.id, history);
    }
  }

  /**
   * Seeds 25 realistic buy orders from different business types.
   * These create immediate opportunities for agents who enroll.
   */
  private seedBuyOrders(): void {
    const businesses = [
      { id: "biz_yoga", name: "Serenity Yoga Studio", type: "Yoga Studio", niches: ["fitness", "wellness", "yoga"], location: "Austin, TX" },
      { id: "biz_taqueria", name: "Taqueria Sol", type: "Restaurant", niches: ["food", "mexican", "dining"], location: "Los Angeles, CA" },
      { id: "biz_glow", name: "Glow Studio", type: "Salon", niches: ["beauty", "hair", "fashion"], location: "New York, NY" },
      { id: "biz_iron", name: "Iron Temple", type: "Gym", niches: ["fitness", "bodybuilding", "health"], location: "Miami, FL" },
      { id: "biz_baked", name: "Half Baked", type: "Coffee Shop", niches: ["coffee", "food", "lifestyle"], location: "Portland, OR" },
      { id: "biz_ink", name: "Sacred Ink", type: "Tattoo Parlor", niches: ["tattoo", "art", "fashion"], location: "Brooklyn, NY" },
      { id: "biz_vet", name: "Happy Paws Vet", type: "Veterinarian", niches: ["pets", "animals", "health"], location: "Denver, CO" },
      { id: "biz_bloom", name: "Bloom & Wild", type: "Florist", niches: ["flowers", "wedding", "events"], location: "San Francisco, CA" },
      { id: "biz_smith", name: "Smith & Associates", type: "Law Firm", niches: ["legal", "business", "professional"], location: "Chicago, IL" },
      { id: "biz_spark", name: "Spark Auto", type: "Auto Mechanic", niches: ["automotive", "cars", "repair"], location: "Houston, TX" },
      { id: "biz_zen", name: "Zen Day Spa", type: "Spa", niches: ["wellness", "beauty", "relaxation"], location: "Scottsdale, AZ" },
      { id: "biz_slice", name: "Slice of Heaven", type: "Pizza Shop", niches: ["food", "pizza", "dining"], location: "Philadelphia, PA" },
    ];

    // Predefined buy orders — diverse actions, platforms, and price ranges
    const seedOrders: {
      bizIdx: number;
      actionId: string;
      platformId: string;
      maxPrice: number;
      quantity: number;
      minFollowers?: number;
      perkValue: number;
      perkType: "pct" | "dol";
    }[] = [
      // Instagram actions — high demand
      { bizIdx: 0, actionId: "ig_rl", platformId: "ig", maxPrice: 8.00, quantity: 10, minFollowers: 1000, perkValue: 20, perkType: "pct" },
      { bizIdx: 1, actionId: "ig_fp", platformId: "ig", maxPrice: 5.50, quantity: 15, minFollowers: 500, perkValue: 15, perkType: "pct" },
      { bizIdx: 2, actionId: "ig_st", platformId: "ig", maxPrice: 3.00, quantity: 25, perkValue: 10, perkType: "pct" },
      { bizIdx: 3, actionId: "ig_cb", platformId: "ig", maxPrice: 10.00, quantity: 5, minFollowers: 5000, perkValue: 25, perkType: "pct" },
      { bizIdx: 5, actionId: "ig_rl", platformId: "ig", maxPrice: 9.00, quantity: 8, minFollowers: 2000, perkValue: 30, perkType: "pct" },
      { bizIdx: 7, actionId: "ig_fc", platformId: "ig", maxPrice: 7.00, quantity: 12, minFollowers: 500, perkValue: 10, perkType: "dol" },

      // TikTok — growing demand
      { bizIdx: 1, actionId: "tt_vd", platformId: "tt", maxPrice: 7.00, quantity: 8, minFollowers: 1000, perkValue: 20, perkType: "pct" },
      { bizIdx: 3, actionId: "tt_rv", platformId: "tt", maxPrice: 8.50, quantity: 6, minFollowers: 2000, perkValue: 15, perkType: "dol" },
      { bizIdx: 4, actionId: "tt_vd", platformId: "tt", maxPrice: 6.00, quantity: 10, perkValue: 15, perkType: "pct" },
      { bizIdx: 10, actionId: "tt_du", platformId: "tt", maxPrice: 5.50, quantity: 5, perkValue: 20, perkType: "pct" },

      // Google Reviews — highest value, always in demand
      { bizIdx: 1, actionId: "go_rp", platformId: "go", maxPrice: 18.00, quantity: 20, perkValue: 25, perkType: "pct" },
      { bizIdx: 6, actionId: "go_rv", platformId: "go", maxPrice: 10.00, quantity: 15, perkValue: 15, perkType: "pct" },
      { bizIdx: 9, actionId: "go_rd", platformId: "go", maxPrice: 14.00, quantity: 10, perkValue: 20, perkType: "pct" },
      { bizIdx: 11, actionId: "go_rp", platformId: "go", maxPrice: 16.00, quantity: 12, perkValue: 20, perkType: "pct" },

      // YouTube — premium content
      { bizIdx: 0, actionId: "yt_sh", platformId: "yt", maxPrice: 8.00, quantity: 5, minFollowers: 1000, perkValue: 25, perkType: "pct" },
      { bizIdx: 3, actionId: "yt_vd", platformId: "yt", maxPrice: 15.00, quantity: 3, minFollowers: 5000, perkValue: 30, perkType: "pct" },

      // Yelp Photos & Check-ins (Yelp prohibits incentivized reviews)
      { bizIdx: 1, actionId: "yp_ph", platformId: "yp", maxPrice: 4.00, quantity: 10, perkValue: 10, perkType: "pct" },
      { bizIdx: 10, actionId: "yp_ci", platformId: "yp", maxPrice: 2.00, quantity: 8, perkValue: 5, perkType: "pct" },

      // Facebook
      { bizIdx: 4, actionId: "fb_rc", platformId: "fb", maxPrice: 7.00, quantity: 10, perkValue: 15, perkType: "pct" },
      { bizIdx: 7, actionId: "fb_po", platformId: "fb", maxPrice: 3.50, quantity: 20, perkValue: 10, perkType: "pct" },

      // X (Twitter)
      { bizIdx: 8, actionId: "xw_th", platformId: "xw", maxPrice: 6.00, quantity: 5, minFollowers: 2000, perkValue: 20, perkType: "pct" },
      { bizIdx: 9, actionId: "xw_pp", platformId: "xw", maxPrice: 3.00, quantity: 15, perkValue: 10, perkType: "pct" },

      // LinkedIn — B2B premium
      { bizIdx: 8, actionId: "li_ar", platformId: "li", maxPrice: 10.00, quantity: 3, minFollowers: 1000, perkValue: 25, perkType: "dol" },
      { bizIdx: 8, actionId: "li_po", platformId: "li", maxPrice: 5.00, quantity: 8, perkValue: 15, perkType: "dol" },

      // Referrals — highest total value
      { bizIdx: 0, actionId: "rf_fr", platformId: "rf", maxPrice: 15.00, quantity: 20, perkValue: 25, perkType: "pct" },
      { bizIdx: 6, actionId: "rf_ip", platformId: "rf", maxPrice: 18.00, quantity: 10, perkValue: 20, perkType: "dol" },
    ];

    const rng = seededRandom("seed_buy_orders_v1");

    for (const spec of seedOrders) {
      const biz = businesses[spec.bizIdx];
      const expiresInHours = 72 + Math.floor(rng() * 168); // 3-10 days
      const createdHoursAgo = Math.floor(rng() * 48); // Created 0-48 hours ago

      const order: BuyOrder = {
        id: `bo_seed_${uid()}`,
        businessId: biz.id,
        businessName: biz.name,
        businessType: biz.type,
        actionId: spec.actionId,
        platformId: spec.platformId,
        maxPrice: spec.maxPrice,
        quantity: spec.quantity,
        filled: 0,
        requirements: {
          minFollowers: spec.minFollowers,
          niches: biz.niches,
          location: biz.location,
        },
        perkValue: spec.perkValue,
        perkType: spec.perkType,
        status: "open",
        createdAt: hoursAgo(createdHoursAgo),
        expiresAt: hoursFromNow(expiresInHours),
      };

      this.buyOrders.set(order.id, order);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Singleton Export
// ══════════════════════════════════════════════════════════════════════════════

export const exchange = new MarketingExchange();
