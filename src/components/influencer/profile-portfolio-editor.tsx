"use client";

import { useState, useCallback } from "react";
import type { PortfolioItem } from "./profile-editor";

// ═══════════════ Constants ═══════════════

const AVAILABLE_PLATFORMS = [
  { id: "ig", name: "Instagram", icon: "📸" },
  { id: "tt", name: "TikTok", icon: "🎬" },
  { id: "yt", name: "YouTube", icon: "📺" },
  { id: "xw", name: "X", icon: "✍️" },
  { id: "fb", name: "Facebook", icon: "👍" },
  { id: "li", name: "LinkedIn", icon: "💼" },
  { id: "pi", name: "Pinterest", icon: "📌" },
  { id: "th", name: "Threads", icon: "🧵" },
  { id: "sc", name: "Snapchat", icon: "👻" },
  { id: "rd", name: "Reddit", icon: "🤖" },
];

// ═══════════════ Component ═══════════════

interface ProfilePortfolioEditorProps {
  portfolio: PortfolioItem[];
  onAddItem: (item: PortfolioItem) => void;
  onRemoveItem: (id: string) => void;
}

export function ProfilePortfolioEditor({ portfolio, onAddItem, onRemoveItem }: ProfilePortfolioEditorProps) {
  const [newPortfolioUrl, setNewPortfolioUrl] = useState("");
  const [newPortfolioTitle, setNewPortfolioTitle] = useState("");
  const [newPortfolioPlatform, setNewPortfolioPlatform] = useState("");

  const handleAddItem = useCallback(() => {
    if (!newPortfolioUrl || !newPortfolioTitle) return;
    const item: PortfolioItem = {
      id: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      url: newPortfolioUrl,
      title: newPortfolioTitle,
      platform: newPortfolioPlatform || "Other",
    };
    onAddItem(item);
    setNewPortfolioUrl("");
    setNewPortfolioTitle("");
    setNewPortfolioPlatform("");
  }, [newPortfolioUrl, newPortfolioTitle, newPortfolioPlatform, onAddItem]);

  return (
    <div className="space-y-6 rounded-xl border border-brand-border bg-brand-surface p-6">
      <div>
        <h2 className="font-heading text-xl italic text-brand-white">Portfolio</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Add links to your best content to showcase your work to businesses.
        </p>
      </div>

      {/* Existing Items */}
      {portfolio.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {portfolio.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-bg p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-text">{item.title}</p>
                <p className="truncate text-xs text-brand-muted">{item.platform} &middot; {item.url}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                className="ml-2 shrink-0 text-xs text-brand-muted transition-colors hover:text-brand-red"
                aria-label={`Remove ${item.title}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New */}
      <div className="rounded-lg border border-dashed border-brand-border bg-brand-bg/50 p-4">
        <h3 className="text-sm font-medium text-brand-text">Add Content</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            type="text"
            value={newPortfolioTitle}
            onChange={(e) => setNewPortfolioTitle(e.target.value)}
            className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
            placeholder="Title"
            aria-label="Content title"
          />
          <input
            type="url"
            value={newPortfolioUrl}
            onChange={(e) => setNewPortfolioUrl(e.target.value)}
            className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
            placeholder="https://..."
            aria-label="Content URL"
          />
          <div className="flex gap-2">
            <select
              value={newPortfolioPlatform}
              onChange={(e) => setNewPortfolioPlatform(e.target.value)}
              className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              aria-label="Content platform"
            >
              <option value="">Platform</option>
              {AVAILABLE_PLATFORMS.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!newPortfolioUrl || !newPortfolioTitle}
              className="shrink-0 rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
