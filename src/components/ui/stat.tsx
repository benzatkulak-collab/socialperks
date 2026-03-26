"use client";

import React from "react";

interface StatProps {
  value: string | number;
  label: string;
  color?:
    | "cyan"
    | "green"
    | "amber"
    | "red"
    | "purple"
    | "pink"
    | "orange"
    | "white"
    | (string & {});
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  prefix?: string;
  suffix?: string;
  size?: "sm" | "md" | "lg";
}

const valueColorMap: Record<string, string> = {
  cyan: "text-brand-cyan",
  green: "text-brand-green",
  amber: "text-brand-amber",
  red: "text-brand-red",
  purple: "text-brand-purple",
  pink: "text-brand-pink",
  orange: "text-brand-orange",
  white: "text-brand-white",
};

const trendIndicator: Record<string, { symbol: string; color: string; bg: string }> = {
  up: { symbol: "\u2191", color: "text-brand-green", bg: "bg-brand-green/10" },
  down: { symbol: "\u2193", color: "text-brand-red", bg: "bg-brand-red/10" },
  neutral: { symbol: "\u2192", color: "text-brand-muted", bg: "bg-brand-muted/10" },
};

const sizeClasses = {
  sm: { value: "text-lg", label: "text-3xs" },
  md: { value: "text-2xl", label: "text-2xs" },
  lg: { value: "text-3xl", label: "text-xs" },
};

export function Stat({
  value,
  label,
  color = "white",
  trend,
  trendValue,
  prefix,
  suffix,
  size = "md",
}: StatProps) {
  const isHex = typeof color === "string" && color.startsWith("#");
  const colorClass = isHex ? "" : valueColorMap[color] ?? "";
  const colorStyle = isHex ? { color } : undefined;
  const s = sizeClasses[size];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        {prefix && (
          <span className={`${s.value} font-mono text-brand-muted`}>
            {prefix}
          </span>
        )}
        <span
          className={`${s.value} font-mono font-semibold tracking-tight ${colorClass}`}
          style={colorStyle}
        >
          {value}
        </span>
        {suffix && (
          <span className={`text-xs font-mono text-brand-muted`}>
            {suffix}
          </span>
        )}
        {trend && (
          <span
            className={`
              inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full
              text-3xs font-mono font-medium
              ${trendIndicator[trend].color} ${trendIndicator[trend].bg}
            `}
          >
            {trendIndicator[trend].symbol}
            {trendValue && <span>{trendValue}</span>}
          </span>
        )}
      </div>
      <span className="text-2xs uppercase tracking-wider text-brand-muted font-mono">
        {label}
      </span>
    </div>
  );
}
