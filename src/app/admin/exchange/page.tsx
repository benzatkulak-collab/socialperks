"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";

interface Order {
  id: string;
  side: "buy" | "sell";
  status: string;
  platformId?: string;
  actionId?: string;
  businessId?: string;
  agentId?: string;
  quantity?: number;
  pricePerUnit?: number;
  createdAt?: string;
}

interface Trade {
  id: string;
  status: string;
  buyerId?: string;
  sellerId?: string;
  amount?: number;
  createdAt?: string;
}

interface MarketStats {
  totalVolume?: number;
  activeOrders?: number;
  activeTrades?: number;
  topMovers?: Array<{ platformId: string; volume: number; price?: number }>;
}

type Tab = "orders" | "trades" | "market";

export default function AdminExchangePage() {
  const [tab, setTab] = useState<Tab>("market");
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [market, setMarket] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [oRes, tRes, mRes] = await Promise.allSettled([
      fetch("/api/v1/exchange/orders?perPage=50", { credentials: "include" }),
      fetch("/api/v1/exchange/trades?perPage=50", { credentials: "include" }),
      fetch("/api/v1/exchange/market", { credentials: "include" }),
    ]);
    if (oRes.status === "fulfilled" && oRes.value.ok) {
      const j = await oRes.value.json();
      if (j.success) setOrders(j.data?.orders ?? []);
    }
    if (tRes.status === "fulfilled" && tRes.value.ok) {
      const j = await tRes.value.json();
      if (j.success) setTrades(j.data?.trades ?? []);
    }
    if (mRes.status === "fulfilled" && mRes.value.ok) {
      const j = await mRes.value.json();
      if (j.success) setMarket(j.data?.data ?? j.data ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    orders: orders.length,
    buys: orders.filter((o) => o.side === "buy").length,
    sells: orders.filter((o) => o.side === "sell").length,
    trades: trades.length,
  };

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Exchange"
        description="Market activity: orders, trades, depth"
        actions={<Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card padding="sm" borderColor="cyan">
          <Stat value={stats.orders} label="Open orders" color="cyan" size="sm" />
        </Card>
        <Card padding="sm" borderColor="green">
          <Stat value={stats.buys} label="Buy orders" color="green" size="sm" />
        </Card>
        <Card padding="sm" borderColor="amber">
          <Stat value={stats.sells} label="Sell orders" color="amber" size="sm" />
        </Card>
        <Card padding="sm" borderColor="purple">
          <Stat value={stats.trades} label="Trades" color="purple" size="sm" />
        </Card>
      </div>

      <div className="flex gap-1 mb-4">
        {(["market", "orders", "trades"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-xs font-mono transition-colors ${
              tab === t
                ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40"
                : "bg-brand-surface/50 text-brand-dim hover:text-brand-text border border-brand-border"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && <Skeleton width="w-full" height="h-32" />}

      {!loading && tab === "market" && (
        <Card padding="md">
          {market ? (
            <pre className="text-xs text-brand-dim font-mono overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(market, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-brand-muted">No market data available.</p>
          )}
        </Card>
      )}

      {!loading && tab === "orders" && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                  <th className="text-left px-4 py-3">Order</th>
                  <th className="text-left px-4 py-3">Side</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Platform / Action</th>
                  <th className="text-left px-4 py-3">Qty</th>
                  <th className="text-left px-4 py-3">Price</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-muted text-sm">No orders.</td></tr>
                )}
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-brand-border/50 hover:bg-brand-surface/30 cursor-pointer"
                    onClick={() => setSelectedOrder(o)}
                  >
                    <td className="px-4 py-3 text-xs text-brand-text font-mono">{o.id.slice(0, 16)}…</td>
                    <td className="px-4 py-3">
                      <Badge color={o.side === "buy" ? "green" : "amber"} size="sm">{o.side}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-text font-mono">{o.status}</td>
                    <td className="px-4 py-3 text-xs text-brand-dim font-mono">{o.platformId ?? "—"} / {o.actionId ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-brand-text font-mono">{o.quantity ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-brand-text font-mono">
                      {o.pricePerUnit !== undefined ? `$${(o.pricePerUnit / 100).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && tab === "trades" && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                  <th className="text-left px-4 py-3">Trade</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Buyer</th>
                  <th className="text-left px-4 py-3">Seller</th>
                  <th className="text-left px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-muted text-sm">No trades.</td></tr>
                )}
                {trades.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-brand-border/50 hover:bg-brand-surface/30 cursor-pointer"
                    onClick={() => setSelectedTrade(t)}
                  >
                    <td className="px-4 py-3 text-xs text-brand-text font-mono">{t.id.slice(0, 16)}…</td>
                    <td className="px-4 py-3 text-xs text-brand-text font-mono">{t.status}</td>
                    <td className="px-4 py-3 text-2xs text-brand-dim font-mono">{(t.buyerId ?? "—").slice(0, 16)}…</td>
                    <td className="px-4 py-3 text-2xs text-brand-dim font-mono">{(t.sellerId ?? "—").slice(0, 16)}…</td>
                    <td className="px-4 py-3 text-xs text-brand-text font-mono">
                      {t.amount !== undefined ? `$${(t.amount / 100).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {selectedOrder && <RecordDrawer title="Order" data={selectedOrder as unknown as Record<string, unknown>} onClose={() => setSelectedOrder(null)} />}
      {selectedTrade && <RecordDrawer title="Trade" data={selectedTrade as unknown as Record<string, unknown>} onClose={() => setSelectedTrade(null)} />}
    </AdminPageContainer>
  );
}

function RecordDrawer({ title, data, onClose }: { title: string; data: Record<string, unknown>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-brand-bg border-l border-brand-border overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-heading text-lg text-brand-white italic">{title}</h2>
            <p className="text-xs text-brand-muted font-mono truncate">{String(data.id ?? "")}</p>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5">
          <pre className="text-xs font-mono text-brand-dim whitespace-pre-wrap break-words bg-brand-surface/30 p-3 rounded-md border border-brand-border">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
