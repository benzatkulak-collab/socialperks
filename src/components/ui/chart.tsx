'use client';

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  className?: string;
}

export function BarChart({ data, height = 200, className = '' }: BarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(48, Math.floor(300 / data.length));
  const gap = 8;
  const width = data.length * (barWidth + gap);

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${height + 30}`} width="100%" height={height + 30} role="img" aria-label="Bar chart">
        {data.map((d, i) => {
          const barH = (d.value / max) * height;
          const x = i * (barWidth + gap);
          const y = height - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barH} rx={4} fill={d.color || '#22D3EE'} opacity={0.8}>
                <title>{`${d.label}: ${d.value}`}</title>
              </rect>
              <text x={x + barWidth / 2} y={height + 16} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">{d.label}</text>
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="11" fontFamily="JetBrains Mono, monospace">{d.value}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  className?: string;
}

export function LineChart({ data, height = 160, color = '#22D3EE', className = '' }: LineChartProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const min = Math.min(...data.map(d => d.value), 0);
  const range = max - min || 1;
  const width = 400;
  const padding = 8;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (d.value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const areaPoints = `${padding},${height - padding} ${points.join(' ')} ${width - padding},${height - padding}`;

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${height + 24}`} width="100%" height={height + 24} role="img" aria-label="Line chart">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#lineGrad)" />
        <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * (width - padding * 2);
          const y = padding + (1 - (d.value - min) / range) * (height - padding * 2);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={3} fill={color} />
              <text x={x} y={height + 16} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  className?: string;
}

export function DonutChart({ data, size = 160, className = '' }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
        {data.map((d, i) => {
          const pct = d.value / total;
          const dashArray = `${pct * circumference} ${circumference}`;
          const rotation = offset * 360 - 90;
          offset += pct;
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={d.color} strokeWidth={20}
              strokeDasharray={dashArray} transform={`rotate(${rotation} ${size / 2} ${size / 2})`} opacity={0.8}>
              <title>{`${d.label}: ${d.value}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="space-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-white/50">{d.label}</span>
            <span className="text-white/80 font-mono ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 80, height = 24, color = '#22D3EE' }: SparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${(1 - (v - min) / range) * height}`).join(' ');
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
