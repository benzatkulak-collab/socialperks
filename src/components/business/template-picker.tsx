"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAllCompliantTemplates,
  INDUSTRY_MAP,
  getTemplatesByIndustry,
  getPopularTemplates,
  type CampaignTemplate,
} from "@/lib/campaign-templates";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TemplatePickerProps {
  businessType: string;
  onSelectTemplate: (template: CampaignTemplate) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DIFFICULTY_META: Record<string, { label: string; color: "green" | "amber" | "red" }> = {
  easy: { label: "Easy", color: "green" },
  medium: { label: "Medium", color: "amber" },
  hard: { label: "Hard", color: "red" },
};

const PLATFORM_FILTERS = [
  { id: "all", label: "All Platforms" },
  { id: "go", label: "Google", icon: "⭐" },
  { id: "ig", label: "Instagram", icon: "📸" },
  { id: "tt", label: "TikTok", icon: "🎬" },
  { id: "fb", label: "Facebook", icon: "👍" },
  { id: "yp", label: "Yelp", icon: "🔴" },
  { id: "ta", label: "TripAdvisor", icon: "🦉" },
  { id: "pi", label: "Pinterest", icon: "📌" },
];

const DIFFICULTY_FILTERS = [
  { id: "all", label: "Any Difficulty" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Map the business "type" string (e.g. "Yoga Studio", "Restaurant", "Salon")
 * to one of our template industry slugs.
 */
function resolveIndustry(businessType: string): string | null {
  const normalized = businessType.toLowerCase().trim();

  const directMap: Record<string, string> = {
    restaurant: "restaurant",
    cafe: "coffee_shop",
    "coffee shop": "coffee_shop",
    coffeeshop: "coffee_shop",
    salon: "salon",
    barbershop: "salon",
    "hair salon": "salon",
    gym: "gym",
    fitness: "gym",
    "fitness center": "gym",
    "yoga studio": "yoga_studio",
    yoga: "yoga_studio",
    dentist: "dentist",
    doctor: "dentist",
    "dental practice": "dentist",
    veterinarian: "veterinarian",
    vet: "veterinarian",
    "auto repair": "auto_repair",
    "auto mechanic": "auto_repair",
    "auto shop": "auto_repair",
    retail: "retail",
    boutique: "retail",
    shop: "retail",
    hotel: "hotel",
    "bed and breakfast": "hotel",
    bnb: "hotel",
    bakery: "bakery",
    brewery: "brewery",
    taproom: "brewery",
    florist: "retail",
    "pizza chain": "restaurant",
    pizzeria: "restaurant",
    "gym chain": "gym",
  };

  if (directMap[normalized]) return directMap[normalized];

  // Partial match fallback
  for (const [keyword, slug] of Object.entries(directMap)) {
    if (normalized.includes(keyword)) return slug;
  }

  return null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TemplatePicker({ businessType, onSelectTemplate }: TemplatePickerProps) {
  const [platformFilter, setPlatformFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const resolvedIndustry = useMemo(() => resolveIndustry(businessType), [businessType]);

  const industryTemplates = useMemo(() => {
    if (!resolvedIndustry) return [];
    return getTemplatesByIndustry(resolvedIndustry);
  }, [resolvedIndustry]);

  const popularTemplates = useMemo(() => getPopularTemplates(6), []);

  // Which templates to display
  const baseTemplates = useMemo(() => {
    if (showAll) return getAllCompliantTemplates();
    if (industryTemplates.length > 0) return industryTemplates;
    return popularTemplates;
  }, [showAll, industryTemplates, popularTemplates]);

  // Apply filters
  const filteredTemplates = useMemo(() => {
    let result = baseTemplates;
    if (platformFilter !== "all") {
      result = result.filter((t) => t.platform === platformFilter);
    }
    if (difficultyFilter !== "all") {
      result = result.filter((t) => t.difficulty === difficultyFilter);
    }
    return result;
  }, [baseTemplates, platformFilter, difficultyFilter]);

  const industryLabel = resolvedIndustry
    ? INDUSTRY_MAP[resolvedIndustry]
    : null;

  // Collect only platforms that appear in current templates for filter display
  const availablePlatforms = useMemo(() => {
    const ids = new Set(baseTemplates.map((t) => t.platform));
    return PLATFORM_FILTERS.filter((p) => p.id === "all" || ids.has(p.id));
  }, [baseTemplates]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-brand-dim">
            {showAll
              ? "All Campaign Templates"
              : industryLabel
                ? `Templates for ${industryLabel}`
                : "Popular Templates"}
          </h2>
          <p className="text-3xs text-brand-muted mt-0.5">
            Proven campaigns you can launch in one click
          </p>
        </div>
        {!showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-xs text-brand-cyan hover:text-brand-white transition-colors py-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
          >
            View all
          </button>
        )}
        {showAll && resolvedIndustry && (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="text-xs text-brand-cyan hover:text-brand-white transition-colors py-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
          >
            Show my industry
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Platform filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {availablePlatforms.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatformFilter(p.id)}
              className={`px-2.5 py-1 rounded-full text-3xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                platformFilter === p.id
                  ? "bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30"
                  : "bg-brand-surface/50 text-brand-muted border border-brand-border hover:text-brand-white hover:border-brand-border-hover"
              }`}
            >
              {"icon" in p && p.icon ? `${p.icon} ` : ""}{p.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-brand-border self-center" />

        {/* Difficulty filter */}
        <div className="flex items-center gap-1">
          {DIFFICULTY_FILTERS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDifficultyFilter(d.id)}
              className={`px-2.5 py-1 rounded-full text-3xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                difficultyFilter === d.id
                  ? "bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30"
                  : "bg-brand-surface/50 text-brand-muted border border-brand-border hover:text-brand-white hover:border-brand-border-hover"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTemplates.map((tpl) => {
            const diffMeta = DIFFICULTY_META[tpl.difficulty];
            return (
              <Card
                key={tpl.id}
                hoverable
                padding="sm"
                className="flex flex-col"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xl">{tpl.icon}</span>
                  <Badge color={diffMeta.color} size="sm">
                    {diffMeta.label}
                  </Badge>
                </div>

                <p className="text-xs font-semibold text-brand-white leading-tight">
                  {tpl.name}
                </p>

                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge color="muted" size="sm" variant="outline">
                    {tpl.platformName}
                  </Badge>
                  <Badge color="muted" size="sm" variant="outline">
                    {tpl.actionLabel}
                  </Badge>
                </div>

                <p className="text-3xs text-brand-muted mt-2 line-clamp-2 flex-1">
                  {tpl.description}
                </p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-brand-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-3xs text-brand-dim">
                      {tpl.discountType === "pct" ? `${tpl.discountValue}% off` : `$${tpl.discountValue} off`}
                    </span>
                    <span className="text-3xs text-brand-green font-semibold font-mono">
                      ~{tpl.estimatedRoi} ROI
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectTemplate(tpl)}
                    className="px-2.5 py-1 rounded-md text-3xs font-semibold bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                  >
                    Use Template
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-8 bg-brand-surface/30">
          <p className="text-sm text-brand-dim">No templates match your filters.</p>
          <p className="text-xs text-brand-muted mt-1">Try adjusting the platform or difficulty filter.</p>
        </Card>
      )}
    </div>
  );
}
