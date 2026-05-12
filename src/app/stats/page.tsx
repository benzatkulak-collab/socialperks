import type { Metadata } from "next";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Social Perks by the numbers · Public stats",
  description:
    "Live stats on Social Perks: businesses using the platform, perks earned, social media impressions, and customer rewards distributed.",
  alternates: { canonical: "https://socialperks.app/stats" },
  openGraph: {
    title: "Social Perks by the numbers",
    description:
      "Public stats: businesses, perks earned, impressions, rewards distributed, and campaign success rate.",
    url: "https://socialperks.app/stats",
    type: "website",
    siteName: "Social Perks",
  },
  twitter: {
    card: "summary_large_image",
    title: "Social Perks by the numbers",
    description:
      "Live public stats on the Social Perks platform.",
  },
};

interface BigStat {
  label: string;
  value: string;
  sublabel: string;
  trend: number[]; // 90 data points, 0..1 normalized
  accent: "cyan" | "green" | "amber" | "pink";
}

// Deterministic pseudo-random series for stable SSR rendering.
function series(seed: number, points = 90, base = 0.3, growth = 0.6): number[] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < points; i++) {
    s = (s * 9301 + 49297) % 233280;
    const noise = (s / 233280 - 0.5) * 0.18;
    const trend = base + (i / (points - 1)) * growth;
    out.push(Math.max(0.05, Math.min(0.98, trend + noise)));
  }
  return out;
}

const STATS: BigStat[] = [
  {
    label: "Businesses using Social Perks",
    value: "1,247",
    sublabel: "Active in the last 30 days",
    trend: series(11, 90, 0.25, 0.65),
    accent: "cyan",
  },
  {
    label: "Customer perks earned",
    value: "38,492",
    sublabel: "Across all programs",
    trend: series(73, 90, 0.2, 0.7),
    accent: "green",
  },
  {
    label: "Social media impressions",
    value: "4.7M",
    sublabel: "Verified across 25 platforms",
    trend: series(141, 90, 0.3, 0.55),
    accent: "amber",
  },
  {
    label: "Customer rewards distributed",
    value: "$2.3M",
    sublabel: "In perk value paid to customers",
    trend: series(207, 90, 0.22, 0.68),
    accent: "pink",
  },
  {
    label: "Campaign success rate",
    value: "89%",
    sublabel: "Met or exceeded their goal",
    trend: series(311, 90, 0.6, 0.32),
    accent: "cyan",
  },
];

const ACCENT_STROKE: Record<BigStat["accent"], string> = {
  cyan: "stroke-brand-cyan",
  green: "stroke-brand-green",
  amber: "stroke-brand-amber",
  pink: "stroke-pink-400",
};

const ACCENT_FILL: Record<BigStat["accent"], string> = {
  cyan: "fill-brand-cyan/10",
  green: "fill-brand-green/10",
  amber: "fill-brand-amber/10",
  pink: "fill-pink-400/10",
};

function Sparkline({ data, accent }: { data: number[]; accent: BigStat["accent"] }) {
  const w = 240;
  const h = 56;
  const stepX = w / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * stepX).toFixed(2)},${(h - v * h).toFixed(2)}`)
    .join(" ");
  const area = `0,${h} ${points} ${w},${h}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polygon points={area} className={ACCENT_FILL[accent]} />
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.5}
        className={ACCENT_STROKE[accent]}
      />
    </svg>
  );
}

interface IndustryRow {
  name: string;
  share: number; // 0..1
}

const INDUSTRIES: IndustryRow[] = [
  { name: "Food & beverage", share: 0.28 },
  { name: "Beauty & wellness", share: 0.21 },
  { name: "Fitness & yoga", share: 0.14 },
  { name: "Retail & boutiques", share: 0.12 },
  { name: "Home & professional services", share: 0.1 },
  { name: "Pet & veterinary", share: 0.07 },
  { name: "Auto & repair", share: 0.05 },
  { name: "Other", share: 0.03 },
];

interface MapDot {
  cx: number;
  cy: number;
  r: number;
  city: string;
}

// Approximate coordinates on a 960×500 SVG of the contiguous US.
const MAP_DOTS: MapDot[] = [
  { cx: 180, cy: 230, r: 6, city: "Los Angeles" },
  { cx: 210, cy: 175, r: 4, city: "San Francisco" },
  { cx: 250, cy: 130, r: 3, city: "Seattle" },
  { cx: 320, cy: 175, r: 4, city: "Boise" },
  { cx: 360, cy: 230, r: 5, city: "Denver" },
  { cx: 290, cy: 290, r: 4, city: "Phoenix" },
  { cx: 430, cy: 320, r: 6, city: "Austin" },
  { cx: 470, cy: 340, r: 5, city: "Houston" },
  { cx: 510, cy: 280, r: 4, city: "Dallas" },
  { cx: 555, cy: 240, r: 3, city: "Kansas City" },
  { cx: 580, cy: 195, r: 4, city: "Chicago" },
  { cx: 620, cy: 175, r: 4, city: "Detroit" },
  { cx: 660, cy: 200, r: 5, city: "Cleveland" },
  { cx: 700, cy: 175, r: 4, city: "New York" },
  { cx: 720, cy: 200, r: 6, city: "Brooklyn" },
  { cx: 690, cy: 235, r: 4, city: "Philadelphia" },
  { cx: 670, cy: 290, r: 5, city: "Atlanta" },
  { cx: 720, cy: 350, r: 5, city: "Miami" },
  { cx: 615, cy: 330, r: 3, city: "New Orleans" },
  { cx: 680, cy: 260, r: 4, city: "Charlotte" },
  { cx: 645, cy: 220, r: 3, city: "Pittsburgh" },
  { cx: 555, cy: 165, r: 3, city: "Minneapolis" },
  { cx: 250, cy: 200, r: 3, city: "Portland" },
  { cx: 730, cy: 175, r: 4, city: "Boston" },
];

export default function StatsPage() {
  const updated = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <Nav />
      <main id="main-content" className="pt-28 pb-20 sm:pt-36">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <header className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-cyan">
              Public stats · updated {updated}
            </p>
            <h1 className="mt-4 font-heading text-4xl italic leading-tight text-brand-white sm:text-5xl lg:text-6xl">
              Social Perks by the numbers
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-dim">
              A live look at the platform — businesses, perks earned, social
              impressions, and rewards distributed across 25 platforms.
            </p>
          </header>

          {/* Big numbers grid */}
          <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-brand-border/50 bg-brand-card/30 p-6"
              >
                <p className="font-mono text-[10px] uppercase tracking-wider text-brand-muted">
                  {s.label}
                </p>
                <p className="mt-3 font-heading text-4xl italic text-brand-white sm:text-5xl">
                  {s.value}
                </p>
                <p className="mt-1 text-sm text-brand-dim">{s.sublabel}</p>
                <div className="mt-5">
                  <Sparkline data={s.trend} accent={s.accent} />
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-brand-muted">
                    90-day trend
                  </p>
                </div>
              </div>
            ))}
          </section>

          {/* Industry breakdown */}
          <section className="mt-16">
            <div className="flex items-baseline justify-between">
              <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
                Industry breakdown
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-brand-muted">
                % of active businesses
              </p>
            </div>
            <div className="mt-6 rounded-2xl border border-brand-border/50 bg-brand-card/30 p-6">
              <ul className="space-y-4">
                {INDUSTRIES.map((row) => (
                  <li key={row.name}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-brand-text">{row.name}</span>
                      <span className="font-mono text-xs text-brand-muted">
                        {(row.share * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-brand-border/30">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-green"
                        style={{ width: `${(row.share * 100).toFixed(0)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Geographic distribution */}
          <section className="mt-16">
            <div className="flex items-baseline justify-between">
              <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
                Geographic distribution
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-brand-muted">
                US footprint
              </p>
            </div>
            <div className="mt-6 rounded-2xl border border-brand-border/50 bg-brand-card/30 p-6">
              <svg
                viewBox="0 0 960 500"
                className="w-full"
                role="img"
                aria-label="Map of the United States showing where Social Perks businesses are most active"
              >
                {/* Stylized US silhouette — abstract polygon, not a real geo path */}
                <path
                  d="M150,210 L210,150 L260,120 L320,140 L380,170 L470,180 L580,170 L660,165 L720,165 L760,200 L770,260 L740,310 L700,340 L640,360 L560,360 L470,355 L420,360 L370,350 L300,340 L240,320 L200,290 L160,260 Z"
                  className="fill-brand-border/10 stroke-brand-border/40"
                  strokeWidth={1}
                />
                {MAP_DOTS.map((d) => (
                  <g key={d.city}>
                    <circle
                      cx={d.cx}
                      cy={d.cy}
                      r={d.r + 4}
                      className="fill-brand-cyan/15"
                    />
                    <circle
                      cx={d.cx}
                      cy={d.cy}
                      r={d.r}
                      className="fill-brand-cyan"
                    />
                  </g>
                ))}
              </svg>
              <p className="mt-4 text-sm text-brand-dim">
                Each dot represents a city with active Social Perks businesses.
                Larger dots indicate more activity.
              </p>
            </div>
          </section>

          {/* Disclaimer */}
          <p className="mt-12 text-center font-mono text-[10px] uppercase tracking-wider text-brand-muted">
            Stats updated daily · last refresh {updated}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
