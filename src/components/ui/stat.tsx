"use client";

import React from "react";

interface StatProps {
  value: string | number;
  label: string;
  color?: "cyan" | "green" | "amber" | "red" | "purple" | "pink" | "orange" | "white" | (string & {});
  trend?: "up" | "down" | "neutral";
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

const trendIndicator: Record<string, { symbol: string; color: string }> = {
  up: { symbol: "\u2191", color: "text-brand-green" },
  down: { symbol: "\u2193", color: "text-brand-red" },
  neutral: { symbol: "\u2192", color: "text-brand-muted" },
};

export function Stat({
  value,
  label,
  color = "white",
  trend,
}: StatProps) {
  const isHex = typeof color === "string" && color.startsWith("#");
  const colorClass = isHex ? "" : valueColorMap[color] ?? "";
  const colorStyle = isHex ? { color } : undefined;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span
          className={`text-2xl font-mono font-semibold tracking-tight ${colorClass}`}
          style={colorStyle}
        >
          {value}
        </span>
        {trend && (
          <span className={`text-xs font-mono ${trendIndicator[trend].color}`}>
            {trendIndicator[trend].symbol}
          </span>
        )}
      </div>
      <span className="text-2xs uppercase tracking-wider text-brand-muted font-mono">
        {label}
      </span>
    </div>
  );
}
