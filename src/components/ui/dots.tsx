"use client";

import React from "react";

interface DotsProps {
  count: number;
  max?: number;
  color?: "cyan" | "green" | "amber" | "red" | "purple";
  size?: "sm" | "md";
}

const colorClasses: Record<string, string> = {
  cyan: "bg-brand-cyan",
  green: "bg-brand-green",
  amber: "bg-brand-amber",
  red: "bg-brand-red",
  purple: "bg-brand-purple",
};

export function Dots({ count, max = 5, color = "cyan", size = "sm" }: DotsProps) {
  const safeCount = Math.max(0, Math.min(count ?? 0, max));
  const safeMax = Math.max(0, max);
  const activeColor = colorClasses[color] ?? colorClasses.cyan;
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <div
      className="inline-flex items-center gap-1"
      role="meter"
      aria-label={`${safeCount} out of ${safeMax}`}
      aria-valuenow={safeCount}
      aria-valuemin={0}
      aria-valuemax={safeMax}
    >
      {Array.from({ length: safeMax }, (_, i) => (
        <span
          key={i}
          className={`${dotSize} rounded-full transition-all duration-fast ease-smooth ${
            i < safeCount ? activeColor : "bg-brand-border"
          }`}
        />
      ))}
    </div>
  );
}
