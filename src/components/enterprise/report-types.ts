// ═══════════════ Report Types ═══════════════

export interface DateRange {
  start: string;
  end: string;
}

export interface ReportMetric {
  label: string;
  value: number;
  formattedValue: string;
  change: number;
  changeLabel: string;
}

export interface CampaignPerformance {
  id: string;
  name: string;
  location: string;
  platform: string;
  platformIcon: string;
  completions: number;
  impressions: number;
  conversions: number;
  marketingValue: number;
  roi: number;
}

export interface LocationComparison {
  id: string;
  name: string;
  campaigns: number;
  completions: number;
  reviews: number;
  marketingValue: number;
  roi: number;
}

export interface PlatformBreakdown {
  platform: string;
  platformIcon: string;
  campaigns: number;
  completions: number;
  marketingValue: number;
  share: number;
}

export interface ReportData {
  metrics: ReportMetric[];
  campaignPerformance: CampaignPerformance[];
  locationComparison: LocationComparison[];
  platformBreakdown: PlatformBreakdown[];
}

export interface ReportsProps {
  reportData: ReportData;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export type ReportType = "campaigns" | "locations" | "roi" | "platforms";

export const REPORT_TYPES: { id: ReportType; label: string; icon: string }[] = [
  { id: "campaigns", label: "Campaign Performance", icon: "📊" },
  { id: "locations", label: "Location Comparison", icon: "📍" },
  { id: "roi", label: "ROI Analysis", icon: "💰" },
  { id: "platforms", label: "Platform Breakdown", icon: "🌐" },
];

export const PRESET_RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
];
